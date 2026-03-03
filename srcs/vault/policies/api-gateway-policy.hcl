# ============================================================
# Donne a api gateway l'acces en read only:
# - secret jwt
# - sa config propre
# - de creds DB dynamique
# ============================================================

# path qui contient les secrets

path "kv/data/jwt/*" {
    capabilities = ["read"]
}

# config de gateway

path "kv/data/services/api-gateway/*" {
    capabilities = ["read"]
}