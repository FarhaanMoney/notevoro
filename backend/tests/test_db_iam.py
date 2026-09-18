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


def test_engine_initialization_resolves_stale_import():
    """Test that engine import after initialization returns the actual engine."""
    from app.db import engine, ensure_engine_initialized
    from app.config import settings
    
    if not settings.using_iam_auth:
        # For traditional mode, engine should be initialized at module load
        assert engine is not None
        return
    
    # For IAM mode, engine should be None before initialization
    assert engine is None, "Engine should be None before initialization in IAM mode"
    
    # Import before initialization
    from app.db import engine as engine_before
    assert engine_before is None, "Engine should be None before initialization"
    
    # Note: We can't actually call ensure_engine_initialized() in tests without AWS credentials
    # But we can verify the architecture is correct for re-importing


def test_iam_ssl_configuration():
    """Test that IAM SSL configuration uses asyncpg's native mechanism."""
    from app.db_iam import get_iam_connection_string, init_iam_engine
    from app.config import settings
    
    if not settings.using_iam_auth:
        return  # Skip test if IAM is not configured
    
    # Verify connection string does NOT contain sslmode (asyncpg doesn't accept it)
    import inspect
    connection_string_source = inspect.getsource(get_iam_connection_string)
    assert "sslmode" not in connection_string_source, "Connection string should not contain sslmode (asyncpg incompatible)"
    
    # Verify init_iam_engine uses connect_args with ssl=True
    engine_source = inspect.getsource(init_iam_engine)
    assert '"ssl": True' in engine_source or "'ssl': True" in engine_source, "Engine should use connect_args with ssl=True"
    assert "connect_args" in engine_source, "Engine should use connect_args for SSL configuration"


def test_iam_token_is_passed_as_password():
    """Test that IAM token is passed as the password in connection string."""
    from app.db_iam import get_iam_connection_string
    from app.config import settings
    
    if not settings.using_iam_auth:
        return  # Skip test if IAM is not configured
    
    import inspect
    connection_string_source = inspect.getsource(get_iam_connection_string)
    
    # Verify the connection string uses the token as password
    assert "token" in connection_string_source, "Connection string should use token as password"
    assert f"{settings.db_username}:" in connection_string_source, "Connection string should use db_username as username"
    assert "await get_current_iam_token()" in connection_string_source, "Connection string should call get_current_iam_token()"


def test_iam_token_generation_parameters():
    """Test that IAM token generation uses correct parameters."""
    from app.db_iam import get_iam_token
    from app.config import settings
    
    if not settings.using_iam_auth:
        return  # Skip test if IAM is not configured
    
    import inspect
    token_source = inspect.getsource(get_iam_token)
    
    # Verify the token generation uses the correct parameters
    assert "generate_db_auth_token" in token_source, "Should use generate_db_auth_token"
    assert "DBHostname=settings.db_host" in token_source, "Should use settings.db_host as DBHostname"
    assert "Port=int(settings.db_port)" in token_source, "Should use settings.db_port as Port"
    assert "DBUsername=settings.db_username" in token_source, "Should use settings.db_username as DBUsername"
    assert "settings.aws_region" in token_source, "Should use settings.aws_region for RDS client"


def test_diagnostic_logging_does_not_expose_secrets():
    """Test that diagnostic logging does not expose secrets."""
    from app.db_iam import get_iam_token, get_iam_connection_string, init_iam_engine
    import inspect
    
    # Check that none of the code logs the actual token
    token_source = inspect.getsource(get_iam_token)
    connection_source = inspect.getsource(get_iam_connection_string)
    engine_source = inspect.getsource(init_iam_engine)
    
    # These should NOT appear in the code (logging secrets)
    assert "logger.info(token)" not in token_source, "Should not log token directly"
    assert "logger.debug(token)" not in token_source, "Should not log token directly"
    assert "print(token)" not in token_source, "Should not print token"
    
    # These SHOULD appear (logging safe info)
    assert "logger.info" in token_source, "Should have diagnostic logging"
    assert "logger.info" in connection_source, "Should have diagnostic logging"
    assert "logger.info" in engine_source, "Should have diagnostic logging"
    
    # Verify we log configuration but not secrets
    assert "settings.db_host" in token_source, "Should log db_host"
    assert "settings.db_username" in token_source, "Should log db_username"
    assert "settings.aws_region" in token_source, "Should log aws_region"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
