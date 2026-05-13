"""Mindris AI API Gateway service."""

import os
from contextlib import asynccontextmanager

from database.models import JobOffer
from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from intelligence.ingest_cv import ingest_cv_data
from intelligence.pdf_parser import parse_pdf_cv
from intelligence.workflow import create_rag_workflow
from pydantic import AnyHttpUrl, BaseModel
from scraper.core import BaseScraper


# ── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for the API Gateway."""
    print("🚀 Mindris AI Gateway starting...")
    yield
    print("🛑 Mindris AI Gateway shutting down...")


# ── App Definition ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Mindris AI API Gateway",
    description="Central gateway for the intelligence and scraping pipelines.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────────────────────
class OptimizeRequest(BaseModel):
    """Request model for the CV optimization endpoint."""

    job_url: AnyHttpUrl
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"


class OptimizationResponse(BaseModel):
    """Response model for the CV optimization endpoint."""

    status: str
    message: str
    job_id: str


# ── Routes ──────────────────────────────────────────────────────────────────
@app.get("/")
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "service": "Mindris AI Gateway"}


@app.post("/api/v1/cv/upload")
async def upload_cv(cv_data: dict) -> dict:
    """Upload a new CV (JSON format), clear the old one, and embed the new one."""
    try:
        ingest_cv_data(cv_data)
        return {"status": "success", "message": "CV successfully uploaded and embedded."}
    except Exception as e:
        print(f"\u274c Error during CV upload: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/v1/cv/upload-pdf")
async def upload_pdf_cv(
    file: UploadFile,
    provider: str = "groq",
    model_name: str = "llama-3.3-70b-versatile",
) -> dict:
    """Upload a PDF CV, parse it with LlamaParse, structure it with LLM, and embed it."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await file.read()
        print(f"\U0001f4c4 Received PDF: {file.filename} ({len(pdf_bytes)} bytes)")

        # Step 1: PDF → Markdown → Structured JSON (LlamaParse + LLM)
        cv_json = await parse_pdf_cv(pdf_bytes, provider=provider, model_name=model_name)

        # Step 2: Embed into ChromaDB (clears old data automatically)
        ingest_cv_data(cv_json)

        return {
            "status": "success",
            "message": "PDF CV parsed, structured, and indexed successfully.",
            "cv_data": cv_json,  # Return the structured JSON so frontend can display it
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        print(f"\u274c PDF upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


async def run_intelligence_pipeline(job_url: str, provider: str, model_name: str) -> None:
    """Background task to run the full RAG pipeline."""
    print(f"⚙️ Starting background pipeline for {job_url}...")

    # 1. Scrape the job offer
    markdown_content = ""
    async with BaseScraper() as scraper:
        markdown_content = await scraper.get_cleaned_content(job_url)

    if not markdown_content:
        print("❌ Scraping failed.")
        return

    # 2. To avoid running the full CrewAI Analyst here which takes time,
    # we simulate the analyst output for the sake of the Live Preview demo.
    job_offer = JobOffer(
        url=job_url,
        title="Simulated Target Role",
        company="Mindris Target",
        location="Remote",
        description_markdown=markdown_content[:500] + "...",
        hard_skills=["Python", "Machine Learning", "Next.js"],
        soft_skills=["Communication", "Teamwork"],
        experience_level="Mid-Level"
    )

    # 3. Run the RAG workflow
    workflow = create_rag_workflow()

    initial_state = {
        "job_offer": job_offer,
        "provider": provider,
        "model_name": model_name,
        "retrieved_context": "",
        "drafted_cv": "",
        "score": 0,
        "iterations": 0
    }

    print("🧠 Triggering LangGraph RAG workflow...")
    workflow.invoke(initial_state)
    print("✅ Pipeline completed successfully.")


@app.post("/api/v1/optimize", response_model=OptimizationResponse)
async def optimize_cv(request: OptimizeRequest, background_tasks: BackgroundTasks) -> OptimizationResponse:
    """Trigger the CV optimization pipeline for a given job URL.
    
    This runs asynchronously and returns immediately.
    """
    job_id = "job_" + os.urandom(4).hex()

    background_tasks.add_task(
        run_intelligence_pipeline,
        str(request.job_url),
        request.provider,
        request.model_name
    )

    return OptimizationResponse(
        status="processing",
        message="The optimization pipeline has been started in the background.",
        job_id=job_id
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
