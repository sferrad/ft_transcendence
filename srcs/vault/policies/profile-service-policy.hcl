path "database/creds/profile-role" {
  capabilities = ["read"]
}

path "kv/data/services/profile-service/*" {
  capabilities = ["read"]
}