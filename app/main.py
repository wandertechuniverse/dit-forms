import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import get_settings
from app.database import init_db
from app.routers import auth, forms, submissions, files, handouts, payments, students, users, export, groups
from app.routers import uploads, admin, analytics, notifications, audit, public, invoices, reps
from app.middleware.audit_middleware import AuditMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dit_forms")

settings = get_settings()

# Initialize Sentry BEFORE creating FastAPI app
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
        release=settings.GIT_SHA,
    )
    logger.info("Sentry initialized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DIT Forms API...")
    await init_db()
    logger.info("Database initialized")

    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from app.services.audit_retention import purge_old_audit_logs

    scheduler = AsyncIOScheduler()
    scheduler.add_job(purge_old_audit_logs, "cron", hour=2, minute=0, day_of_week="sun")
    scheduler.start()
    logger.info("Weekly audit retention scheduler started")

    yield

    scheduler.shutdown()
    logger.info("Shutting down DIT Forms API")


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration}ms")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {request.method} {request.url.path} - {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router)
app.include_router(forms.router)
app.include_router(submissions.router)
app.include_router(files.router)
app.include_router(handouts.router)
app.include_router(payments.router)
app.include_router(students.router)
app.include_router(users.router)
app.include_router(export.router)
app.include_router(groups.router)
app.include_router(uploads.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(public.router)
app.include_router(invoices.router)
app.include_router(reps.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
