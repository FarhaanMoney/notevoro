import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings


class Base(DeclarativeBase):
    pass


def now():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class IdMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)


# Initialize engine based on configuration
if settings.using_iam_auth:
    # Use IAM authentication
    from .db_iam import init_iam_engine, get_iam_db as get_db
    engine = None  # Will be initialized on first use
else:
    # Use traditional DATABASE_URL
    if not settings.database_url:
        raise ValueError(
            "DATABASE_URL is required when USE_IAM_AUTH is false. "
            "Either set DATABASE_URL or configure DB_HOST with USE_IAM_AUTH=true."
        )
    
    engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async def get_db():
        async with SessionLocal() as session:
            yield session
