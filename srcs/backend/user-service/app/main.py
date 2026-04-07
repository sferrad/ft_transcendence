
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session
from . import models
from . import schemas, crud

from .password import hash_password, verify_password
from .database import get_db, init_db, init_engine
from .profile_service_client import create_profile


app = FastAPI(title="user-service")

# À l'import, Vault/DB peuvent ne pas être prêts -> crash.
# Au startup, Docker a plus de chances d'avoir tout up.
@app.on_event("startup")
def on_startup() -> None:
	try:
		init_engine()  # lit Vault -> crée engine + SessionLocal
		init_db() # a mettre on event("startup")???
	except Exception as e:
		print(f"[startup] DB init failed: {e}")


@app.get("/health")
async def health():
	return {"status": "ok", "service": "user-service"}


@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/by-username/{username}", response_model=schemas.UserLookupOut)
async def get_user_by_username(username: str, db: Session = Depends(get_db)):
	user = crud.get_user_by_username(db, username)
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return user


@app.post("/auth/register", response_model=schemas.OutputLogin, status_code=status.HTTP_201_CREATED)
async def auth_register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
	hashed = hash_password(payload.password)
	user = models.User(email=payload.email, hashed_password=hashed, username=payload.username)
	try:
		user = crud.add_user(db, user)
	except IntegrityError:
		if crud.existing_user(db, payload.email):
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
		if crud.existing_username(db, payload.username):
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

	# Crée un profil par défaut dès l'inscription.
	# - display_name = username (modifiable ensuite par l'utilisateur)
	# - si profile-service est KO, on échoue le register (et on tente de supprimer le user)
	try:
		await create_profile(user_id=user.id, display_name=user.username)
	except HTTPException:
		# Compensation best-effort: éviter un user "sans profil" si l'étape profil échoue.
		try:
			crud.delete_user(db, user)
		except Exception:
			pass
		raise
	return user

# Ajout
@app.post("/internal/auth/verify", response_model=dict)
async def internal_auth_verify(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
	user = crud.get_user_by_identifier(db, payload.identifier)
	if not user or not verify_password(payload.password, user.hashed_password):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
	return {"ok": True, "user": schemas.OutputLogin(id=user.id, email=user.email, username=user.username)}


@app.post("/internal/user/update", response_model=dict)
async def internal_update_user(user_update: schemas.InternalUserUpdate, db: Session = Depends(get_db)):
	user = db.query(models.User).filter(models.User.id == user_update.user_id).first()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	if user_update.email is not None:
		user.email = user_update.email
	if user_update.password is not None:
		user.hashed_password = hash_password(user_update.password)
	try:
		crud.update_user(db, user)
	except IntegrityError:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
	except SQLAlchemyError:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")	
	return {"ok": True, "user_id": user.id}

@app.post("/internal/user/delete", response_model=dict)
async def internal_delete_user(user_delete: schemas.InternalUserDelete, db: Session = Depends(get_db)):
	user = db.query(models.User).filter(models.User.id == user_delete.user_id).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	try:
		crud.delete_user(db, user)
	except SQLAlchemyError:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")	
	return {"ok": True, "deleted_user_id": user_delete.user_id}