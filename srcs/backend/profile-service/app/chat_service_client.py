import httpx
import os

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://chat-service:8002")

async def fetch_rooms(*, user_id: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{CHAT_SERVICE_URL}/rooms", headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()

async def fetch_room_messages(*, user_id: int, room_id: int, limit: int = 200) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{CHAT_SERVICE_URL}/rooms/{room_id}/messages", params={"limit": limit}, headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()

async def cleanup_user(*, user_id: int) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{CHAT_SERVICE_URL}/internal/user/cleanup", json={"user_id": user_id})
    r.raise_for_status()
    return r.json()