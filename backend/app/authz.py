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
