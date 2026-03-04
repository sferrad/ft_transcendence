# lit les secrets KV pour -> permettra de verifier la validite de la requete(token) et redirige
# vers le micro service concerne
# retour read secret at kv/data/jwt/main:
# {
#   "data": {
#     "data": {
#       "secret_key": "...",
#       "algorithm": "HS256"
#     }
#     "metadata"{
#         ....
#     }
#   }
# }

from .vault_client import get_vault_client

def read_jwt_secret() -> tuple[str, str]:
    client = get_vault_client()
    secret = client.read("kv/data/jwt/main")
    if not secret:
        raise RuntimeError("JWT not found at kv/data/jwt/main")
    if "data" not in secret or "data" not in secret["data"]:
        raise RuntimeError("JWT structure invalid, expected KV V2")
    payload = secret["data"]["data"]
    secret_key = payload.get("secret_key")
    algorithm = payload.get("algorithm", "HS256")
    if not secret_key:
        raise RuntimeError("JWT data field missing: secret_key")
    return secret_key, algorithm