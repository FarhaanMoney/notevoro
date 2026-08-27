from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from lib.db import db
from lib.security import (
    SESSION_COOKIE,
    cookie_kwargs,
    create_session,
    current_user,
    destroy_session,
    hash_password,
    now_iso,
    verify_password,
)
from models.collab import LoginIn, MessageOut, Profile, RecoverIn, SignupIn, new_id

router = APIRouter(prefix="/auth", tags=["auth"])


def _profile(doc: dict) -> Profile:
    return Profile(id=doc["id"], email=doc["email"], name=doc["name"], created_at=doc["created_at"])


@router.post("/signup", response_model=Profile)
async def signup(payload: SignupIn, response: Response):
    email = payload.email.lower().strip()
    if await db.profiles.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    doc = {
        "id": new_id(),
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.profiles.insert_one(dict(doc))
    token = await create_session(doc["id"])
    response.set_cookie(SESSION_COOKIE, token, **cookie_kwargs())
    return _profile(doc)


@router.post("/login", response_model=Profile)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    doc = await db.profiles.find_one({"email": email})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = await create_session(doc["id"])
    response.set_cookie(SESSION_COOKIE, token, **cookie_kwargs())
    return _profile(doc)


@router.post("/logout", response_model=MessageOut)
async def logout(response: Response, nv_session: str | None = Cookie(default=None)):
    if nv_session:
        await destroy_session(nv_session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return MessageOut(message="Signed out")


@router.get("/me", response_model=Profile)
async def me(user: dict = Depends(current_user)):
    return _profile(user)


@router.post("/recover", response_model=MessageOut)
async def recover(payload: RecoverIn):
    # Deliberately does not reveal whether the address exists.
    return MessageOut(
        message=(
            "If an account exists for that address, a recovery link will be sent. "
            "Email delivery activates once an email provider is configured."
        )
    )


@router.get("/directory", response_model=list[Profile])
async def directory(q: str = "", user: dict = Depends(current_user)):
    """Look up people by email or name so a conversation can target a real user id."""
    if len(q.strip()) < 2:
        return []
    needle = q.strip().lower()
    rows = await db.profiles.find({}).to_list(500)
    return [
        _profile(r)
        for r in rows
        if r["id"] != user["id"] and (needle in r["email"].lower() or needle in r["name"].lower())
    ][:10]
