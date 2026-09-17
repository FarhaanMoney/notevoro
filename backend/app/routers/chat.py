import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import current_user, user_from_token
from ..authz import load_space_context
from ..core import ApiError, dump, forbidden, not_found
from ..db import SessionLocal, get_db, now
from ..entitlements import require_feature
from ..models import Conversation, ConversationMember, Message, Space, SpaceMember, User
from ..realtime import hub
from ..services import notify, user_brief

router = APIRouter(tags=["chat"])


class ConversationIn(BaseModel):
    type: str = Field(pattern="^(direct|group)$")
    member_ids: list[str]
    space_id: Optional[str] = None
    title: Optional[str] = None
    icon: Optional[str] = None
    accent: Optional[str] = None


class MessageIn(BaseModel):
    content: str = Field(max_length=8000)
    client_id: Optional[str] = None
    attachments: list[dict] = []
    reply_to_id: Optional[str] = None
    mentions: list[str] = []


class ReactionIn(BaseModel):
    emoji: str = Field(max_length=16)


class EditIn(BaseModel):
    content: str = Field(max_length=8000)


async def _member(db, conv_id, user_id) -> ConversationMember:
    m = (await db.execute(select(ConversationMember).where(ConversationMember.conversation_id == conv_id, ConversationMember.user_id == user_id))).scalar_one_or_none()
    if not m:
        raise forbidden("You are not a member of this conversation")
    return m


async def _members(db, conv_id):
    return (await db.execute(select(ConversationMember.user_id).where(ConversationMember.conversation_id == conv_id))).scalars().all()


async def _conv_out(db, conv: Conversation, me: User):
    rows = (await db.execute(select(User).join(ConversationMember, ConversationMember.user_id == User.id).where(ConversationMember.conversation_id == conv.id))).scalars().all()
    mine = (await db.execute(select(ConversationMember).where(ConversationMember.conversation_id == conv.id, ConversationMember.user_id == me.id))).scalar_one()
    unread_q = select(func.count()).select_from(Message).where(Message.conversation_id == conv.id, Message.sender_id != me.id, Message.deleted_at.is_(None))
    if mine.last_read_at:
        unread_q = unread_q.where(Message.created_at > mine.last_read_at)
    unread = (await db.execute(unread_q)).scalar()
    other = next((u for u in rows if u.id != me.id), None)
    d = dump(conv, extra={"members": [user_brief(u) for u in rows], "unread": unread, "pinned": mine.pinned or conv.pinned})
    if conv.type == "direct" and other:
        d["title"] = other.name
        d["peer"] = user_brief(other)
    return d


@router.get("/conversations")
async def list_conversations(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), space_id: Optional[str] = None):
    stmt = select(Conversation).join(ConversationMember, ConversationMember.conversation_id == Conversation.id).where(ConversationMember.user_id == user.id)
    if space_id:
        stmt = stmt.where((Conversation.space_id == space_id) | (Conversation.space_id.is_(None)))
    convs = (await db.execute(stmt.order_by(Conversation.last_message_at.desc().nulls_last(), Conversation.created_at.desc()))).scalars().all()
    return [await _conv_out(db, c, user) for c in convs]


