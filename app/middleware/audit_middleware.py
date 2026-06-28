import json
import asyncio
import logging
import sentry_sdk
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from jose import JWTError

from app.core.security import decode_access_token
from app.models.audit_log import AuditLog

logger = logging.getLogger("dit_forms.audit")

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/openapi.json"}

RESOURCE_MAP = {
    "/students": "Student",
    "/handouts": "HandoutOrder",
    "/payments": "Payment",
    "/forms": "FormVersion",
    "/groups": "StudentGroup",
    "/analytics": "AnalyticsQuery",
    "/notifications": "Notification",
    "/admin": "AdminAction",
    "/users": "User",
    "/uploads": "Upload",
    "/submissions": "FormSubmission",
    "/export": "Export",
    "/files": "File",
    "/auth": "Auth",
}


def _extract_resource_type(path: str) -> str:
    for prefix, resource in RESOURCE_MAP.items():
        if path.startswith(prefix):
            return resource
    return "Unknown"


def _extract_resource_id(path: str) -> str | None:
    parts = path.strip("/").split("/")
    if len(parts) >= 2:
        last = parts[-1]
        if len(last) >= 20 and "-" in last:
            return last
    return None


def _decode_user(token: str) -> tuple[str | None, str | None]:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        user_role = payload.get("role")
        return user_id, user_role
    except (JWTError, Exception):
        return None, None


async def _insert_log(log: AuditLog):
    try:
        await log.insert()
    except Exception as e:
        logger.warning(f"Audit insert failed: {e}")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method not in WRITE_METHODS:
            return response

        path = request.url.path
        if any(skip in path for skip in SKIP_PATHS):
            return response

        try:
            token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
            user_id, user_role = _decode_user(token) if token else (None, None)

            action_map = {"POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}

            log = AuditLog(
                user_id=user_id,
                user_role=user_role or "anonymous",
                ip_address=request.client.host if request.client else None,
                action=action_map.get(request.method, "UNKNOWN"),
                resource_type=_extract_resource_type(path),
                resource_id=_extract_resource_id(path),
                metadata={"path": path, "method": request.method},
                success=response.status_code < 400,
                error_message=None if response.status_code < 400 else f"HTTP {response.status_code}",
            )
            asyncio.create_task(_insert_log(log))

        except Exception as e:
            sentry_sdk.capture_exception(e, tags={"component": "audit-middleware"})
            logger.warning(f"Audit middleware error: {e}")

        return response
