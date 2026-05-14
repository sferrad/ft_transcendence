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
import threading
import time
import random as _random

from fastapi import Depends, FastAPI, Header, HTTPException, status

# `text()` : permet d'exécuter une requête SQL brute (ici SELECT 1 pour ping).
from sqlalchemy import text
from prometheus_fastapi_instrumentator import Instrumentator

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

# ─── Matchmaking in-memory state ───────────────────────────────────────────────
_mq_lock = threading.Lock()
_mq_queue: list[dict] = []        # players waiting for an opponent
_mq_results: dict[int, dict] = {} # user_id → match result waiting to be fetched

# ─── DM invites in-memory state ────────────────────────────────────────────────
# match_id → invite payload waiting for the recipient to accept.
_invites_lock = threading.Lock()
_invites: dict[int, dict] = {}
INVITE_TTL_SECONDS = 300  # invites expire after 5 minutes

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

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
	return crud.create_match_for_players(db, player1_id=user_id, player2_id=payload.player2_id, game_mode=payload.game_mode)

	# """Récupère un match + tous ses events.

	# Pourquoi deux appels DB :
	# - `crud.get_match` : récupère l'état global du match.
	# - `crud.get_match_events` : récupère la timeline triée par `sequence`.

	# Note :
	# - Ici, on construit explicitement `MatchWithEvents`.
	# - `match.__dict__` contient les colonnes ORM.
	#   Attention : SQLAlchemy ajoute aussi `_sa_instance_state` (champ interne).
	#   Pydantic ignore en général les champs inconnus, donc ça passe.
	#   Sinon, alternative plus propre (Pydantic v2) : `schemas.MatchInDB.model_validate(match)`.
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
def get_my_matches(skip: int = 0, limit: int = 100, game_mode: str | None = None, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.get_matches_for_user(db, user_id=user_id, skip=skip, limit=limit, game_mode=game_mode)

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
	try:
		return crud.create_match_event(db, match_id, event)
	except crud.MatchEventSequenceAllocationError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not allocate event sequence, please retry")

	# """Retourne tous les events d'un match.

	# - Vérifie que le match existe.
	# - Retourne la liste triée : stable pour replay/clients.
	# """
@app.get("/matches/{match_id}/events/", response_model=list[schemas.MatchEventInDB])
def get_match_events(match_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	_require_match_participant(db=db, match_id=match_id, user_id=user_id)
	return crud.get_match_events(db, match_id)

@app.get("/me/stats/", response_model=schemas.UserStats)
def get_my_stats(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.compute_user_stats(db, user_id)

@app.get("/users/{target_user_id}/stats/", response_model=schemas.UserStats)
def get_user_stats(target_user_id: int, _user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	if target_user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")
	return crud.compute_user_stats(db, target_user_id)

@app.get("/users/{target_user_id}/matches/", response_model=list[schemas.MatchInDB])
def get_user_matches(
	target_user_id: int,
	skip: int = 0,
	limit: int = 50,
	game_mode: str | None = None,
	_user_id: int = Depends(_current_user_id),
	db: Session = Depends(get_db),
):
	if target_user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")
	return crud.get_matches_for_user(db, user_id=target_user_id, skip=skip, limit=limit, game_mode=game_mode)

@app.get("/leaderboard/", response_model=list[schemas.LeaderboardEntry])
def get_leaderboard(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.get_leaderboard(db)

@app.post("/me/matchmaking/join", response_model=schemas.MatchmakingResult)
def matchmaking_join(
	payload: schemas.MatchmakingJoin,
	user_id: int = Depends(_current_user_id),
	db: Session = Depends(get_db),
):
	with _mq_lock:
		# Already has a result waiting to be consumed?
		if user_id in _mq_results:
			return _mq_results.pop(user_id)
		# Already in the queue?
		for entry in _mq_queue:
			if entry["user_id"] == user_id:
				return {"status": "waiting"}
		# Try to match with the first person in queue (must be a different user).
		for i, other in enumerate(_mq_queue):
			if other["user_id"] != user_id:
				_mq_queue.pop(i)
				seed = _random.randint(1, 2**31 - 1)
				# other is player1, current user is player2
				match = crud.create_match_for_players(
					db,
					player1_id=other["user_id"],
					player2_id=user_id,
					game_mode="online",
				)
				winning_score = other.get("winning_score", 3)
				duration = other.get("duration", None)
				p1_result = {
					"status": "matched",
					"match_id": match.id,
					"game_room_id": str(match.id),
					"role": "player1",
					"seed": seed,
					"opponent_name": payload.player_name,
					"opponent_nation": payload.player_nation,
					"winning_score": winning_score,
					"duration": duration,
				}
				p2_result = {
					"status": "matched",
					"match_id": match.id,
					"game_room_id": str(match.id),
					"role": "player2",
					"seed": seed,
					"opponent_name": other["player_name"],
					"opponent_nation": other["player_nation"],
					"winning_score": winning_score,
					"duration": duration,
				}
				_mq_results[other["user_id"]] = p1_result
				return p2_result
		# No match found: add to queue.
		_mq_queue.append({
			"user_id": user_id,
			"player_name": payload.player_name,
			"player_nation": payload.player_nation,
			"winning_score": payload.winning_score,
			"duration": payload.duration,
			"joined_at": time.time(),
		})
		return {"status": "waiting"}


@app.get("/me/matchmaking/status", response_model=schemas.MatchmakingResult)
def matchmaking_status(user_id: int = Depends(_current_user_id)):
	with _mq_lock:
		if user_id in _mq_results:
			return _mq_results.pop(user_id)
		for entry in _mq_queue:
			if entry["user_id"] == user_id:
				return {"status": "waiting"}
		return {"status": "idle"}


@app.delete("/me/matchmaking/leave", status_code=204)
def matchmaking_leave(user_id: int = Depends(_current_user_id)):
	global _mq_queue
	with _mq_lock:
		_mq_queue = [e for e in _mq_queue if e["user_id"] != user_id]
		_mq_results.pop(user_id, None)


@app.post("/me/invites/dm/{target_user_id}", response_model=schemas.MatchmakingResult)
def create_dm_invite(
	target_user_id: int,
	payload: schemas.MatchmakingJoin,
	user_id: int = Depends(_current_user_id),
	db: Session = Depends(get_db),
):
	"""User A invites user B to an online match via DM. Returns A's match details immediately."""
	if target_user_id <= 0 or target_user_id == user_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target_user_id")

	match = crud.create_match_for_players(
		db,
		player1_id=user_id,
		player2_id=target_user_id,
		game_mode="online",
	)
	seed = _random.randint(1, 2**31 - 1)
	winning_score = payload.winning_score if payload.winning_score is not None else 3
	duration = payload.duration

	with _invites_lock:
		# Purge expired invites.
		now = time.time()
		expired = [mid for mid, inv in _invites.items() if now - inv["created_at"] > INVITE_TTL_SECONDS]
		for mid in expired:
			_invites.pop(mid, None)

		_invites[match.id] = {
			"from_user_id": user_id,
			"from_name": payload.player_name,
			"from_nation": payload.player_nation,
			"to_user_id": target_user_id,
			"seed": seed,
			"winning_score": winning_score,
			"duration": duration,
			"created_at": now,
		}

	return {
		"status": "matched",
		"match_id": match.id,
		"game_room_id": str(match.id),
		"role": "player1",
		"seed": seed,
		"opponent_name": "Opponent",
		"opponent_nation": "Algeria",
		"winning_score": winning_score,
		"duration": duration,
	}


@app.post("/me/invites/{match_id}/accept", response_model=schemas.MatchmakingResult)
def accept_invite(
	match_id: int,
	payload: schemas.MatchmakingJoin,
	user_id: int = Depends(_current_user_id),
	db: Session = Depends(get_db),
):
	"""User B accepts an invite. Returns B's match details with the inviter's seed."""
	with _invites_lock:
		invite = _invites.get(match_id)
		if invite is None:
			raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired or not found")
		if invite["to_user_id"] != user_id:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This invite is not for you")
		if time.time() - invite["created_at"] > INVITE_TTL_SECONDS:
			_invites.pop(match_id, None)
			raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired")
		_invites.pop(match_id, None)

	# Verify match still exists and the user is player2.
	match = crud.get_match(db, match_id)
	if not match or match.player2_id != user_id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

	# Mark match as started so the inviter can detect acceptance by polling.
	crud.update_match(db, match_id, schemas.MatchUpdate(status="started"))

	# Store the result so the inviter can fetch it.
	with _mq_lock:
		_mq_results[invite["from_user_id"]] = {
			"status": "matched",
			"match_id": match_id,
			"game_room_id": str(match_id),
			"role": "player1",
			"seed": invite["seed"],
			"opponent_name": payload.player_name,
			"opponent_nation": payload.player_nation,
			"winning_score": invite["winning_score"],
			"duration": invite["duration"],
		}

	return {
		"status": "matched",
		"match_id": match_id,
		"game_room_id": str(match_id),
		"role": "player2",
		"seed": invite["seed"],
		"opponent_name": invite["from_name"],
		"opponent_nation": invite["from_nation"],
		"winning_score": invite["winning_score"],
		"duration": invite["duration"],
	}


@app.get("/me/invites/pending", response_model=schemas.MatchmakingResult)
def get_pending_invite_result(user_id: int = Depends(_current_user_id)):
	"""Inviter polls this to learn when their invite was accepted."""
	with _mq_lock:
		result = _mq_results.pop(user_id, None)
	if result:
		return result
	return {"status": "waiting"}


@app.delete("/me/invites/{match_id}", status_code=204)
def cancel_invite(match_id: int, user_id: int = Depends(_current_user_id)):
	"""Inviter or invitee can cancel a pending invite."""
	with _invites_lock:
		invite = _invites.get(match_id)
		if not invite or (invite["from_user_id"] != user_id and invite["to_user_id"] != user_id):
			return
		inviter_id = invite["from_user_id"]
		is_invitee_declining = user_id == invite["to_user_id"]
		_invites.pop(match_id, None)
	if is_invitee_declining:
		with _mq_lock:
			_mq_results[inviter_id] = {"status": "declined", "match_id": None}


@app.post("/internal/user/cleanup")
def internal_user_cleanup(payload: dict, db: Session = Depends(get_db)) -> dict:
	user_id = int(payload.get("user_id") or 0)
	if user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid user id")
	try:
		return crud.cleanup_user_data(db, user_id=user_id)
	except ValueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))