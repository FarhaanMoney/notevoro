"""Payments: Stripe Checkout → idempotent webhook → existing entitlement engine. Amounts are defined server-side only."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from ..auth import current_user
from ..config import settings
from ..core import ApiError, dump, not_found
from ..db import Base, IdMixin, TimestampMixin, get_db, now
from ..entitlements import PLANS, entitlements, get_subscription
from ..models import BillingEvent, User
from ..services import notify

router = APIRouter(tags=["payments"])

PACKAGES = {"pro": {"amount": 12.0, "plan": "pro"}, "premium": {"amount": 20.0, "plan": "premium"}}


class PaymentTransaction(Base, IdMixin, TimestampMixin):
    __tablename__ = "payment_transactions"
    session_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    package_id: Mapped[str] = mapped_column(String(40), nullable=False)
    amount: Mapped[str] = mapped_column(String(20), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="usd")
    status: Mapped[str] = mapped_column(String(30), default="initiated")
    payment_status: Mapped[str] = mapped_column(String(30), default="pending")
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class CheckoutIn(BaseModel):
    package_id: str
    origin_url: str


def _checkout(request: Request):
    if not settings.stripe_api_key:
        raise ApiError(503, "PAYMENTS_NOT_CONFIGURED", "Stripe is not configured (STRIPE_API_KEY).")
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    return StripeCheckout(api_key=settings.stripe_api_key, webhook_url=f"{str(request.base_url)}api/webhook/stripe")


async def _activate(db: AsyncSession, tx: PaymentTransaction):
    """Single place that grants entitlements after payment. Idempotent: guarded by payment_status != paid."""
    if tx.payment_status == "paid":
        return False
    tx.status, tx.payment_status, tx.paid_at = "completed", "paid", now()
    sub = await get_subscription(db, tx.user_id)
    sub.plan, sub.status, sub.started_at = PACKAGES[tx.package_id]["plan"], "active", now()
    sub.expires_at = now() + timedelta(days=30)
    sub.grace_until = sub.expires_at + timedelta(days=7)
    sub.provider_subscription_id = tx.session_id
    await notify(db, [tx.user_id], "subscription", f"Welcome to {PLANS[sub.plan]['label']}", "Payment confirmed. Your entitlements are active.")
    return True


@router.post("/payments/checkout")
async def create_checkout(body: CheckoutIn, request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    pkg = PACKAGES.get(body.package_id)
    if not pkg:
        raise not_found("Package")
    from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest
    sc = _checkout(request)
    session = await sc.create_checkout_session(CheckoutSessionRequest(
        amount=pkg["amount"], currency="usd", success_url=f"{body.origin_url}/dashboard/settings?tab=billing&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/dashboard/settings?tab=billing&canceled=1", metadata={"user_id": user.id, "package_id": body.package_id}))
    db.add(PaymentTransaction(session_id=session.session_id, user_id=user.id, package_id=body.package_id, amount=str(pkg["amount"])))
    await db.commit()
    return {"checkout_url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    tx = (await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == session_id, PaymentTransaction.user_id == user.id))).scalar_one_or_none()
    if not tx:
        raise not_found("Transaction")
    if tx.payment_status != "paid":
        try:
            st = await _checkout(request).get_checkout_status(session_id)
            if st.payment_status == "paid":
                await _activate(db, tx)
            elif st.status == "expired":
                tx.status = tx.payment_status = "expired"
            await db.commit()
        except ApiError:
            raise
        except Exception:
            pass
    return {"session_id": tx.session_id, "status": tx.status, "payment_status": tx.payment_status, "entitlements": await entitlements(db, user)}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    try:
        ev = await _checkout(request).handle_webhook(body, request.headers.get("Stripe-Signature"))
    except ApiError:
        raise
    except Exception:
        raise ApiError(400, "WEBHOOK_UNVERIFIED", "Invalid Stripe signature")
    if (await db.execute(select(BillingEvent.id).where(BillingEvent.event_id == ev.event_id))).scalar_one_or_none():
        return {"ok": True, "duplicate": True}
    db.add(BillingEvent(event_id=ev.event_id, type=ev.event_type, payload={"session_id": ev.session_id, "payment_status": ev.payment_status}))
    tx = (await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == ev.session_id))).scalar_one_or_none()
    if tx and ev.payment_status == "paid":
        await _activate(db, tx)
    elif tx and ev.event_type in ("checkout.session.expired",):
        tx.status = tx.payment_status = "expired"
    await db.commit()
    return {"ok": True}
