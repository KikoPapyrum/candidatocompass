"""Registration, verification and password reset."""

import secrets
from datetime import datetime, timedelta

from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    VerifyRequest,
)
from app.utils.exceptions import DomainError
from app.utils.security import create_access_token, get_password_hash, verify_password
from app.utils.validators import (
    is_valid_email,
    is_valid_national_id,
    is_valid_password,
    normalize_national_id,
)

CODE_TTL = timedelta(minutes=30)


def _issue_code(user: User, purpose: str) -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    user.verification_code = code
    user.verification_purpose = purpose
    user.verification_expires_at = datetime.utcnow() + CODE_TTL
    print(
        f"\n=== {purpose} code for {user.national_id}: {code} ===\n",
        flush=True,
    )
    return code


def _check_identity(national_id: str, password: str, email: str | None = None) -> str:
    normalized = normalize_national_id(national_id)
    if not is_valid_national_id(normalized):
        raise DomainError("El DNI/NIE no es correcto.")
    if not is_valid_password(password):
        raise DomainError(
            "La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números."
        )
    if email is not None and not is_valid_email(email):
        raise DomainError("El email no es válido.")
    return normalized


class AuthService:
    """Account lifecycle. The candidate file is not created here."""

    @staticmethod
    async def register(payload: RegisterRequest) -> None:
        national_id = _check_identity(payload.national_id, payload.password, payload.email)
        candidate = await Candidate.find_one(Candidate.national_id == national_id)
        if candidate is None:
            raise DomainError(
                "El usuario con ese DNI/NIE no está registrado para el proceso de alta.",
                status_code=403,
            )
        existing = await User.find_one(User.national_id == national_id)
        if existing is not None:
            raise DomainError(
                "El usuario ya existe. Póngase en contacto con Compass.",
                status_code=409,
            )
        user = User(
            national_id=national_id,
            email=payload.email.strip().lower(),
            hashed_password=get_password_hash(payload.password),
        )
        _issue_code(user, "registro")
        await user.insert()

    @staticmethod
    async def verify(payload: VerifyRequest) -> None:
        national_id = normalize_national_id(payload.national_id)
        user = await User.find_one(User.national_id == national_id)
        if user is None or user.verification_purpose != "registro":
            raise DomainError("El código de verificación no es válido.")
        AuthService._consume_code(user, payload.code)
        user.email_verified = True
        user.updated_at = datetime.utcnow()
        await user.save()

    @staticmethod
    async def login(payload: LoginRequest) -> tuple[User, str]:
        national_id = normalize_national_id(payload.national_id)
        if not is_valid_national_id(national_id):
            raise DomainError("El DNI/NIE no es correcto.")
        user = await User.find_one(User.national_id == national_id)
        candidate = await Candidate.find_one(Candidate.national_id == national_id)
        if user is None:
            if candidate is None:
                raise DomainError(
                    "El usuario con ese DNI/NIE no está registrado para el proceso de alta.",
                    status_code=403,
                )
            raise DomainError(
                "Este DNI no tiene cuenta de acceso. Regístrate para crear la contraseña.",
                status_code=403,
            )
        if not verify_password(payload.password, user.hashed_password):
            raise DomainError("Credenciales erróneas.", status_code=401)
        if not user.email_verified:
            raise DomainError(
                "El email todavía no está verificado. Introduce el código de registro.",
                status_code=403,
            )
        if candidate is None:
            raise DomainError(
                "El usuario con ese DNI/NIE no está registrado para el proceso de alta.",
                status_code=403,
            )
        token = create_access_token({"sub": str(user.id), "national_id": user.national_id})
        return user, token

    @staticmethod
    async def open_account(national_id: str, email: str, password: str) -> tuple[str, str | None, User]:
        """Create the account or accept the password of an existing one.

        Returns the next step (`verify` or `authenticated`), a token when the
        email is already confirmed, and the user.
        """
        normalized = _check_identity(national_id, password, email)
        user = await User.find_one(User.national_id == normalized)
        if user is None:
            user = User(
                national_id=normalized,
                email=email.strip().lower(),
                hashed_password=get_password_hash(password),
            )
            _issue_code(user, "registro")
            await user.insert()
            return "verify", None, user
        if not verify_password(password, user.hashed_password):
            raise DomainError(
                "Este DNI ya tiene cuenta. La contraseña no coincide.",
                status_code=403,
            )
        if not user.email_verified:
            _issue_code(user, "registro")
            user.updated_at = datetime.utcnow()
            await user.save()
            return "verify", None, user
        token = create_access_token({"sub": str(user.id), "national_id": user.national_id})
        return "authenticated", token, user

    @staticmethod
    async def request_password_reset(payload: PasswordResetRequest) -> None:
        national_id = normalize_national_id(payload.national_id)
        user = await User.find_one(User.national_id == national_id)
        if user is None:
            raise DomainError("El usuario no existe.", status_code=404)
        _issue_code(user, "reset")
        user.updated_at = datetime.utcnow()
        await user.save()

    @staticmethod
    async def confirm_password_reset(payload: PasswordResetConfirm) -> None:
        national_id = _check_identity(payload.national_id, payload.password)
        user = await User.find_one(User.national_id == national_id)
        if user is None or user.verification_purpose != "reset":
            raise DomainError("El código de verificación no es válido.")
        AuthService._consume_code(user, payload.code)
        user.hashed_password = get_password_hash(payload.password)
        user.updated_at = datetime.utcnow()
        await user.save()

    @staticmethod
    def _consume_code(user: User, code: str) -> None:
        expires = user.verification_expires_at
        if (
            not user.verification_code
            or user.verification_code != code.strip()
            or expires is None
            or expires < datetime.utcnow()
        ):
            raise DomainError("El código de verificación no es válido.")
        user.verification_code = None
        user.verification_purpose = None
        user.verification_expires_at = None
