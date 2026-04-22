from fastapi import Depends, FastAPI, HTTPException, status, Header
from sqlalchemy import text
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from . import models, schemas, crud
from .database import get_db, init_db, init_engine

app = FastAPI(title="chat-service")

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()
		init_db()
	except Exception as e:
		print(f"[startup] DB init failed: {e}")


@app.get("/health")
async def health():
	return {"status": "ok", "service": "chat-service"}


@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	
def _current_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> int:
	if not x_user_id:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing x-User-Id header")
	try:
		user_id = int(x_user_id)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid X-User-Id")
	if user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid X-User-Id")
	return user_id

@app.post("/rooms", response_model=schemas.RoomOut, status_code=201)
def create_room(payload: schemas.RoomCreate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		return crud.create_room(db, name=payload.name, is_private=payload.is_private, owner_user_id=user_id)
	except Exception:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room already exist")
	
@app.get("/rooms", response_model=list[schemas.RoomOut])
def get_rooms(skip: int = 0, limit: int = 100, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	return crud.list_rooms(db, skip=skip, limit=limit)

@app.post("/rooms/{room_id}/join", response_model=schemas.JoinRoomOut)
def join_room(room_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	room = crud.get_room(db, room_id=room_id)
	if not room:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
	crud.join_room(db, room_id=room_id, user_id=user_id)
	return schemas.JoinRoomOut(ok=True, room_id=room_id)


@app.post("/rooms/{room_id}/leave", response_model=schemas.LeaveRoomOut)
def leave_room(room_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	room = crud.get_room(db, room_id=room_id)
	if not room:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
	try:
		crud.leave_room(db, room_id=room_id, user_id=user_id)
	except ValueError as e:
		if str(e) == "owner_cannot_leave":
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner cannot leave room")
		raise
	return schemas.LeaveRoomOut(ok=True, room_id=room_id)


@app.delete("/rooms/{room_id}", response_model=schemas.DeleteRoomOut)
def delete_room(room_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		crud.delete_room(db, room_id=room_id, owner_user_id=user_id)
	except ValueError as e:
		if str(e) == "room_not_found":
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
		if str(e) == "not_owner":
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete room")
		raise
	return schemas.DeleteRoomOut(ok=True, room_id=room_id)

@app.get("/rooms/{room_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(room_id: int, limit: int = 50, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	room = crud.get_room(db, room_id=room_id)
	if not room:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
	if not crud.is_member(db, room_id=room_id, user_id=user_id):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
	return crud.list_messages(db, room_id=room_id, limit=min(max(limit, 1), 200))

@app.post("/rooms/{room_id}/messages", response_model=schemas.MessageOut, status_code=201)
def send_message(room_id: int, payload: schemas.MessageCreate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	room = crud.get_room(db, room_id=room_id)
	if not room:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
	if not crud.is_member(db, room_id=room_id, user_id=user_id):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
	return crud.create_message(db, room_id=room_id, sender_user_id=user_id, content=payload.content)

@app.get("/rooms/{room_id}/members", response_model=list[int])
def get_room_members(room_id: int, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	room = crud.get_room(db, room_id=room_id)
	if not room:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room does not exist")
	if not crud.is_member(db, room_id=room_id, user_id=user_id):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
	return crud.list_room_member_ids(db, room_id=room_id)