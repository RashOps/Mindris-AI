"""CV, cover letter, patch, and ATS routes."""

import asyncio
import json
from typing import Annotated, Literal

from database.session import Session, get_session
from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from monitoring import monitor
from persistence import (
    get_current_cv,
    save_ats_report,
    save_cover_letter,
    save_current_cv,
)
from schemas import (
    CoverLetterRequest,
    CVDataModel,
    CVDocumentRequest,
    PatchRequest,
    ScoreRequest,
    validate_llm_selection,
)
from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")
router = APIRouter(prefix="/api/v1", tags=["cv"])
SessionDep = Annotated[Session, Depends(get_session)]


def _validate_pdf_bytes(pdf_bytes: bytes) -> None:
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="PDF file is empty.")
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid PDF file signature.")


@router.get("/cv/current")
def current_cv(session: SessionDep) -> dict:
    """Return the current persisted CV."""
    cv_data = get_current_cv(session)
    if not cv_data:
        raise HTTPException(status_code=404, detail="No current CV stored.")
    return {"status": "success", "cv_data": cv_data}


@router.put("/cv/current")
def put_current_cv(request: CVDocumentRequest, session: SessionDep) -> dict:
    """Persist and re-index the current CV."""
    from intelligence.ingest_cv import ingest_cv_data

    cv_data = request.cv_data.model_dump(mode="json")
    save_current_cv(session, cv_data, source=request.source)
    ingest_cv_data(cv_data)
    return {"status": "success", "message": "CV saved and indexed."}


@router.post("/cv/import-json")
def import_json_cv(cv_data: CVDataModel, session: SessionDep) -> dict:
    """Import a CV JSON object, persist it, and index it."""
    from intelligence.ingest_cv import ingest_cv_data

    payload = cv_data.model_dump(mode="json")
    save_current_cv(session, payload, source="json")
    ingest_cv_data(payload)
    return {"status": "success", "message": "CV imported and indexed."}


@router.post("/cv/upload")
def upload_cv(cv_data: CVDataModel, session: SessionDep) -> dict:
    """Backward-compatible CV upload endpoint."""
    return import_json_cv(cv_data, session)


@router.post("/cv/upload-pdf")
async def upload_pdf_cv(
    file: UploadFile,
    session: SessionDep,
    provider_form: str | None = Form(default=None, alias="provider"),
    provider_query: str | None = Query(default=None, alias="provider"),
    model_name_form: str | None = Form(default=None, alias="model_name"),
    model_name_query: str | None = Query(default=None, alias="model_name"),
    ingestion_mode_form: Literal["auto", "llama_parse", "local_text"] | None = Form(
        default=None,
        alias="ingestion_mode",
    ),
    ingestion_mode_query: Literal["auto", "llama_parse", "local_text"] | None = Query(
        default=None,
        alias="ingestion_mode",
    ),
) -> dict:
    """Upload a PDF CV, parse it, persist it, and index it."""
    provider = provider_form or provider_query or "groq"
    model_name = model_name_form or model_name_query or "llama-3.3-70b-versatile"
    ingestion_mode = ingestion_mode_form or ingestion_mode_query or "auto"
    try:
        validate_llm_selection(provider, model_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    _validate_pdf_bytes(pdf_bytes)
    if len(pdf_bytes) > settings.max_pdf_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file is too large.",
        )

    logger.info("Received PDF: %s (%d bytes)", file.filename, len(pdf_bytes))
    from intelligence.ingest_cv import ingest_cv_data
    from intelligence.pdf_parser import parse_pdf_cv

    try:
        parsed_cv = await asyncio.wait_for(
            parse_pdf_cv(
                pdf_bytes,
                filename=file.filename or "cv.pdf",
                provider=provider,
                model_name=model_name,
                ingestion_mode=ingestion_mode,
            ),
            timeout=settings.pipeline_timeout_seconds,
        )
    except TimeoutError as exc:
        monitor.increment_pipeline_failure("cv_upload_pdf")
        raise HTTPException(
            status_code=504,
            detail="PDF parsing timed out.",
        ) from exc
    cv_json = CVDataModel.model_validate(parsed_cv).model_dump(mode="json")
    save_current_cv(session, cv_json, source="pdf")
    ingest_cv_data(cv_json)
    return {
        "status": "success",
        "message": "PDF CV parsed, structured, and indexed.",
        "cv_data": cv_json,
    }


