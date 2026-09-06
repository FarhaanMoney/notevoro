import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from ..auth import current_user
from ..authz import SpaceContext, admin_ctx, load_space_context, space_ctx, writer_ctx
from ..core import ApiError, dump, not_found
from ..db import get_db, now
from ..entitlements import entitlements, require_feature
from ..models import (Activity, CalendarEvent, Conversation, ConversationMember, Document, FileObject, IdempotencyKey, Integration,
                     Invitation, Note, Project, Space, SpaceMember, Task, User)
from ..realtime import hub
from ..registry import BY_KEY, DEFAULT_PERSONAL, DEFAULT_TEAM, REG, sidebar_for
from ..services import notify, record_activity, user_brief

router = APIRouter(prefix="/spaces", tags=["spaces"])


class SpaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: str = Field(pattern="^(personal|team)$")
    description: Optional[str] = None
    icon: str = "sparkles"
    accent: str = "violet"
    capabilities: list[str] = []
    invites: list[EmailStr] = []


class SpacePatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    accent: Optional[str] = None
    settings: Optional[dict] = None
    voro_context: Optional[dict] = None


class CapabilityIn(BaseModel):
    key: str


class ReorderIn(BaseModel):
    order: list[str]


class InviteIn(BaseModel):
    emails: list[EmailStr]
    role: str = Field(default="member", pattern="^(admin|member|viewer)$")


class RoleIn(BaseModel):
    role: str = Field(pattern="^(admin|member|viewer)$")


def space_out(space: Space, member: SpaceMember | None = None, extra=None):
    d = dump(space)
    d["role"] = member.role if member else None
    d["sidebar"] = sidebar_for(space.enabled_capabilities or [], space.sidebar_order)
    if extra:
        d.update(extra)
    return d


async def _members_with_users(db, space_id):
    rows = (await db.execute(select(SpaceMember, User).join(User, User.id == SpaceMember.user_id).where(SpaceMember.space_id == space_id))).all()
    return [dump(m, extra={"user": user_brief(u)}) for m, u in rows]


@router.get("")
async def list_spaces(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Space, SpaceMember).join(SpaceMember, SpaceMember.space_id == Space.id)
                             .where(SpaceMember.user_id == user.id, SpaceMember.status == "active", Space.deleted_at.is_(None)).order_by(Space.created_at))).all()
    out = []
    for s, m in rows:
        count = (await db.execute(select(func.count()).select_from(SpaceMember).where(SpaceMember.space_id == s.id, SpaceMember.status == "active"))).scalar()
        out.append(space_out(s, m, {"member_count": count}))
    return out


@router.post("", status_code=201)
async def create_space(body: SpaceIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None)):
    if idempotency_key:
        prev = (await db.execute(select(IdempotencyKey).where(IdempotencyKey.user_id == user.id, IdempotencyKey.key == idempotency_key))).scalar_one_or_none()
        if prev:
            return prev.response
    ent = await entitlements(db, user)
    if body.type == "team":
        owned = (await db.execute(select(func.count()).select_from(Space).where(Space.owner_id == user.id, Space.type == "team", Space.deleted_at.is_(None)))).scalar()
        if owned >= ent["limits"]["team_spaces"]:
            raise ApiError(402, "PLAN_REQUIRED", "Team Spaces require the Pro plan or higher.", {"feature": "team_spaces", "limit": ent["limits"]["team_spaces"], "plan": ent["plan"], "upgrade": "/settings/billing"})
    caps = [k for k in body.capabilities if k in BY_KEY] or (DEFAULT_TEAM if body.type == "team" else DEFAULT_PERSONAL)
    if body.type == "team":
        for k in ("chat", "team"):
            if k not in caps:
                caps.append(k)
    space = Space(name=body.name.strip(), type=body.type, description=body.description, icon=body.icon, accent=body.accent, owner_id=user.id, enabled_capabilities=caps, sidebar_order=caps)
    db.add(space)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise ApiError(409, "DUPLICATE_SPACE", "You already have a Space with this name.")
    db.add(SpaceMember(space_id=space.id, user_id=user.id, role="owner", status="active", joined_at=now()))
    if body.type == "team":
        conv = Conversation(type="space", space_id=space.id, created_by=user.id, title=space.name, icon=space.icon, accent=space.accent)
        db.add(conv)
        await db.flush()
        db.add(ConversationMember(conversation_id=conv.id, user_id=user.id))
    await db.flush()
    invited = []
    for email in body.invites[:50]:
        invited.append(await _invite(db, space, user, email.lower(), "member"))
    await record_activity(db, space.id, user, "space.created", "space", space.id, f"{user.name} created the space {space.name}")
    resp = space_out(space, None, {"role": "owner", "invited": invited})
    if idempotency_key:
        db.add(IdempotencyKey(user_id=user.id, key=idempotency_key, response=resp, status_code=201))
    await db.commit()
    return resp


