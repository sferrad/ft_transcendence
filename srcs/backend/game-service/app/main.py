# """main.py

# Point d'entrée FastAPI du game-service.

# Rôle de ce fichier :
# - créer l'application FastAPI (`app = FastAPI(...)`),
# - initialiser la DB au démarrage (startup),
# - exposer les routes HTTP (REST) pour :
# 	- health check,
# 	- ping DB,
# 	- CRUD Match,
# 	- CRUD MatchEvent (timeline).

# Petit lexique :
# - FastAPI : framework web asynchrone qui route les requêtes HTTP vers des fonctions Python.
# - Endpoint/Route : une fonction décorée par `@app.get/post/...`.
# - Depends(...) : injection de dépendance (FastAPI appelle une fonction pour fournir un objet).
# - Session (SQLAlchemy) : objet qui représente une connexion/transaction logique vers la DB.
# - Schémas (Pydantic) : validation/serialization des payloads et des réponses.
# - Modèles (SQLAlchemy ORM) : mapping Python <-> tables SQL.
# """

# Imports FastAPI :
# - FastAPI : l'objet application.
# - Depends : injection de dépendances (ex: fournir un `db: Session`).
# - HTTPException : renvoyer une erreur HTTP propre (status + message).
# - status : constantes de codes HTTP (200, 404, 500...).
from fastapi import Depends, FastAPI, Header, HTTPException, status

# `text()` : permet d'exécuter une requête SQL brute (ici SELECT 1 pour ping).
from sqlalchemy import text

# Session SQLAlchemy : type utilisé pour annoter `db: Session`.
from sqlalchemy.orm import Session

# Imports locaux :
# - schemas : contrats API Pydantic
# - crud : fonctions d'accès DB (create/get/update/delete)
from . import schemas, crud

# DB helpers :
# - get_db : dépendance FastAPI qui fournit une Session à chaque requête
# - init_engine/init_db : initialisation moteur + création tables (en dev)
from .database import get_db, init_db, init_engine

app = FastAPI(title="game-service")


def _current_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> int:
	if not x_user_id:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
	try:
		user_id = int(x_user_id)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id header")
	if user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id header")
	return user_id


	# """Vérifie que `user_id` participe au match `match_id`.

	# On centralise la logique ici pour éviter de la répéter partout.

	# Choix de statut :
	# - On renvoie 404 si le match n'existe pas OU si l'user n'y a pas accès.
	#   Ça évite de "révéler" l'existence d'un match à quelqu'un qui n'y participe pas.
	# """
def _require_match_participant(*, db: Session, match_id: int, user_id: int):
	match = crud.get_match_for_user(db, match_id=match_id, user_id=user_id)
	if not match:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
	return match

	# """Hook de démarrage du service.

	# FastAPI appelle cette fonction UNE fois au lancement du process.

	# But : préparer l'accès DB.
	# - `init_engine()` : configure le moteur SQLAlchemy (connexion Postgres).
	# - `init_db()` : crée les tables si elles n'existent pas.

	# Important :
	# - Ce pattern est ok en dev.
	# - En prod, on préfère souvent des migrations (Alembic) + `init_db` désactivé.
	# """
@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()
		init_db()
	except Exception as e:
		# Ici on log en stdout pour rester simple.
		# Si tu as un logger structuré, remplace `print`.
		print(f"[startup] DB init failed: {e}")

	# """Healthcheck simple.

	# - Pas de DB.
	# - Permet au docker compose / orchestrateur / WAF de vérifier que le service répond.
	# """
@app.get("/health")
async def health():
	return {"status": "ok", "service": "game-service"}

	# """Vérifie que la DB répond.

	# Explication `db: Session = Depends(get_db)` :
	# - FastAPI appelle `get_db()` (dans database.py) pour récupérer une Session.
	# - La Session est ensuite injectée dans cet endpoint.
	# - `get_db()` gère généralement l'ouverture/fermeture (yield) proprement.

	# Pourquoi `SELECT 1` :
	# - requête minimale, standard, qui valide la connexion.
	# """
@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		# On renvoie 500 si la DB ne répond pas.
		# Note sécurité : `detail=str(e)` peut exposer des infos internes.
		# En prod, préfère un message générique + logs serveur.
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# CRUD endpoints for Match
	# """Crée un match "pour moi".

	# Ici, `player1_id` est FORCÉ à `user_id` (provenant du header X-User-Id).
	# Le client ne peut pas usurper l'identité d'un autre user.

	# Le client fournit uniquement `player2_id`.
	# """
