from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import current_user
from .core import forbidden, not_found
from .db import get_db
from .models import Space, SpaceMember, User

ROLE_RANK = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}


class SpaceContext:
    def __init__(self, space: Space, member: SpaceMember, user: User):
        self.space, self.member, self.user = space, member, user

    @property
    def role(self):
        return self.member.role

    def require(self, min_role: str):
        if ROLE_RANK[self.role] < ROLE_RANK[min_role]:
            raise forbidden(f"This action requires the {min_role} role")
        return self

    def can_write(self):
        return ROLE_RANK[self.role] >= 1

    def require_capability(self, key: str):
        if key not in (self.space.enabled_capabilities or []):
            raise forbidden(f"'{key}' is not enabled in this Space. Add it from the Space Library.")
        return self


async def load_space_context(space_id: str, user: User, db: AsyncSession) -> SpaceContext:
    space = (await db.execute(select(Space).where(Space.id == space_id, Space.deleted_at.is_(None)))).scalar_one_or_none()
    if not space:
        raise not_found("Space")
    member = (await db.execute(select(SpaceMember).where(SpaceMember.space_id == space_id, SpaceMember.user_id == user.id, SpaceMember.status == "active"))).scalar_one_or_none()
    if not member:
        raise forbidden("You are not a member of this Space")
    return SpaceContext(space, member, user)


async def space_ctx(space_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> SpaceContext:
    return await load_space_context(space_id, user, db)


async def writer_ctx(ctx: SpaceContext = Depends(space_ctx)) -> SpaceContext:
    return ctx.require("member")


async def admin_ctx(ctx: SpaceContext = Depends(space_ctx)) -> SpaceContext:
    return ctx.require("admin")



# =====================================================================
# Object-level ACL (visibility + shared_with)
# =====================================================================
#
# Every SpaceScoped object carries `visibility` (private/specific/team)
# and `shared_with` (list of {user_id, role}).
#
# The rules:
#   - `team`     -> any active member of the Space can access
#                   (write requires the caller's Space role >= member)
#   - `private`  -> only the creator
#   - `specific` -> the creator + explicit entries in `shared_with`
#                   role='editor' can write, role='viewer' is read-only
#
# Cross-space access is impossible regardless of ACL — the Space
# membership check in `space_ctx` runs first.
#
# Personal Spaces should always default new objects to `private` so
# that a future "Promote to Team" flow can migrate them without exposing
# them during the transition.

VISIBILITY_VALUES = ("team", "specific", "private")
SHARE_ROLES = ("viewer", "editor")


def _shared_entry(shared_with: list, user_id: str):
    for entry in (shared_with or []):
        if isinstance(entry, dict) and entry.get("user_id") == user_id:
            return entry
    return None


def can_access_object(ctx: SpaceContext, obj) -> bool:
    """Return True if the current user may READ this SpaceScoped object.

    Space membership is assumed (this function is called only after
    `space_ctx` has passed).
    """
    vis = getattr(obj, "visibility", "team") or "team"
    if vis == "team":
        return True
    if obj.created_by == ctx.user.id:
        return True
    if vis == "specific":
        return _shared_entry(getattr(obj, "shared_with", None), ctx.user.id) is not None
    # private
    return False


def can_edit_object(ctx: SpaceContext, obj) -> bool:
    """Return True if the current user may WRITE (edit/delete) this object.

    Space-level admins/owners always retain admin override; this matches
    existing behaviour of the Team page member management.
    """
    if ROLE_RANK[ctx.role] >= ROLE_RANK["admin"]:
        return True
    if obj.created_by == ctx.user.id:
        return True
    vis = getattr(obj, "visibility", "team") or "team"
    if vis == "team":
        return ctx.can_write()
    if vis == "specific":
        entry = _shared_entry(getattr(obj, "shared_with", None), ctx.user.id)
        return bool(entry and entry.get("role") == "editor")
    return False  # private -> only creator (handled above)


def require_object_read(ctx: SpaceContext, obj):
    if not obj or getattr(obj, "deleted_at", None):
        raise not_found("Object")
    if not can_access_object(ctx, obj):
        # 404 rather than 403 so private objects don't leak their existence
        # to unauthorized users (they cannot distinguish "no such id" from
        # "you cannot see it").
        raise not_found("Object")
    return obj


def require_object_write(ctx: SpaceContext, obj):
    require_object_read(ctx, obj)
    if not can_edit_object(ctx, obj):
        raise forbidden("You cannot modify this object")
    return obj


def filter_accessible(ctx: SpaceContext, rows: list) -> list:
    """Filter a list of SpaceScoped rows to those the caller may read.

    Used by list endpoints, search, activity feeds, and AI retrieval so
    that private objects never leak.
    """
    return [r for r in rows if can_access_object(ctx, r)]


def sanitize_shared_with(entries) -> list:
    """Return a clean list of {user_id, role} entries. Silently drops
    malformed rows rather than 4xx-ing — callers rely on this being
    forgiving during share/unshare edits."""
    out = []
    seen = set()
    for e in (entries or []):
        if not isinstance(e, dict):
            continue
        uid = str(e.get("user_id") or "").strip()
        role = str(e.get("role") or "viewer").strip().lower()
        if not uid or uid in seen:
            continue
        if role not in SHARE_ROLES:
            role = "viewer"
        out.append({"user_id": uid, "role": role})
        seen.add(uid)
    return out
