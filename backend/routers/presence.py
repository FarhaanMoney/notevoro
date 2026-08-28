from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from lib.db import db
from lib.security import current_user, now_iso
from models.collab import MessageOut

router = APIRouter(tags=["presence"])

ONLINE_WINDOW_SECONDS = 45
TYPING_WINDOW_SECONDS = 6


class HeartbeatIn(BaseModel):
    conversation_id: Optional[str] = None
    typing: bool = False


class PresenceUser(BaseModel):
    user_id: str
    name: str
    online: bool
    typing: bool
    last_seen: str


class PresenceOut(BaseModel):
    online_user_ids: List[str]
    typing: List[PresenceUser]
    users: List[PresenceUser]


def _cutoff(seconds: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat()


@router.post("/presence/heartbeat", response_model=MessageOut)
async def heartbeat(payload: HeartbeatIn, user: dict = Depends(current_user)):
    """Called on a timer by any open client, and immediately while the user types."""
    update = {"user_id": user["id"], "name": user["name"], "last_seen": now_iso()}
    if payload.typing and payload.conversation_id:
        update["typing_in"] = payload.conversation_id
        update["typing_at"] = now_iso()
    elif payload.conversation_id:
        # Explicitly stopped typing in this conversation.
        update["typing_in"] = None
        update["typing_at"] = None
    await db.presence.update_one({"user_id": user["id"]}, {"$set": update}, upsert=True)
    return MessageOut(message="ok")


@router.get("/presence", response_model=PresenceOut)
async def presence(
    conversation_id: Optional[str] = None,
    space_id: Optional[str] = None,
    user: dict = Depends(current_user),
):
    """
    Presence for the people the caller is actually allowed to see: the members of a Space,
    or the participants of a conversation. Never a global user list.
    """
    scope_ids: Optional[set[str]] = None
    if space_id:
        member = await db.space_members.find_one({"space_id": space_id, "user_id": user["id"]})
        if not member:
            return PresenceOut(online_user_ids=[], typing=[], users=[])
        rows = await db.space_members.find({"space_id": space_id}).to_list(200)
        scope_ids = {r["user_id"] for r in rows}
    elif conversation_id:
        conv = await db.conversations.find_one({"id": conversation_id})
        if not conv or user["id"] not in conv["participant_ids"]:
            return PresenceOut(online_user_ids=[], typing=[], users=[])
        scope_ids = set(conv["participant_ids"])

    query: dict = {} if scope_ids is None else {"user_id": {"$in": list(scope_ids)}}
    rows = await db.presence.find(query).to_list(300)

    online_cutoff = _cutoff(ONLINE_WINDOW_SECONDS)
    typing_cutoff = _cutoff(TYPING_WINDOW_SECONDS)

    users: List[PresenceUser] = []
    for r in rows:
        online = r.get("last_seen", "") >= online_cutoff
        typing = bool(
            conversation_id
            and r.get("typing_in") == conversation_id
            and (r.get("typing_at") or "") >= typing_cutoff
            and r["user_id"] != user["id"]
        )
        users.append(
            PresenceUser(
                user_id=r["user_id"],
                name=r.get("name", "Someone"),
                online=online,
                typing=typing,
                last_seen=r.get("last_seen", ""),
            )
        )

    return PresenceOut(
        online_user_ids=[u.user_id for u in users if u.online],
        typing=[u for u in users if u.typing],
        users=users,
    )
