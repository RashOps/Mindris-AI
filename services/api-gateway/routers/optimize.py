"""Optimization pipeline and SSE routes."""

import asyncio
import json
import os
from collections.abc import AsyncGenerator
from functools import partial

from database.records import ResumeRecord
from database.session import Session, engine
from fastapi import APIRouter, BackgroundTasks, Request
from intelligence.event_bus import create_job_queue, emit, stream_events
from monitoring import monitor
from persistence import resolve_resume_variant, save_job_offer
from persistence_lib.json import dump_json
from schemas import OptimizationResponse, OptimizeRequest
from sse_starlette.sse import EventSourceResponse
from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")
router = APIRouter(prefix="/api/v1", tags=["optimize"])


async def run_intelligence_pipeline(
    job_id: str,
    job_url: str,
    provider: str,
    model_name: str,
    resume_id: int | None = None,
    resume_locale: str = "fr",
) -> None:
    """Background task: scrape -> analyze -> RAG workflow -> SSE events."""
    from intelligence.company_analyzer import analyze_company
    from intelligence.crew import analyze_job_offer
    from intelligence.workflow import create_rag_workflow
    from scraper.smart_scraper import ScraperExhaustedError, SmartScraper

    logger.info("[%s] Starting pipeline for %s", job_id, job_url)
    emit(
        job_id,
        "pipeline_start",
        {
            "message": f"Pipeline started for {job_url}",
            "message_id": "agent.pipeline.started",
        },
    )

    try:
        emit(
            job_id,
            "node_start",
            {
                "node": "scrape",
                "message": "Scraping job offer page…",
                "message_id": "agent.pipeline.scraping",
            },
        )
        try:
            async with SmartScraper() as scraper:
                markdown_content = await asyncio.wait_for(
                    scraper.get_cleaned_content(job_url),
                    timeout=settings.pipeline_timeout_seconds,
                )
        except ScraperExhaustedError as exc:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": f"All scraping providers failed: {exc}",
                    "message_id": "agent.pipeline.scraping_failed",
                },
            )
            return
        except TimeoutError:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": "Scraping timed out.",
                    "message_id": "agent.pipeline.scraping_timeout",
                },
            )
            return

        if not markdown_content:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": "Scraping returned empty content.",
                    "message_id": "agent.pipeline.empty_source",
                },
            )
            return

        emit(
            job_id,
            "node_done",
            {
                "node": "scrape",
                "message": f"Job page scraped ({len(markdown_content)} chars).",
                "message_id": "agent.pipeline.scraped",
                "params": {"characters": len(markdown_content)},
            },
        )
        emit(
            job_id,
            "node_start",
            {
                "node": "analyze",
                "message": "Extracting job requirements with AI…",
                "message_id": "agent.pipeline.analyzing_job",
            },
        )

        try:
            job_offer = await asyncio.wait_for(
                analyze_job_offer(
                    markdown_content=markdown_content,
                    url=job_url,
                    provider=provider,
                    model_name=model_name,
                ),
                timeout=settings.pipeline_timeout_seconds,
            )
        except TimeoutError:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": "Job offer analysis timed out.",
                    "message_id": "agent.pipeline.job_analysis_timeout",
                },
            )
            return
        if not job_offer:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": (
                        "Job offer analysis failed - LLM could not extract "
                        "structured data."
                    ),
                    "message_id": "agent.pipeline.job_analysis_failed",
                },
            )
            return

        company_insight = None
        job_record_id: int | None = None
        resume_payload: dict | None = None
        resume_snapshot: dict | None = None
        resolved_resume_locale = resume_locale
        with Session(engine) as session:
            job_record = save_job_offer(session, job_offer)
            job_record_id = job_record.id
            if resume_id is not None:
                resume_record = session.get(ResumeRecord, resume_id)
                if resume_record is None:
                    emit(
                        job_id,
                        "error",
                        {
                            "message": "Selected resume not found.",
                            "message_id": "agent.resume_not_found",
                        },
                    )
                    return
                try:
                    resume_payload, resolved_resume_locale = resolve_resume_variant(
                        resume_record,
                        locale=resume_locale,
                    )
                except ValueError as exc:
                    emit(
                        job_id,
                        "error",
                        {
                            "message": str(exc),
                            "message_id": "agent.resume_locale_invalid",
                        },
                    )
                    return
                from intelligence.resume_context import AgentTask
                from resume_agent_runtime import build_persisted_resume_snapshot

                canonical_snapshot = build_persisted_resume_snapshot(
                    session,
                    resume_id=resume_id,
                    locale=resolved_resume_locale,
                    job_id=job_record_id,
                )
                resume_snapshot = canonical_snapshot.for_task(
                    AgentTask.STRATEGY,
                    external_provider=provider if provider != "ollama" else None,
                ).model_dump(mode="json")
            try:
                company_insight = await asyncio.wait_for(
                    analyze_company(
                        job_offer.company,
                        provider,
                        model_name,
                        source_url=job_url,
                        evidence_text=job_offer.description_markdown,
                    ),
                    timeout=settings.service_timeout_seconds,
                )
                job_record.company_insight_json = dump_json(company_insight)
                session.add(job_record)
                session.commit()
            except Exception as exc:
                logger.warning(
                    "Company intel skipped for %s: %s", job_offer.company, exc
                )

        emit(
            job_id,
            "node_done",
            {
                "node": "analyze",
                "message": (
                    f"Extracted: '{job_offer.title}' @ {job_offer.company} - "
                    f"{len(job_offer.hard_skills)} skills."
                ),
                "message_id": "agent.pipeline.job_ready",
                "params": {
                    "title": job_offer.title,
                    "company": job_offer.company,
                    "skills": len(job_offer.hard_skills),
                },
            },
        )

        if resume_payload is not None:
            from intelligence.ingest_cv import ingest_cv_data

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                partial(
                    ingest_cv_data,
                    resume_payload,
                    resume_id=resume_id,
                    locale=resolved_resume_locale,
                ),
            )

        def _persist_workflow_proposal(proposal_payload: dict) -> int | None:
            if resume_id is None:
                return None
            from intelligence.resume_patches import ResumePatchProposal
            from resume_agent_tools import ProposalArguments, save_agent_proposal

            with Session(engine) as proposal_session:
                record = save_agent_proposal(
                    proposal_session,
                    ProposalArguments(
                        resume_id=resume_id,
                        revision=(
                            int(resume_snapshot["revision"])
                            if resume_snapshot
                            else None
                        ),
                        locale=resolved_resume_locale,
                        job_id=job_record_id,
                        task="strategy",
                        external_provider=(
                            provider if provider != "ollama" else None
                        ),
                        proposal=ResumePatchProposal.model_validate(
                            proposal_payload
                        ),
                        agent="resume_strategist",
                        provider=provider,
                        model_name=model_name,
                    ),
                )
                return record.id

        workflow = create_rag_workflow(
            job_id=job_id,
            proposal_sink=_persist_workflow_proposal,
        )
        initial_state = {
            "job_offer": job_offer,
            "provider": provider,
            "model_name": model_name,
            "retrieved_context": "",
            "drafted_cv": "",
            "score": 0,
            "iterations": 0,
            "job_id": job_id,
            "job_record_id": job_record_id,
            "source_url": job_url,
            "evidence_ledger": [],
            "evidence_matrix": [],
            "proposed_changes": [],
            "evaluation": None,
            "warnings": [],
            "resume_id": resume_id,
            "resume_locale": resolved_resume_locale,
            "resume_snapshot": resume_snapshot,
            "resume_patch": None,
            "max_iterations": settings.agent_max_iterations,
        }
        loop = asyncio.get_running_loop()
        try:
            await asyncio.wait_for(
                loop.run_in_executor(None, workflow.invoke, initial_state),
                timeout=settings.pipeline_timeout_seconds,
            )
        except TimeoutError:
            monitor.increment_pipeline_failure("optimize")
            emit(
                job_id,
                "error",
                {
                    "message": "CV optimization workflow timed out.",
                    "message_id": "agent.pipeline.workflow_timeout",
                },
            )
            return

        if company_insight:
            emit(job_id, "company_result", {"company_insight": company_insight})

        emit(
            job_id,
            "done",
            {
                "message": "Pipeline complete! Your CV has been tailored.",
                "message_id": "agent.pipeline.completed",
            },
        )
        logger.info("[%s] Pipeline completed.", job_id)
    except Exception as exc:
        monitor.increment_pipeline_failure("optimize")
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
        request.resume_id,
        request.resume_locale,
    )
    return OptimizationResponse(
        status="processing",
        message=(
            "Pipeline started. Connect to /api/v1/optimize/stream?job_id=<id> "
            "for live updates."
        ),
        job_id=job_id,
    )


async def _event_generator(
    request: Request,
    job_id: str,
) -> AsyncGenerator[dict, None]:
    async for item in stream_events(job_id):
        if await request.is_disconnected():
            break
        yield {"event": item["event"], "data": json.dumps(item["data"])}


@router.get("/optimize/stream")
async def stream_pipeline(request: Request, job_id: str) -> EventSourceResponse:
    """SSE endpoint for the optimization pipeline."""
    return EventSourceResponse(_event_generator(request, job_id))


@router.get("/stream/{job_id}")
async def stream_pipeline_compat(request: Request, job_id: str) -> EventSourceResponse:
    """Compatibility SSE endpoint for older frontend code."""
    return EventSourceResponse(_event_generator(request, job_id))
