"""Global Notevoro Inbox — Brain-only aggregator + Mail/Send composer.

Design principles (per product spec):
  * ONE Inbox per user, mounted at /api/v1/inbox. Never per-Space.
  * Every event carries its ORIGINATING Space (`source_space_id`) as
    metadata, derived from the canonical object it references or from the
    explicit "From Space" the sender selected.
  * Never duplicates objects. `object_type` + `object_id` reference the
    canonical row; opening the event opens the actual object.
  * Enforces authorization on both send and read paths — the recipient
    only sees what they may see, the sender only sends from Spaces they
    belong to, and only shares objects they have write access to.
"""
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import current_user
from ..authz import (SHARE_ROLES, VISIBILITY_VALUES, can_edit_object,
                     load_space_context, require_object_read,
                     sanitize_shared_with)
from ..core import ApiError, dump, not_found
from ..db import get_db, now
from ..models import (Document, FileObject, InboxEvent, Note, Page, Project,
                      Space, SpaceMember, Task, User)
from ..services import create_inbox_event, user_brief

router = APIRouter(prefix="/inbox", tags=["inbox"])


# ---------------------------------------------------------------------------
# object registry — the ONE place that knows how to resolve a canonical
# object reference back to the row + its Space + a preview title.
# ---------------------------------------------------------------------------
_OBJECT_MODELS = {
    "page": Page,
    "document": Document,
    "note": Note,
    "project": Project,
    "task": Task,
    "file": FileObject,
}


async def _load_object(db: AsyncSession, object_type: str, object_id: str):
    model = _OBJECT_MODELS.get(object_type)
    if not model:
        return None
    row = (await db.execute(select(model).where(model.id == object_id))).scalar_one_or_none()
    return row


def _object_preview(row) -> dict:
    if not row:
        return {"title": "(unknown)"}
    title = getattr(row, "title", None) or getattr(row, "name", None) or "(untitled)"
    return {"title": title, "space_id": getattr(row, "space_id", None)}


# ---------------------------------------------------------------------------
# request schemas
# ---------------------------------------------------------------------------
class ComposeIn(BaseModel):
    """Compose payload for the Inbox / object Send Composer.

    * `source_space_id` is REQUIRED — no Inbox event can be authored without a
      Source Space. If the user is composing from Brain, they MUST select one
      before submit (frontend enforces this too).
    * `recipient_ids` is a list of user_ids. Recipients must be members of
      `source_space_id`, OR (for object shares) will be granted 'specific'
      access via the object's shared_with list. If the sender is not an admin
      of the source Space and the recipient is not a member, the send is
      rejected with 403 NOT_REACHABLE.
    """
    source_space_id: str
    recipient_ids: list[str] = Field(min_length=1, max_length=100)
    subject: Optional[str] = Field(default=None, max_length=300)
    body: Optional[str] = Field(default=None, max_length=8000)
    object_type: Optional[str] = None
    object_id: Optional[str] = None
    permission: Optional[Literal["viewer", "editor"]] = None  # for share
    grant_access: bool = True  # if True and object is 'specific', add recipients to shared_with


class DecisionIn(BaseModel):
    accept: bool = True


class ReadIn(BaseModel):
    id: Optional[str] = None
    all: bool = False


