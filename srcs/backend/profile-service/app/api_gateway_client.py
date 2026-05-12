import httpx
import os



API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "https://api-gateway:8000")
INTERNAL_CA_CERT = os.getenv("INTERNAL_CA_CERT", "/certs/ca.crt")

async def logout_current_token(authorization: str) -> None:
	async with httpx.AsyncClient(timeout=5.0, verify=INTERNAL_CA_CERT) as client:
		response = await client.post(
			f"{API_GATEWAY_URL}/auth/logout",
			headers={"Authorization": authorization},
		)
	response.raise_for_status()