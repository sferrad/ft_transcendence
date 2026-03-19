from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session
from . import models
from . import schemas, crud

from .password import _hash_password, _verify_password
from .database import get_db, init_db, init_engine


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


@app.post("/auth/register", response_model=schemas.OutputLogin)
async def auth_register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
	hashed = _hash_password(payload.password)
	user = models.User(email=payload.email, hashed_password=hashed, username=payload.username)
	try:
		user = crud.add_user(db, user)
	except IntegrityError:
		if crud.existing_user(db, payload.email):
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
		if crud.existing_username(db, payload.username):
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
	return schemas.OutputLogin(id=user.id, email=user.email, username=user.username)

# Ajout
@app.post("/internal/auth/verify")
async def internal_auth_verify(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
	user = crud.get_user_by_identifier(db, payload.identifier)
	if not user or not _verify_password(payload.password, user.hashed_password):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

	return {"ok": True, "user": schemas.OutputLogin(id=user.id, email=user.email, username=user.username)}
