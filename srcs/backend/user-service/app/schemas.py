from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    identifier: str  # email or username
    password: str
    
class OutputLogin(BaseModel):
    id: int
    email: str
    username: str

class UpdateUserRequest(BaseModel):
    user_id: int
    email: Optional[str]
    password: Optional[str]
    username: Optional[str]

class InternalUserUpdate(BaseModel):
    user_id: int
    email: Optional[str] = None
    nickname: Optional[str] = None
    password: Optional[str] = None

class InternalUserDelete(BaseModel):
    user_id: int
