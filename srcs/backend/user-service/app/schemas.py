from pydantic import BaseModel


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