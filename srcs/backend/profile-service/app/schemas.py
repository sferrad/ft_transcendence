from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProfileCreate(BaseModel):
	display_name: str
	avatar_url: Optional[str] = None
	bio: Optional[str] = None
	country: Optional[str] = None
	language: Optional[str] = None


class ProfileUpdate(BaseModel):
	display_name: Optional[str] = None
	avatar_url: Optional[str] = None
	bio: Optional[str] = None
	country: Optional[str] = None
	language: Optional[str] = None


class ProfileOut(BaseModel):
	id: int
	user_id: int
	display_name: str
	avatar_url: Optional[str]
	bio: Optional[str]
	country: Optional[str]
	language: Optional[str]
	created_at: Optional[datetime]
	updated_at: Optional[datetime]
