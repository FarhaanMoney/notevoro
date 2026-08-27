import re

from fastapi import APIRouter, Depends, HTTPException

from lib.db import db
from lib.security import current_user, now_iso
from models.collab import (
    Conversation,
    ConversationCreate,
    InboxCounts,
    Message,
    MessageCreate,
    MentionOut,
    MessageOut,
    new_id,
)
from routers.spaces import log_activity, membership

router = APIRouter(tags=["messaging"])

MENTION_RE = re.compile(r"@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")


async def _shape(doc: dict, viewer_id: str) -> Conversation:
    """
    Title is resolved per viewer, not stored per creator: in a direct thread each side
    must see the OTHER person's name. Participant names are returned aligned to
    participant_ids so callers can map id -> name.
    """
    unread, last = await _unread_and_last(doc["id"], viewer_id)

    names: list[str] = []
    for pid in doc["participant_ids"]:
        profile = await db.profiles.find_one({"id": pid})
        names.append(profile["name"] if profile else "Unknown")

    title = doc["title"]
    if doc["kind"] == "direct":
        others = [
            name for pid, name in zip(doc["participant_ids"], names) if pid != viewer_id
        ]
        if others:
            title = others[0]

    return Conversation(
        id=doc["id"],
        kind=doc["kind"],
        space_id=doc.get("space_id"),
        title=title,
        participant_ids=doc["participant_ids"],
        participant_names=names,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        last_message=last,
        unread=unread,
    )


async def _unread_and_last(conversation_id: str, user_id: str) -> tuple[int, str]:
    msgs = await db.messages.find({"conversation_id": conversation_id}).to_list(1000)
    msgs.sort(key=lambda m: m["created_at"])
    unread = sum(
        1 for m in msgs if m["sender_id"] != user_id and user_id not in m.get("read_by", [])
    )
    return unread, (msgs[-1]["body"] if msgs else "")


async def _participant(conversation_id: str, user_id: str) -> dict:
    conv = await db.conversations.find_one({"id": conversation_id})
    if not conv or user_id not in conv["participant_ids"]:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations(user: dict = Depends(current_user)):
    rows = await db.conversations.find({"participant_ids": user["id"]}).to_list(300)
    rows.sort(key=lambda r: r["updated_at"], reverse=True)
    return [await _shape(r, user["id"]) for r in rows]


@router.post("/conversations", response_model=Conversation)
async def create_conversation(payload: ConversationCreate, user: dict = Depends(current_user)):
    if payload.kind == "direct":
        if not payload.email:
            raise HTTPException(status_code=422, detail="An email address is required.")
        email = payload.email.lower().strip()
        if email == user["email"]:
            raise HTTPException(status_code=400, detail="You cannot message yourself.")
        other = await db.profiles.find_one({"email": email})
        if not other:
            raise HTTPException(
                status_code=404,
                detail="Nobody on Notevoro uses that email yet. Invite them to a Space first.",
            )
        # Relationships are by user id, never by email string.
        ids = sorted([user["id"], other["id"]])
        existing = await db.conversations.find_one({"kind": "direct", "participant_ids": ids})
        if existing:
            return await _shape(existing, user["id"])
        doc = {
            "id": new_id(),
            "kind": "direct",
            "space_id": None,
            # Stored for reference only — the served title is resolved per viewer.
            "title": other["name"],
            "participant_ids": ids,
            "participant_names": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
    else:
        if not payload.space_id:
            raise HTTPException(status_code=422, detail="A space_id is required.")
        await membership(payload.space_id, user["id"])
        space = await db.spaces.find_one({"id": payload.space_id})
        existing = await db.conversations.find_one({"kind": "space", "space_id": payload.space_id})
        members = await db.space_members.find({"space_id": payload.space_id}).to_list(200)
        ids = sorted(m["user_id"] for m in members)
        if existing:
            # Keep the group in sync with current membership.
            await db.conversations.update_one(
                {"id": existing["id"]}, {"$set": {"participant_ids": ids}}
            )
            existing["participant_ids"] = ids
            return await _shape(existing, user["id"])
        doc = {
            "id": new_id(),
            "kind": "space",
            "space_id": payload.space_id,
            "title": f'{space["name"]} — team',
            "participant_ids": ids,
            "participant_names": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }

    await db.conversations.insert_one(dict(doc))
    return await _shape(doc, user["id"])


@router.get("/conversations/{conversation_id}/messages", response_model=list[Message])
async def list_messages(conversation_id: str, user: dict = Depends(current_user)):
    await _participant(conversation_id, user["id"])
    rows = await db.messages.find({"conversation_id": conversation_id}).to_list(1000)
    rows.sort(key=lambda m: m["created_at"])
    return [Message(**{k: v for k, v in r.items() if k != "_id"}) for r in rows]


@router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(
    conversation_id: str, payload: MessageCreate, user: dict = Depends(current_user)
):
    conv = await _participant(conversation_id, user["id"])

    mention_ids: list[str] = []
    for email in MENTION_RE.findall(payload.body):
        profile = await db.profiles.find_one({"email": email.lower()})
        if profile and profile["id"] in conv["participant_ids"] and profile["id"] != user["id"]:
            mention_ids.append(profile["id"])

    doc = {
        "id": new_id(),
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "body": payload.body.strip(),
        "mention_ids": mention_ids,
        "read_by": [user["id"]],
        "created_at": now_iso(),
    }
    await db.messages.insert_one(dict(doc))
    await db.conversations.update_one({"id": conversation_id}, {"$set": {"updated_at": now_iso()}})
    for mentioned in mention_ids:
        await log_activity(mentioned, "mention", f'{user["name"]} mentioned you in {conv["title"]}')
    return Message(**doc)


@router.post("/conversations/{conversation_id}/read", response_model=MessageOut)
async def mark_read(conversation_id: str, user: dict = Depends(current_user)):
    await _participant(conversation_id, user["id"])
    await db.messages.update_many(
        {"conversation_id": conversation_id, "read_by": {"$ne": user["id"]}},
        {"$push": {"read_by": user["id"]}},
    )
    return MessageOut(message="Marked read")


@router.get("/mentions", response_model=list[MentionOut])
async def mentions(user: dict = Depends(current_user)):
    rows = await db.messages.find({"mention_ids": user["id"]}).to_list(300)
    rows.sort(key=lambda m: m["created_at"], reverse=True)
    out = []
    for r in rows[:60]:
        conv = await db.conversations.find_one({"id": r["conversation_id"]})
        out.append(
            MentionOut(
                message=Message(**{k: v for k, v in r.items() if k != "_id"}),
                conversation_title=conv["title"] if conv else "Conversation",
            )
        )
    return out


@router.get("/inbox/counts", response_model=InboxCounts)
async def inbox_counts(user: dict = Depends(current_user)):
    convs = await db.conversations.find({"participant_ids": user["id"]}).to_list(300)
    unread = 0
    for c in convs:
        count, _ = await _unread_and_last(c["id"], user["id"])
        unread += count
    mention_rows = await db.messages.find({"mention_ids": user["id"]}).to_list(300)
    mention_unread = sum(1 for m in mention_rows if user["id"] not in m.get("read_by", []))
    invites = await db.invitations.count_documents({"email": user["email"], "status": "pending"})
    activity = await db.activity.count_documents({"user_id": user["id"]})
    return InboxCounts(
        messages=unread,
        mentions=mention_unread,
        invitations=invites,
        activity=activity,
        total=unread + invites,
    )
