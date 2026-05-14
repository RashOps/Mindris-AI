"""Mindris AI API Gateway service."""

import asyncio
import json
import os
from contextlib import asynccontextmanager

from database.models import JobOffer
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from intelligence.event_bus import create_job_queue, emit, stream_events
from intelligence.ingest_cv import ingest_cv_data
from intelligence.llm_config import MODEL_CATALOGUE, TASK_DEFAULTS, get_llm
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
    # Per-task LLM override — falls back to TASK_DEFAULTS["optimize"] if not set
    provider: str = TASK_DEFAULTS["optimize"]["provider"]
    model_name: str = TASK_DEFAULTS["optimize"]["model_name"]


class OptimizationResponse(BaseModel):
    status: str
    message: str
    job_id: str


class PatchRequest(BaseModel):
    """Request body for /api/v1/cv/patch-from-bullets."""
    drafted_bullets: list[str]
    cv_data: dict
    provider: str = TASK_DEFAULTS["patch"]["provider"]
    model_name: str = TASK_DEFAULTS["patch"]["model_name"]


class CoverLetterRequest(BaseModel):
    """Request body for /api/v1/cover-letter."""
    cv_data: dict
    job_insights: dict                  # title, company, hard_skills, drafted_bullets
    instructions: str = ""             # Free-form user instructions
    example_letter: str | None = None  # Optional style guide letter
    provider: str = TASK_DEFAULTS["cover_letter"]["provider"]
    model_name: str = TASK_DEFAULTS["cover_letter"]["model_name"]


class ScoreRequest(BaseModel):
    """Request body for /api/v1/cv/score."""
    cv_data: dict
    job_insights: dict
    provider: str = TASK_DEFAULTS["ats_score"]["provider"]
    model_name: str = TASK_DEFAULTS["ats_score"]["model_name"]


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health_check() -> dict:
    return {"status": "healthy", "service": "Mindris AI Gateway"}


# ── LLM Catalogue (for frontend selectors) ────────────────────────────────────
@app.get("/api/v1/llm/catalogue")
def llm_catalogue() -> dict:
    """Return available providers, models, and per-task defaults."""
    return {
        "catalogue": MODEL_CATALOGUE,
        "defaults":  TASK_DEFAULTS,
    }

# ── Cover Letter Generator ────────────────────────────────────────────────────
@app.post("/api/v1/cover-letter")
async def generate_cover_letter_route(request: CoverLetterRequest) -> dict:
    """Generate a tailored cover letter in Markdown using an AI agent.

    The letter is built from the candidate's CV data, the scraped job
    insights, optional user instructions, and an optional style example.
    """
    from intelligence.cover_letter import generate_cover_letter
    try:
        markdown = await generate_cover_letter(
            cv_data=request.cv_data,
            job_insights=request.job_insights,
            instructions=request.instructions,
            example_letter=request.example_letter,
            provider=request.provider,
            model_name=request.model_name,
        )
        return {"status": "success", "markdown": markdown}
    except Exception as e:
        print(f"❌ Cover letter generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ── ATS Score On-Demand ───────────────────────────────────────────────────────
@app.post("/api/v1/cv/score")
async def calculate_ats_score_route(request: ScoreRequest) -> dict:
    """Calculate the ATS score for the current CV against the job insights."""
    from intelligence.ats_score import calculate_ats_score
    try:
        report = await calculate_ats_score(
            cv_data=request.cv_data,
            job_insights=request.job_insights,
            provider=request.provider,
            model_name=request.model_name,
        )
        return {"status": "success", "report": report}
    except Exception as e:
        print(f"❌ ATS score calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/v1/cv/patch-from-bullets")
async def patch_cv_from_bullets(request: PatchRequest) -> dict:
    """Use an LLM to map AI-generated bullets back to a CVData JSON patch.

    The agent receives the current CV structure + the drafted bullet points,
    and returns a minimal JSON patch: {experience: [{id, description_markdown}]}.
    """
    from crewai import Agent, Crew, Process, Task

    try:
        llm = get_llm(provider=request.provider, model_name=request.model_name)

        # Build a minimal representation of experience items for the agent
        experiences = request.cv_data.get("experience", [])
        exp_list = "\n".join(
            f"  - id: {e.get('id')}, role: {e.get('role')}, company: {e.get('company')}"
            for e in experiences
        )
        bullets_text = "\n".join(f"  - {b}" for b in request.drafted_bullets)

        patcher = Agent(
            role="CV Data Architect",
            goal="Map AI-generated bullet points to the correct CV experience entries.",
            backstory=(
                "You are a precise data mapper. Given a list of tailored bullet points "
                "and a CV structure, you assign each bullet to the most relevant "
                "experience entry and return a JSON patch."
            ),
            llm=llm,
            allow_delegation=False,
            verbose=False,
        )

        task = Task(
            description=(
                f"Experience entries in the CV:\n{exp_list}\n\n"
                f"AI-generated bullet points:\n{bullets_text}\n\n"
                "Task: Return a JSON object mapping experience IDs to their new "
                "description_markdown. Format:\n"
                '{"experience": [{"id": "...", "description_markdown": "- bullet1\\n- bullet2"}]}\n'
                "Only include entries that have matching bullets. Return ONLY the JSON."
            ),
            expected_output='{"experience": [...]}',
            agent=patcher,
        )

        crew = Crew(agents=[patcher], tasks=[task], process=Process.sequential)
        result = crew.kickoff()

        raw = str(result.raw).strip()
        # Extract JSON from the response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        patch = json.loads(raw[start:end]) if start != -1 else {}

        return {"status": "success", "patch": patch}

    except Exception as e:
        print(f"❌ Patch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


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
