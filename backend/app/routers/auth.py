"""Authentication routes."""

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    VerifyRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        national_id=user.national_id,
        email=user.email,
        email_verified=user.email_verified,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> dict:
    """Create the login account and print the verification code."""
    await AuthService.register(payload)
    return {"detail": "Código de verificación generado. Consúltalo en la consola del servidor."}


@router.post("/verify")
async def verify(payload: VerifyRequest) -> dict:
    """Confirm the registration code."""
    await AuthService.verify(payload)
    return {"detail": "Código de validación aceptado."}


@router.post("/login", response_model=dict)
async def login(payload: LoginRequest) -> dict:
    """Return a bearer token when the account and the candidate file both exist."""
    user, access_token = await AuthService.login(payload)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    """OAuth2 form login so Swagger can authorize requests."""
    _, access_token = await AuthService.login(
        LoginRequest(national_id=form_data.username, password=form_data.password)
    )
    return TokenResponse(access_token=access_token)


@router.post("/password-reset/request")
async def password_reset_request(payload: PasswordResetRequest) -> dict:
    """Print a password reset code."""
    await AuthService.request_password_reset(payload)
    return {"detail": "Código de restablecimiento generado. Consúltalo en la consola del servidor."}


@router.post("/password-reset/confirm")
async def password_reset_confirm(payload: PasswordResetConfirm) -> dict:
    """Set a new password with the reset code."""
    await AuthService.confirm_password_reset(payload)
    return {"detail": "Contraseña actualizada."}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the signed-in account."""
    return _user_response(current_user)
