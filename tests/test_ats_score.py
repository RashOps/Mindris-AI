"""ATS schema tests."""

from intelligence.ats_score import AtsReport


def test_ats_report_accepts_scoring_breakdown() -> None:
    report = AtsReport.model_validate(
        {
            "score": 80,
            "summary": "Good fit.",
            "scoring_breakdown": [
                {
                    "criterion": "Keyword Match Rate",
                    "weight": 40,
                    "score": 32,
                    "max_score": 40,
                    "explanation": "Most required keywords are present.",
                }
            ],
            "keyword_analysis": [],
            "recommendations": ["Add more metrics."],
        }
    )
    assert report.scoring_breakdown[0].weight == 40
