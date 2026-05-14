"""Mindris AI API Gateway service."""

import asyncio
import os
from contextlib import asynccontextmanager

from database.models import JobOffer
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from intelligence.event_bus import create_job_queue, emit, stream_events
from intelligence.ingest_cv import ingest_cv_data
from intelligence.pdf_parser import parse_pdf_cv
from intelligence.workflow import create_rag_workflow
from pydantic import AnyHttpUrl, BaseModel
from scraper.core import BaseScraper
from sse_starlette.sse import EventSourceResponse


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Mindris AI Gateway starting...")
    yield
    print("🛑 Mindris AI Gateway shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Mindris AI API Gateway",
    description="Central gateway for the intelligence and scraping pipelines.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────
class OptimizeRequest(BaseModel):
    job_url: AnyHttpUrl
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"


class OptimizationResponse(BaseModel):
    status: str
    message: str
    job_id: str


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health_check() -> dict:
    return {"status": "healthy", "service": "Mindris AI Gateway"}


# ── CV Upload (JSON) ──────────────────────────────────────────────────────────
@app.post("/api/v1/cv/upload")
async def upload_cv(cv_data: dict) -> dict:
    """Upload a new CV (JSON format), clear the old one, and embed."""
    try:
        ingest_cv_data(cv_data)
        return {"status": "success", "message": "CV successfully uploaded and embedded."}
    except Exception as e:
        print(f"❌ Error during CV upload: {e}")
        return {"status": "error", "message": str(e)}


# ── CV Upload (PDF via LlamaParse) ────────────────────────────────────────────
@app.post("/api/v1/cv/upload-pdf")
async def upload_pdf_cv(
    file: UploadFile,
    provider: str = "groq",
    model_name: str = "llama-3.3-70b-versatile",
) -> dict:
    """Upload a PDF CV, parse with LlamaParse, structure with LLM, and embed."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await file.read()
        print(f"📄 Received PDF: {file.filename} ({len(pdf_bytes)} bytes)")
        cv_json = await parse_pdf_cv(pdf_bytes, provider=provider, model_name=model_name)
        ingest_cv_data(cv_json)
        return {
            "status": "success",
            "message": "PDF CV parsed, structured, and indexed.",
            "cv_data": cv_json,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        print(f"❌ PDF upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ── Optimize (fire-and-forget) ────────────────────────────────────────────────
async def run_intelligence_pipeline(
    job_id: str, job_url: str, provider: str, model_name: str
) -> None:
    """Background task: scrape → LangGraph RAG → emit SSE done."""
    print(f"⚙️  [{job_id}] Starting pipeline for {job_url}…")

    emit(job_id, "pipeline_start", {
        "icon": "🚀",
        "message": f"Pipeline started for {job_url}",
    })

    try:
        # 1. Scrape the job offer
        emit(job_id, "node_start", {
            "node": "scrape",
            "icon": "🌐",
            "message": "Scraping job offer page…",
        })
        async with BaseScraper() as scraper:
            markdown_content = await scraper.get_cleaned_content(job_url)

        if not markdown_content:
            emit(job_id, "error", {"message": "Scraping failed — no content found."})
            return

        emit(job_id, "node_done", {
            "node": "scrape",
            "icon": "✅",
            "message": f"Job page scraped ({len(markdown_content)} chars).",
        })

        # 2. Build simulated JobOffer from scraped content
        job_offer = JobOffer(
            url=job_url,
            title="Target Role",
            company="Target Company",
            location="Remote",
            description_markdown=markdown_content[:1000],
            hard_skills=["Python", "Machine Learning", "Next.js"],
            soft_skills=["Communication", "Teamwork"],
            experience_level="Mid-Level",
        )

        # 3. Run the RAG workflow (with SSE events)
        workflow = create_rag_workflow(job_id=job_id)
        initial_state = {
            "job_offer": job_offer,
            "provider": provider,
            "model_name": model_name,
            "retrieved_context": "",
            "drafted_cv": "",
            "score": 0,
            "iterations": 0,
            "job_id": job_id,
        }

        # Run in a thread so async event loop isn't blocked
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, workflow.invoke, initial_state)

        emit(job_id, "done", {
            "icon": "🎉",
            "message": "Pipeline complete! Your CV has been tailored.",
        })
        print(f"✅ [{job_id}] Pipeline completed.")

    except Exception as e:
        print(f"❌ [{job_id}] Pipeline error: {e}")
        emit(job_id, "error", {"message": str(e)})


@app.post("/api/v1/optimize", response_model=OptimizationResponse)
async def optimize_cv(
    request: OptimizeRequest, background_tasks: BackgroundTasks
) -> OptimizationResponse:
    """Trigger the CV optimization pipeline. Returns immediately with a job_id."""
    job_id = "job_" + os.urandom(4).hex()

    # Register SSE queue BEFORE starting the background task
    create_job_queue(job_id)

    background_tasks.add_task(
        run_intelligence_pipeline,
        job_id,
        str(request.job_url),
        request.provider,
        request.model_name,
    )

    return OptimizationResponse(
        status="processing",
        message="Pipeline started. Connect to /api/v1/optimize/stream?job_id=<id> for live updates.",
        job_id=job_id,
    )


# ── SSE Stream ────────────────────────────────────────────────────────────────
@app.get("/api/v1/optimize/stream")
async def stream_pipeline(request: Request, job_id: str) -> EventSourceResponse:
    """SSE endpoint — stream real-time pipeline events to the Ghost Mode terminal.

    Connect with:
        const es = new EventSource('/api/v1/optimize/stream?job_id=<id>')
    """
    async def event_generator():
        async for item in stream_events(job_id):
            # Check if client disconnected
            if await request.is_disconnected():
                break
            import json
            yield {
                "event": item["event"],
                "data": json.dumps(item["data"]),
            }

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
