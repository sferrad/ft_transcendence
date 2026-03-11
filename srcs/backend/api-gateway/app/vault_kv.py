# lit les secrets KV pour -> permettra de verifier la validite de la requete(token) et redirige
# vers le micro service concerne
# retour read jwt_secret_key at kv/data/jwt/main:
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
    jwt_secret_key = client.read("kv/data/jwt/main")
    if not jwt_secret_key:
        raise RuntimeError("JWT not found at kv/data/jwt/main")
    if "data" not in jwt_secret_key or "data" not in jwt_secret_key["data"]:
        raise RuntimeError("JWT structure invalid, expected KV V2")
    payload = jwt_secret_key["data"]["data"]
    secret_key = payload.get("secret_key")
    jwt_algorithm = payload.get("algorithm", "HS256")
    if not secret_key:
        raise RuntimeError("JWT data field missing: secret_key")
    return secret_key, jwt_algorithm