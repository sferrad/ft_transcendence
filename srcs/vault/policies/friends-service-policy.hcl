path "database/creds/friends-role" {
  capabilities = ["read"]
}

path "kv/data/services/friends-service/*" {
  capabilities = ["read"]
}