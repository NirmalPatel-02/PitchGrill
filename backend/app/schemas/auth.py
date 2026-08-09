from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    age: int = Field(..., ge=13, le=120)
    full_name: Optional[str] = None
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class VerifyOTP(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

class ResendOTP(BaseModel):
    email: EmailStr

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: EmailStr
    age: int
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True