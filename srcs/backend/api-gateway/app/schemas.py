from pydantic import BaseModel

class LoginRequest(BaseModel):
    identifier: str
    password: str

