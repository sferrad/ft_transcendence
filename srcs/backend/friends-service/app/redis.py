import os
import redis.asyncio as redis

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

client_redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)