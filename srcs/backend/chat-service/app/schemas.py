from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_private: bool = False

class RoomOut(BaseModel):
    id: int
    name: str
    is_private: bool
    owner_user_id: int
    created_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

class JoinRoomOut(BaseModel):
    ok: bool
    room_id: int


class LeaveRoomOut(BaseModel):
    ok: bool
    room_id: int


class DeleteRoomOut(BaseModel):
    ok: bool
    room_id: int

class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class MessageOut(BaseModel):
    id: int
    room_id: int
    sender_user_id: int
    content: str
    created_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

class PrivateMessageOut(BaseModel):
    id: int
    sender_user_id: int
    receiver_user_id: int
    content: str
    created_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)