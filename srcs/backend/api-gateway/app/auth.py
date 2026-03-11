# verifier la validite du token en le comparant avec la clet secrete KV (signature, expiration, algo, ...)
# renvoi erreur si header manquant ou token invalid

import jwt
from fastapi import Header, HTTPException, status, Request
from jwt import InvalidTokenError

# jwt_secret_key et jwt_algorithm sont stockes dans app.state on"startup" dans le main,
# le param request permet de les recup
def _get_jwt_secret(request: Request) -> tuple[str, str]:
    jwt_secret_key = getattr(request.app.state, "jwt_secret_key", None)
    jwt_algorithm = getattr(request.app.state, "jwt_algorithm", None)
    if not jwt_secret_key or not jwt_algorithm:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT jwt_secret_key not initialized"
        )
    return jwt_secret_key, jwt_algorithm

# Verifie la validite du token envoye (KEY check signature, ALGO check jwt_algorithm accepte)
# fonction .decode raise exception si invalid
def check_jwt(token: str, request: Request) -> dict:
    jwt_secret_key, jwt_algorithm = _get_jwt_secret(request)
    payload = jwt.decode(token, jwt_secret_key, algorithms=[jwt_algorithm])
    return payload

# on accepte none pour analyser et envoyer notre propre message d erreur et ne pas laisser Fastapi faire seul
# split (" ", 1) -> " " -> separator le format de authorization
# est en 2 parts (bearer 42254) le 1 est explicite pour 
# ne cut qu une fois au cas ou le token serait avec des espaces
# il y a beaucoup de header mais ici seul le header "authorization" nous interesse car c est ici 
# que se trouve le token pour l'authentification (Authorization: Bearer <token>)
# Seul un user authentifie peut continuer la route
# return payload si valid ou erreur 4xx si invalid
def require_user(request: Request, authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be: Bearer <token>",
        )
    try:
        return check_jwt(parts[1], request)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )