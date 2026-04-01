from fastapi import Request
from fastapi.responses import Response

from .redis import redis_client

WHITELIST = {
    "/health"
}
LIMIT = 10
WINDOW = 30

async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if path in WHITELIST:
        return await call_next(request)
    ip = request.client.host
    key = f"rate:{ip}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, WINDOW)
        if count > LIMIT:
            return Response("Too many request", status_code=429)
    except Exception as e:
        return await call_next(request)
    response = await call_next(request)
    return response