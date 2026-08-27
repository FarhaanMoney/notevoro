"""Auth + collaboration primitives: password hashing and opaque cookie sessions.

Personal workspace data stays local-first in the browser. Identity, Space membership
and messaging are inherently collaborative, so they live server-side behind a session
cookie. Swapping in Supabase Auth later means replacing `current_user` and the two
credential helpers — nothing else.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, HTTPException

from lib.db import db

SESSION_COOKIE = "nv_session"
SESSION_DAYS = 30
_ITERATIONS = 240_000


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt, expected = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations))
    except (ValueError, AttributeError):
        return False
    return hmac.compare_digest(digest.hex(), expected)


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one(
        {
            "token": token,
            "user_id": user_id,
            "created_at": now_iso(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat(),
        }
    )
    return token


async def destroy_session(token: str) -> None:
    await db.sessions.delete_one({"token": token})


def cookie_kwargs() -> dict:
    # The app is served behind HTTPS ingress; secure cookies are safe and required for
    # SameSite=None-free same-origin use. httponly means JS can never read the token.
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": os.environ.get("COOKIE_SECURE", "true").lower() == "true",
        "max_age": SESSION_DAYS * 24 * 3600,
        "path": "/",
    }


async def current_user(nv_session: str | None = Cookie(default=None)) -> dict:
    """FastAPI dependency: resolves the signed-in profile or raises 401."""
    if not nv_session:
        raise HTTPException(status_code=401, detail="Not signed in")
    session = await db.sessions.find_one({"token": nv_session})
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")
    if session.get("expires_at", "") < now_iso():
        await db.sessions.delete_one({"token": nv_session})
        raise HTTPException(status_code=401, detail="Session expired")
    profile = await db.profiles.find_one({"id": session["user_id"]})
    if not profile:
        raise HTTPException(status_code=401, detail="Account not found")
    return profile
