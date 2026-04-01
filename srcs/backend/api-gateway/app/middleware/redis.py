import redis.asyncio as redis
import os



HOST = os.getenv("REDIS_HOST", "redis")
PORT = os.getenv("REDIS_PORT", "6379")

redis_client = redis.Redis(host=HOST, port=PORT, decode_responses=True)