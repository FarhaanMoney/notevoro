from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import current_user
from ..authz import SpaceContext, admin_ctx, space_ctx
from ..config import settings
from ..core import ApiError, dump, not_found
from ..db import get_db, now
from ..entitlements import PLANS, entitlements, get_subscription, require_feature
from ..models import (Activity, BillingEvent, CalendarEvent, Document, Integration, Note, Notification, Project, Space, SpaceMember, Task, UsageRecord, User)
from ..registry import BY_KEY
from ..services import notify, record_activity, user_brief

router = APIRouter(tags=["account"])


@router.get("/registry")
async def registry(user: User = Depends(current_user)):
    from ..registry import REG
    return REG


@router.get("/notifications")
async def notifications(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), limit: int = 30):
    rows = (await db.execute(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(limit))).scalars().all()
    unread = (await db.execute(select(func.count()).select_from(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None)))).scalar()
    return {"items": [dump(n) for n in rows], "unread": unread}


@router.post("/notifications/read")
async def read_notifications(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), id: Optional[str] = None):
    stmt = update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    if id:
        stmt = stmt.where(Notification.id == id)
    await db.execute(stmt.values(read_at=now()))
    await db.commit()
    return {"ok": True}


@router.get("/spaces/{space_id}/activity")
async def space_activity(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db), limit: int = 50):
    rows = (await db.execute(select(Activity, User).join(User, User.id == Activity.actor_id).where(Activity.space_id == ctx.space.id).order_by(Activity.created_at.desc()).limit(limit))).all()
    return [dump(a, extra={"actor": user_brief(u)}) for a, u in rows]


@router.get("/activity")
async def my_activity(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), limit: int = 20):
    spaces = select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active")
    rows = (await db.execute(select(Activity, User, Space).join(User, User.id == Activity.actor_id).join(Space, Space.id == Activity.space_id).where(Activity.space_id.in_(spaces)).order_by(Activity.created_at.desc()).limit(limit))).all()
    return [dump(a, extra={"actor": user_brief(u), "space": {"id": s.id, "name": s.name, "type": s.type}}) for a, u, s in rows]


