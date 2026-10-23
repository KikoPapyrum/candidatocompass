"""Auth request and response bodies."""

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    national_id: str
    password: str = Field(min_length=8)


class VerifyRequest(BaseModel):
    national_id: str
    code: str


class LoginRequest(BaseModel):
    national_id: str
    password: str


class EmployeeLoginRequest(BaseModel):
    national_id: str
    email: str
    captcha_id: str
    captcha_answer: str


class PasswordResetRequest(BaseModel):
    national_id: str


class PasswordResetConfirm(BaseModel):
    national_id: str
    code: str
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    national_id: str
    email: str
    email_verified: bool
