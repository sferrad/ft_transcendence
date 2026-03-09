import os
import httpx
from fastapi import FastAPI, Request, Depends
from fastapi.responses import Response

from .auth import require_user

app = FastAPI(title="api-gateway")

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL")
CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL")
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL")
FRIENDS_SERVICE_URL = os.getenv("FRIENDS_SERVICE_URL")
GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL")
PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL")

@app.get("/health")
def health():
    return {"status": "ok", "service": "api-gateway"}

