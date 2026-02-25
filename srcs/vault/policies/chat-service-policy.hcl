path "database/creds/chat-role" {
  capabilities = ["read"]
}

path "kv/data/services/chat-service/*" {
  capabilities = ["read"]
}