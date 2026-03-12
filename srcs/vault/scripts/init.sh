#!/bin/bash
#  si une commande echoue -> exit
set -e

echo "launching vault: vault $@"

# lance vault avec argument ($@) en arriere plan (&)
vault "$@" &

# recupere le pid du dernier process (vault) lance ($!) -> pour wait
VAULT_PID=$!

# attend que vault soit lance (& specifie le fd et non un file)
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

echo "vault initialisized"

wait "$VAULT_PID"
