"""Mindris AI API Gateway service."""

import asyncio
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from auth import verify_api_key
from database.session import init_db
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from intelligence.event_bus import cleanup_stale_queues
from monitoring import monitor
from routers import (
    company,
    cv,
    drafts,
    history,
    llm,
    markdown,
    onboarding,
    optimize,
    resume_agents,
    resumes,
    system,
    templates,
    tracker,
    workflows,
)
from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
}


def _request_id(request: Request) -> str:
    candidate = request.headers.get("x-request-id", "").strip()
    if candidate:
        return candidate[:128]
    return uuid4().hex


def _apply_response_hardening(response: JSONResponse, request_id: str) -> JSONResponse:
    response.headers["X-Request-Id"] = request_id
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown lifecycle."""
    logger.info("Mindris AI Gateway starting")
    init_db()

    async def _queue_cleanup_loop() -> None:
        while True:
            await asyncio.sleep(300)
            removed = cleanup_stale_queues()
            if removed:
                logger.info("Periodic cleanup removed %d stale SSE queue(s).", removed)

    task = asyncio.create_task(_queue_cleanup_loop())
    try:
        yield
    finally:
        task.cancel()
        logger.info("Mindris AI Gateway shutting down")


app = FastAPI(
    title="Mindris AI API Gateway",
    description="Central gateway for the intelligence and scraping pipelines.",
    version="0.4.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins(),
    allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def record_runtime_metrics(request: Request, call_next):
    """Track lightweight per-request metrics for runtime inspection."""
    started_at = perf_counter()
    request_id = _request_id(request)
    request.state.request_id = request_id
    response = await call_next(request)
    duration_ms = (perf_counter() - started_at) * 1000
    monitor.record_request(
        route=request.url.path,
        method=request.method,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    response.headers["X-Request-Id"] = request_id
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return normalized JSON errors for unexpected failures."""
    request_id = getattr(request.state, "request_id", _request_id(request))
    logger.exception(
        "Unhandled API error on %s [request_id=%s]", request.url.path, request_id
    )
    return _apply_response_hardening(
        JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Internal server error",
                "detail": "internal_server_error",
                "request_id": request_id,
            },
        ),
        request_id,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Return normalized JSON for expected HTTP errors."""
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    request_id = getattr(request.state, "request_id", _request_id(request))
    return _apply_response_hardening(
        JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "message": detail,
                "detail": exc.detail,
                "path": request.url.path,
                "request_id": request_id,
            },
            headers=exc.headers,
        ),
        request_id,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Return normalized JSON for validation errors."""
    request_id = getattr(request.state, "request_id", _request_id(request))
    return _apply_response_hardening(
        JSONResponse(
            status_code=422,
            content={
                "status": "error",
                "message": "Validation failed.",
                "detail": jsonable_encoder(exc.errors()),
                "path": request.url.path,
                "request_id": request_id,
            },
        ),
        request_id,
    )


app.include_router(system.router)
app.include_router(llm.router, dependencies=[Depends(verify_api_key)])
app.include_router(cv.router, dependencies=[Depends(verify_api_key)])
app.include_router(optimize.router, dependencies=[Depends(verify_api_key)])
app.include_router(history.router, dependencies=[Depends(verify_api_key)])
app.include_router(tracker.router, dependencies=[Depends(verify_api_key)])
app.include_router(workflows.router, dependencies=[Depends(verify_api_key)])
app.include_router(company.router, dependencies=[Depends(verify_api_key)])
app.include_router(resumes.router, dependencies=[Depends(verify_api_key)])
app.include_router(resume_agents.router, dependencies=[Depends(verify_api_key)])
app.include_router(drafts.router, dependencies=[Depends(verify_api_key)])
app.include_router(templates.router, dependencies=[Depends(verify_api_key)])
app.include_router(markdown.router, dependencies=[Depends(verify_api_key)])
app.include_router(onboarding.router, dependencies=[Depends(verify_api_key)])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
