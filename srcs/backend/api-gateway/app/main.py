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

async def _proxy(request: Request, target_base: str, path: str) -> Response:
    target_url = f"{target_base}/{path}"
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=request.method,
            url=target_url,
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )
        return Response(content=response.content, status_code=response.status_code, headers=dict(response.headers))



# path:path -> parametre de la fonction et type (permet la gestion des "/") 
# Fastapi fais la liaison auto entre le parametre de la route et la signature de la fonction 

# pas de dict depends car on doit povoir y acceder sans etre log
@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_users(path: str, request: Request):
    return await _proxy(request, USER_SERVICE_URL, path)

@app.api_route("/game/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_game(path: str, request: Request, user: dict = Depends(require_user)):
    return await _proxy(request, GAME_SERVICE_URL, path)

@app.api_route("/chat/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_chat(path: str, request: Request, user: dict = Depends(require_user)):
    return await _proxy(request, CHAT_SERVICE_URL, path)

@app.api_route("/friends/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_friends(path: str, request: Request, user: dict = Depends(require_user)):
    return await _proxy(request, FRIENDS_SERVICE_URL, path)

@app.api_route("/analytics/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_analytics(path: str, request: Request, user: dict = Depends(require_user)):
    return await _proxy(request, ANALYTICS_SERVICE_URL, path)

@app.api_route("/profile/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_profile(path: str, request: Request, user: dict = Depends(require_user)):
    return await _proxy(request, PROFILE_SERVICE_URL, path)