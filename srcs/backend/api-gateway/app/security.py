from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os
from uuid import uuid4

import jwt
from fastapi import FastAPI, HTTPException, status

from .vault_kv import read_jwt_secret


def load_jwt_secret(app: FastAPI) -> None:
    try:
        secret_key, algorithm = read_jwt_secret()
    except Exception as exc:
        print(f"[startup] Read JWT secret failed: {exc}")
        secret_key = os.getenv("JWT_SECRET_KEY")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        if not secret_key:
            app.state.jwt_secret_key = None
            app.state.jwt_algorithm = None
            return

        print("[startup] Using JWT secret from environment fallback")
        app.state.jwt_secret_key = secret_key
        app.state.jwt_algorithm = algorithm
        return

    app.state.jwt_secret_key = secret_key
    app.state.jwt_algorithm = algorithm


# Crée un JWT (token) signé.

#     Contexte débutant (important pour comprendre le reste):
#     - Un JWT est un *badge* signé que le client garde et renvoie à chaque requête.
#         Exemple de header:
#                 Authorization: Bearer <token>
#     - Le serveur peut vérifier la signature => si c'est bien un token émis par nous.

#     Les "claims" qu'on met dans ce JWT (des champs dans le payload):
#     - `exp` (expiration): date/heure de fin de validité du token.
#         Après `exp`, le token est refusé.
#     - `iat` (issued at): date/heure d'émission du token.
#         Très utile pour debug / audit.
#     - `jti` (JWT ID): identifiant unique du token (un UUID).

#     Pourquoi `jti` ? (c'est ce qui te manquait pour comprendre le "logout")
#     - Un JWT est *stateless*: une fois émis, il reste valide jusqu'à `exp`.
#         Donc, sans mécanisme serveur, "logout" ne peut pas invalider un token déjà donné.
#     - Notre solution: on enregistre le `jti` dans Redis lors du logout.
#         Puis, à chaque requête authentifiée, on vérifie si ce `jti` est "blacklisté".

#     TTL côté Redis:
#     - La blacklist a une durée de vie (TTL) basée sur `exp`.
#         Comme ça, Redis supprime tout seul l'entrée quand le token aurait expiré.

# Détails d'implémentation:
# - On stocke `iat`/`exp` en secondes UNIX (int) pour éviter les soucis de timezone.
# - On copie `payload` pour ne pas modifier le dict original de l'appelant.
def create_access_token(app: FastAPI, payload: dict, *, expires_minutes: int) -> str:
    jwt_secret_key = getattr(app.state, "jwt_secret_key", None)
    jwt_algorithm = getattr(app.state, "jwt_algorithm", None)
    if not jwt_secret_key or not jwt_algorithm:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT secret not initialized",
        )

    data = payload.copy()
    now = datetime.now(timezone.utc)
    # `iat` and `jti` are set only if not already present.
    # This allows tests or other callers to override them when needed.
    data.setdefault("iat", int(now.timestamp()))
    data.setdefault("jti", uuid4().hex)
    expire = now + timedelta(minutes=expires_minutes)
    data["exp"] = int(expire.timestamp())
    return jwt.encode(data, jwt_secret_key, algorithm=jwt_algorithm)