# ---- Brain home: orientation, not analytics
@router.get("/brain")
async def brain(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    spaces = (await db.execute(select(Space, SpaceMember).join(SpaceMember, SpaceMember.space_id == Space.id).where(SpaceMember.user_id == user.id, SpaceMember.status == "active", Space.deleted_at.is_(None)).order_by(Space.updated_at.desc()))).all()
    space_ids = [s.id for s, _ in spaces]
    names = {s.id: s for s, _ in spaces}
    recent = []
    for model, kind in [(Document, "document"), (Note, "note"), (Project, "project"), (Task, "task")]:
        if not space_ids:
            break
        rows = (await db.execute(select(model).where(model.space_id.in_(space_ids), model.deleted_at.is_(None)).order_by(model.updated_at.desc()).limit(4))).scalars().all()
        for r in rows:
            recent.append({"kind": kind, "id": r.id, "title": getattr(r, "title", None) or getattr(r, "name", ""), "space": {"id": r.space_id, "name": names[r.space_id].name, "type": names[r.space_id].type}, "updated_at": r.updated_at.isoformat()})
    recent.sort(key=lambda r: r["updated_at"], reverse=True)
    t = now()
    day_end = t.replace(hour=23, minute=59, second=59)
    today = (await db.execute(select(CalendarEvent).where(CalendarEvent.space_id.in_(space_ids), CalendarEvent.deleted_at.is_(None), CalendarEvent.end_at >= t.replace(hour=0, minute=0, second=0), CalendarEvent.start_at <= day_end).order_by(CalendarEvent.start_at).limit(6))).scalars().all() if space_ids else []
    out_spaces = []
    for s, m in spaces:
        count = (await db.execute(select(func.count()).select_from(SpaceMember).where(SpaceMember.space_id == s.id, SpaceMember.status == "active"))).scalar()
        last = (await db.execute(select(func.max(Activity.created_at)).where(Activity.space_id == s.id))).scalar()
        out_spaces.append({**dump(s, ["id", "name", "description", "type", "icon", "accent", "enabled_capabilities", "updated_at"]), "role": m.role, "member_count": count, "last_active_at": last.isoformat() if last else None,
                           "capability_names": [BY_KEY[k]["name"] for k in (s.enabled_capabilities or []) if k in BY_KEY and BY_KEY[k]["type"] == "module"][:6]})
    return {"spaces": out_spaces, "recent": recent[:8], "today": [dump(e, extra={"space": {"id": e.space_id, "name": names[e.space_id].name}}) for e in today], "entitlements": await entitlements(db, user)}


# ---- Billing / entitlements / usage (backend is the only authority)
class PlanChangeIn(BaseModel):
    plan: str = Field(pattern="^(free|pro|premium|enterprise)$")


class WebhookIn(BaseModel):
    event_id: str
    type: str
    user_id: str
    plan: Optional[str] = None
    expires_at: Optional[str] = None


@router.get("/billing")
async def billing(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    ent = await entitlements(db, user)
    tokens = (await db.execute(select(func.coalesce(func.sum(UsageRecord.amount), 0)).where(UsageRecord.user_id == user.id, UsageRecord.resource_type == "ai_tokens", UsageRecord.period == ent["period"]))).scalar()
    return {**ent, "plans": {k: {x: v[x] for x in v} for k, v in PLANS.items()}, "ai_tokens": tokens}


@router.post("/billing/change-plan")
async def change_plan(body: PlanChangeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """Plan change entry point. In production this is driven by the payment provider webhook below; the direct
    endpoint is available so the lifecycle (upgrade/downgrade/expiry) can be exercised end-to-end."""
    sub = await get_subscription(db, user.id)
    sub.plan, sub.status, sub.started_at = body.plan, "active", now()
    sub.expires_at = None if body.plan == "free" else now() + timedelta(days=30)
    sub.grace_until = None if body.plan == "free" else sub.expires_at + timedelta(days=7)
    await notify(db, [user.id], "subscription", f"You're now on {PLANS[body.plan]['label']}", "Your entitlements have been updated.")
    await db.commit()
    return await entitlements(db, user)


@router.post("/billing/simulate-expiry")
async def simulate_expiry(user: User = Depends(current_user), db: AsyncSession = Depends(get_db), grace: bool = True):
    sub = await get_subscription(db, user.id)
    sub.expires_at = now() - timedelta(minutes=1)
    sub.grace_until = now() + timedelta(days=7) if grace else now() - timedelta(minutes=1)
    await notify(db, [user.id], "subscription_warning", "Your subscription has expired", "Local data stays yours. Cloud features are limited during the grace period.")
    await db.commit()
    return await entitlements(db, user)


@router.post("/billing/webhook")
async def billing_webhook(body: WebhookIn, db: AsyncSession = Depends(get_db), x_webhook_secret: Optional[str] = Header(default=None)):
    """Idempotent by event_id: duplicate/delayed deliveries are no-ops."""
    if settings.local_auth_secret and x_webhook_secret != settings.local_auth_secret:
        raise ApiError(401, "WEBHOOK_UNVERIFIED", "Webhook signature invalid")
    db.add(BillingEvent(event_id=body.event_id, type=body.type, payload=body.model_dump()))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return {"ok": True, "duplicate": True}
    sub = await get_subscription(db, body.user_id)
    if body.type in ("subscription.activated", "subscription.renewed") and body.plan:
        sub.plan, sub.status = body.plan, "active"
        sub.expires_at = now() + timedelta(days=30)
        sub.grace_until = sub.expires_at + timedelta(days=7)
    elif body.type == "subscription.canceled":
        sub.status = "canceled"
        sub.grace_until = now() + timedelta(days=7)
    elif body.type == "payment.failed":
        sub.status = "past_due"
    await db.commit()
    return {"ok": True}


# ---- Integrations (connections, not sidebar clutter)
PROVIDERS = {"zoom": {"name": "Zoom", "used_by": ["meetings"], "configured": lambda: bool(settings.zoom_client_id)},
             "google": {"name": "Google Workspace", "used_by": ["calendar", "meetings", "files", "documents"], "configured": lambda: bool(settings.google_client_id)},
             "microsoft": {"name": "Microsoft 365", "used_by": ["calendar", "meetings", "files"], "configured": lambda: bool(settings.microsoft_client_id)},
             "dropbox": {"name": "Dropbox", "used_by": ["files"], "configured": lambda: False}}


@router.get("/spaces/{space_id}/integrations")
async def integrations(ctx: SpaceContext = Depends(space_ctx), db: AsyncSession = Depends(get_db)):
    rows = {i.provider: i for i in (await db.execute(select(Integration).where(Integration.space_id == ctx.space.id))).scalars().all()}
    return [{"provider": k, "name": v["name"], "used_by": v["used_by"], "provider_configured": v["configured"](), **(dump(rows[k]) if k in rows else {"status": "disconnected"})} for k, v in PROVIDERS.items()]


@router.post("/spaces/{space_id}/integrations/{provider}/connect")
async def connect_integration(provider: str, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    if provider not in PROVIDERS:
        raise not_found("Provider")
    await require_feature(db, ctx.user, "integrations")
    if not PROVIDERS[provider]["configured"]():
        raise ApiError(503, "INTEGRATION_NOT_CONFIGURED", f"{PROVIDERS[provider]['name']} OAuth credentials are not configured on the server ({provider.upper()}_CLIENT_ID / _SECRET).", {"provider": provider})
    row = (await db.execute(select(Integration).where(Integration.space_id == ctx.space.id, Integration.provider == provider))).scalar_one_or_none()
    if not row:
        row = Integration(space_id=ctx.space.id, provider=provider)
        db.add(row)
    row.status = "pending_oauth"
    await db.commit()
    return {"authorize_url": f"/api/v1/integrations/{provider}/oauth/start?space_id={ctx.space.id}", "integration": dump(row)}


@router.delete("/spaces/{space_id}/integrations/{provider}")
async def disconnect_integration(provider: str, ctx: SpaceContext = Depends(admin_ctx), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Integration).where(Integration.space_id == ctx.space.id, Integration.provider == provider))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}
