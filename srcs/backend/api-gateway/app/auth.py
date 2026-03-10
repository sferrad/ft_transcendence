# verifier la validite du token en le comparant avec la clet secrete KV (signature, expiration, algo, ...)
# renvoi erreur si header manquant ou token invalid

import jwt
from fastapi import Header, HTTPException, status
from jwt import InvalidTokenError


from .vault_kv import read_jwt_secret

JWT_SECRET_KEY, JWT_ALGORITHM = read_jwt_secret()

# Verifie la validite du token envoye (KEY check signature, ALGO check algo accepte)
# fonction .decode raise exception si invalid
def check_jwt(token: str) -> dict:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return payload

# on accepte none pour analyser et envoyer notre propre message d erreur et ne pas laisser Fastapi faire seul
# split (" ", 1) -> " " -> separator le format de authorization
# est en 2 parts (bearer 42254) le 1 est explicite pour 
# ne cut qu une fois au cas ou le token serait avec des espaces
# il y a beaucoup de header mais ici seul le header "authorization" nous interesse car c est ici 
# que se trouve le token pour l'authentification (Authorization: Bearer <token>)
# Seul un user authentifie peut continuer la route
# return payload si valid ou erreur 4xx si invalid
def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be : bearer <token>",
        )
    try:
        return check_jwt(parts[1])
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )