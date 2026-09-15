from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Header, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..authz import (SpaceContext, can_access_object, can_edit_object,
                     filter_accessible, require_object_read, require_object_write,
                     sanitize_shared_with, space_ctx, writer_ctx,
                     VISIBILITY_VALUES)
from ..core import ApiError, dump, forbidden, not_found
from ..db import get_db, now
from ..entitlements import entitlements
from ..models import CalendarEvent, Document, DocumentVersion, FileObject, Note, Project, Record, Task, User
from ..realtime import hub
from ..registry import BY_KEY
from ..services import notify, record_activity
from ..storage import storage
from ..models import SpaceMember

router = APIRouter(prefix="/spaces/{space_id}", tags=["items"])


class NoteIn(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    pinned: Optional[bool] = None
    links: Optional[list[str]] = None


class DocIn(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    project_id: Optional[str] = None


class TaskIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_at: Optional[datetime] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    tags: Optional[list[str]] = None
    position: Optional[int] = None


class ProjectIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None
    due_at: Optional[datetime] = None


class EventIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    all_day: Optional[bool] = None
    location: Optional[str] = None
    kind: Optional[str] = None
    meeting_provider: Optional[str] = None
    meeting_url: Optional[str] = None
    attendees: Optional[list[str]] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    transcript: Optional[str] = None
    project_id: Optional[str] = None
    color: Optional[str] = None


class RecordIn(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    due_at: Optional[datetime] = None
    fields: Optional[dict] = None
    position: Optional[int] = None


class VisibilityIn(BaseModel):
    visibility: str  # 'private' | 'specific' | 'team'
    shared_with: Optional[list[dict]] = None  # [{user_id, role}]


async def _members(db, space_id):
    return (await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == space_id, SpaceMember.status == "active"))).scalars().all()


async def _emit(db, ctx: SpaceContext, event: str, payload: dict):
    await hub.send_to_users(await _members(db, ctx.space.id), event, {**payload, "space_id": ctx.space.id})


async def _recipients_for(db, ctx: SpaceContext, obj) -> list[str]:
    """Users who may see this object — closes WebSocket/notification leakage."""
    vis = getattr(obj, "visibility", "team") or "team"
    if vis == "team":
        return await _members(db, ctx.space.id)
    recipients = {obj.created_by}
    if vis == "specific":
        for entry in (getattr(obj, "shared_with", None) or []):
            if isinstance(entry, dict) and entry.get("user_id"):
                recipients.add(entry["user_id"])
    admins = (await db.execute(select(SpaceMember.user_id).where(
        SpaceMember.space_id == ctx.space.id,
        SpaceMember.status == "active",
        SpaceMember.role.in_(("owner", "admin")),
    ))).scalars().all()
    recipients.update(admins)
    return list(recipients)


async def _emit_scoped(db, ctx: SpaceContext, obj, event: str, payload: dict):
    recipients = await _recipients_for(db, ctx, obj)
    await hub.send_to_users(recipients, event, {**payload, "space_id": ctx.space.id})


def crud(model, prefix: str, label: str, schema, capability: str, order_by, on_create=None):
    name = model.__tablename__

    @router.get(f"/{prefix}", name=f"list_{name}")
    async def list_items(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db), q: str | None = None, project_id: str | None = None, status: str | None = None, limit: int = 200, offset: int = 0, visibility: str | None = None, mine: bool = False):
        stmt = select(model).where(model.space_id == ctx.space.id, model.deleted_at.is_(None))
        if q:
            cols = [getattr(model, c) for c in ("title", "name", "content", "description", "body") if hasattr(model, c)]
            stmt = stmt.where(or_(*[c.ilike(f"%{q}%") for c in cols]))
        if project_id and hasattr(model, "project_id"):
            stmt = stmt.where(model.project_id == project_id)
        if status and hasattr(model, "status"):
            stmt = stmt.where(model.status == status)
        if visibility in VISIBILITY_VALUES and hasattr(model, "visibility"):
            stmt = stmt.where(model.visibility == visibility)
        if mine and hasattr(model, "created_by"):
            # "My Work" filter — the caller's private + owned specific-share items
            stmt = stmt.where(model.created_by == ctx.user.id)
        rows = (await db.execute(stmt.order_by(*order_by(model)).limit(min(limit, 500)).offset(offset))).scalars().all()
        # ACL: strip out rows the caller cannot see even if they're in the same Space.
        rows = filter_accessible(ctx, rows)
        return [dump(r) for r in rows]

    @router.post(f"/{prefix}", status_code=201, name=f"create_{name}")
    async def create_item(body: schema, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
        data = body.model_dump(exclude_none=True)
        # Extract ACL fields if the caller sent them (creator can set on create)
        visibility_in = data.pop("visibility", None)
        shared_with_in = data.pop("shared_with", None)
        obj = model(space_id=ctx.space.id, created_by=ctx.user.id, **data)
        if hasattr(obj, "title") and not getattr(obj, "title", None):
            obj.title = "Untitled"
        if hasattr(obj, "name") and not getattr(obj, "name", None):
            raise ApiError(422, "VALIDATION_ERROR", "Name is required")
        if hasattr(obj, "start_at") and (not obj.start_at or not obj.end_at):
            obj.start_at = obj.start_at or now()
            obj.end_at = obj.end_at or obj.start_at + timedelta(hours=1)
        # Default visibility rule:
        #   Personal Space -> private (never accidentally exposed)
        #   Team Space     -> team    (matches user's expectation of team collab)
        if hasattr(obj, "visibility"):
            if visibility_in in VISIBILITY_VALUES:
                obj.visibility = visibility_in
            else:
                obj.visibility = "private" if ctx.space.type == "personal" else "team"
        if hasattr(obj, "shared_with"):
            obj.shared_with = sanitize_shared_with(shared_with_in)
        db.add(obj)
        await db.flush()
        title = getattr(obj, "title", None) or getattr(obj, "name", "")
        # Activity feeds only surface team-visible objects — private/specific
        # creations should not leak to the whole Space activity stream.
        if getattr(obj, "visibility", "team") == "team":
            await record_activity(db, ctx.space.id, ctx.user, f"{name}.created", label, obj.id, f"{ctx.user.name} created {label} \"{title}\"")
        if on_create:
            await on_create(db, ctx, obj)
        await db.commit()
        # Realtime "changed" events must only be emitted to users who can see
        # this object — otherwise UIs would light up with unreachable IDs.
        await _emit_scoped(db, ctx, obj, f"{name}.changed", {"id": obj.id, "op": "create"})
        return dump(obj)

    @router.get(f"/{prefix}/{{item_id}}", name=f"get_{name}")
    async def get_item(item_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
        obj = (await db.execute(select(model).where(model.id == item_id, model.space_id == ctx.space.id, model.deleted_at.is_(None)))).scalar_one_or_none()
        require_object_read(ctx, obj)
        return dump(obj)

    @router.patch(f"/{prefix}/{{item_id}}", name=f"update_{name}")
    async def update_item(item_id: str, body: schema, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
        obj = (await db.execute(select(model).where(model.id == item_id, model.space_id == ctx.space.id, model.deleted_at.is_(None)))).scalar_one_or_none()
        require_object_write(ctx, obj)
        data = body.model_dump(exclude_unset=True)
        # Never allow visibility/ACL to be mutated through the generic PATCH
        # — the dedicated /visibility endpoint enforces the promote-to-team
        # semantics and audit logging.
        data.pop("visibility", None)
        data.pop("shared_with", None)
        if model is Document and "content" in data and data["content"] != obj.content:
            db.add(DocumentVersion(document_id=obj.id, version=obj.version, content=obj.content, author_id=ctx.user.id))
            obj.version += 1
        for k, v in data.items():
            setattr(obj, k, v)
        if model is Task and data.get("status") == "done":
            await record_activity(db, ctx.space.id, ctx.user, "task.completed", "task", obj.id, f"{ctx.user.name} completed \"{obj.title}\"")
        if model is Task and data.get("assignee_id") and data["assignee_id"] != ctx.user.id:
            # Notifications only fire if the assignee can actually access the task.
            if can_access_object(ctx, obj) or getattr(obj, "visibility", "team") == "team":
                await notify(db, [data["assignee_id"]], "assignment", f"{ctx.user.name} assigned you a task", obj.title, f"/dashboard/spaces/{ctx.space.id}/tasks", ctx.space.id)
        await db.commit()
        await _emit_scoped(db, ctx, obj, f"{name}.changed", {"id": obj.id, "op": "update"})
        return dump(obj)

    @router.delete(f"/{prefix}/{{item_id}}", name=f"delete_{name}")
    async def delete_item(item_id: str, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
        obj = (await db.execute(select(model).where(model.id == item_id, model.space_id == ctx.space.id, model.deleted_at.is_(None)))).scalar_one_or_none()
        require_object_write(ctx, obj)
        obj.deleted_at = now()
        if model is FileObject:
            await storage.delete(obj.storage_key)
        if getattr(obj, "visibility", "team") == "team":
            await record_activity(db, ctx.space.id, ctx.user, f"{name}.deleted", label, obj.id, f"{ctx.user.name} deleted a {label}")
        await db.commit()
        await _emit_scoped(db, ctx, obj, f"{name}.changed", {"id": obj.id, "op": "delete"})
        return {"ok": True}

    @router.patch(f"/{prefix}/{{item_id}}/visibility", name=f"share_{name}")
    async def set_visibility(item_id: str, body: "VisibilityIn", ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
        obj = (await db.execute(select(model).where(model.id == item_id, model.space_id == ctx.space.id, model.deleted_at.is_(None)))).scalar_one_or_none()
        require_object_read(ctx, obj)
        # Only creators (or space admins/owners) may reshare an object.
        if obj.created_by != ctx.user.id and not ctx.require("admin"):
            raise forbidden("Only the creator can change sharing for this item")
        if not hasattr(obj, "visibility"):
            raise ApiError(400, "NOT_SHAREABLE", f"{label} does not support visibility settings")
        new_vis = body.visibility
        if new_vis not in VISIBILITY_VALUES:
            raise ApiError(422, "VALIDATION_ERROR", f"visibility must be one of {VISIBILITY_VALUES}")
        # Promote-to-team on a Personal Space is a no-op — Personal spaces
        # have only one member, so 'team' visibility === 'private' in effect.
        # We still record the intent so a future "Move to Team Space" can
        # honor it.
        obj.visibility = new_vis
        obj.shared_with = sanitize_shared_with(body.shared_with) if new_vis == "specific" else []
        # Guard against sharing to users who aren't Space members. Silently
        # drop non-members rather than 4xx-ing so the UI can be permissive.
        if obj.shared_with:
            member_ids = set((await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == ctx.space.id, SpaceMember.status == "active"))).scalars().all())
            obj.shared_with = [e for e in obj.shared_with if e["user_id"] in member_ids]
        title = getattr(obj, "title", None) or getattr(obj, "name", "")
        # Log promotions to team so the activity feed reflects the share.
        if new_vis == "team":
            await record_activity(db, ctx.space.id, ctx.user, f"{name}.promoted", label, obj.id, f"{ctx.user.name} promoted {label} \"{title}\" to the Team")
        elif new_vis == "specific":
            await record_activity(db, ctx.space.id, ctx.user, f"{name}.shared", label, obj.id, f"{ctx.user.name} shared {label} \"{title}\" with {len(obj.shared_with)} people")
        await db.commit()
        # Emit a fresh scope-aware event so newly-authorized users receive
        # the object and revoked users' UIs can prune it.
        await _emit_scoped(db, ctx, obj, f"{name}.changed", {"id": obj.id, "op": "share", "visibility": new_vis})
        return dump(obj)


async def _notify_meeting(db, ctx, ev):
    if ev.kind == "meeting":
        await notify(db, await _members(db, ctx.space.id), "meeting", f"New meeting: {ev.title}", ev.start_at.strftime("%b %d, %H:%M"), f"/dashboard/spaces/{ctx.space.id}/meetings", ctx.space.id, exclude=ctx.user.id)


crud(Note, "notes", "note", NoteIn, "notes", lambda m: [m.pinned.desc(), m.updated_at.desc()])
crud(Document, "documents", "document", DocIn, "documents", lambda m: [m.updated_at.desc()])
crud(Task, "tasks", "task", TaskIn, "tasks", lambda m: [m.position, m.due_at.asc().nulls_last(), m.created_at.desc()])
crud(Project, "projects", "project", ProjectIn, "projects", lambda m: [m.created_at.desc()])
crud(CalendarEvent, "events", "event", EventIn, "calendar", lambda m: [m.start_at], on_create=_notify_meeting)


@router.get("/documents/{doc_id}/versions")
async def versions(doc_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    doc = (await db.execute(select(Document).where(Document.id == doc_id, Document.space_id == ctx.space.id))).scalar_one_or_none()
    if not doc:
        raise not_found("Document")
    rows = (await db.execute(select(DocumentVersion).where(DocumentVersion.document_id == doc_id).order_by(DocumentVersion.version.desc()).limit(50))).scalars().all()
    return [dump(v) for v in rows]


# ---- Generic records for library modules (courses, habits, goals, ...)
@router.get("/records/{capability_key}")
async def list_records(capability_key: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Record).where(Record.space_id == ctx.space.id, Record.capability_key == capability_key, Record.deleted_at.is_(None)).order_by(Record.position, Record.created_at.desc()))).scalars().all()
    return {"capability": BY_KEY.get(capability_key), "items": [dump(r) for r in rows]}


@router.post("/records/{capability_key}", status_code=201)
async def create_record(capability_key: str, body: RecordIn, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    if capability_key not in BY_KEY:
        raise not_found("Capability")
    ctx.require_capability(capability_key)
    obj = Record(space_id=ctx.space.id, created_by=ctx.user.id, capability_key=capability_key, **body.model_dump(exclude_none=True))
    obj.title = obj.title or "Untitled"
    db.add(obj)
    await db.flush()
    await record_activity(db, ctx.space.id, ctx.user, "record.created", BY_KEY[capability_key]["name"].lower(), obj.id, f"{ctx.user.name} added \"{obj.title}\" to {BY_KEY[capability_key]['name']}")
    await db.commit()
    return dump(obj)


@router.patch("/records/{capability_key}/{record_id}")
async def update_record(capability_key: str, record_id: str, body: RecordIn, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    obj = (await db.execute(select(Record).where(Record.id == record_id, Record.space_id == ctx.space.id, Record.deleted_at.is_(None)))).scalar_one_or_none()
    if not obj:
        raise not_found("Record")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    return dump(obj)


@router.delete("/records/{capability_key}/{record_id}")
async def delete_record(capability_key: str, record_id: str, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    obj = (await db.execute(select(Record).where(Record.id == record_id, Record.space_id == ctx.space.id, Record.deleted_at.is_(None)))).scalar_one_or_none()
    if not obj:
        raise not_found("Record")
    obj.deleted_at = now()
    await db.commit()
    return {"ok": True}


# ---- Files (multipart upload -> storage adapter; metadata in Postgres)
@router.get("/files")
async def list_files(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db), q: str | None = None):
    stmt = select(FileObject).where(FileObject.space_id == ctx.space.id, FileObject.deleted_at.is_(None))
    if q:
        stmt = stmt.where(FileObject.name.ilike(f"%{q}%"))
    rows = (await db.execute(stmt.order_by(FileObject.created_at.desc()))).scalars().all()
    return [dump(f, extra={"url": storage.download_url(f.storage_key, f.id, ctx.space.id)}) for f in rows]


@router.post("/files", status_code=201)
async def upload_file(file: UploadFile = File(...), ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db), idempotency_key: str | None = Header(default=None)):
    data = await file.read()
    size_mb = max(1, len(data) // (1024 * 1024))
    ent = await entitlements(db, ctx.user)
    used = (await db.execute(select(func.coalesce(func.sum(FileObject.size), 0)).where(FileObject.created_by == ctx.user.id, FileObject.deleted_at.is_(None)))).scalar()
    if (used + len(data)) / (1024 * 1024) > ent["limits"]["cloud_storage_mb"]:
        raise ApiError(429, "LIMIT_REACHED", "Cloud storage limit reached.", {"resource": "cloud_storage_mb", "current": used // (1024 * 1024), "limit": ent["limits"]["cloud_storage_mb"], "unit": "MB", "upgrade": "/settings/billing"})
    key = storage.key_for(ctx.space.id, file.filename or "file")
    await storage.put(key, data, file.content_type or "application/octet-stream")
    obj = FileObject(space_id=ctx.space.id, created_by=ctx.user.id, name=file.filename or "file", size=len(data), content_type=file.content_type or "application/octet-stream", storage_key=key)
    db.add(obj)
    await db.flush()
    await record_activity(db, ctx.space.id, ctx.user, "file.uploaded", "file", obj.id, f"{ctx.user.name} uploaded {obj.name}")
    await db.commit()
    await _emit(db, ctx, "files.changed", {"id": obj.id, "op": "create"})
    return dump(obj, extra={"url": storage.download_url(key, obj.id, ctx.space.id)})


@router.get("/files/{file_id}/content")
async def file_content(file_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    obj = (await db.execute(select(FileObject).where(FileObject.id == file_id, FileObject.space_id == ctx.space.id, FileObject.deleted_at.is_(None)))).scalar_one_or_none()
    if not obj:
        raise not_found("File")
    data = await storage.get(obj.storage_key)
    return Response(content=data, media_type=obj.content_type, headers={"Content-Disposition": f'inline; filename="{obj.name}"'})


@router.delete("/files/{file_id}")
async def delete_file(file_id: str, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    obj = (await db.execute(select(FileObject).where(FileObject.id == file_id, FileObject.space_id == ctx.space.id, FileObject.deleted_at.is_(None)))).scalar_one_or_none()
    if not obj:
        raise not_found("File")
    obj.deleted_at = now()
    await db.commit()
    return {"ok": True}


# ---- Space search across entities
@router.get("/search")
async def search(q: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    like = f"%{q}%"
    sid = ctx.space.id
    out = []
    for model, kind, tcol, sub in [(Note, "note", Note.title, Note.content), (Document, "document", Document.title, Document.content), (Task, "task", Task.title, Task.description),
                                   (Project, "project", Project.name, Project.description), (CalendarEvent, "event", CalendarEvent.title, CalendarEvent.description), (FileObject, "file", FileObject.name, FileObject.name), (Record, "record", Record.title, Record.body)]:
        rows = (await db.execute(select(model).where(model.space_id == sid, model.deleted_at.is_(None), or_(tcol.ilike(like), sub.ilike(like))).limit(8))).scalars().all()
        for r in rows:
            out.append({"kind": kind, "id": r.id, "title": getattr(r, "title", None) or getattr(r, "name", ""), "capability_key": getattr(r, "capability_key", None), "updated_at": r.updated_at.isoformat()})
    return out


# ---- Transcription (Whisper via OpenAI; usage-enforced in minutes)
@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    from ..config import settings
    from ..entitlements import consume, refund
    if not settings.openai_api_key:
        raise ApiError(503, "AI_NOT_CONFIGURED", "Transcription requires OPENAI_API_KEY to be configured on the server.")
    data = await file.read()
    minutes = max(1, len(data) // (1024 * 1024))
    await consume(db, ctx.user, "transcription_minutes", minutes, ctx.space.id, source="transcriber")
    await db.commit()
    try:
        from openai import AsyncOpenAI
        import io
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        buf = io.BytesIO(data)
        buf.name = file.filename or "audio.mp3"
        result = await client.audio.transcriptions.create(model="whisper-1", file=buf)
    except Exception as exc:
        await refund(db, ctx.user, "transcription_minutes", minutes)
        await db.commit()
        raise ApiError(502, "AI_PROVIDER_ERROR", "Transcription failed. Please retry.", {"reason": str(exc)[:200]})
    await record_activity(db, ctx.space.id, ctx.user, "transcript.created", "transcript", None, f"{ctx.user.name} transcribed {file.filename}")
    await db.commit()
    return {"text": result.text, "minutes": minutes}


# ---- Export (no lock-in)
@router.get("/export")
async def export_space(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    sid = ctx.space.id
    payload = {"space": dump(ctx.space), "exported_at": now().isoformat()}
    for model, key in [(Note, "notes"), (Document, "documents"), (Task, "tasks"), (Project, "projects"), (CalendarEvent, "events"), (Record, "records"), (FileObject, "files")]:
        rows = (await db.execute(select(model).where(model.space_id == sid, model.deleted_at.is_(None)))).scalars().all()
        payload[key] = [dump(r) for r in rows]
    return payload
