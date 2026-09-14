"""Notevoro collaboration router.

Supabase is the *realtime pub/sub* layer for collaborative features
(chat delivery, presence, invitations, Yjs document broadcasts).
Aurora/Postgres remains the durable source of truth for every
business record (documents, memberships, invitations, messages).

Every endpoint enforces backend authorization BEFORE returning a
channel/topic. The frontend cannot fabricate authorization by
manipulating IDs: RLS on the Supabase side must mirror this check
in production (see /app/memory/PRD.md).
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import current_user
from ..authz import space_ctx, SpaceContext
from ..config import settings
from ..core import ApiError, dump, forbidden, not_found
from ..db import get_db
from ..models import Document, DocumentYjsUpdate, SpaceMember, User

router = APIRouter(prefix="/collab", tags=["collab"])


def _require_realtime():
    if not settings.supabase_configured:
        raise ApiError(
            503,
            "REALTIME_NOT_CONFIGURED",
            "Supabase Realtime is not configured. Add SUPABASE_URL and "
            "SUPABASE_ANON_KEY to enable realtime collaboration.",
        )


class ConfigOut(BaseModel):
    enabled: bool
    supabase_url: str = ""
    supabase_anon_key: str = ""
    # NEVER expose service_role_key here. Server-only.


@router.get("/config", response_model=ConfigOut)
async def collab_config(user: User = Depends(current_user)):
    """Return the frontend Supabase client config, or {enabled: false}.

    Only the publishable/anon key is returned. The service-role key never
    leaves the backend. If keys are blank, the frontend falls back to
    offline-local Yjs editing (IndexedDB persistence) without exposing any
    fake connection state.
    """
    if not settings.supabase_configured:
        return ConfigOut(enabled=False)
    return ConfigOut(
        enabled=True,
        supabase_url=settings.supabase_url,
        supabase_anon_key=settings.supabase_anon_key,
    )


class SpaceAuthOut(BaseModel):
    topic: str
    chat_topic: str
    document_topic_prefix: str
    role: str


@router.post("/spaces/{space_id}/authorize", response_model=SpaceAuthOut)
async def authorize_space(ctx: SpaceContext = Depends(space_ctx)):
    """Grant a member permission-scoped topic names for a Space."""
    _require_realtime()
    sid = ctx.space.id
    return SpaceAuthOut(
        topic=f"workspace:{sid}",
        chat_topic=f"workspace:{sid}:chat",
        document_topic_prefix=f"document:{sid}:",
        role=ctx.role,
    )


class DocAuthOut(BaseModel):
    topic: str
    document_id: str
    space_id: str
    can_write: bool


@router.post("/documents/{document_id}/authorize", response_model=DocAuthOut)
async def authorize_document(
    document_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify the caller belongs to the Document's Space, then return the
    per-document channel topic. Prevents IDOR: a user cannot subscribe to
    a doc in another Space by supplying a foreign document_id."""
    _require_realtime()
    doc = (
        await db.execute(
            select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not doc:
        raise not_found("Document")
    member = (
        await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == doc.space_id,
                SpaceMember.user_id == user.id,
                SpaceMember.status == "active",
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise forbidden("You cannot access this document")
    return DocAuthOut(
        topic=f"document:{doc.space_id}:{doc.id}",
        document_id=doc.id,
        space_id=doc.space_id,
        can_write=member.role != "viewer",
    )


class YjsUpdateIn(BaseModel):
    update_b64: str
    client_id: str


class YjsSnapshotOut(BaseModel):
    document_id: str
    updates: list[str]  # ordered base64 update chunks
    next_cursor: Optional[str] = None


@router.get("/documents/{document_id}/yjs-snapshot", response_model=YjsSnapshotOut)
async def get_yjs_snapshot(
    document_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 500,
):
    """Return ordered Yjs update chunks so a client can rebuild the CRDT
    state without depending on ephemeral Supabase broadcasts.

    Merging is done client-side with Y.mergeUpdates for portability.
    """
    doc = (
        await db.execute(
            select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not doc:
        raise not_found("Document")
    member = (
        await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == doc.space_id,
                SpaceMember.user_id == user.id,
                SpaceMember.status == "active",
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise forbidden("You cannot access this document")
    rows = (
        await db.execute(
            select(DocumentYjsUpdate)
            .where(DocumentYjsUpdate.document_id == document_id)
            .order_by(DocumentYjsUpdate.created_at.asc())
            .limit(min(limit, 2000))
        )
    ).scalars().all()
    return YjsSnapshotOut(document_id=doc.id, updates=[r.update_b64 for r in rows])


@router.post("/documents/{document_id}/yjs-update", status_code=201)
async def push_yjs_update(
    document_id: str,
    body: YjsUpdateIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist a Yjs update chunk. Ephemeral broadcasts go through Supabase
    Realtime; this endpoint is the durable path so late-joining clients
    can bootstrap after Supabase drops the queue."""
    doc = (
        await db.execute(
            select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not doc:
        raise not_found("Document")
    member = (
        await db.execute(
            select(SpaceMember).where(
                SpaceMember.space_id == doc.space_id,
                SpaceMember.user_id == user.id,
                SpaceMember.status == "active",
            )
        )
    ).scalar_one_or_none()
    if not member or member.role == "viewer":
        raise forbidden("You cannot edit this document")
    if not body.update_b64 or len(body.update_b64) > 400_000:
        raise ApiError(422, "INVALID_UPDATE", "Yjs update payload out of range")
    row = DocumentYjsUpdate(
        document_id=doc.id,
        space_id=doc.space_id,
        client_id=body.client_id[:64],
        update_b64=body.update_b64,
        author_id=user.id,
    )
    db.add(row)
    await db.commit()
    return {"ok": True, "id": row.id}
