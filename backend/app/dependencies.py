"""Shared route dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
from app.models.candidate import Candidate
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Load the account stored in the bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user = await User.get(user_id)
    except Exception:
        raise credentials_exception
    if user is None or not user.active:
        raise credentials_exception
    return user


async def get_current_candidate(current_user: User = Depends(get_current_user)) -> Candidate:
    """Load the hiring file that belongs to the signed-in national id."""
    candidate = await Candidate.find_one(Candidate.national_id == current_user.national_id)
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario con ese DNI/NIE no está registrado para el proceso de alta",
        )
    return candidate
