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
while true; do
    if vault status >/dev/null 2>&1; then
        echo "vault OK"
        break
    fi
    echo "waiting ..."
    sleep 1
done

echo "initialisation of vault"

if ! /vault/scripts/setting.sh; then
    echo "error initialisation kill and exit"
    kill "$VAULT_PID"
    exit 1
fi

echo "vault initialisazed"

wait "$VAULT_PID"

