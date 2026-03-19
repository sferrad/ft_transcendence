from . import models
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, or_

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
	except SQLAlchemyError:
		db.rollback()
		raise