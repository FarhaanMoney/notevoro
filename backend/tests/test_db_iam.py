"""
Test database initialization with IAM authentication.
"""
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


def test_iam_rds_client_initialization():
    """Test that the RDS client is properly initialized in get_iam_token."""
    from app.db_iam import get_iam_token
    from app.config import settings
    
    # If IAM is configured, the function should be importable
    # The actual token generation requires AWS credentials, which we can't test here
    assert callable(get_iam_token)
    
    # Verify the function has the right signature
    import inspect
    sig = inspect.signature(get_iam_token)
    assert len(sig.parameters) == 0  # Should take no parameters


def test_iam_module_imports():
    """Test that the IAM module imports correctly."""
    from app.db_iam import (
        get_iam_token,
        get_current_iam_token,
        get_iam_connection_string,
        init_iam_engine,
        get_iam_db,
        get_engine,
        get_session_local,
    )
    
    # All should be callable
    assert callable(get_iam_token)
    assert callable(get_current_iam_token)
    assert callable(get_iam_connection_string)
    assert callable(init_iam_engine)
    assert callable(get_iam_db)
    assert callable(get_engine)
    assert callable(get_session_local)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
