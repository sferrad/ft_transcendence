path "database/creds/analytics-role" {
  capabilities = ["read"]
}

path "kv/data/services/analytics-service/*" {
  capabilities = ["read"]
}