"""
Aurora PostgreSQL IAM authentication for SQLAlchemy async engine.

This module provides database connection using AWS RDS IAM authentication tokens.
Tokens are generated dynamically and are valid for 15 minutes.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import boto3
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


def get_iam_token() -> str:
    """
    Generate an AWS RDS IAM authentication token for Aurora PostgreSQL.
    
    Uses the EC2 instance profile IAM role (Notevoro-aurora) to authenticate.
    The token is valid for 15 minutes.
    """
    if not settings.db_host:
        raise ValueError("DB_HOST is required for IAM authentication")
    
    if not settings.aws_region:
        raise ValueError("AWS_REGION is required for IAM authentication")
    
    rds_client = boto3.client('rds', region_name=settings.aws_region)
    
    # Generate token for Aurora PostgreSQL
    token = rds.generate_db_auth_token(
        DBHostname=settings.db_host,
        Port=int(settings.db_port),
        DBUsername=settings.db_username,
    )
    
    return token


# Cache for IAM token to avoid generating new tokens on every connection
_iam_token_cache: Optional[tuple[str, datetime]] = None
_iam_token_lock = asyncio.Lock()


async def get_current_iam_token() -> str:
    """
    Get the current IAM token, refreshing if expired.
    
    Tokens are cached for 10 minutes (tokens are valid for 15 minutes).
    """
    async with _iam_token_lock:
        global _iam_token_cache
        
        now = datetime.now(timezone.utc)
        
        # Return cached token if still valid (10 minutes old or less)
        if _iam_token_cache is not None:
            token, cached_at = _iam_token_cache
            if now - cached_at < timedelta(minutes=10):
                return token
        
        # Generate new token
        loop = asyncio.get_event_loop()
        new_token = await loop.run_in_executor(None, get_iam_token)
        _iam_token_cache = (new_token, now)
        
        return new_token


async def get_iam_connection_string() -> str:
    """
    Build a PostgreSQL connection string with a fresh IAM token.
    """
    token = await get_current_iam_token()
    return (
        f"postgresql+asyncpg://{settings.db_username}:{token}"
        f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    )


# Global engine and session maker
_engine: Optional[AsyncEngine] = None
_Session_local: Optional[async_sessionmaker] = None


async def init_iam_engine() -> AsyncEngine:
    """
    Initialize the SQLAlchemy async engine with IAM authentication.
    
    Uses pool_recycle to refresh connections before tokens expire.
    """
    global _engine, _session_local
    
    if _engine is not None:
        return _engine
    
    # Get connection string with fresh IAM token
    connection_string = await get_iam_connection_string()
    
    # Create engine with pool_recycle to refresh connections before token expires
    _engine = create_async_engine(
        connection_string,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=600,  # Recycle connections after 10 minutes (tokens valid for 15)
    )
    
    _session_local = async_sessionmaker(_engine, expire_on_commit=False)
    
    return _engine


async def get_iam_db():
    """
    Async generator that provides database sessions with IAM authentication.
    """
    global _engine, _session_local
    
    if _engine is None:
        await init_iam_engine()
    
    async with _session_local() as session:
        yield session


def get_engine() -> AsyncEngine:
    """
    Get the current engine (for non-async contexts where needed).
    """
    global _engine
    if _engine is None:
        raise RuntimeError("Engine not initialized. Call init_iam_engine() first.")
    return _engine