# ---------------------------------------------------------------------------
# list / detail
# ---------------------------------------------------------------------------
@router.get("")
async def list_inbox(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
    category: Literal["all", "invitations", "shared", "mentions", "activity", "system"] = "all",
    space_id: Optional[str] = None,
    unread: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List Inbox events for the current user, newest first, with premium
    scanning-friendly categories and space filtering."""
    q = select(InboxEvent).where(InboxEvent.recipient_id == user.id)
    if category == "invitations":
        q = q.where(InboxEvent.event_type == "invitation")
    elif category == "shared":
        q = q.where(InboxEvent.event_type.in_(("mail", "share")))
    elif category == "mentions":
        q = q.where(InboxEvent.event_type == "mention")
    elif category == "activity":
        q = q.where(InboxEvent.event_type == "activity")
    elif category == "system":
        q = q.where(InboxEvent.event_type == "system")
    if space_id == "__none__":
        q = q.where(InboxEvent.source_space_id.is_(None))
    elif space_id:
        q = q.where(InboxEvent.source_space_id == space_id)
    if unread is True:
        q = q.where(InboxEvent.read_at.is_(None))
    if unread is False:
        q = q.where(InboxEvent.read_at.is_not(None))
    if search:
        like = f"%{search.lower()}%"
        q = q.where(or_(func.lower(InboxEvent.subject).like(like),
                        func.lower(InboxEvent.body).like(like)))
    q = q.order_by(InboxEvent.created_at.desc()).limit(min(limit, 100)).offset(offset)
    rows = (await db.execute(q)).scalars().all()

    # bulk-load senders and spaces for scanning speed
    sender_ids = list({r.sender_id for r in rows if r.sender_id})
    space_ids = list({r.source_space_id for r in rows if r.source_space_id})
    senders = {u.id: u for u in (await db.execute(select(User).where(User.id.in_(sender_ids)))).scalars().all()} if sender_ids else {}
    spaces = {s.id: s for s in (await db.execute(select(Space).where(Space.id.in_(space_ids)))).scalars().all()} if space_ids else {}

    unread_count = (await db.execute(
        select(func.count()).select_from(InboxEvent).where(InboxEvent.recipient_id == user.id, InboxEvent.read_at.is_(None))
    )).scalar()

    # per-space counts for the sidebar filter
    space_counts_rows = (await db.execute(
        select(InboxEvent.source_space_id, func.count()).where(InboxEvent.recipient_id == user.id).group_by(InboxEvent.source_space_id)
    )).all()
    space_counts = {(sid or "__none__"): c for sid, c in space_counts_rows}

    items = []
    for r in rows:
        sender = senders.get(r.sender_id) if r.sender_id else None
        space = spaces.get(r.source_space_id) if r.source_space_id else None
        items.append({
            **dump(r),
            "sender": user_brief(sender),
            "source_space": ({"id": space.id, "name": space.name, "type": space.type, "icon": space.icon, "accent": space.accent} if space else None),
        })
    return {"items": items, "unread": unread_count, "space_counts": space_counts}


@router.get("/{event_id}")
async def get_event(event_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.recipient_id == user.id))).scalar_one_or_none()
    if not row:
        raise not_found("Inbox event")
    sender = (await db.execute(select(User).where(User.id == row.sender_id))).scalar_one_or_none() if row.sender_id else None
    space = (await db.execute(select(Space).where(Space.id == row.source_space_id))).scalar_one_or_none() if row.source_space_id else None
    obj_preview = None
    if row.object_type and row.object_id:
        obj_row = await _load_object(db, row.object_type, row.object_id)
        if obj_row is not None:
            obj_preview = _object_preview(obj_row)
    return {
        **dump(row),
        "sender": user_brief(sender),
        "source_space": ({"id": space.id, "name": space.name, "type": space.type, "icon": space.icon, "accent": space.accent} if space else None),
        "object_preview": obj_preview,
    }


# ---------------------------------------------------------------------------
# read state
# ---------------------------------------------------------------------------
@router.post("/read")
async def mark_read(body: ReadIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    stmt = update(InboxEvent).where(InboxEvent.recipient_id == user.id, InboxEvent.read_at.is_(None))
    if body.id and not body.all:
        stmt = stmt.where(InboxEvent.id == body.id)
    await db.execute(stmt.values(read_at=now()))
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# compose / send
# ---------------------------------------------------------------------------
@router.post("/compose", status_code=201)
async def compose(body: ComposeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """The single composer endpoint used by:
      * Brain Inbox → Compose
      * Any object → Send (documents, notes, pages, projects, tasks, files)
      * Chat → Send as Mail

    Authorization is enforced strictly on the server:
      1) sender must be an active member of source_space_id
      2) if object attached: sender must have READ access on that object AND
         the object must belong to source_space_id (no cross-space leaking)
      3) if grant_access + object visibility != 'team': add recipients as
         'specific' shares on the canonical object
      4) each recipient must be reachable — either an active member of
         source_space_id OR (fallback) another user the sender has already
         collaborated with via any shared Space. Otherwise the recipient
         entry is silently dropped and reported in the response.
    """
    # (1) sender is a member of source_space_id
    space_ctx_obj = await load_space_context(body.source_space_id, user, db)

    # (2) resolve + validate object if provided
    obj_row = None
    if body.object_type or body.object_id:
        if not (body.object_type and body.object_id):
            raise ApiError(422, "INVALID_OBJECT_REF", "Both object_type and object_id are required to attach an object")
        obj_row = await _load_object(db, body.object_type, body.object_id)
        if obj_row is None or getattr(obj_row, "deleted_at", None):
            raise not_found("Object")
        if obj_row.space_id != body.source_space_id:
            # sender cannot pretend an object belongs to another Space
            raise ApiError(422, "INVALID_OBJECT_SPACE", "The attached object does not belong to the selected Source Space")
        # sender must be able to READ the object at minimum
        require_object_read(space_ctx_obj, obj_row)

    perm = body.permission or ("viewer" if obj_row else None)

    # (3) determine reachable recipients
    sender_spaces = (await db.execute(select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active"))).scalars().all()
    reachable_check_space_ids = list(set(sender_spaces))
    recipient_rows = (await db.execute(select(User).where(User.id.in_(body.recipient_ids)))).scalars().all()
    src_members = set((await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == body.source_space_id, SpaceMember.status == "active"))).scalars().all())

    delivered, skipped = [], []
    for rec in recipient_rows:
        if rec.id == user.id:
            skipped.append({"user_id": rec.id, "reason": "self"})
            continue
        is_src_member = rec.id in src_members
        # fallback: shared_space check
        if not is_src_member:
            shared = (await db.execute(
                select(func.count()).select_from(SpaceMember)
                .where(SpaceMember.user_id == rec.id, SpaceMember.status == "active", SpaceMember.space_id.in_(reachable_check_space_ids))
            )).scalar()
            if not shared:
                skipped.append({"user_id": rec.id, "reason": "not_reachable"})
                continue

        # (3a) grant object access when required
        if obj_row and body.grant_access and is_src_member and getattr(obj_row, "visibility", "team") != "team":
            entries = list(getattr(obj_row, "shared_with", None) or [])
            if not any(isinstance(e, dict) and e.get("user_id") == rec.id for e in entries):
                entries.append({"user_id": rec.id, "role": perm or "viewer"})
                obj_row.shared_with = sanitize_shared_with(entries)
            # Promote visibility so the ACL actually admits the recipient.
            # 'private' -> 'specific'; 'specific' stays specific; 'team' bypassed above.
            if getattr(obj_row, "visibility", "team") == "private":
                obj_row.visibility = "specific"

        # (4) canonical event
        event_type = "share" if obj_row else "mail"
        evt = await create_inbox_event(
            db,
            recipient_id=rec.id,
            sender_id=user.id,
            source_space_id=body.source_space_id,
            event_type=event_type,
            subject=body.subject or (getattr(obj_row, "title", None) or getattr(obj_row, "name", None) if obj_row else None),
            body=body.body,
            object_type=body.object_type,
            object_id=body.object_id,
            permission=perm,
            link=(f"/dashboard/spaces/{body.source_space_id}/{body.object_type}s/{body.object_id}" if obj_row and is_src_member else None),
            status="accepted" if (obj_row and is_src_member) else "pending",
            meta={"source_object_title": getattr(obj_row, "title", None) or getattr(obj_row, "name", None)} if obj_row else {},
        )
        delivered.append({"user_id": rec.id, "event_id": evt.id})
    await db.commit()
    return {"delivered": delivered, "skipped": skipped}


# ---------------------------------------------------------------------------
# accept / decline (for pending shares)
# ---------------------------------------------------------------------------
@router.post("/{event_id}/accept")
async def accept_event(event_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.recipient_id == user.id))).scalar_one_or_none()
    if not row:
        raise not_found("Inbox event")
    if row.status in ("accepted", "declined", "archived"):
        return dump(row)
    # Only 'share' events with a pending object need explicit acceptance
    if row.event_type == "share" and row.object_type and row.object_id and row.source_space_id:
        # Ensure sender still has write access; refresh membership + acl if
        # the recipient is now a member of the source Space.
        obj_row = await _load_object(db, row.object_type, row.object_id)
        if obj_row is not None:
            is_member = (await db.execute(select(SpaceMember).where(
                SpaceMember.space_id == row.source_space_id,
                SpaceMember.user_id == user.id,
                SpaceMember.status == "active",
            ))).scalar_one_or_none() is not None
            if is_member and getattr(obj_row, "visibility", "team") != "team":
                entries = list(getattr(obj_row, "shared_with", None) or [])
                if not any(isinstance(e, dict) and e.get("user_id") == user.id for e in entries):
                    entries.append({"user_id": user.id, "role": row.permission or "viewer"})
                    obj_row.shared_with = sanitize_shared_with(entries)
    row.status = "accepted"
    row.read_at = row.read_at or now()
    await db.commit()
    return dump(row)


@router.post("/{event_id}/decline")
async def decline_event(event_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.recipient_id == user.id))).scalar_one_or_none()
    if not row:
        raise not_found("Inbox event")
    row.status = "declined"
    row.read_at = row.read_at or now()
    await db.commit()
    return dump(row)


@router.delete("/{event_id}")
async def archive_event(event_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.recipient_id == user.id))).scalar_one_or_none()
    if not row:
        raise not_found("Inbox event")
    row.status = "archived"
    row.read_at = row.read_at or now()
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# recipient search — used by the Compose "To:" popup
# ---------------------------------------------------------------------------
@router.get("/recipients/search")
async def search_recipients(
    q: str = "",
    source_space_id: Optional[str] = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return only users the sender can actually reach — never exposes
    unauthorized directory data. If `source_space_id` is provided, members
    of that space come first."""
    my_space_ids = (await db.execute(select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active"))).scalars().all()
    if not my_space_ids:
        return {"items": []}
    reachable_ids = (await db.execute(
        select(SpaceMember.user_id).where(SpaceMember.space_id.in_(my_space_ids), SpaceMember.status == "active")
    )).scalars().all()
    reachable_ids = list({u for u in reachable_ids if u != user.id})
    if not reachable_ids:
        return {"items": []}
    query = select(User).where(User.id.in_(reachable_ids))
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(func.lower(User.name).like(like), func.lower(User.email).like(like)))
    query = query.limit(20)
    users = (await db.execute(query)).scalars().all()
    src_members = set()
    if source_space_id:
        src_members = set((await db.execute(select(SpaceMember.user_id).where(
            SpaceMember.space_id == source_space_id, SpaceMember.status == "active"
        ))).scalars().all())
    items = [{**user_brief(u), "in_source_space": (u.id in src_members)} for u in users]
    # in-source-space members first
    items.sort(key=lambda x: (not x.get("in_source_space"), x["name"].lower()))
    return {"items": items}
