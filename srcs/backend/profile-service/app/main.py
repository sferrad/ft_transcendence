from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import text
from fastapi.responses import Response
import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from . import user_service_client
from . import friends_service_client
from . import crud, schemas
from . import schemas
from .database import get_db, init_db, init_engine

app = FastAPI(title="profile-service")

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
	return profile

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
	return profile

# consulte le profile d un autre user
@app.get("/profiles/{user_id}", response_model=schemas.ProfileOut)
async def get_profile(user_id: int, db: Session = Depends(get_db)):
	profile = crud.get_profile_by_user_id(db, user_id)
	if not profile:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
	return profile

@app.get("/me/settings", response_model = schemas.UserSettingOut)
async def get_settings(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)) -> schemas.UserSettingOut:
	settings = crud.get_user_settings(db, user_id)
	if not settings:
		settings = crud.create_user_settings(db, user_id)
	return settings

@app.put("/me/settings", response_model=schemas.UserSettingOut)
async def create_or_update_settings(new_settings: schemas.UserSettingIn, user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)) -> schemas.UserSettingOut:
	return crud.update_user_settings(user_id, db, new_settings)

@app.put("/me/settings/user")
async def update_user_infos(payload: schemas.UserUpdateRequest, user_id: int = Depends(_current_user_id)):
	try:
		res = await user_service_client.update_user_in_user_service(user_id, payload)
		return res
	except httpx.RequestError:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="user-service unavailable")
	except httpx.HTTPStatusError as e:
		return Response(
            content=e.response.content,
            status_code=e.response.status_code,
            media_type="application/json"
        )
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	
@app.delete("/me/settings/user")
async def delete_user(user_id: int = Depends(_current_user_id), db: Session = Depends(get_db)):
	try:
		res = await user_service_client.delete_user_in_user_service(user_id)
	except httpx.RequestError:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="user-service unavailable")
	except httpx.HTTPStatusError as e:
		return Response(
            content=e.response.content,
            status_code=e.response.status_code,
            media_type="application/json"
        )
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
	try:
		crud.delete_user_settings_by_user_id(db, user_id)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Failed to delete user settings: {e}")
	try:
		crud.delete_profile_by_user_id(db, user_id)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Failed to delete user profile: {e}")
	friends_cleanup = None
	try:
		friends_cleanup = await friends_service_client.delete_friends_in_friends_service(user_id)
	except httpx.RequestError:
		friends_cleanup = {"ok": False, "error": "friends-service unavailable"}
	except httpx.HTTPStatusError as e:
		friends_cleanup = {"ok": False, "status": e.response.status_code}
	return {"ok": True, "user_service": res, "friends_cleanup": friends_cleanup}	

# Crée un profil par défaut pour un user.

# Cas d'usage:
# - juste après un register dans user-service, on veut un profil minimal.

# Comportement:
# - idempotent: si le profil existe déjà pour ce user_id, on le renvoie.
@app.post("/internal/profile/create", response_model=schemas.ProfileOut, status_code=status.HTTP_201_CREATED)
async def internal_create_profile(payload: schemas.InternalProfileCreate, db: Session = Depends(get_db)):
	if payload.user_id <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user_id")
	if not payload.display_name:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="display_name is required")

	existing = crud.get_profile_by_user_id(db, payload.user_id)
	if existing:
		return existing
	try:
		profile = crud.create_profile(db, payload.user_id, schemas.ProfileCreate(display_name=payload.display_name))
		crud.create_user_settings(db, payload.user_id)
	except IntegrityError:
		# Si une course crée le profil juste avant nous, on relit.
		profile = crud.get_profile_by_user_id(db, payload.user_id)
		if not profile:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile creation conflict")

	return profile