# Backend - FastAPI

## Commandes essentielles

### Construire l'image Docker
```bash
docker build -t fastapi-backend .
```

### Lancer en Docker
```bash
docker run -p 8000:80 fastapi-backend
```
Accès : http://localhost:8000

Documentation auto : http://localhost:8000/docs

---

## Stack utilisée
- **FastAPI** : Framework web Python moderne et rapide
- **Uvicorn** : Serveur ASGI haute performance
- **Python 3.11** : Version récente et rapide

---

## Structure
```
main.py          → Endpoints API
requirements.txt → Dépendances Python
Dockerfile       → Config Docker
```

## Endpoints disponibles
- `GET /` → Hello World
- `GET /items/{item_id}` → Exemple avec paramètres

## Ressources
- [FastAPI](https://fastapi.tiangolo.com)
- [Uvicorn](https://www.uvicorn.org)
