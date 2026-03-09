from datetime import datetime, timedelta
import os

import bcrypt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db


app = FastAPI()

Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@app.on_event("startup")
def ensure_user_schema() -> None:
	"""Best-effort dev migration for `username`.

	`create_all()` doesn't alter existing tables.
	"""
	try:
		with engine.begin() as conn:
			conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)"))
			conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
	except Exception:
		# Don't block startup if DB isn't reachable yet.
		return


class RegisterRequest(BaseModel):
	email: str
	password: str
	username: str | None = None


class LoginRequest(BaseModel):
	email: str
	password: str


def hash_password(password: str) -> str:
	password_bytes = password.encode("utf-8")
	hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
	return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
	plain_pw_bytes = plain_password.encode("utf-8")
	hashed_pw_bytes = hashed_password.encode("utf-8")
	return bcrypt.checkpw(plain_pw_bytes, hashed_pw_bytes)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
	to_encode = data.copy()
	expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
	to_encode.update({"exp": expire})
	return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Invalid token",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		email: str | None = payload.get("sub")
		if email is None:
			raise credentials_exception
	except JWTError:
		raise credentials_exception

	user = db.query(models.User).filter(models.User.email == email).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return user


@app.get("/health")
async def health():
	return {"status": "ok"}


@app.get("/db/ping")
async def db_ping(db: Session = Depends(get_db)):
	try:
		db.execute(text("SELECT 1"))
		return {"status": "ok"}
	except Exception as e:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/auth/register")
async def auth_register(payload: RegisterRequest, db: Session = Depends(get_db)):
	existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
	if existing_user:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

	if payload.username is not None:
		existing_username = db.query(models.User).filter(models.User.username == payload.username).first()
		if existing_username:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

	hashed = hash_password(payload.password)
	user = models.User(email=payload.email, hashed_password=hashed, username=payload.username)
	db.add(user)
	db.commit()
	db.refresh(user)
	return {"id": user.id, "email": user.email, "username": user.username}


@app.post("/auth/login")
async def auth_login(payload: LoginRequest, db: Session = Depends(get_db)):
	user = db.query(models.User).filter(models.User.email == payload.email).first()
	if not user or not verify_password(payload.password, user.hashed_password):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

	access_token = create_access_token(data={"sub": user.email})
	return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
async def auth_me(current_user=Depends(get_current_user)):
	return {
		"id": current_user.id,
		"email": current_user.email,
		"username": getattr(current_user, "username", None),
		"created_at": current_user.created_at,
	}
