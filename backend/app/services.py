from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core import dump
from .models import Activity, InboxEvent, Notification, SpaceMember, User
from .realtime import hub


async def record_activity(db: AsyncSession, space_id: str, actor: User, type_: str, entity_type: str, entity_id: Optional[str], summary: str, meta: Optional[dict] = None):
    act = Activity(space_id=space_id, actor_id=actor.id, type=type_, entity_type=entity_type, entity_id=entity_id, summary=summary, meta=meta or {})
    db.add(act)
    await db.flush()
    members = (await db.execute(select(SpaceMember.user_id).where(SpaceMember.space_id == space_id, SpaceMember.status == "active"))).scalars().all()
    await hub.send_to_users(members, "activity.created", dump(act, extra={"actor": {"id": actor.id, "name": actor.name, "avatar_url": actor.avatar_url}}))
    return act


async def notify(db: AsyncSession, user_ids, type_: str, title: str, body: Optional[str] = None, link: Optional[str] = None, space_id: Optional[str] = None, exclude: Optional[str] = None):
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


async def create_inbox_event(
    db: AsyncSession,
    *,
    recipient_id: str,
    event_type: str,
    sender_id: Optional[str] = None,
    source_space_id: Optional[str] = None,
    subject: Optional[str] = None,
    body: Optional[str] = None,
    object_type: Optional[str] = None,
    object_id: Optional[str] = None,
    permission: Optional[str] = None,
    link: Optional[str] = None,
    status: str = "pending",
    meta: Optional[dict] = None,
) -> InboxEvent:
    """Create a canonical Inbox event for `recipient_id` and push a
    real-time notification so the Brain Inbox unread counter updates
    immediately.

    IMPORTANT: This function does NOT enforce authorization. The caller is
    responsible for verifying that (a) the sender may send from the given
    source Space and (b) the sender may share the referenced object. See
    routers/inbox.py::compose for the canonical flow.
    """
    evt = InboxEvent(
        recipient_id=recipient_id,
        sender_id=sender_id,
        source_space_id=source_space_id,
        event_type=event_type,
        subject=subject,
        body=body,
        object_type=object_type,
        object_id=object_id,
        permission=permission,
        link=link,
        status=status,
        meta=meta or {},
    )
    db.add(evt)
    await db.flush()
    await hub.send_to_users([recipient_id], "inbox.created", dump(evt))
    return evt


def user_brief(u: Optional[User]):
    if not u:
        return None
    return {"id": u.id, "name": u.name, "email": u.email, "avatar_url": u.avatar_url, "title": u.title, "online": hub.is_online(u.id)}
