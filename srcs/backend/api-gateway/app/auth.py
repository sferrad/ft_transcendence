# Helpers d'authentification pour l'API Gateway.

# Objectif du fichier (niveau débutant):
# - C'est ici qu'on décide si une requête est "connectée" ou non.
# - Dans FastAPI, on fait ça via une *dependency* (dépendance) appelée `require_user`.
#     Si `require_user` échoue => la route renvoie 401.

# Ce qu'on fait concrètement:
# 1) Vérifier le JWT cryptographiquement:
#      - signature (le token n'a pas été modifié)
#      - algorithme autorisé
#      - expiration (`exp`)
# 2) Optionnellement, appliquer une révocation côté serveur (blacklist) via Redis.

# Pourquoi une blacklist Redis ?
# - Un JWT est "stateless": une fois émis, il reste valide jusqu'à `exp`.
# - Donc un "logout" *réel* (invalidation immédiate) nécessite un état côté serveur.
# - On stocke un marqueur en Redis (clé basée sur `jti`) avec un TTL = durée restante
#     du token.

# Choix sécurité/disponibilité (important):
# - Pour `require_user`, on fait actuellement *fail-open* si Redis est indisponible:
#     si le JWT est valide, on laisse passer.
#     => avantage: une panne Redis ne coupe pas toute l'API
#     => inconvénient: la révocation est temporairement non appliquée pendant la panne

import jwt
import asyncio
from fastapi import Header, HTTPException, status, Request
from jwt import InvalidTokenError
import hashlib
from datetime import datetime, timezone

from .middleware.redis import redis_client

# Récupère le secret JWT + l'algorithme depuis `app.state`.

# Le gateway charge ces valeurs au démarrage "on startup" depuis Vault (`load_jwt_secret`).
# On passe `request` pour accéder à `request.app.state` à l'intérieur d'une dependency.
def _get_jwt_secret(request: Request) -> tuple[str, str]:
    jwt_secret_key = getattr(request.app.state, "jwt_secret_key", None)
    jwt_algorithm = getattr(request.app.state, "jwt_algorithm", None)
    if not jwt_secret_key or not jwt_algorithm:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT jwt_secret_key not initialized"
        )
    return jwt_secret_key, jwt_algorithm


# Décode et valide un JWT.

# `jwt.decode(...)` vérifie automatiquement:
# - la signature (avec notre secret)
# - l'algorithme (liste blanche)
# - l'expiration (`exp`)

# Si quelque chose ne va pas, PyJWT lève `InvalidTokenError`.
def check_jwt(token: str, request: Request) -> dict:
    jwt_secret_key, jwt_algorithm = _get_jwt_secret(request)
    payload = jwt.decode(token, jwt_secret_key, algorithms=[jwt_algorithm])
    return payload

# Calcule la clé Redis qui marque un token comme révoqué.

# Cas normal (préféré):
# - On utilise `jti` (JWT ID) si présent.
#   `jti` = identifiant unique du token (généré lors du login).
#   Avantage: on ne stocke pas le token complet en base.

# Fallback (compat):
# - Si un ancien token n'a pas de `jti`, on hash le token complet (SHA-256).
#   Ça évite de stocker le token en clair dans Redis.
def _blacklist_key(token: str, payload: dict) -> str:
    jti = payload.get("jti")
    if jti:
        return f"jwt:blacklist:jti:{jti}"
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"jwt:blacklist:token:{token_hash}"

# Calcule le TTL (durée de vie) de l'entrée Redis de blacklist.

# Principe: TTL = exp - maintenant.
# - si le token expire dans 20 minutes, on garde la révocation 20 minutes.
# - ensuite Redis supprime automatiquement la clé.

# Si `exp` est absent ou invalide, on retourne 0 (donc pas de blacklist).
def _ttl_seconds(payload: dict) -> int:

    exp = payload.get("exp")
    if not exp:
        return 0
    try:
        exp_int = int(exp)
    except (TypeError, ValueError):
        return 0
    now = int(datetime.now(timezone.utc).timestamp())
    return max(0, exp_int - now)


# Révoque un token en écrivant un marqueur dans Redis (SETEX = valeur + TTL)."""
async def blacklist_jwt(token: str, payload: dict) -> None:
    ttl = _ttl_seconds(payload)
    if ttl <= 0:
        return
    key = _blacklist_key(token, payload)
    await asyncio.wait_for(redis_client.setex(key, ttl, "1"), timeout=1.0)


# Vérifie si le token est révoqué.

# On utilise `EXISTS` (booléen) pour juste savoir si la clé existe.

# Mode dégradé (fail-open):
# - Si Redis est KO, on renvoie False (donc "pas blacklisté") pour ne pas
#   casser toute l'API.
# - C'est un choix: si tu préfères "sécurité d'abord", tu peux faire fail-closed
#   (lever 503/401 quand Redis est down).
async def is_blacklisted(token: str, payload: dict) -> bool:
    key = _blacklist_key(token, payload)
    try:
        return bool(await asyncio.wait_for(redis_client.exists(key), timeout=1.0))
    except Exception:
        # Si Redis est down, on ne bloque pas toute l'API.
        return False

# Dependency FastAPI: impose qu'un utilisateur soit authentifié.

# Ce que FastAPI fait avec une dependency:
# - Si la dependency lève une HTTPException => la route s'arrête immédiatement.
# - Sinon, la valeur retournée (ici un dict `payload`) est injectée dans la route.

# Header attendu:
#     Authorization: Bearer <token>

# Étapes:
# 1) Vérifier que le header Authorization est présent + format "Bearer".
# 2) Décoder/valider le JWT (signature, algorithme, expiration).
# 3) Vérifier dans Redis si ce token a été révoqué (blacklist).

# Retour:
# - Le payload du JWT (dict). Exemple typique:
#     {"sub": "42", "email": "a@b.com", "exp": 1770000000, "jti": "..."}
async def require_user(request: Request, authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be: Bearer <token>",
        )
    try:
        token = parts[1]
        payload = check_jwt(token, request)
        if await is_blacklisted(token, payload):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revoked",
            )
        return payload
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
