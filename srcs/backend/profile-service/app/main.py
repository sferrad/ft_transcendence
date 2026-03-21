from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models  # ensure SQLAlchemy models are imported before create_all()
from . import crud, schemas
from .database import get_db, init_db, init_engine

app = FastAPI(title="profile-service")


@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()
		init_db()
	except Exception as e:
		print(f"[startup] DB init failed: {e}")


@app.get("/health")
async def health():
	return {"status": "ok", "service": "profile-service"}


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

# consulte son profile
@app.get("/me", response_model=schemas.ProfileOut)
async def get_me(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
	return schemas.ProfileOut(
		id=profile.id,
		user_id=profile.user_id,
		display_name=profile.display_name,
		avatar_url=profile.avatar_url,
		bio=profile.bio,
		country=profile.country,
		language=profile.language,
		created_at=profile.created_at,
		updated_at=profile.updated_at,
	)

# cree ou met a jour son profil
@app.put("/me", response_model=schemas.ProfileOut)
async def put_me(payload: schemas.ProfileUpdate, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		if not payload.display_name:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name is required")
		try:
			profile = crud.create_profile(db, user_id, schemas.ProfileCreate(**payload.model_dump(exclude_unset=True)))
			# SQLAlchemyError: catch large pour rollback systematique
			# vs
			# IntegrityError: catch apeecifique (unique constraint...) 
		except IntegrityError:
			# Race condition:possible que 2 requetes se chevauchent et que entre
			# le SELECT(get_profile_by_user_id) et le INSERT(create_profile) un
			# user b ait cree egalement un user avec ce id unique avant user a
			profile = crud.get_profile_by_user_id(db, user_id)
			if not profile:
				# si profil n existe toujours pas ca veut dire transaction foireuse, rollback ailleurs, lecture pas possible, etc.
				raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile creation conflict, please retry")
			# si profile existe on ne le cree plus on l'update
			profile = crud.update_profile(db, profile, payload)
	else:
		data = payload.model_dump(exclude_unset=True)
		if "display_name" in data and data["display_name"] is None:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name cannot be null")
		profile = crud.update_profile(db, profile, payload)
	return schemas.ProfileOut(
		id=profile.id,
		user_id=profile.user_id,
		display_name=profile.display_name,
		avatar_url=profile.avatar_url,
		bio=profile.bio,
		country=profile.country,
		language=profile.language,
		created_at=profile.created_at,
		updated_at=profile.updated_at,
	)

# consulte le profile d un autre user
@app.get("/{user_id}", response_model=schemas.ProfileOut)
async def get_profile(user_id: int, db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
	return schemas.ProfileOut(
		id=profile.id,
		user_id=profile.user_id,
		display_name=profile.display_name,
		avatar_url=profile.avatar_url,
		bio=profile.bio,
		country=profile.country,
		language=profile.language,
		created_at=profile.created_at,
		updated_at=profile.updated_at,
	)