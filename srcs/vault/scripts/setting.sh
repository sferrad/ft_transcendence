#!/bin/bash

# e -> exit si cmd echoue
# u -> exit si var non init
# -o | -> si erreur dans une pipe exit

set -euo pipefail

INIT_FILE_JSON="/vault/init.json"

export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"

echo "Initialisation Vault..."

# par defaut vault n est pas initialise et est scelle
# vault operatot init -> genere .json avec cles de deverouillage
is_initialized(){
  vault status 2>/dev/null | grep -q 'Initialized *true'
}

is_sealed(){
  vault status 2>/dev/null | grep -q 'Sealed *true'
}

if is_initialized; then
  echo "vault already initialized"
else
  vault operator init -format=json -key-shares=1 -key-threshold=1 > "$INIT_FILE_JSON"
  echo "vault initialized"
fi

if [ ! -f "$INIT_FILE_JSON" ]; then
  echo "json file init does not exist after initialisation, exit..."
  exit 1
fi

# Le JSON ressemble à :
# {
#   "unseal_keys_b64": ["clé_base64_1", ...],
#   "root_token": "hvs.xxxx"
# }
# jq -> cmd pour lire json, -r -> raw output (sans les guillemets)
# '.' -> chemin du tableau json, [0] -> premier element
# 2e arg -> var contenant le path json
UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' "$INIT_FILE_JSON")
ROOT_TOKEN=$(jq -r '.root_token' "$INIT_FILE_JSON")

# -z -> check est ce que la chaine est vide

if [ -z "$UNSEAL_KEY" ] || [ -z "$ROOT_TOKEN" ]; then
  echo "unseal key or root token empty" >&2
  exit 1
fi

echo "unseal key and root token succesfully extracted"

if is_sealed; then
  echo "unsealing vault..."
  vault operator unseal "$UNSEAL_KEY"
else
  echo "vault already unsealed"
fi

echo "login with root token..."

vault login "$ROOT_TOKEN"
# logger en tant que root a partir d ici

echo "Activation secrets engine..."
if vault secrets list | grep -q '^kv/'; then
  echo "Secrets engine 'kv/' already enabled"
else
  echo "Secrets engine enabled"
  vault secrets enable -path=kv -version=2 kv
fi


echo "Activation secrets DB..."
if vault secrets list | grep -q '^database/'; then
  echo "Secrets DB already enabled"
else
  echo "secrets DB enabled"
  vault secrets enable database
fi

config_db(){
  local config_name="$1"
  local host="$2"
  local db_name="$3"
  local role_name="$4"

  echo "Config DB '$config_name' (host=$host, db=$db_name, role=$role_name)..."
  vault write "database/config/$config_name" \
    plugin_name=postgresql-database-plugin \
    allowed_roles="$role_name" \
    connection_url="postgresql://{{username}}:{{password}}@$host:5432/$db_name?sslmode=disable" \
    username="${POSTGRES_USER:-postgres}" \
    password="${POSTGRES_PASSWORD:-postgres}"

  vault write database/roles/$role_name \
    db_name="$config_name" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
    default_ttl="1h" \
    max_ttl="24h"
}

config_db "user-db" "user-db" "user_db" "user-role"
config_db "chat-db" "chat-db" "chat_db" "chat-role"
config_db "friends-db" "friends-db" "friends_db" "friends-role"
config_db "game-db" "game-db" "game_db" "game-role"
config_db "analytics-db" "analytics-db" "analytics_db" "analytics-role"
config_db "profile-db" "profile-db" "profile_db" "profile-role"

echo "policy api-gateway-policy loading..."
vault policy write api-gateway-policy /vault/policies/api-gateway-policy.hcl

echo "policy user-service-policy loading..."
vault policy write user-service-policy /vault/policies/user-service-policy.hcl

echo "policy chat-service-policy loading..."
vault policy write chat-service-policy /vault/policies/chat-service-policy.hcl

echo "policy friends-service-policy loading..."
vault policy write friends-service-policy /vault/policies/friends-service-policy.hcl

echo "policy game-service-policy loading..."
vault policy write game-service-policy /vault/policies/game-service-policy.hcl

echo "policy analytics-service-policy loading..."
vault policy write analytics-service-policy /vault/policies/analytics-service-policy.hcl

echo "policy profile-service-policy loading..."
vault policy write profile-service-policy /vault/policies/profile-service-policy.hcl

create_token() {
  local policy="$1"
  local file="$2"

  if [ -f "$file" ]; then
    echo "Token already created for '$policy', skipping."
    return
  fi

  echo "Creating token for '$policy' -> '$file'..."
  local token
  token=$(vault token create -policy="$policy" -format=json | jq -r '.auth.client_token')
  if [ -z "$token" ]; then
    echo "error creating token for '$policy'." >&2
    exit 1
  fi
  echo "$token" > "$file"
}

create_token "api-gateway-policy" "/vault/api-gateway.token"
create_token "user-service-policy" "/vault/api-user.token"
create_token "chat-service-policy" "/vault/api-chat.token"
create_token "friends-service-policy" "/vault/api-friends.token"
create_token "game-service-policy" "/vault/api-game.token"
create_token "analytics-service-policy" "/vault/api-analytics.token"
create_token "profile-service-policy" "/vault/api-profile.token"

echo "Vault ready"