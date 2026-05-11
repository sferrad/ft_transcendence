import os

import httpx
from fastapi import HTTPException, status


PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL", "https://profile-service:8006")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")


# Crée le profil par défaut d'un utilisateur nouvellement inscrit.

# On utilise un endpoint interne dédié du profile-service:
# - `POST /internal/profile/create`

# Cet endpoint ne doit pas être exposé publiquement via l'api-gateway.
async def create_profile(*, user_id: int, display_name: str) -> dict:
    url = f"{PROFILE_SERVICE_URL}/internal/profile/create"
    payload = {"user_id": user_id, "display_name": display_name}

    try:
        async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()
    except httpx.RequestError:
        # profile-service down / DNS / réseau
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile service unavailable",
        )
    except httpx.HTTPStatusError as e:
        # profile-service a répondu 4xx/5xx
        detail = "Profile service failed"
        try:
            detail = e.response.json()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    # Normalement profile-service renvoie le ProfileOut (JSON)
    return response.json()