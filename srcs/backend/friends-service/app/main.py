from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models
from . import crud, schemas
from .database import get_db, init_db, init_engine

app = FastAPI(title="friends-service")


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

# unbloxk user
@app.delete("/block/{blocked_user_id}", response_model=dict)
async def unblock(blocked_user_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		ok = crud.unblock_user(db, user_id, blocked_user_id)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unblock user conflict, please retry")
	if not ok:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
	return {"status": "ok"}