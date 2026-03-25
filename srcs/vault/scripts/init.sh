#!/bin/bash

# =============================================================================
# FICHIER: init.sh (entrypoint du conteneur Vault)
#
# But :
# 1) Lancer `vault server ...` en arrière-plan
# 2) Attendre que le serveur réponde à `vault status`
# 3) Exécuter `setting.sh` (init/unseal/policies/tokens)
# 4) Attendre le process Vault (pour que le conteneur reste vivant)
#
# Pourquoi c'est séparé en 2 scripts ?
# - `vault server` doit tourner en continu.
# - La configuration (init/unseal/enable engines) est un "bootstrap" à faire au démarrage.
# =============================================================================

# Si une commande échoue -> exit immédiat.
set -e

echo "launching vault: vault $@"

# Lance Vault avec les arguments passés au conteneur.
# - `$@` = tous les arguments du script.
# - `&`  = arrière-plan (sinon on ne pourrait pas exécuter setting.sh).
vault "$@" &

# Récupère le PID du dernier process lancé en arrière-plan (Vault).
# On s'en sert pour:
# - tuer Vault si le bootstrap échoue
# - `wait` à la fin
VAULT_PID=$!

# Attendre que Vault réponde.
#
# `vault status` peut renvoyer:
# - code 0 : Vault OK et unsealed
# - code 2 : Vault OK mais sealed (il répond, donc prêt)
#
# On attend max 60s pour éviter un conteneur "bloqué" à l'infini.
echo "waiting for vault ..."
max_time=60
elapsed=0
while [ "$elapsed" -lt "$max_time" ]; do
	vault_code=0
	vault status >/dev/null 2>&1 || vault_code=$?
	if [ "$vault_code" -eq 0 ] || [ "$vault_code" -eq 2 ]; then
		echo "vault OK"
		break
	fi
	echo "waiting ..."
	sleep 1
	elapsed=$((elapsed + 1))
done

if [ "$elapsed" -ge "$max_time" ]; then
	echo "Vault is not ready, failed after ${max_time}s, killing vault and exiting"
	kill "$VAULT_PID" 2>/dev/null
	exit 1
fi

echo "initialisation of vault"

if ! /vault/scripts/setting.sh; then
	echo "error initialisation kill and exit"
	kill "$VAULT_PID"
	exit 1
fi

echo "vault initialized"

# On attend le process Vault (sinon le conteneur s'arrête).
wait "$VAULT_PID"
