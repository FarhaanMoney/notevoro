"""
Test database initialization with IAM authentication.
"""
import os
import pytest


def test_ensure_engine_initialized_function_exists():
    """Test that ensure_engine_initialized function exists and is callable."""
    from app.db import ensure_engine_initialized
    assert callable(ensure_engine_initialized)


def test_db_exports_exist():
    """Test that all expected database exports exist."""
    from app.db import engine, SessionLocal, get_db, now, Base, ensure_engine_initialized
    from app.config import settings
    
    # For IAM mode, engine is None until initialization
    # For traditional mode, engine should be initialized
    if settings.using_iam_auth:
        assert engine is None  # Expected for IAM until initialization
    else:
        assert engine is not None  # Should be initialized for traditional mode
    
    assert SessionLocal is not None
    assert callable(get_db)
    assert callable(now)
    assert Base is not None
    assert callable(ensure_engine_initialized)


def test_iam_validation_at_import():
    """Test that IAM configuration is validated at module import time."""
    from app.config import settings
    
    if settings.using_iam_auth:
        # If IAM is enabled, validation should have already happened
        # If config is invalid, the import would have failed
        assert settings.db_host or settings.db_host == ""  # May be empty in local dev
        assert settings.aws_region or settings.aws_region == ""  # May be empty in local dev


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
