"""Company intelligence routes."""

from typing import Annotated
from urllib.parse import urlparse

from database.records import CompanyInsightRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends
from persistence import dump_json, load_json
from schemas import CompanyAnalyzeRequest
from sqlalchemy import or_, select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/company", tags=["company"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _cache_key(name: str, source_url: str | None) -> str:
    if source_url:
        hostname = (urlparse(source_url).hostname or "").lower()
        if hostname.startswith("www."):
            hostname = hostname[4:]
        if hostname:
            parts = hostname.split(".")
            if len(parts) >= 2:
                return ".".join(parts[-2:])
            return hostname
    return name.lower()


@router.post("/analyze")
async def analyze_company_route(
    request: CompanyAnalyzeRequest,
    session: SessionDep,
) -> dict:
    """Analyze company intelligence with SQLite cache."""
    name = request.company_name.strip()
    source_url = str(request.source_url) if request.source_url else None
    cache_key = _cache_key(name, source_url)
    cached = session.exec(
        select(CompanyInsightRecord).where(
            or_(
                CompanyInsightRecord.cache_key == cache_key,
                CompanyInsightRecord.company_name == name.lower(),
            )
        )
    ).first()
    cached_payload = load_json(cached.insight_json, {}) if cached else None
    cached_strategy = (
        cached_payload.get("cache", {}).get("strategy")
        if isinstance(cached_payload, dict)
        else None
    )
    if cached and (
        not request.enable_llm_summary or cached_strategy == "deterministic+llm"
    ):
        logger.info("Company insight cache hit for %s", name)
        return {"status": "success", "insight": cached_payload}

    from intelligence.company_analyzer import analyze_company

    insight = await analyze_company(
        name,
        request.provider,
        request.model_name,
        source_url=source_url,
        evidence_text=request.evidence_text,
        job_insights=request.job_insights,
        cv_data=request.cv_data,
        enable_llm_summary=request.enable_llm_summary,
    )
    logger.info("Company insight generated for %s", name)
    record = cached or CompanyInsightRecord(company_name=name.lower(), cache_key=cache_key)
    record.company_name = name.lower()
    record.cache_key = cache_key
    record.insight_json = dump_json(insight)
    record.provider = request.provider
    record.model_name = request.model_name
    session.add(record)
    session.commit()
    return {"status": "success", "insight": insight}