@router.post("/conversations", status_code=201)
async def create_conversation(body: ConversationIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    ids = sorted(set(body.member_ids + [user.id]))
    if body.type == "direct":
        if len(ids) != 2:
            raise ApiError(400, "INVALID_DIRECT", "A direct conversation needs exactly one other person.")
        key = ":".join(ids)
        existing = (await db.execute(select(Conversation).where(Conversation.direct_key == key))).scalar_one_or_none()
        if existing:
            return await _conv_out(db, existing, user)
    # must share at least one Team Space with every participant (no messaging strangers)
    my_spaces = set((await db.execute(select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active"))).scalars().all())
    for uid in ids:
        if uid == user.id:
            continue
        theirs = set((await db.execute(select(SpaceMember.space_id).where(SpaceMember.user_id == uid, SpaceMember.status == "active"))).scalars().all())
        if not my_spaces & theirs:
            raise forbidden("You can only message people who share a Team Space with you.")
    if body.space_id:
        await load_space_context(body.space_id, user, db)
    conv = Conversation(type=body.type, space_id=body.space_id, created_by=user.id, title=body.title, icon=body.icon, accent=body.accent, direct_key=":".join(ids) if body.type == "direct" else None)
    db.add(conv)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        existing = (await db.execute(select(Conversation).where(Conversation.direct_key == ":".join(ids)))).scalar_one()
        return await _conv_out(db, existing, user)
    for uid in ids:
        db.add(ConversationMember(conversation_id=conv.id, user_id=uid))
    await db.commit()
    out = await _conv_out(db, conv, user)
    await hub.send_to_users([i for i in ids if i != user.id], "conversation.created", out)
    return out


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await _member(db, conv_id, user.id)
    conv = (await db.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one_or_none()
    if not conv:
        raise not_found("Conversation")
    return await _conv_out(db, conv, user)


@router.get("/conversations/{conv_id}/messages")
async def list_messages(conv_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db), before: Optional[str] = None, limit: int = 50):
    await _member(db, conv_id, user.id)
    stmt = select(Message, User).join(User, User.id == Message.sender_id).where(Message.conversation_id == conv_id)
    if before:
        anchor = (await db.execute(select(Message.created_at).where(Message.id == before))).scalar_one_or_none()
        if anchor:
            stmt = stmt.where(Message.created_at < anchor)
    rows = (await db.execute(stmt.order_by(Message.created_at.desc()).limit(min(limit, 100)))).all()
    reads = (await db.execute(select(ConversationMember).where(ConversationMember.conversation_id == conv_id, ConversationMember.user_id != user.id))).scalars().all()
    read_marks = {m.user_id: m.last_read_at.isoformat() if m.last_read_at else None for m in reads}
    return {"messages": [dump(m, extra={"sender": user_brief(u)}) for m, u in reversed(rows)], "read_marks": read_marks}


@router.post("/conversations/{conv_id}/messages", status_code=201)
async def send_message(conv_id: str, body: MessageIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    member = await _member(db, conv_id, user.id)
    if not body.content.strip() and not body.attachments:
        raise ApiError(422, "EMPTY_MESSAGE", "Message cannot be empty")
    if body.client_id:
        dup = (await db.execute(select(Message).where(Message.conversation_id == conv_id, Message.client_id == body.client_id))).scalar_one_or_none()
        if dup:
            return dump(dup, extra={"sender": user_brief(user), "duplicate": True})
    msg = Message(conversation_id=conv_id, sender_id=user.id, client_id=body.client_id, content=body.content.strip(), attachments=body.attachments, reply_to_id=body.reply_to_id, mentions=body.mentions, status="sent")
    db.add(msg)
    conv = (await db.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one()
    conv.last_message_at = now()
    conv.last_message_preview = (msg.content or "Attachment")[:200]
    member.last_read_at = now()
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        dup = (await db.execute(select(Message).where(Message.conversation_id == conv_id, Message.client_id == body.client_id))).scalar_one()
        return dump(dup, extra={"sender": user_brief(user), "duplicate": True})
    members = await _members(db, conv_id)
    recipients = [m for m in members if m != user.id]
    for uid in body.mentions:
        if uid in recipients:
            await notify(db, [uid], "mention", f"{user.name} mentioned you", msg.content[:140], f"/chat/{conv_id}", conv.space_id)
    for uid in recipients:
        if not hub.is_online(uid):
            await notify(db, [uid], "message", f"New message from {user.name}", msg.content[:140], f"/chat/{conv_id}", conv.space_id)
    await db.commit()
    out = dump(msg, extra={"sender": user_brief(user)})
    await hub.send_to_users(members, "message.created", {"conversation_id": conv_id, "message": out, "space_id": conv.space_id})
    if any(hub.is_online(u) for u in recipients):
        msg.status = "delivered"
        await db.commit()
        out["status"] = "delivered"
        await hub.send_to_users([user.id], "message.status", {"conversation_id": conv_id, "message_id": msg.id, "status": "delivered"})
    return out


@router.patch("/conversations/{conv_id}/messages/{message_id}")
async def edit_message(conv_id: str, message_id: str, body: EditIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await _member(db, conv_id, user.id)
    msg = (await db.execute(select(Message).where(Message.id == message_id, Message.conversation_id == conv_id))).scalar_one_or_none()
    if not msg or msg.sender_id != user.id:
        raise forbidden("You can only edit your own messages")
    msg.content, msg.edited_at = body.content, now()
    await db.commit()
    out = dump(msg, extra={"sender": user_brief(user)})
    await hub.send_to_users(await _members(db, conv_id), "message.updated", {"conversation_id": conv_id, "message": out})
    return out


@router.delete("/conversations/{conv_id}/messages/{message_id}")
async def delete_message(conv_id: str, message_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await _member(db, conv_id, user.id)
    msg = (await db.execute(select(Message).where(Message.id == message_id, Message.conversation_id == conv_id))).scalar_one_or_none()
    if not msg or msg.sender_id != user.id:
        raise forbidden("You can only delete your own messages")
    msg.deleted_at, msg.content = now(), ""
    await db.commit()
    await hub.send_to_users(await _members(db, conv_id), "message.updated", {"conversation_id": conv_id, "message": dump(msg, extra={"sender": user_brief(user)})})
    return {"ok": True}


@router.post("/conversations/{conv_id}/messages/{message_id}/reactions")
async def react(conv_id: str, message_id: str, body: ReactionIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await _member(db, conv_id, user.id)
    msg = (await db.execute(select(Message).where(Message.id == message_id, Message.conversation_id == conv_id))).scalar_one_or_none()
    if not msg:
        raise not_found("Message")
    reactions = dict(msg.reactions or {})
    users = list(reactions.get(body.emoji, []))
    users.remove(user.id) if user.id in users else users.append(user.id)
    if users:
        reactions[body.emoji] = users
    else:
        reactions.pop(body.emoji, None)
    msg.reactions = reactions
    await db.commit()
    sender = (await db.execute(select(User).where(User.id == msg.sender_id))).scalar_one()
    out = dump(msg, extra={"sender": user_brief(sender)})
    await hub.send_to_users(await _members(db, conv_id), "message.updated", {"conversation_id": conv_id, "message": out})
    return out


@router.post("/conversations/{conv_id}/read")
async def mark_read(conv_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    m = await _member(db, conv_id, user.id)
    m.last_read_at = now()
    await db.commit()
    await hub.send_to_users(await _members(db, conv_id), "conversation.read", {"conversation_id": conv_id, "user_id": user.id, "read_at": m.last_read_at.isoformat()})
    return {"ok": True}


@router.post("/conversations/{conv_id}/pin")
async def pin(conv_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    m = await _member(db, conv_id, user.id)
    m.pinned = not m.pinned
    await db.commit()
    return {"pinned": m.pinned}


@router.get("/people")
async def people(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), space_id: Optional[str] = None):
    """People you can message: everyone who shares a Team Space with you."""
    my_spaces = select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active")
    stmt = select(User, SpaceMember.space_id).join(SpaceMember, SpaceMember.user_id == User.id).where(SpaceMember.space_id.in_(my_spaces), User.id != user.id)
    if space_id:
        stmt = stmt.where(SpaceMember.space_id == space_id)
    rows = (await db.execute(stmt)).all()
    seen = {}
    for u, sid in rows:
        seen.setdefault(u.id, {**user_brief(u), "spaces": []})["spaces"].append(sid)
    return list(seen.values())


@router.get("/presence")
async def presence(user: User = Depends(current_user)):
    return {"online": hub.online_users()}


# ---- WebSocket: delivery + presence + typing (ephemeral). Durable state is Postgres.
@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket, token: str):
    async with SessionLocal() as db:
        try:
            user = await user_from_token(db, token)
        except Exception:
            await ws.close(code=4401)
            return
        user.last_seen_at = now()
        await db.commit()
    first = await hub.connect(user.id, ws)
    if first:
        await hub.broadcast("presence.changed", {"user_id": user.id, "online": True})
    await ws.send_text(json.dumps({"event": "presence.snapshot", "payload": {"online": hub.online_users()}}))
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except ValueError:
                continue
            ev, payload = data.get("event"), data.get("payload") or {}
            if ev == "typing":
                conv_id = payload.get("conversation_id")
                if conv_id:
                    async with SessionLocal() as db:
                        members = await _members(db, conv_id)
                    if user.id in members:
                        await hub.send_to_users([m for m in members if m != user.id], "typing", {"conversation_id": conv_id, "user_id": user.id, "name": user.name, "typing": bool(payload.get("typing", True))})
            elif ev == "ping":
                await ws.send_text(json.dumps({"event": "pong", "payload": {"t": time.time()}}))
    except WebSocketDisconnect:
        pass
    finally:
        last = hub.disconnect(user.id, ws)
        if last:
            async with SessionLocal() as db:
                u = (await db.execute(select(User).where(User.id == user.id))).scalar_one_or_none()
                if u:
                    u.last_seen_at = now()
                    await db.commit()
            await hub.broadcast("presence.changed", {"user_id": user.id, "online": False, "last_seen_at": now().isoformat()})
