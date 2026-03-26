from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
	to_user_id: int


class FriendRequestOut(BaseModel):
	id: int
	from_user_id: int
	to_user_id: int
	status: str
	created_at: Optional[datetime]
	updated_at: Optional[datetime]


class FriendOut(BaseModel):
	friend_id: int
	created_at: Optional[datetime]


class BlockCreate(BaseModel):
	blocked_user_id: int


class BlockOut(BaseModel):
	blocked_user_id: int
	created_at: Optional[datetime]
