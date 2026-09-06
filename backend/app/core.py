import logging
import time
import uuid
from datetime import datetime

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("notevoro")


class ApiError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        super().__init__(status_code=status_code, detail={"code": code, "message": message, "details": details or {}})


def not_found(entity="Resource"):
    return ApiError(404, "NOT_FOUND", f"{entity} not found")


def forbidden(message="You do not have permission to do this"):
    return ApiError(403, "FORBIDDEN", message)


def unauthorized(message="Authentication required"):
    return ApiError(401, "UNAUTHORIZED", message)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = rid
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("unhandled error request_id=%s path=%s", rid, request.url.path)
            response = JSONResponse(status_code=500, content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred", "request_id": rid}})
        response.headers["x-request-id"] = rid
        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "DENY"
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"
        log.info("%s %s %s %.1fms rid=%s", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000, rid)
        return response


async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        body = {**detail}
    else:
        body = {"code": "HTTP_ERROR", "message": str(detail)}
    body["request_id"] = getattr(request.state, "request_id", None)
    return JSONResponse(status_code=exc.status_code, content={"error": body}, headers=getattr(exc, "headers", None))


async def validation_exception_handler(request: Request, exc):
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Invalid request", "details": {"errors": exc.errors()}, "request_id": getattr(request.state, "request_id", None)}})


def dump(obj, fields=None, extra=None):
    if obj is None:
        return None
    data = {}
    cols = fields or [c.key for c in obj.__table__.columns]
    for k in cols:
        v = getattr(obj, k, None)
        if isinstance(v, datetime):
            v = v.isoformat()
        if k == "password_hash":
            continue
        data[k] = v
    if extra:
        data.update(extra)
    return data