async def _invite(db, space: Space, inviter: User, email: str, role: str):
    existing_user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing_user:
        member = (await db.execute(select(SpaceMember).where(SpaceMember.space_id == space.id, SpaceMember.user_id == existing_user.id))).scalar_one_or_none()
        if member:
            return {"email": email, "status": "already_member"}
        db.add(SpaceMember(space_id=space.id, user_id=existing_user.id, role=role, status="active", invited_at=now(), joined_at=now()))
        conv = (await db.execute(select(Conversation).where(Conversation.space_id == space.id, Conversation.type == "space"))).scalar_one_or_none()
        if conv:
            db.add(ConversationMember(conversation_id=conv.id, user_id=existing_user.id))
        await db.flush()
        await notify(db, [existing_user.id], "invitation", f"{inviter.name} added you to {space.name}", "Open the Space to start collaborating.", f"/dashboard/spaces/{space.id}", space.id)
        await hub.send_to_users([existing_user.id], "space.joined", {"space_id": space.id})
        return {"email": email, "status": "joined", "user": user_brief(existing_user)}
    inv = (await db.execute(select(Invitation).where(Invitation.space_id == space.id, Invitation.email == email))).scalar_one_or_none()
    if not inv:
        inv = Invitation(space_id=space.id, email=email, role=role, token=secrets.token_urlsafe(24), invited_by=inviter.id)
        db.add(inv)
        await db.flush()
    return {"email": email, "status": "invited", "token": inv.token}


