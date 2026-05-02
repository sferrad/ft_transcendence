import redis.asyncio as redis
import os



HOST = os.getenv("REDIS_HOST", "redis")
PORT = os.getenv("REDIS_PORT", "6379")
TIMEOUT = float(os.getenv("REDIS_TIMEOUT_SECONDS", "1.0"))

redis_client = redis.Redis(
    host=HOST,
    port=PORT,
    decode_responses=True,
    socket_connect_timeout=TIMEOUT,
    socket_timeout=TIMEOUT,
)
