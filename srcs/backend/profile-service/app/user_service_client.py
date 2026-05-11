import httpx
import os
from .schemas import UserUpdateRequest

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "https://user-service:8001")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")

async def update_user_in_user_service(user_id: int, updates: UserUpdateRequest):
    url = f"{USER_SERVICE_URL}/internal/user/update"
    payload = {"user_id": user_id}
    if updates.email is not None:
        payload["email"] = updates.email
    if updates.password is not None:
        payload["password"] = updates.password
    async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.post(url, json=payload)
    response.raise_for_status()
    return response.json()

async def delete_user_in_user_service(user_id: int):
    async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
        url = f"{USER_SERVICE_URL}/internal/user/delete"
        response = await client.post(url, json={"user_id": user_id})
    response.raise_for_status()
    return response.json()

async def fetch_user_in_user_service(user_id: int) -> dict:
    async with httpx.AsyncClient(timeout=10.0, verify=INTERNAL_CA_CERT) as client:
        response = await client.get(f"{USER_SERVICE_URL}/internal/user/{user_id}")
    response.raise_for_status()
    return response.json()