@router.get("/{space_id}")
async def get_space(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    members = await _members_with_users(db, ctx.space.id)
    integrations = (await db.execute(select(Integration).where(Integration.space_id == ctx.space.id))).scalars().all()
    return space_out(ctx.space, ctx.member, {"members": members, "member_count": len(members), "integrations": [dump(i) for i in integrations]})


@router.patch("/{space_id}")
async def update_space(body: SpacePatch, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ctx.space, k, v)
    await record_activity(db, ctx.space.id, ctx.user, "space.updated", "space", ctx.space.id, f"{ctx.user.name} updated space settings")
    await db.commit()
    return space_out(ctx.space, ctx.member)


@router.delete("/{space_id}")
async def delete_space(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    ctx.require("owner")
    ctx.space.deleted_at = now()
    await db.commit()
    return {"ok": True}


# ---- Space Library
@router.get("/{space_id}/library")
async def library(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    ent = await entitlements(db, ctx.user)
    enabled = set(ctx.space.enabled_capabilities or [])
    integrations = {i.provider: i.status for i in (await db.execute(select(Integration).where(Integration.space_id == ctx.space.id))).scalars().all()}
    items = []
    for c in REG:
        locked = bool(c["plan"]) and ent["plan"] == "free"
        items.append({**c, "enabled": c["key"] in enabled, "locked": locked, "integration_status": integrations.get(c["key"]) if c["type"] == "integration" else None})
    return {"items": items, "plan": ent["plan"], "sidebar": sidebar_for(list(enabled), ctx.space.sidebar_order)}


@router.post("/{space_id}/library/enable")
async def enable_capability(body: CapabilityIn, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    c = BY_KEY.get(body.key)
    if not c:
        raise not_found("Capability")
    if c["plan"]:
        await require_feature(db, ctx.user, "integrations" if c["type"] == "integration" else "automation" if c["key"] == "automations" else "collaboration")
    caps = list(ctx.space.enabled_capabilities or [])
    if body.key not in caps:
        caps.append(body.key)
        ctx.space.enabled_capabilities = caps
        ctx.space.sidebar_order = list(ctx.space.sidebar_order or []) + [body.key]
        if body.key == "chat" and not (await db.execute(select(Conversation.id).where(Conversation.space_id == ctx.space.id, Conversation.type == "space"))).scalar_one_or_none():
            conv = Conversation(type="space", space_id=ctx.space.id, created_by=ctx.user.id, title=ctx.space.name, icon=ctx.space.icon, accent=ctx.space.accent)
            db.add(conv)
            await db.flush()
            for m in (await db.execute(select(SpaceMember).where(SpaceMember.space_id == ctx.space.id, SpaceMember.status == "active"))).scalars().all():
                db.add(ConversationMember(conversation_id=conv.id, user_id=m.user_id))
        await record_activity(db, ctx.space.id, ctx.user, "capability.enabled", "capability", body.key, f"{ctx.user.name} added {c['name']} to the space")
        await db.commit()
    return space_out(ctx.space, ctx.member)


@router.post("/{space_id}/library/disable")
async def disable_capability(body: CapabilityIn, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    caps = [k for k in (ctx.space.enabled_capabilities or []) if k != body.key]
    ctx.space.enabled_capabilities = caps
    ctx.space.sidebar_order = [k for k in (ctx.space.sidebar_order or []) if k != body.key]
    await record_activity(db, ctx.space.id, ctx.user, "capability.disabled", "capability", body.key, f"{ctx.user.name} removed {BY_KEY.get(body.key, {}).get('name', body.key)} from the space")
    await db.commit()
    return space_out(ctx.space, ctx.member)


@router.post("/{space_id}/library/reorder")
async def reorder(body: ReorderIn, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    ctx.space.sidebar_order = [k for k in body.order if k in (ctx.space.enabled_capabilities or [])]
    await db.commit()
    return space_out(ctx.space, ctx.member)


# ---- Members & invitations
@router.get("/{space_id}/members")
async def members(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    invites = (await db.execute(select(Invitation).where(Invitation.space_id == ctx.space.id, Invitation.status == "pending"))).scalars().all()
    return {"members": await _members_with_users(db, ctx.space.id), "invitations": [dump(i, ["id", "email", "role", "status", "created_at"]) for i in invites]}


@router.post("/{space_id}/invitations", status_code=201)
async def invite(body: InviteIn, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    if ctx.space.type != "team":
        raise ApiError(400, "PERSONAL_SPACE", "Personal Spaces cannot have members. Create a Team Space to collaborate.")
    ent = await require_feature(db, ctx.user, "collaboration") if ctx.space.owner_id == ctx.user.id else await entitlements(db, ctx.user)
    count = (await db.execute(select(func.count()).select_from(SpaceMember).where(SpaceMember.space_id == ctx.space.id))).scalar()
    if count + len(body.emails) > ent["limits"]["members_per_team"]:
        raise ApiError(402, "PLAN_REQUIRED", "Member limit reached for your plan.", {"limit": ent["limits"]["members_per_team"], "current": count, "upgrade": "/settings/billing"})
    results = [await _invite(db, ctx.space, ctx.user, e.lower(), body.role) for e in body.emails[:50]]
    await record_activity(db, ctx.space.id, ctx.user, "member.invited", "member", None, f"{ctx.user.name} invited {len(results)} people")
    await db.commit()
    return results


@router.post("/invitations/{token}/accept")
async def accept_invitation(token: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invitation).where(Invitation.token == token, Invitation.status == "pending"))).scalar_one_or_none()
    if not inv:
        raise not_found("Invitation")
    if inv.email != user.email:
        raise ApiError(403, "FORBIDDEN", "This invitation was sent to a different email address.")
    existing = (await db.execute(select(SpaceMember).where(SpaceMember.space_id == inv.space_id, SpaceMember.user_id == user.id))).scalar_one_or_none()
    if not existing:
        db.add(SpaceMember(space_id=inv.space_id, user_id=user.id, role=inv.role, status="active", invited_at=inv.created_at, joined_at=now()))
        conv = (await db.execute(select(Conversation).where(Conversation.space_id == inv.space_id, Conversation.type == "space"))).scalar_one_or_none()
        if conv:
            db.add(ConversationMember(conversation_id=conv.id, user_id=user.id))
    inv.status = "accepted"
    await db.commit()
    return {"space_id": inv.space_id}


@router.patch("/{space_id}/members/{user_id}")
async def change_role(user_id: str, body: RoleIn, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(SpaceMember).where(SpaceMember.space_id == ctx.space.id, SpaceMember.user_id == user_id))).scalar_one_or_none()
    if not m:
        raise not_found("Member")
    if m.role == "owner":
        raise ApiError(400, "OWNER_ROLE", "The owner role cannot be changed.")
    m.role = body.role
    await record_activity(db, ctx.space.id, ctx.user, "member.role_changed", "member", user_id, f"{ctx.user.name} changed a member's role to {body.role}")
    await db.commit()
    await hub.send_to_users([user_id], "space.permissions_changed", {"space_id": ctx.space.id, "role": body.role})
    return dump(m)


@router.delete("/{space_id}/members/{user_id}")
async def remove_member(user_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    if user_id != ctx.user.id:
        ctx.require("admin")
    m = (await db.execute(select(SpaceMember).where(SpaceMember.space_id == ctx.space.id, SpaceMember.user_id == user_id))).scalar_one_or_none()
    if not m:
        raise not_found("Member")
    if m.role == "owner":
        raise ApiError(400, "OWNER_ROLE", "The owner cannot be removed.")
    await db.delete(m)
    await db.commit()
    await hub.send_to_users([user_id], "space.removed", {"space_id": ctx.space.id})
    return {"ok": True}


# ---- Space Home summary (one viewport)
@router.get("/{space_id}/home")
async def home(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    sid = ctx.space.id
    t = now()
    week = t + timedelta(days=7)
    projects = (await db.execute(select(func.count()).select_from(Project).where(Project.space_id == sid, Project.deleted_at.is_(None), Project.status == "active"))).scalar()
    new_projects = (await db.execute(select(func.count()).select_from(Project).where(Project.space_id == sid, Project.deleted_at.is_(None), Project.created_at >= t - timedelta(days=7)))).scalar()
    open_tasks = (await db.execute(select(func.count()).select_from(Task).where(Task.space_id == sid, Task.deleted_at.is_(None), Task.status != "done"))).scalar()
    tasks_today = (await db.execute(select(func.count()).select_from(Task).where(Task.space_id == sid, Task.deleted_at.is_(None), Task.created_at >= t.replace(hour=0, minute=0, second=0)))).scalar()
    members = (await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == sid, SpaceMember.status == "active"))).scalars().all()
    online = sum(1 for m in members if hub.is_online(m))
    meetings = (await db.execute(select(func.count()).select_from(CalendarEvent).where(CalendarEvent.space_id == sid, CalendarEvent.deleted_at.is_(None), CalendarEvent.kind == "meeting", CalendarEvent.start_at >= t, CalendarEvent.start_at <= week))).scalar()
    upcoming = (await db.execute(select(CalendarEvent).where(CalendarEvent.space_id == sid, CalendarEvent.deleted_at.is_(None), CalendarEvent.end_at >= t).order_by(CalendarEvent.start_at).limit(6))).scalars().all()
    my_tasks = (await db.execute(select(Task).where(Task.space_id == sid, Task.deleted_at.is_(None), Task.status != "done").order_by(Task.due_at.asc().nulls_last(), Task.created_at.desc()).limit(8))).scalars().all()
    activity = (await db.execute(select(Activity, User).join(User, User.id == Activity.actor_id).where(Activity.space_id == sid).order_by(Activity.created_at.desc()).limit(8))).all()
    notes_count = (await db.execute(select(func.count()).select_from(Note).where(Note.space_id == sid, Note.deleted_at.is_(None)))).scalar()
    docs_count = (await db.execute(select(func.count()).select_from(Document).where(Document.space_id == sid, Document.deleted_at.is_(None)))).scalar()
    files_count = (await db.execute(select(func.count()).select_from(FileObject).where(FileObject.space_id == sid, FileObject.deleted_at.is_(None)))).scalar()
    return {
        "stats": {"active_projects": projects, "new_projects": new_projects, "open_tasks": open_tasks, "tasks_today": tasks_today, "members": len(members), "online": online, "meetings": meetings,
                  "notes": notes_count, "documents": docs_count, "files": files_count},
        "upcoming": [dump(e) for e in upcoming], "tasks": [dump(x) for x in my_tasks],
        "activity": [dump(a, extra={"actor": user_brief(u)}) for a, u in activity],
        "synced_at": t.isoformat(),
    }
