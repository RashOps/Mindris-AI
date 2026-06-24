"""Mindris AI API Gateway service."""

import asyncio
from contextlib import asynccontextmanager

from auth import verify_api_key
from database.session import init_db
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from intelligence.event_bus import cleanup_stale_queues
from routers import (
    company,
    cv,
    drafts,
    history,
    llm,
    optimize,
    resumes,
    system,
    templates,
    tracker,
)
from utils.logger import get_logger

logger = get_logger(__name__)


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
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return normalized JSON errors for unexpected failures."""
    logger.exception("Unhandled API error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc),
        },
    )


app.include_router(system.router)
app.include_router(llm.router, dependencies=[Depends(verify_api_key)])
app.include_router(cv.router, dependencies=[Depends(verify_api_key)])
app.include_router(optimize.router, dependencies=[Depends(verify_api_key)])
app.include_router(history.router, dependencies=[Depends(verify_api_key)])
app.include_router(tracker.router, dependencies=[Depends(verify_api_key)])
app.include_router(company.router, dependencies=[Depends(verify_api_key)])
app.include_router(resumes.router, dependencies=[Depends(verify_api_key)])
app.include_router(drafts.router, dependencies=[Depends(verify_api_key)])
app.include_router(templates.router, dependencies=[Depends(verify_api_key)])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
