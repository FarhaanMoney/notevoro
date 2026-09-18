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


# Global engine and session maker
engine = None
SessionLocal = None


async def _init_iam_engine():
    """Initialize engine with IAM authentication."""
    global engine, SessionLocal
    from .db_iam import init_iam_engine as init_iam, get_session_local
    
    # Initialize the IAM engine
    engine = await init_iam()
    
    # Get the session maker from db_iam for compatibility
    SessionLocal = get_session_local()


def _init_traditional_engine():
    """Initialize engine with traditional DATABASE_URL (synchronous)."""
    global engine, SessionLocal
    if not settings.database_url:
        raise ValueError(
            "DATABASE_URL is required when USE_IAM_AUTH is false. "
            "Either set DATABASE_URL or configure DB_HOST with USE_IAM_AUTH=true."
        )
    
    engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# Initialize engine based on configuration
if settings.using_iam_auth:
    # Use IAM authentication - initialize lazily on first use
    # Create a lazy SessionLocal that initializes when first called
    class LazySessionLocal:
        """Lazy initialization wrapper for SessionLocal with IAM auth."""
        
        def __call__(self) -> AsyncSession:
            """Called when SessionLocal() is used."""
            global engine, SessionLocal
            if SessionLocal is None:
                raise RuntimeError(
                    "IAM engine not initialized. SessionLocal() cannot be used before "
                    "the engine is initialized. Use get_db() for FastAPI dependencies instead."
                )
            return SessionLocal()
    
    SessionLocal = LazySessionLocal()
    
    async def get_db():
        """Use IAM authentication for database sessions."""
        global engine, SessionLocal
        if engine is None:
            await _init_iam_engine()
        from .db_iam import get_iam_db
        async for session in get_iam_db():
            yield session
else:
    # Use traditional DATABASE_URL - initialize immediately (synchronous)
    _init_traditional_engine()
    
    async def get_db():
        async with SessionLocal() as session:
            yield session
