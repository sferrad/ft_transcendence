import httpx
import os

FRIENDS_SERVICE_URL = os.getenv("FRIENDS_SERVICE_URL", "http://friends-service:8004")

async def delete_friends_in_friends_service(user_id: int):
    async with httpx.AsyncClient(timeout=5.0) as client:
        url = f"{FRIENDS_SERVICE_URL}/internal/user/cleanup"
        response = await client.post(url, json={"user_id": user_id})
    response.raise_for_status()
    return response.json()