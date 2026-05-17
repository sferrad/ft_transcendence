import os
from .redis import client_redis
from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from . import crud, schemas
from .database import get_db, init_db, init_engine

PRESENCE_TTL_SECONDS = int(os.getenv("PRESENCE_TTL_SECONDS", "45"))
PRESENCE_KEY_PREFIX = "presence:user:"

app = FastAPI(title="friends-service")
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



def _presence_key(user_id: int) -> str:
	return f"{PRESENCE_KEY_PREFIX}{user_id}"


async def _set_online(user_id: int) -> None:
	await client_redis.setex(_presence_key(user_id), PRESENCE_TTL_SECONDS, "1")


async def _get_online_list(user_ids: list[int]) -> dict[int, bool]:
	if not user_ids:
		return {}
	keys = [_presence_key(uid) for uid in user_ids]
	values = await client_redis.mget(keys)
	return {user_id : (values[i] is not None) for i, user_id in enumerate(user_ids)}
	# result = {}
	# for user_id, value in zip(user_ids, values)
	# is_online = value is not None (bool true ou false si online ou non)
	# result[user_id] = is_online

@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()
		init_db()
	except Exception as e:
		print(f"[startup] DB init failed: {e}")


@app.get("/health")
async def health():
	return {"status": "ok", "service": "friends-service"}


@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	

@app.post("/presence/ping", response_model=schemas.PresencePingOut)
async def presence_ping(user_id: int = Depends(_current_user_id)):
	await _set_online(user_id)
	return schemas.PresencePingOut(ok=True, ttl_seconds=PRESENCE_TTL_SECONDS)

@app.get("/friends/with-status", response_model=list[schemas.FriendsWithStatusOut])
async def list_my_friends_with_their_status(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	friend_list = crud.list_friends(db, user_id)
	friend_ids = [f.friend_id for f in friend_list]
	online_list = await _get_online_list(friend_ids)
	out: list[dict] = []
	for f in friend_list:
		out.append({"friend_id": f.friend_id, "created_at": f.created_at, "online": bool(online_list.get(f.friend_id, False))})
	return out

# envoi une requete
@app.post("/requests", response_model=schemas.FriendRequestOut)
async def send_request(payload: schemas.FriendRequestCreate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	if payload.to_user_id == user_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot friend yourself")
	if crud.is_blocked(db, user_id, payload.to_user_id):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")
	if crud.are_friends(db, user_id, payload.to_user_id):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already friends")
	if crud.get_pending_request_between(db, user_id, payload.to_user_id):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already pending")
	try:
		request = crud.create_friend_request(db, user_id, payload.to_user_id)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request conflict, please retry")
	return request

# Affiche les requetes en attente
@app.get("/requests/incoming", response_model=list[schemas.FriendRequestOut])
async def incoming_requests(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	# Grâce à `schemas.FriendRequestOut.model_config = ConfigDict(from_attributes=True)`
	# (Pydantic v2), on peut retourner directement les objets ORM SQLAlchemy.
	return crud.list_incoming_requests(db, user_id)

# accepte une requete
@app.post("/requests/{request_id}/accept", response_model=dict)
async def accept_request(request_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	request = crud.get_friend_request(db, request_id)
	if not request or request.to_user_id != user_id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
	if request.status != "pending":
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request not pending")
	if crud.is_blocked(db, request.from_user_id, request.to_user_id):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")
	try:
		crud.accept_request(db, request)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request accept conflict, please retry")
	return {"status": "ok"}

# Refus de requete
@app.post("/requests/{request_id}/reject", response_model=dict)
async def reject_request(request_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	request = crud.get_friend_request(db, request_id)
	if not request or request.to_user_id != user_id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
	if request.status != "pending":
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request not pending")
	try:
		crud.reject_request(db, request)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request reject conflict, please retry")
	return {"status": "ok"}

# Lister liste amis
@app.get("/friends", response_model=list[schemas.FriendOut])
async def list_my_friends(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	friends = crud.list_friends(db, user_id)
	return friends

# Bloquer un user
@app.get("/block", response_model=list[int])
async def list_blocked(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.list_blocked_ids(db, user_id)


@app.post("/block", response_model=schemas.BlockOut)
async def block(payload: schemas.BlockCreate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	if payload.blocked_user_id == user_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")
	if crud.is_blocked(db, user_id, payload.blocked_user_id):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already blocked")
	try:
		block_row = crud.block_user(db, user_id, payload.blocked_user_id)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Block user conflict, please retry")
	return block_row

# unblock user
@app.delete("/block/{blocked_user_id}", response_model=bool)
async def unblock(blocked_user_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		ok = crud.unblock_user(db, user_id, blocked_user_id)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unblock user conflict, please retry")
	if not ok:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
	return ok

@app.get("/internal/block/check")
async def internal_block_check(user_a: int, user_b: int, db: Session = Depends(get_db)):
	return {"blocked": crud.is_blocked(db, user_a, user_b)}


@app.post("/internal/user/cleanup")
async def internal_cleanup_friends(user_to_clean: schemas.InternalUserCleanup, db: Session = Depends(get_db)):
	if user_to_clean.user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid user id")
	try: 
		return crud.cleanup_user_data(db, user_to_clean.user_id)
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	
@app.delete("/unfriend/{friend_user_id}", response_model=bool)
async def unfriend(friend_user_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		ok = crud.unfriend_user(db, user_id, friend_user_id)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unfriend user conflict, please retry")
	if not ok:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
	return ok

@app.get("/friends/{sender_user_id}/blocked/{receiver_user_id}", response_model=bool)
async def is_blocked(sender_user_id: int, receiver_user_id: int, db: Session = Depends(get_db)):
	return crud.is_blocked(db, sender_user_id, receiver_user_id)