@router.post("/cv/score")
async def calculate_ats_score_route(request: ScoreRequest, session: SessionDep) -> dict:
    """Calculate and persist the ATS score for a CV against job insights."""
    from intelligence.ats_score import calculate_ats_score

    try:
        report = await asyncio.wait_for(
            calculate_ats_score(
                cv_data=request.cv_data,
                job_insights=request.job_insights,
                provider=request.provider,
                model_name=request.model_name,
                mode=request.ats_mode,
            ),
            timeout=settings.pipeline_timeout_seconds,
        )
    except TimeoutError as exc:
        monitor.increment_pipeline_failure("ats_score")
        raise HTTPException(status_code=504, detail="ATS scoring timed out.") from exc
    report_context = dict(report.get("context", {}))
    report_context.setdefault("resume_id", request.resume_id)
    report_context.setdefault(
        "resume_locale",
        request.cv_data.get("global_settings", {})
        .get("locale", {})
        .get("label_language"),
    )
    report["context"] = report_context
    save_ats_report(session, report, request.provider, request.model_name)
    return {"status": "success", "report": report, "ats_report": report}


@router.post("/cover-letter")
async def generate_cover_letter_route(
    request: CoverLetterRequest, session: SessionDep
) -> dict:
    """Generate and persist a tailored cover letter in Markdown."""
    from intelligence.cover_letter import generate_cover_letter

    try:
        markdown = await asyncio.wait_for(
            generate_cover_letter(
                cv_data=request.cv_data,
                job_insights=request.job_insights,
                instructions=request.instructions,
                example_letter=request.example_letter,
                provider=request.provider,
                model_name=request.model_name,
            ),
            timeout=settings.pipeline_timeout_seconds,
        )
    except TimeoutError as exc:
        monitor.increment_pipeline_failure("cover_letter")
        raise HTTPException(
            status_code=504,
            detail="Cover letter generation timed out.",
        ) from exc
    save_cover_letter(session, markdown, request.provider, request.model_name)
    return {"status": "success", "markdown": markdown}


@router.post("/cv/patch-from-bullets")
def patch_cv_from_bullets(request: PatchRequest) -> dict:
    """Use an LLM to map AI-generated bullets back to a CVData JSON patch."""
    from crewai import Agent, Crew, Process, Task
    from intelligence.llm_config import get_llm

    llm = get_llm(provider=request.provider, model_name=request.model_name)
    experiences = request.cv_data.get("experience", [])
    exp_list = "\n".join(
        f"  - id: {e.get('id')}, role: {e.get('role')}, company: {e.get('company')}"
        for e in experiences
    )
    bullets_text = "\n".join(f"  - {bullet}" for bullet in request.drafted_bullets)

    patcher = Agent(
        role="CV Data Architect",
        goal="Map AI-generated bullet points to the correct CV experience entries.",
        backstory=(
            "You are a precise data mapper. Given tailored bullet points and a CV "
            "structure, assign each bullet to the most relevant experience entry."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )
    task = Task(
        description=(
            f"Experience entries in the CV:\n{exp_list}\n\n"
            f"AI-generated bullet points:\n{bullets_text}\n\n"
            "Return ONLY JSON in this format: "
            '{"experience": [{"id": "...", "description_markdown": "- bullet"}]}'
        ),
        expected_output='{"experience": [...] }',
        agent=patcher,
    )
    result = Crew(agents=[patcher], tasks=[task], process=Process.sequential).kickoff()
    raw = str(result.raw).strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end <= start:
        raise HTTPException(status_code=502, detail="LLM did not return JSON.")
    try:
        patch = json.loads(raw[start:end])
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502, detail="LLM returned invalid JSON."
        ) from exc
    return {"status": "success", "patch": patch}
