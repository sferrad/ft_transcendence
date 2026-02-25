path "database/creds/user-role" {
  capabilities = ["read"]
}

path "kv/data/services/user-service/*" {
  capabilities = ["read"]
}