from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import LocalProvider, current_user, provider
from ..config import settings
from ..core import ApiError, dump
from ..db import get_db, now
from ..entitlements import entitlements
from ..models import Subscription, User

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/config")
async def auth_config():
    return {"provider": provider.name, "cognito": {"region": settings.cognito_region, "user_pool_id": settings.cognito_user_pool_id, "client_id": settings.cognito_client_id}}


def _local_only():
    if not isinstance(provider, LocalProvider):
        raise ApiError(404, "NOT_AVAILABLE", "Email/password endpoints are disabled when Cognito is the identity provider.")


@router.post("/signup", status_code=201)
async def signup(body: SignupIn, db: AsyncSession = Depends(get_db)):
    _local_only()
    email = body.email.lower()
    if (await db.execute(select(User.id).where(User.email == email))).scalar_one_or_none():
        raise ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.")
    user = User(email=email, name=body.name, password_hash=LocalProvider.hash_password(body.password))
    db.add(user)
    await db.flush()
    db.add(Subscription(user_id=user.id, plan="free", status="active", started_at=now()))
    await db.commit()
    return {"token": provider.issue(user), "user": dump(user)}


@router.post("/login")
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    _local_only()
    user = (await db.execute(select(User).where(User.email == body.email.lower()))).scalar_one_or_none()
    if not user or not LocalProvider.check_password(body.password, user.password_hash or ""):
        raise ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
    user.last_seen_at = now()
    await db.commit()
    return {"token": provider.issue(user), "user": dump(user)}


@router.get("/me")
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return {"user": dump(user), "entitlements": await entitlements(db, user)}


@router.patch("/me")
async def update_me(body: ProfileIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    await db.commit()
    return dump(user)
