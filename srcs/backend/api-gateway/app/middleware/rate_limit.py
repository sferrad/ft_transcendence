from fastapi import Request
from fastapi.responses import JSONResponse

from .redis import redis_client

WHITELIST = {
    "/health",
    "/metrics",
}
LIMIT = 40
WINDOW = 30


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

async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if path in WHITELIST:
        return await call_next(request)
    ip = _get_client_ip(request)
    key = f"rate:{ip}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, WINDOW)
        if count > LIMIT:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": "Rate limit exceeded",
                    "retry_after": WINDOW,
                },
                headers={"Retry-After": str(WINDOW)},
            )
    except Exception as e:
        return await call_next(request)
    response = await call_next(request)
    return response