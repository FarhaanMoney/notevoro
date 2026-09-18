import uuid
import asyncio
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
_initialized = False


async def _init_iam_engine():
    """Initialize engine with IAM authentication."""
    global engine, SessionLocal, _initialized, _real_session_local
    from .db_iam import init_iam_engine as init_iam, get_session_local
    
    # Initialize the IAM engine
    engine = await init_iam()
    
    # Get the session maker from db_iam for compatibility
    _real_session_local = get_session_local()
    _initialized = True


def _init_traditional_engine():
    """Initialize engine with traditional DATABASE_URL (synchronous)."""
    global engine, SessionLocal, _initialized
    if not settings.database_url:
        raise ValueError(
            "DATABASE_URL is required when USE_IAM_AUTH is false. "
            "Either set DATABASE_URL or configure DB_HOST with USE_IAM_AUTH=true."
        )
    
    engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    _initialized = True


async def ensure_engine_initialized():
    """Ensure the database engine is initialized. Call this during startup."""
    global engine, SessionLocal, _initialized
    
    if _initialized:
        return
    
    if settings.using_iam_auth:
        # Validate IAM configuration
        if not settings.db_host:
            raise ValueError(
                "USE_IAM_AUTH=true but DB_HOST is not set. "
                "Please configure DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, and AWS_REGION."
            )
        if not settings.aws_region:
            raise ValueError(
                "USE_IAM_AUTH=true but AWS_REGION is not set. "
                "Please configure AWS_REGION for IAM authentication."
            )
        
        await _init_iam_engine()
    else:
        _init_traditional_engine()
    
    # Verify engine was actually created
    if engine is None:
        raise RuntimeError("Engine initialization failed - engine is still None after initialization")


# For IAM mode, ensure SessionLocal is callable for direct usage
if settings.using_iam_auth:
    # SessionLocal will be set after initialization
    # Make it a lazy wrapper that initializes if needed
    class LazySessionLocal:
        """Lazy SessionLocal that initializes on first call."""
        
        def __call__(self) -> AsyncSession:
            """Called when SessionLocal() is used."""
            global _real_session_local, _initialized
            if not _initialized:
                # This is called from sync context, so we can't initialize async
                raise RuntimeError(
                    "SessionLocal() called before engine initialization. "
                    "For IAM auth, the engine must be initialized during application startup "
                    "before SessionLocal() can be used. Use get_db() for FastAPI dependencies instead."
                )
            return _real_session_local()
    
    _real_session_local = None
    SessionLocal = LazySessionLocal()


# Initialize engine based on configuration
# For traditional auth, initialize immediately (synchronous)
# For IAM auth, initialize during startup (async)
if not settings.using_iam_auth:
    _init_traditional_engine()
    
    async def get_db():
        async with SessionLocal() as session:
            yield session
else:
    # IAM auth - validate configuration at module load time
    if not settings.db_host:
        raise ValueError(
            "USE_IAM_AUTH=true but DB_HOST is not set. "
            "Please configure DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, and AWS_REGION."
        )
    if not settings.aws_region:
        raise ValueError(
            "USE_IAM_AUTH=true but AWS_REGION is not set. "
            "Please configure AWS_REGION for IAM authentication."
        )
    
    # IAM auth - will be initialized during startup
    async def get_db():
        """Use IAM authentication for database sessions."""
        global engine, SessionLocal
        if not _initialized:
            await ensure_engine_initialized()
        from .db_iam import get_iam_db
        async for session in get_iam_db():
            yield session
