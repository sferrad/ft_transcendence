import bcrypt
from . import models
from sqlalchemy.orm import Session
from sqlalchemy import text, or_


def hash_password(password: str) -> str:
	password_bytes = password.encode("utf-8")
	hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
	return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
	plain_pw_bytes = plain_password.encode("utf-8")
	hashed_pw_bytes = hashed_password.encode("utf-8")
	return bcrypt.checkpw(plain_pw_bytes, hashed_pw_bytes)

def get_user_by_identifier(db: Session, identifier: str) -> models.User | None:
	return (
		db.query(models.User)
		.filter(or_(models.User.email == identifier, models.User.username == identifier)).first()
	)


def existing_user(db: Session, email: str) -> bool:
	return (db.query(models.User).filter(models.User.email == email).first() is not None)

def existing_username(db: Session, username: str) -> bool:
	return (db.query(models.User).filter(models.User.username == username).first() is not None)

def add_user(db: Session, user: models.User):
	try:
		db.add(user)
		db.commit() # si email ou username existe deja il leve une exception car ils sont en UniqueConstraint
		db.refresh(user)
		return user
	except Exception:
		db.rollback()
		raise