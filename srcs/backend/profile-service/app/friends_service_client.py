import httpx
import os

FRIENDS_SERVICE_URL = os.getenv("FRIENDS_SERVICE_URL", "https://friends-service:8004")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")

async def delete_friends_in_friends_service(user_id: int):
    async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
        url = f"{FRIENDS_SERVICE_URL}/internal/user/cleanup"
        response = await client.post(url, json={"user_id": user_id})
    response.raise_for_status()
    return response.json()

async def fetch_friends_list_in_friends_service(user_id: int):
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{FRIENDS_SERVICE_URL}/friends/with-status", headers={"X-User-Id": str(user_id)})
    response.raise_for_status()
    return response.json()