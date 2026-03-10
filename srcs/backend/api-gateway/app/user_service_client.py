import os
import httpx

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL")

async def verify_credentials(email: str, password: str) ->dict:
    url = f"{USER_SERVICE_URL}/internal/auth/verify"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={"email": email, "password": password})
    if response.status_code != 200:
        raise RuntimeError(f"user-service verify failed: {response.status_code} {response.text}")
    data = response.json()
    if not data.get("ok"):
        raise RuntimeError("user-service verify returned ok=false")
    return data["user"]