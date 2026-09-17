"""Notion-styled Pages — first-class Notevoro object.

* Pages are SpaceScoped (inherit the same visibility/ACL model as Notes,
  Documents, Tasks). A Team-Space page created with visibility='private'
  is a My Work draft; visibility='team' shares it with the whole Space.
* Pages can be nested (parent_page_id). Deleting a parent cascades.
* Content is stored as Tiptap JSON in the `content` column so the front-end
  can round-trip through the same rich editor used by Documents.
* Server-side authz uses filter_accessible / require_object_read so
  unauthorized pages behave as if they do not exist for the caller.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..authz import (SpaceContext, filter_accessible, require_object_read,
                     require_object_write, sanitize_shared_with, space_ctx,
                     writer_ctx, VISIBILITY_VALUES)
from ..core import ApiError, dump, not_found
from ..db import get_db, now
from ..models import Page, SpaceMember, User
from ..services import record_activity

router = APIRouter(prefix="/spaces/{space_id}/pages", tags=["pages"])


class PageIn(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    icon: Optional[str] = Field(default=None, max_length=80)
    cover: Optional[str] = None
    content: Optional[dict] = None
    parent_page_id: Optional[str] = None
    position: Optional[int] = None
    is_favorite: Optional[bool] = None
    archived: Optional[bool] = None


class VisibilityIn(BaseModel):
    visibility: str
    shared_with: Optional[list[dict]] = None


def _page_dump(row: Page) -> dict:
    return dump(row, ["id", "space_id", "title", "icon", "cover", "content",
                      "parent_page_id", "position", "is_favorite", "archived",
                      "visibility", "shared_with", "created_by", "created_at",
                      "updated_at", "deleted_at"])


@router.get("")
async def list_pages(
    ctx: SpaceContext = Depends(space_ctx),
    db: AsyncSession = Depends(get_db),
    mine_only: bool = False,
    parent_page_id: Optional[str] = None,
):
    q = select(Page).where(Page.space_id == ctx.space.id, Page.deleted_at.is_(None), Page.archived.is_(False))
    if parent_page_id == "__root__":
        q = q.where(Page.parent_page_id.is_(None))
    elif parent_page_id:
        q = q.where(Page.parent_page_id == parent_page_id)
    if mine_only:
        q = q.where(Page.created_by == ctx.user.id)
    rows = (await db.execute(q.order_by(Page.position, Page.created_at))).scalars().all()
    visible = filter_accessible(ctx, rows)
    return [_page_dump(r) for r in visible]


@router.get("/tree")
async def page_tree(
    ctx: SpaceContext = Depends(space_ctx),
    db: AsyncSession = Depends(get_db),
    mine_only: bool = False,
):
    """Return the full tree of accessible pages for the sidebar. Returned
    flat with parent_page_id so the frontend can render nesting cheaply."""
    q = select(Page).where(Page.space_id == ctx.space.id, Page.deleted_at.is_(None), Page.archived.is_(False))
    if mine_only:
        q = q.where(Page.created_by == ctx.user.id)
    rows = (await db.execute(q.order_by(Page.position, Page.created_at))).scalars().all()
    visible = filter_accessible(ctx, rows)
    return [{"id": r.id, "title": r.title or "Untitled", "icon": r.icon,
             "parent_page_id": r.parent_page_id, "visibility": r.visibility,
             "created_by": r.created_by, "is_favorite": r.is_favorite,
             "updated_at": r.updated_at.isoformat()} for r in visible]


@router.post("", status_code=201)
async def create_page(body: PageIn, ctx: SpaceContext = Depends(writer_ctx), db: AsyncSession = Depends(get_db)):
    # Personal Spaces default to private; Team Spaces default to private
    # (My Work). Users can promote to 'team' later.
    default_vis = "private" if ctx.space.type == "personal" else "private"
    if body.parent_page_id:
        parent = (await db.execute(select(Page).where(Page.id == body.parent_page_id, Page.space_id == ctx.space.id))).scalar_one_or_none()
        if not parent:
            raise not_found("Parent page")
        require_object_read(ctx, parent)
    page = Page(
        space_id=ctx.space.id,
        created_by=ctx.user.id,
        title=body.title or "Untitled",
        icon=body.icon,
        cover=body.cover,
        content=body.content or {"type": "doc", "content": [{"type": "paragraph"}]},
        parent_page_id=body.parent_page_id,
        position=body.position or 0,
        visibility=default_vis,
    )
    db.add(page)
    await db.flush()
    await record_activity(db, ctx.space.id, ctx.user, "created", "page", page.id, f"created page “{page.title}”")
    await db.commit()
    return _page_dump(page)


@router.get("/{page_id}")
async def get_page(page_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Page).where(Page.id == page_id, Page.space_id == ctx.space.id))).scalar_one_or_none()
    require_object_read(ctx, row)
    return _page_dump(row)


@router.patch("/{page_id}")
async def update_page(page_id: str, body: PageIn, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Page).where(Page.id == page_id, Page.space_id == ctx.space.id))).scalar_one_or_none()
    require_object_write(ctx, row)
    changed = False
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "parent_page_id" and v:
            parent = (await db.execute(select(Page).where(Page.id == v, Page.space_id == ctx.space.id))).scalar_one_or_none()
            if not parent:
                raise not_found("Parent page")
            if v == page_id:
                raise ApiError(422, "INVALID_PARENT", "A page cannot be its own parent")
            require_object_read(ctx, parent)
        setattr(row, k, v)
        changed = True
    if changed:
        row.updated_at = now()
    await db.commit()
    return _page_dump(row)


@router.post("/{page_id}/visibility")
async def set_visibility(page_id: str, body: VisibilityIn, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Page).where(Page.id == page_id, Page.space_id == ctx.space.id))).scalar_one_or_none()
    require_object_write(ctx, row)
    if body.visibility not in VISIBILITY_VALUES:
        raise ApiError(422, "INVALID_VISIBILITY", "visibility must be one of team|specific|private")
    row.visibility = body.visibility
    if body.visibility == "specific":
        row.shared_with = sanitize_shared_with(body.shared_with or [])
    else:
        row.shared_with = []
    row.updated_at = now()
    await db.commit()
    return _page_dump(row)


@router.delete("/{page_id}", status_code=204)
async def delete_page(page_id: str, ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Page).where(Page.id == page_id, Page.space_id == ctx.space.id))).scalar_one_or_none()
    require_object_write(ctx, row)
    row.deleted_at = now()
    await record_activity(db, ctx.space.id, ctx.user, "deleted", "page", row.id, f"deleted page “{row.title}”")
    await db.commit()
    return None
