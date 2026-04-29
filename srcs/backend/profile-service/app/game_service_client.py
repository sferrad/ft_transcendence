import httpx
import os

GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL", "http://game-service:8005")

async def fetch_my_matches(*, user_id:int, skip: int = 0, limit: int = 200) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{GAME_SERVICE_URL}/me/matches/", params={"skip": skip, "limit": limit}, headers={"X-User-Id": str(user_id)},)
    response.raise_for_status()
    return response.json()

async def cleanup_user(*, user_id: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{GAME_SERVICE_URL}/internal/user/cleanup", json={"user_id": user_id})
    response.raise_for_status()
    return response.json()