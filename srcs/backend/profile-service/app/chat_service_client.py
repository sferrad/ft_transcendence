import httpx
import os

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "https://chat-service:8002")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")

async def fetch_rooms(*, user_id: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{CHAT_SERVICE_URL}/rooms", headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()

async def fetch_room_messages(*, user_id: int, room_id: int, limit: int = 200) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{CHAT_SERVICE_URL}/rooms/{room_id}/messages", params={"limit": limit}, headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()

async def cleanup_user(*, user_id: int) -> dict:
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        r = await client.post(f"{CHAT_SERVICE_URL}/internal/user/cleanup", json={"user_id": user_id})
    r.raise_for_status()
    return r.json()

async def fetch_my_private_messages(*, user_id: int, limit: int = 10000) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{CHAT_SERVICE_URL}/{user_id}/messages/export", params={"limit": limit}, headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()