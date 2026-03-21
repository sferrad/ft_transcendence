from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import FastAPI, HTTPException, status

from .vault_kv import read_jwt_secret


def load_jwt_secret(app: FastAPI) -> None:
    try:
        secret_key, algorithm = read_jwt_secret()
    except Exception as exc:
        print(f"[startup] Read JWT secret failed: {exc}")
        app.state.jwt_secret_key = None
        app.state.jwt_algorithm = None
        return

    app.state.jwt_secret_key = secret_key
    app.state.jwt_algorithm = algorithm


def create_access_token(app: FastAPI, payload: dict, *, expires_minutes: int) -> str:
    jwt_secret_key = getattr(app.state, "jwt_secret_key", None)
    jwt_algorithm = getattr(app.state, "jwt_algorithm", None)
    if not jwt_secret_key or not jwt_algorithm:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT secret not initialized",
        )

    data = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    data["exp"] = int(expire.timestamp())
    return jwt.encode(data, jwt_secret_key, algorithm=jwt_algorithm)