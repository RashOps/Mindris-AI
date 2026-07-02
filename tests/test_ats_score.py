"""ATS schema tests."""

from intelligence.ats_score import AtsReport, build_fallback_ats_report


def test_ats_report_accepts_scoring_breakdown() -> None:
    report = AtsReport.model_validate(
        {
            "score": 80,
            "mode": "strict",
            "summary": "Good fit.",
            "rubric": {
                "version": "ats-v1",
                "mode": "strict",
                "dimensions": [
                    {
                        "key": "keyword_match",
                        "label": "Keyword Match Rate",
                        "weight": 30,
                        "description": "Coverage of required keywords.",
                    }
                ],
            },
            "scoring_breakdown": [
                {
                    "criterion": "Keyword Match Rate",
                    "weight": 40,
                    "score": 32,
                    "max_score": 40,
                    "explanation": "Most required keywords are present.",
                }
            ],
            "deductions": [
                {
                    "code": "missing_keyword",
                    "title": "Missing SQL keyword",
                    "severity": "high",
                    "points_lost": 8,
                    "evidence": "SQL not found in the experience or skills sections.",
                    "recommendation": "Add explicit SQL usage in relevant roles.",
                }
            ],
            "keyword_analysis": [],
            "recommendations": ["Add more metrics."],
            "context": {
                "job_title": "Data Engineer",
                "job_company": "Mindris",
                "job_id": 12,
                "resume_id": 4,
                "resume_locale": "fr",
                "provider": "groq",
                "model_name": "llama-3.1-8b-instant",
            },
        }
    )
    assert report.scoring_breakdown[0].weight == 40
    assert report.mode == "strict"
    assert report.rubric.mode == "strict"
    assert report.deductions[0].points_lost == 8
    assert report.context.resume_locale == "fr"


def test_fallback_ats_report_keeps_transparency_contract() -> None:
    report = build_fallback_ats_report(
        mode="standard",
        provider="groq",
        model_name="llama-3.1-8b-instant",
        reason="provider timeout",
        context={
            "job_title": "AI Engineer",
            "job_company": "Mindris",
            "resume_locale": "en",
        },
    )

    parsed = AtsReport.model_validate(report)

    assert parsed.mode == "standard"
    assert parsed.rubric.version == "ats-v1"
    assert parsed.deductions[0].code == "llm_output_invalid"
    assert parsed.context.provider == "groq"
    assert parsed.context.resume_locale == "en"
