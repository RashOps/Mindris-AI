"""Company intelligence routes."""

from database.records import CompanyInsightRecord
from database.session import get_session
from fastapi import APIRouter, Depends
from intelligence.company_analyzer import analyze_company
from persistence import dump_json, load_json
from schemas import CompanyAnalyzeRequest
from sqlalchemy import select
from database.session import Session

router = APIRouter(prefix="/api/v1/company", tags=["company"])


@router.post("/analyze")
async def analyze_company_route(
    request: CompanyAnalyzeRequest, session: Session = Depends(get_session)
) -> dict:
    """Analyze company intelligence with SQLite cache."""
    name = request.company_name.strip()
    cached = session.exec(
        select(CompanyInsightRecord).where(CompanyInsightRecord.company_name == name.lower())
    ).first()
    if cached:
        return {"status": "success", "insight": load_json(cached.insight_json, {})}

    insight = await analyze_company(name, request.provider, request.model_name)
    record = CompanyInsightRecord(
        company_name=name.lower(),
        insight_json=dump_json(insight),
        provider=request.provider,
        model_name=request.model_name,
    )
    session.add(record)
    session.commit()
    return {"status": "success", "insight": insight}
