"""Optimization pipeline and SSE routes."""

import asyncio
import os

from database.session import engine
from fastapi import APIRouter, BackgroundTasks, Request
from intelligence.company_analyzer import analyze_company
from intelligence.crew import analyze_job_offer
from intelligence.event_bus import create_job_queue, emit, stream_events
from intelligence.workflow import create_rag_workflow
from persistence import dump_json, save_job_offer
from schemas import OptimizationResponse, OptimizeRequest
from scraper.smart_scraper import ScraperExhaustedError, SmartScraper
from database.session import Session
from sse_starlette.sse import EventSourceResponse
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["optimize"])


async def run_intelligence_pipeline(
    job_id: str, job_url: str, provider: str, model_name: str
) -> None:
    """Background task: scrape -> analyze -> RAG workflow -> SSE events."""
    logger.info("[%s] Starting pipeline for %s", job_id, job_url)
    emit(job_id, "pipeline_start", {"icon": "🚀", "message": f"Pipeline started for {job_url}"})

    try:
        emit(job_id, "node_start", {"node": "scrape", "icon": "🌐", "message": "Scraping job offer page…"})
        try:
            async with SmartScraper() as scraper:
                markdown_content = await scraper.get_cleaned_content(job_url)
        except ScraperExhaustedError as exc:
            emit(job_id, "error", {"message": f"All scraping providers failed: {exc}"})
            return

        if not markdown_content:
            emit(job_id, "error", {"message": "Scraping returned empty content."})
            return

        emit(job_id, "node_done", {"node": "scrape", "icon": "✅", "message": f"Job page scraped ({len(markdown_content)} chars)."})
        emit(job_id, "node_start", {"node": "analyze", "icon": "🧠", "message": "Extracting job requirements with AI…"})

        job_offer = await analyze_job_offer(
            markdown_content=markdown_content,
            url=job_url,
            provider=provider,
            model_name=model_name,
        )
        if not job_offer:
            emit(job_id, "error", {"message": "Job offer analysis failed — LLM could not extract structured data."})
            return

        company_insight = None
        with Session(engine) as session:
            job_record = save_job_offer(session, job_offer)
            try:
                company_insight = await analyze_company(job_offer.company, provider, model_name)
                job_record.company_insight_json = dump_json(company_insight)
                session.add(job_record)
                session.commit()
            except Exception as exc:
                logger.warning("Company intel skipped for %s: %s", job_offer.company, exc)

        emit(job_id, "node_done", {
            "node": "analyze",
            "icon": "✅",
            "message": f"Extracted: '{job_offer.title}' @ {job_offer.company} — {len(job_offer.hard_skills)} skills.",
        })

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
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, workflow.invoke, initial_state)

        if company_insight:
            emit(job_id, "company_result", {"company_insight": company_insight})

        emit(job_id, "done", {"icon": "🎉", "message": "Pipeline complete! Your CV has been tailored."})
        logger.info("[%s] Pipeline completed.", job_id)
    except Exception as exc:
        logger.exception("[%s] Pipeline error", job_id)
        emit(job_id, "error", {"message": str(exc)})


@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_cv(
    request: OptimizeRequest, background_tasks: BackgroundTasks
) -> OptimizationResponse:
    """Trigger the CV optimization pipeline."""
    job_id = "job_" + os.urandom(4).hex()
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


async def _event_generator(request: Request, job_id: str):
    async for item in stream_events(job_id):
        if await request.is_disconnected():
            break
        import json
        yield {"event": item["event"], "data": json.dumps(item["data"])}


@router.get("/optimize/stream")
async def stream_pipeline(request: Request, job_id: str) -> EventSourceResponse:
    """SSE endpoint for the optimization pipeline."""
    return EventSourceResponse(_event_generator(request, job_id))


@router.get("/stream/{job_id}")
async def stream_pipeline_compat(request: Request, job_id: str) -> EventSourceResponse:
    """Compatibility SSE endpoint for older frontend code."""
    return EventSourceResponse(_event_generator(request, job_id))
