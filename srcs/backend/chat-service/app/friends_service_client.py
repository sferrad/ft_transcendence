import httpx
import os

FRIENDS_SERVICE_URL = os.getenv("FRIENDS_SERVICE_URL", "https://friends-service:8004")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")

async def is_blocked(sender_user_id: int, receiver_user_id: int):
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{FRIENDS_SERVICE_URL}/friends/{sender_user_id}/blocked/{receiver_user_id}", headers={"X-User-Id": str(sender_user_id)})
    response.raise_for_status()
    return response.json()