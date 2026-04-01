import os
import httpx
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi import Header

from .middleware.rate_limit import rate_limit_middleware
from .security import load_jwt_secret, create_access_token
from .auth import require_user, blacklist_jwt
from .schemas import LoginRequest
from .middleware.redis import redis_client
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

app.middleware("http")(rate_limit_middleware)

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


# Charge le secret + l'algorithme JWT depuis Vault dans `app.state`.
# La dependency d'auth (`require_user`) lit ces valeurs au moment des requêtes.
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

# Login: vérifie les identifiants et renvoie un JWT.

# Flux:
# - Le gateway envoie `identifier/password` au `user-service` (via `verify_credentials`).
# - Si OK, le gateway fabrique le JWT localement et le renvoie au client.

# Mapping des erreurs:
# - 401: identifiants invalides
# - 503: user-service indisponible (réseau / down)
@app.post("/auth/login")
async def auth_login(body: LoginRequest):
# - 502: user-service a renvoyé une erreur inattendue
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


# Logout: rend le token courant inutilisable (révocation).

# Détails d'implémentation:
# - On blacklist le token dans Redis via son `jti` (ou un hash du token en fallback).
# - L'entrée Redis a un TTL égal au temps restant avant l'expiration (`exp`).

# Comportement important:
# - Contrairement à `require_user` (fail-open si Redis est down), le logout est
# fail-closed: si Redis est indisponible, on renvoie 503 car on ne peut pas
# garantir que la révocation a bien été appliquée.
@app.post("/auth/logout")
async def auth_logout(request: Request, payload: dict = Depends(require_user), authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header must be: Bearer <token>")
    token = parts[1]
    try:
        await blacklist_jwt(token, payload)
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Redis unavailable")
    return {"ok": True}


# Reverse-proxy générique vers les microservices.

# Le gateway est le point d'entrée public (derrière le WAF). Cette fonction:
# - forward la méthode, les query params, le body
# - forward les headers, en filtrant ceux qui ne doivent pas traverser un proxy

# On supprime les headers "hop-by-hop" (RFC 7230) car ils ne sont valables que
# pour *une* connexion réseau et peuvent casser le proxy si on les relaie.
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
    try:
        async with httpx.AsyncClient() as client: # envoi de la requete client -> gateway -> service (avec header filtre)
            response = await client.request(
                method=request.method,
                url=target_url,
                params=dict(request.query_params),
                content=body,
                headers=client_headers,
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable"
        )

    # "response" revient avec de nouveaux headers côté microservice: on refiltre.
    service_header = {
        k: v for k, v in response.headers.items()
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
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, GAME_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_chat(path: str, request: Request, user: dict = Depends(require_user)):
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, CHAT_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/friends/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_friends(path: str, request: Request, user: dict = Depends(require_user)):
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, FRIENDS_SERVICE_URL, path, extra_headers=extra)

@app.api_route("/analytics/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_analytics(path: str, request: Request, user: dict = Depends(require_user)):
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    extra = {"X-User-Id": str(user.get("sub", ""))}
    return await _proxy(request, ANALYTICS_SERVICE_URL, path, extra_headers=extra)

# Proxy vers profile-service avec un cache Redis léger sur les GET.

# Design du cache:
# - Clé = user_id + path + query string
#   (car la réponse dépend de `X-User-Id` et peut dépendre des paramètres).
# - On met en cache uniquement les réponses OK (HTTP 200).
# - TTL court (30s par défaut) pour limiter l'incohérence.

# Invalidation:
# - Toute écriture sur `/me*` (PUT/PATCH/POST/DELETE) invalide les clés de cache du user.

# Mode dégradé:
# - Si Redis est down, on ignore le cache (fail-open) et on proxy normalement.
@app.api_route("/profile/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_profile(path: str, request: Request, user: dict = Depends(require_user)):
    if path.startswith("internal/") or path.startswith("/internal/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    extra = {"X-User-Id": str(user.get("sub", ""))}
    user_id = str(user.get("sub", ""))
    method = request.method.upper()
    query = str(request.url.query)
    cache_key = f"cache:profile:{user_id}:{path}:{query}"

    if method == "GET" and user_id:
        try:
            cached = await redis_client.get(cache_key)
            if cached is not None:
                # Cached value is stored as JSON string.
                return Response(content=cached, status_code=200, media_type="application/json")
        except Exception:
            pass

    response = await _proxy(request, PROFILE_SERVICE_URL, path, extra_headers=extra)

    # Invalidation minimale: toute modif de /me* invalide les caches du user.
    if method in {"PUT", "PATCH", "DELETE", "POST"} and path.startswith("me") and user_id:
        try:
            keys_to_delete: list[str] = []
            async for key in redis_client.scan_iter(match=f"cache:profile:{user_id}:*"):
                keys_to_delete.append(key)
            if keys_to_delete:
                await redis_client.delete(*keys_to_delete)
        except Exception:
            pass

    if method == "GET" and response.status_code == 200 and user_id:
        # TTL court pour éviter les incohérences, à ajuster si besoin.
        ttl = int(os.getenv("PROFILE_CACHE_TTL_SECONDS", "30"))
        try:
            body = response.body
            if body is not None:
                # Stocke le JSON en UTF-8 (pratique à lire/debugger avec `redis-cli`).
                await redis_client.setex(cache_key, ttl, body.decode("utf-8"))
        except Exception:
            pass

    return response


# 🧠 règle simple à retenir

# 👉 dans ton projet :

# 🔥 erreurs réseau (microservices)

# → httpx.HTTPStatusError

# 🔥 erreurs métier

# → tes exceptions custom (InvalidCredentialsError)

# 🔥 erreurs infra/config

# → HTTPException (comme ton JWT)