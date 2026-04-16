from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FriendRequestCreate(BaseModel):
	to_user_id: int


class FriendRequestOut(BaseModel):
	id: int
	from_user_id: int
	to_user_id: int
	status: str
	created_at: Optional[datetime]
	updated_at: Optional[datetime]
	# Pydantic v2 : remplace `orm_mode=True` (v1)
	model_config = ConfigDict(from_attributes=True)


class FriendOut(BaseModel):
	friend_id: int
	created_at: Optional[datetime]
	model_config = ConfigDict(from_attributes=True)


class BlockCreate(BaseModel):
	blocked_user_id: int


class BlockOut(BaseModel):
	blocked_user_id: int
	created_at: Optional[datetime]
	model_config = ConfigDict(from_attributes=True)

class InternalUserCleanup(BaseModel):
	user_id: int

class PresencePingOut(BaseModel):
	ok: bool
	ttl_seconds: int

class FriendsWithStatusOut(BaseModel):
	friend_id: int
	created_at: Optional[datetime]
	online: bool
	model_config = ConfigDict(from_attributes=True)