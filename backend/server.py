import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import models  # noqa: E402,F401
from app.config import settings  # noqa: E402
from app.core import RequestContextMiddleware, http_exception_handler, validation_exception_handler  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.realtime import hub  # noqa: E402
from app.routers import account, auth, chat, collab, items, spaces, voro  # noqa: E402
from app.storage import storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Notevoro API", version="1.0.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(RequestContextMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

for r in (auth.router, spaces.router, items.router, chat.router, voro.router, account.router, collab.router):
    app.include_router(r, prefix="/api/v1")


@app.get("/api/health/live")
async def live():
    return {"status": "ok"}


@app.get("/api/health/ready")
async def ready():
    checks = {"database": "ok", "storage": storage.name, "auth_provider": __import__("app.auth", fromlist=["provider"]).provider.name,
              "ai": "configured" if settings.openai_api_key else "not_configured", "realtime": "configured" if settings.supabase_configured else "not_configured", "realtime_connections": len(hub.online_users())}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        checks["database"] = f"error: {exc.__class__.__name__}"
        return {"status": "degraded", "checks": checks}
    return {"status": "ready", "checks": checks}
