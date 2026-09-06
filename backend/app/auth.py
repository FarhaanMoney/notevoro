import time
from abc import ABC, abstractmethod
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .core import ApiError, unauthorized
from .db import get_db, now
from .models import Subscription, User


class IdentityProvider(ABC):
    name = "none"

    @abstractmethod
    def verify(self, token: str) -> dict[str, Any]: ...


class CognitoProvider(IdentityProvider):
    name = "cognito"

    def __init__(self):
        self.client_id = settings.cognito_client_id
        self.issuer = f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}"
        self.jwks = jwt.PyJWKClient(f"{self.issuer}/.well-known/jwks.json", cache_keys=True)

    def verify(self, token):
        try:
            key = self.jwks.get_signing_key_from_jwt(token)
            claims = jwt.decode(token, key.key, algorithms=["RS256"], issuer=self.issuer, options={"verify_aud": False})
            if claims.get("token_use") != "access" or claims.get("client_id") != self.client_id or not claims.get("sub"):
                raise ValueError("bad claims")
            return {"sub": claims["sub"], "email": claims.get("email") or claims.get("username"), "name": claims.get("name")}
        except Exception as exc:
            raise unauthorized("Invalid or expired token") from exc


class LocalProvider(IdentityProvider):
    """Explicitly enabled dev/self-hosted email+password identity. Never active when AUTH_PROVIDER=cognito."""
    name = "local"

    def issue(self, user: User):
        payload = {"sub": user.id, "email": user.email, "token_use": "access", "iss": "notevoro-local", "iat": int(time.time()), "exp": int(time.time()) + 60 * 60 * 24 * 7}
        return jwt.encode(payload, settings.local_auth_secret, algorithm="HS256")

    def verify(self, token):
        try:
            claims = jwt.decode(token, settings.local_auth_secret, algorithms=["HS256"], issuer="notevoro-local")
            return {"sub": claims["sub"], "email": claims.get("email"), "name": None}
        except Exception as exc:
            raise unauthorized("Invalid or expired token") from exc

    @staticmethod
    def hash_password(pw: str) -> str:
        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def check_password(pw: str, hashed: str) -> bool:
        return bool(hashed) and bcrypt.checkpw(pw.encode(), hashed.encode())


class DisabledProvider(IdentityProvider):
    name = "disabled"

    def verify(self, token):
        raise ApiError(503, "AUTH_NOT_CONFIGURED", "Cognito is not configured. Set COGNITO_REGION, COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.")


def build_provider() -> IdentityProvider:
    if settings.auth_provider == "cognito":
        if settings.cognito_region and settings.cognito_user_pool_id and settings.cognito_client_id:
            return CognitoProvider()
        return DisabledProvider()
    return LocalProvider()


provider = build_provider()
bearer = HTTPBearer(auto_error=False)


async def resolve_user(db: AsyncSession, claims: dict) -> User:
    sub = claims["sub"]
    user = (await db.execute(select(User).where((User.identity_sub == sub) | (User.id == sub)))).scalar_one_or_none()
    if not user:
        if not claims.get("email"):
            raise unauthorized("Token has no email claim")
        user = (await db.execute(select(User).where(User.email == claims["email"].lower()))).scalar_one_or_none()
        if user:
            user.identity_sub = sub
        else:
            user = User(email=claims["email"].lower(), name=claims.get("name") or claims["email"].split("@")[0], identity_sub=sub)
            db.add(user)
            await db.flush()
            db.add(Subscription(user_id=user.id, plan="free", status="active", started_at=now()))
        await db.commit()
    return user


async def current_user(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer), db: AsyncSession = Depends(get_db)) -> User:
    token = creds.credentials if creds else request.query_params.get("token")
    if not token:
        raise unauthorized()
    claims = provider.verify(token)
    user = await resolve_user(db, claims)
    request.state.user_id = user.id
    return user


async def user_from_token(db: AsyncSession, token: str) -> User:
    return await resolve_user(db, provider.verify(token))
