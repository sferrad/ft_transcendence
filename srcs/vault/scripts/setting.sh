#!/bin/bash

# e -> exit si cmd echoue
# u -> exit si var non init
# -o | -> si erreur dans une pipe exit

set -euo pipefail

# On stocke les secrets de private (unseal key + root token) hors du volume
# partagé avec les autres services.
PRIVATE_DIR="/vault/private"
INIT_FILE_JSON="${PRIVATE_DIR}/init.json"
FALLBACK_INIT_FILE_JSON="/vault/data/init.json"

# changer les droits sur le dir /vault/data : quand il est monté via un volume,
# les permissions du Dockerfile ne suffisent pas toujours (volume déjà existant).
# 711 = traverse ok (x) sans lister (r) pour les autres conteneurs non-root.
mkdir -p /vault/data
chmod 711 /vault/data || true

# Dossier private: accessible uniquement au conteneur Vault.
mkdir -p "$PRIVATE_DIR"
chmod 700 "$PRIVATE_DIR" || true

export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"

echo "Initialisation Vault..."

# par defaut vault n est pas initialise et est scelle
# vault operatot init -> genere .json avec cles de deverouillage
is_initialized(){
  local output
  output=$(vault status 2>/dev/null || true)
  if echo "$output" | grep -q 'Initialized *true'; then
    return 0
  else
    return 1
  fi
}

if is_initialized; then
  echo "vault already initialized"

  if [ ! -f "$INIT_FILE_JSON" ] && [ -f "$FALLBACK_INIT_FILE_JSON" ]; then
    echo "init.json found in /vault/data (fallback). Migrating to /vault/private..."
    umask 077
    cp -f "$FALLBACK_INIT_FILE_JSON" "$INIT_FILE_JSON"
  fi

  if [ ! -f "$INIT_FILE_JSON" ]; then
    echo "init.json is missing. Vault is already initialized, but unseal keys/root token are not available." >&2
    echo "Fix: restore init.json into /vault/private, or reset Vault by removing both volumes (vault-data + vault-private)." >&2
    exit 1
  fi
else
  # Empêche la création d'un init.json world-readable.
  umask 077
  vault operator init -format=json -key-shares=1 -key-threshold=1 > "$INIT_FILE_JSON"
  chmod 600 "$INIT_FILE_JSON" || true
  echo "vault initialized"
fi

# Si le fichier existe déjà (volume persistant), on (re)verrouille les perms.
chmod 600 "$INIT_FILE_JSON" || true

# S'assure qu'une éventuelle copie dans /vault/data ne soit pas lisible par les autres conteneurs.
if [ -f "$FALLBACK_INIT_FILE_JSON" ]; then
  chmod 600 "$FALLBACK_INIT_FILE_JSON" || true
  chown root:root "$FALLBACK_INIT_FILE_JSON" || true
fi
is_sealed(){
  local output
  output=$(vault status 2>/dev/null || true)
  if echo "$output" | grep -q 'Sealed *true'; then
    return 0
  else
    return 1
  fi
}




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
  vault secrets enable -path=kv -version=2 kv
  echo "Secrets engine enabled"
fi

JWT_SECRET="${JWT_SECRET_KEY:?key must be initialized}"
echo "Adding secret JWT in kv/data/jwt/main"
vault kv put kv/jwt/main \
  secret_key="$JWT_SECRET" \
  algorithm="${JWT_ALGORITHM:-HS256}"


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
  local group_role="${config_name//-/_}_app"
  local sslmode="${VAULT_DB_SSLMODE:-disable}"
  local max_attempts="${VAULT_DB_MAX_ATTEMPTS:-30}"
  local sleep_seconds="${VAULT_DB_RETRY_SLEEP_SECONDS:-2}"

  echo "Config DB '$config_name' (host=$host, db=$db_name, role=$role_name)..."
  local attempt=1
  while true; do
    if vault write "database/config/$config_name" \
      plugin_name=postgresql-database-plugin \
      allowed_roles="$role_name" \
      connection_url="postgresql://{{username}}:{{password}}@$host:5432/$db_name?sslmode=$sslmode" \
      username="${POSTGRES_USER:?POSTGRES_USER must be set and not empty}" \
      password="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set and not empty}" \
      && vault write "database/roles/$role_name" \
        db_name="$config_name" \
        creation_statements="DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${group_role}') THEN CREATE ROLE ${group_role} NOLOGIN; END IF; END \$\$; CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT ${group_role} TO \"{{name}}\"; GRANT CONNECT ON DATABASE \"${db_name}\" TO ${group_role}; GRANT USAGE, CREATE ON SCHEMA public TO ${group_role}; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${group_role}; GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${group_role}; ALTER DEFAULT PRIVILEGES FOR ROLE \"{{name}}\" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${group_role}; ALTER DEFAULT PRIVILEGES FOR ROLE \"{{name}}\" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${group_role};" \
        default_ttl="1h" \
        max_ttl="24h"; then
      break
    fi

    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "ERROR: failed to configure DB '$config_name' after ${max_attempts} attempts" >&2
      return 1
    fi

    echo "Retrying DB '$config_name' (${attempt}/${max_attempts}) in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
}

config_db "user-db" "user-db" "user_db" "user-role"
config_db "chat-db" "chat-db" "chat_db" "chat-role"
config_db "friends-db" "friends-db" "friends_db" "friends-role"
config_db "game-db" "game-db" "game_db" "game-role"
config_db "analytics-db" "analytics-db" "analytics_db" "analytics-role"
config_db "profile-db" "profile-db" "profile_db" "profile-role"

apply_policy() {
  local name="$1"
  local file="$2"
  if vault policy list 2>/dev/null | grep -qx "$name"; then
    echo "Updating existing policy: '$name' from '$file'..."
  else
    echo "Creating new policy: '$name' from '$file'..."
  fi
  vault policy write "$name" "$file"
}

apply_policy "api-gateway-policy" "/vault/policies/api-gateway-policy.hcl"
apply_policy  "user-service-policy" "/vault/policies/user-service-policy.hcl"
apply_policy  "chat-service-policy" "/vault/policies/chat-service-policy.hcl"
apply_policy  "friends-service-policy" "/vault/policies/friends-service-policy.hcl"
apply_policy  "game-service-policy" "/vault/policies/game-service-policy.hcl"
apply_policy  "analytics-service-policy" "/vault/policies/analytics-service-policy.hcl"
apply_policy  "profile-service-policy" "/vault/policies/profile-service-policy.hcl"

create_token() {
  local policy="$1"
  local file="$2"

  local token_uid="${VAULT_TOKEN_UID:-1000}"
  local token_gid="${VAULT_TOKEN_GID:-1000}"

  if [ -f "$file" ]; then
    # Ensure permissions are usable by non-root app containers.
    chmod 600 "$file" || true
    chown "$token_uid:$token_gid" "$file" || true
    echo "Token already created for '$policy', skipping creation."
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
  chmod 600 "$file"
  chown "$token_uid:$token_gid" "$file" || true
}

# Creation token Vault pour autoriser l'acces a la lecture des fichiers specifies dans policies
create_token "api-gateway-policy" "/vault/data/api-gateway.token"
create_token "user-service-policy" "/vault/data/api-user.token"
create_token "chat-service-policy" "/vault/data/api-chat.token"
create_token "friends-service-policy" "/vault/data/api-friends.token"
create_token "game-service-policy" "/vault/data/api-game.token"
create_token "analytics-service-policy" "/vault/data/api-analytics.token"
create_token "profile-service-policy" "/vault/data/api-profile.token"

echo "Vault ready"