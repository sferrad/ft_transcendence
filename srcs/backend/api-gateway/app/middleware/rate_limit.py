import os

from fastapi import Request
from fastapi.responses import JSONResponse

from .redis import redis_client
import jwt

WHITELIST = {
    "/health",
    "/metrics",
}

LIMITS = {
    "chat":    {"limit": 300, "window": 30},   # polling intensif → généreux
    "friends": {"limit": 200, "window": 30},   # presence/ping régulier
    "default": {"limit": 60,  "window": 30},   # tout le reste
}


SECRET = os.getenv("JWT_SECRET_KEY", "")


def _get_limit_config(path: str) -> dict:
    if path.startswith("/chat"):
        return LIMITS["chat"]
    if path.startswith("/friends"):
        return LIMITS["friends"]
    return LIMITS["default"]

# Récupère l'IP du client réel derrière un reverse-proxy.

# - Nginx (WAF) envoie typiquement `X-Forwarded-For: <ip_client>, <ip_proxy>, ...`.
# - X-Forwarded-For: contient l'ip reele du client, du proxy et du gateway 
# - X-Forwarded-For: 1.2.3.4, 10.0.0.1, 172.20.0.3
# - 1.2.3.4       → client réel
# - 10.0.0.1      → nginx
# - 172.20.0.3    → gateway
# - On prend l'entrée la plus à gauche (client d'origine) les ip suivantes sont celle du proxy et gateway.
# - Fallback: `request.client.host`.
# dict comprehension: parts = [] -> type de retour (dict comprehension), p -> expression final,
# .strip(ce qu on applique a l expression) p -> element (temp), xff -> iterable,
# if() -> condition a applique avant d ajouter l expression



def _get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[0]
    client = request.client
    return client.host if client is not None else ""

# NOUVEAU : extrait le user ID depuis le JWT Bearer token.
#
# Pourquoi ?
# - Le rate limit par IP traite tous les users de la même machine comme UN seul.
# - En dev (localhost), tous tes browsers = même IP = même compteur → 429.
# - En prod, plusieurs users derrière un NAT / proxy d'entreprise = même problème.
#
# Solution : utiliser le "sub" du JWT comme clé de rate limit.
# "sub" = subject = identifiant unique de l'utilisateur (ex: "1", "2"...).
#
# Si pas de token valide (route publique, token expiré, etc.)
# → on retombe sur l'IP comme fallback. Pas de crash.

def _get_rate_limit_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")

    if auth.startswith("Bearer "):
        token = auth.removeprefix("Bearer ").strip()
        # on essaie de décoder le JWT
        # options={"verify_exp": False} → on ne vérifie PAS l'expiration ici.
        # Pourquoi ? Le rate limit doit s'appliquer même aux tokens légèrement
        # expirés (sinon un attaquant avec un token expiré bypass le rate limit).
        # L'auth réelle est vérifiée plus loin dans la stack (dépendance FastAPI).
        try:
            payload = jwt.decode(
                token,
                SECRET,
                algorithms=["HS256"],
                options={"verify_exp": False},
            )
            user_id = payload.get("sub")
            if user_id:
                # clé Redis = "rate:user:42"
                # Séparée de "rate:1.2.3.4" pour éviter collisions
                return f"rate:user:{user_id}"
        except Exception:
            # Token malformé, mauvaise signature, etc. → fallback IP
            pass

    # Pas de token (route publique) → rate limit par IP
    ip = _get_client_ip(request)
    return f"rate:ip:{ip}"

async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path

    if path in WHITELIST:
        return await call_next(request)
    
    key = _get_rate_limit_key(request)
    config = _get_limit_config(path)
    limit = config["limit"]
    window = config["window"]

    route_type = "chat" if path.startswith("/chat") else \
                 "friends" if path.startswith("/friends") else "default"
    scoped_key = f"rate:{route_type}:{key.split(':', 1)[1]}"
    
    try:
        count = await redis_client.incr(scoped_key)
        if count == 1:
            await redis_client.expire(scoped_key, window)
        if count > limit:
            ttl = await redis_client.ttl(scoped_key)
            retry_after = ttl if ttl > 0 else window
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": "Rate limit exceeded",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
    except Exception as e:
        return await call_next(request)
    return await call_next(request)