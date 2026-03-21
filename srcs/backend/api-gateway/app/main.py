import os
import httpx
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .security import load_jwt_secret, create_access_token
from .auth import require_user
from .schemas import LoginRequest
from .user_service_client import (
    verify_credentials,
    InvalidCredentialsError,
    UserServiceUnavailableError,
    UserServiceError
)

app = FastAPI(title="api-gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
}


@app.on_event("startup")
def on_startup() -> None:
    load_jwt_secret(app)

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001")
CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://chat-service:8002")
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8003")
FRIENDS_SERVICE_URL = os.getenv("FRIENDS_SERVICE_URL", "http://friends-service:8004")
GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL", "http://game-service:8005")
PROFILE_SERVICE_URL = os.getenv("PROFILE_SERVICE_URL", "http://profile-service:8006")


@app.get("/health")
def health():
    return {"status": "ok", "service": "api-gateway"}

# auth/login appel une route interne avec verify_credentials -> user-service
@app.post("/auth/login")
async def auth_login(body: LoginRequest):
    try:
        user = await verify_credentials(body.identifier, body.password)
    except InvalidCredentialsError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except UserServiceUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except UserServiceError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    token = create_access_token(app, {
        "sub": str(user["id"]),
        "email": str(user["email"]),
        "username": str(user["username"]),
    }, expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return {"access_token": token, "token_type": "bearer"}

# Le frontend l’appelle souvent pour savoir “qui je suis ? est-ce que je suis connecté ?”
@app.get("/auth/me")
def auth_me(payload: dict = Depends(require_user)):
    return {"payload": payload}



# headers = {}  # Dictionnaire vide

# for k, v in request.headers.items():
    # k = clé (ex: "host", "authorization")
    # v = valeur (ex: "api-gateway:8000", "Bearer xxx")
    
    # if k.lower() != "host":  # Si ce n'est PAS "host"
        # headers[k] = v       # On l'ajoute au dictionnaire
# Résultat:
# headers = {
#   "authorization": "Bearer xxx",
#   "content-type": "application/json"
# }

# lorsqu'une fonction est async le retour se fait avec 
# await (coroutine retourne adresse sans await car reponse incomplete il faut donc attendre avec await)

async def _proxy(request: Request, target_base: str, path: str, extra_headers: dict | None = None) -> Response:
    target_url = f"{target_base}/{path}"
    body = await request.body()
    client_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "x-user-id")
        and k.lower() not in HOP_BY_HOP_HEADERS
    }
    if extra_headers:
        client_headers.update(extra_headers)
    async with httpx.AsyncClient() as client: # envoi de la requete client -> gateway -> service (avec header filtre)
        response = await client.request(
            method=request.method,
            url=target_url,
            params=dict(request.query_params),
            content=body,
            headers=client_headers,
        )
# "response" revient avec de nouveau header de la part du micro service qui doivent etre filtre
    service_header = {
        k: v for k, v in client_headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS
    }


    return Response(content=response.content, status_code=response.status_code, headers=dict(service_header))



# RAPPEL retour de require_user -> lit header authorization: "bearer <jwt>" et renvoi le payload (jwt) decode
# user = {
#   "sub": "42",
#   "email": "a@b.com",
#   "exp": 1770000000
# } 
# path:path -> parametre de la fonction et type (permet la gestion des "/") 
# Fastapi fais la liaison auto entre le parametre de la route et la signature de la fonction 
# pas de dict depends car on doit rester public pour register/login

# gateway recupere et envoi a chaque micro service prive l'ID(x-user-id) du 
# user car ils ne verifient pas le jwt sauf a user-service qui est public (sauf /users/internal)
# FastAPI sait injecter automatiquement les parametre (request, authorization ...) -> require_user
@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_users(path: str, request: Request):
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return await _proxy(request, USER_SERVICE_URL, path)

@app.api_route("/game/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_game(path: str, request: Request, user: dict = Depends(require_user)):
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, GAME_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_chat(path: str, request: Request, user: dict = Depends(require_user)):
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, CHAT_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/friends/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_friends(path: str, request: Request, user: dict = Depends(require_user)):
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, FRIENDS_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/analytics/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_analytics(path: str, request: Request, user: dict = Depends(require_user)):
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, ANALYTICS_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/profile/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_profile(path: str, request: Request, user: dict = Depends(require_user)):
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, PROFILE_SERVICE_URL, path, extra_headers=extra)
