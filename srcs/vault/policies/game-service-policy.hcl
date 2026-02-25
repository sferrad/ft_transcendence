path "database/creds/game-role" {
  capabilities = ["read"]
}

path "kv/data/services/game-service/*" {
  capabilities = ["read"]
}