import os
import httpx

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL")

class InvalidCredentialsError(RuntimeError):
    """Credentials are wrong (401 from user-service)."""


class UserServiceUnavailableError(RuntimeError):
    """Network/timeout/DNS issues when calling user-service."""


class UserServiceError(RuntimeError):
    """Unexpected non-401 response from user-service (5xx/4xx)."""

async def verify_credentials(email: str, password: str) ->dict:
    url = f"{USER_SERVICE_URL}/internal/auth/verify"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json={"email": email, "password": password})
    except httpx.RequestError as e:
        raise UserServiceUnavailableError("user-service unavailable") from e
    if response.status_code == 401:
        raise InvalidCredentialsError("invalid credentials")
    if response.status_code != 200:
        raise RuntimeError(f"user-service verify failed: {response.status_code} {response.text}")
    data = response.json()
    if not data.get("ok"):
        raise RuntimeError("user-service verify returned ok=false")
    return data["user"]