@app.post("/me/matches/", response_model=schemas.MatchInDB, status_code=201)
def create_my_match(payload: schemas.MatchCreateMe, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	if payload.player2_id == user_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="player2_id must be different from current user")
	return crud.create_match_for_players(db, player1_id=user_id, player2_id=payload.player2_id)

	# """Récupère un match + tous ses events.

	# Pourquoi deux appels DB :
	# - `crud.get_match` : récupère l'état global du match.
	# - `crud.get_match_events` : récupère la timeline triée par `sequence`.

	# Note :
	# - Ici, on construit explicitement `MatchWithEvents`.
	# - `match.__dict__` contient les colonnes ORM.
	#   Attention : SQLAlchemy ajoute aussi `_sa_instance_state` (champ interne).
	#   Pydantic ignore en général les champs inconnus, donc ça passe.
	#   Sinon, alternative plus propre : `schemas.MatchInDB.from_orm(match)`.
	# """
@app.get("/matches/{match_id}", response_model=schemas.MatchWithEvents)
def get_match(match_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	match = _require_match_participant(db=db, match_id=match_id, user_id=user_id)
	events = crud.get_match_events(db, match_id)
	return schemas.MatchWithEvents(**match.__dict__, events=events)

	# """Liste paginée de matchs.
	# """Liste uniquement les matchs où *je* suis player1 ou player2.

	# - `skip` : offset
	# - `limit` : nombre max d'items
	# Le type `list[schemas.MatchInDB]` est du Python 3.9+.
	# Sécurité : on ne liste pas "tous les matchs". On retourne uniquement ceux du user courant.
	# (Le endpoint canonique est /me/matches/, mais on garde /matches/ compatible.)

	# C'est la réponse directe à : "comment un user récupère uniquement ses matchs ?"
	# - On ne prend PAS un `user_id` en query param.
	# - On utilise l'identité injectée par le gateway (X-User-Id).
@app.get("/me/matches/", response_model=list[schemas.MatchInDB])
def get_my_matches(skip: int = 0, limit: int = 100, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.get_matches_for_user(db, user_id=user_id, skip=skip, limit=limit)

	# """Met à jour un match.

	# - `MatchUpdate` : payload partiel.
	# - Si l'id n'existe pas : 404.
	# """
@app.put("/matches/{match_id}", response_model=schemas.MatchInDB)
def update_match(match_id: int, match_update: schemas.MatchUpdate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	_require_match_participant(db=db, match_id=match_id, user_id=user_id)
	match = crud.update_match(db, match_id, match_update)
	if not match:
		raise HTTPException(status_code=404, detail="Match not found")
	return match

	# """Supprime un match.

	# - 204 : "No Content" => réponse vide, suppression ok.
	# - Si le match n'existe pas : 404.

	# La DB supprime aussi les events via ON DELETE CASCADE.
	# """
@app.delete("/matches/{match_id}", status_code=204)
def delete_match(match_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	_require_match_participant(db=db, match_id=match_id, user_id=user_id)
	ok = crud.delete_match(db, match_id)
	if not ok:
		raise HTTPException(status_code=404, detail="Match not found")

# CRUD endpoints for MatchEvent
	# """Ajoute un event à la timeline d'un match.

	# Flow :
	# 1) Vérifie que le match existe (sinon 404).
	# 2) Crée l'event avec allocation automatique de `sequence` (voir crud.py).

	# `event_type` est validé via l'Enum `MatchEventType`.
	# """
@app.post("/matches/{match_id}/events/", response_model=schemas.MatchEventInDB, status_code=201)
def create_match_event(match_id: int, event: schemas.MatchEventCreate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	_require_match_participant(db=db, match_id=match_id, user_id=user_id)
	return crud.create_match_event(db, match_id, event)

	# """Retourne tous les events d'un match.

	# - Vérifie que le match existe.
	# - Retourne la liste triée : stable pour replay/clients.
	# """
@app.get("/matches/{match_id}/events/", response_model=list[schemas.MatchEventInDB])
def get_match_events(match_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	_require_match_participant(db=db, match_id=match_id, user_id=user_id)
	return crud.get_match_events(db, match_id)