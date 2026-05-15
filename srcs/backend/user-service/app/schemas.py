from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=50)
    password: str = Field(..., min_length=6, max_length=255)
    username: str = Field(..., min_length=3, max_length=15)


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=50)  # email or username
    password: str = Field(..., min_length=6, max_length=255)

class OutputLogin(BaseModel):
    id: int
    email: str
    username: str
    model_config = ConfigDict(from_attributes=True)


class UserLookupOut(BaseModel):
    id: int
    email: str
    username: str
    model_config = ConfigDict(from_attributes=True)

class UpdateUserRequest(BaseModel):
    user_id: int
    email: Optional[str] = Field(None, min_length=5, max_length=50)
    password: Optional[str] = Field(None, min_length=6, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=15)

class InternalUserUpdate(BaseModel):
    user_id: int
    email: Optional[str] = Field(None, min_length=5, max_length=50)
    nickname: Optional[str] = Field(None, min_length=3, max_length=15)
    password: Optional[str] = Field(None, min_length=6, max_length=255)

class InternalUserDelete(BaseModel):
    user_id: int
