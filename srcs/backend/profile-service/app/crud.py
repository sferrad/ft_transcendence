from __future__ import annotations


from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from . import models
from .schemas import ProfileCreate, ProfileUpdate, UserSettingIn


def get_profile_by_user_id(db: Session, user_id: int) -> models.Profile | None:
	return db.query(models.Profile).filter(models.Profile.user_id == user_id).first()

# SQLAlchemyError: catch large pour rollback systematique 
# vs
# IntegrityError: catch apeecifique (unique constraint...) 
def create_profile(db: Session, user_id: int, payload: ProfileCreate) -> models.Profile:
	profile = models.Profile(
		user_id=user_id,
		display_name=payload.display_name,
		avatar_url=payload.avatar_url,
		bio=payload.bio,
		country=payload.country,
		language=payload.language,
	)
	try:
		db.add(profile)
		db.commit()
		db.refresh(profile)
		return profile
	except SQLAlchemyError:
		db.rollback()
		raise

def update_profile(db: Session, profile: models.Profile, payload: ProfileUpdate) -> models.Profile:
	data = payload.model_dump(exclude_unset=True)
	for key, value in data.items():
		setattr(profile, key, value)
	try:
		db.add(profile)
		db.commit()
		db.refresh(profile)
		return profile
	except SQLAlchemyError:
		db.rollback()
		raise


def get_user_settings(db: Session, user_id: int) -> models.UserSetting | None:
	return db.query(models.UserSetting).filter(models.UserSetting.user_id == user_id).first()

def create_user_settings(db: Session, user_id: int) -> models.UserSetting:
	settings = models.UserSetting(user_id=user_id)
	try:
		db.add(settings)
		db.commit()
		db.refresh(settings)
		return settings
	except SQLAlchemyError:
		db.rollback()
		raise

def update_user_settings(user_id: int, db: Session, updates: UserSettingIn) -> models.UserSetting:
	settings = get_user_settings(db, user_id)
	if not settings:
		settings = create_user_settings(db, user_id)

	# Pydantic v2 : `model_dump` remplace `.dict()`
	updates_data = updates.model_dump(exclude_unset=True)
	for field, value in updates_data.items():
		setattr(settings, field, value)
	try:
		db.add(settings)
		db.commit()
		db.refresh(settings)
		return settings
	except SQLAlchemyError:
		db.rollback()
		raise