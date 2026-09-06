from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core import dump
from .models import Activity, Notification, SpaceMember, User
from .realtime import hub


async def record_activity(db: AsyncSession, space_id: str, actor: User, type_: str, entity_type: str, entity_id: str | None, summary: str, meta: dict | None = None):
    act = Activity(space_id=space_id, actor_id=actor.id, type=type_, entity_type=entity_type, entity_id=entity_id, summary=summary, meta=meta or {})
    db.add(act)
    await db.flush()
    members = (await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == space_id, SpaceMember.status == "active"))).scalars().all()
    await hub.send_to_users(members, "activity.created", dump(act, extra={"actor": {"id": actor.id, "name": actor.name, "avatar_url": actor.avatar_url}}))
    return act


async def notify(db: AsyncSession, user_ids, type_: str, title: str, body: str | None = None, link: str | None = None, space_id: str | None = None, exclude: str | None = None):
    created = []
    for uid in set(user_ids):
        if uid == exclude:
            continue
        n = Notification(user_id=uid, space_id=space_id, type=type_, title=title, body=body, link=link)
        db.add(n)
        created.append(n)
    await db.flush()
    for n in created:
        await hub.send_to_users([n.user_id], "notification.created", dump(n))


def user_brief(u: User | None):
    if not u:
        return None
    return {"id": u.id, "name": u.name, "email": u.email, "avatar_url": u.avatar_url, "title": u.title, "online": hub.is_online(u.id)}
