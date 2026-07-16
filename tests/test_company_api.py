"""Company intelligence API tests."""

from uuid import uuid4

from conftest import auth_headers, client


def test_company_analyze_reuses_cached_identity(monkeypatch) -> None:
    calls = {"count": 0}
    slug = uuid4().hex[:8]
    company_name = f"Mindris {slug}"
    source_url = f"https://jobs.mindris-{slug}.com/careers/platform-engineer"
    second_source_url = f"https://mindris-{slug}.com/about"

    async def _fake_analyze_company(*args, **kwargs):
        calls["count"] += 1
        return {
            "name": company_name,
            "canonical_domain": f"mindris-{slug}.com",
            "homepage_url": f"https://mindris-{slug}.com",
            "careers_url": source_url,
            "industry": "SaaS",
            "size": "Unknown",
            "work_mode": "remote",
            "locations": [],
            "culture_values": ["ownership"],
            "recent_news": [],
            "glassdoor_summary": None,
            "tech_stack_known": ["python", "fastapi"],
            "role_fit": {
                "skills_to_foreground": [],
                "wording_to_mirror": [],
                "priority_experiences": [],
                "cv_emphasis": [],
                "cover_letter_emphasis": [],
            },
            "risk_flags": [],
            "evidence": {},
            "provenance": {},
            "cache": {
                "strategy": "deterministic",
                "provider": "local",
                "freshness": "runtime",
            },
            "unavailable_reason": None,
        }

    monkeypatch.setattr(
        "intelligence.company_analyzer.analyze_company",
        _fake_analyze_company,
    )

    api = client()
    headers = auth_headers()

    first = api.post(
        "/api/v1/company/analyze",
        headers=headers,
        json={
            "company_name": company_name,
            "source_url": source_url,
        },
    )
    assert first.status_code == 200
    assert calls["count"] == 1

    second = api.post(
        "/api/v1/company/analyze",
        headers=headers,
        json={
            "company_name": f"{company_name} Labs",
            "source_url": second_source_url,
        },
    )
    assert second.status_code == 200
    assert calls["count"] == 1
    assert second.json()["insight"]["canonical_domain"] == f"mindris-{slug}.com"


def test_company_analyze_can_bypass_deterministic_cache_for_explicit_summary(
    monkeypatch,
) -> None:
    calls = {"count": 0}
    slug = uuid4().hex[:8]
    company_name = f"Mindris Summary {slug}"
    source_url = f"https://jobs.mindris-summary-{slug}.com/careers/platform-engineer"

    async def _fake_analyze_company(*args, **kwargs):
        calls["count"] += 1
        return {
            "name": company_name,
            "canonical_domain": f"mindris-summary-{slug}.com",
            "homepage_url": f"https://mindris-summary-{slug}.com",
            "careers_url": source_url,
            "industry": "SaaS",
            "size": "Unknown",
            "work_mode": "remote",
            "locations": [],
            "culture_values": ["ownership"],
            "recent_news": [],
            "glassdoor_summary": None,
            "tech_stack_known": ["python"],
            "role_fit": {
                "skills_to_foreground": [],
                "wording_to_mirror": [],
                "priority_experiences": [],
                "cv_emphasis": [],
                "cover_letter_emphasis": [],
            },
            "risk_flags": [],
            "evidence": {},
            "provenance": {},
            "cache": {
                "strategy": (
                    "deterministic+llm"
                    if kwargs.get("enable_llm_summary")
                    else "deterministic"
                ),
                "provider": "local",
                "freshness": "runtime",
            },
            "unavailable_reason": None,
        }

    monkeypatch.setattr(
        "intelligence.company_analyzer.analyze_company",
        _fake_analyze_company,
    )

    api = client()
    headers = auth_headers()

    first = api.post(
        "/api/v1/company/analyze",
        headers=headers,
        json={
            "company_name": company_name,
            "source_url": source_url,
        },
    )
    assert first.status_code == 200
    assert calls["count"] == 1

    second = api.post(
        "/api/v1/company/analyze",
        headers=headers,
        json={
            "company_name": company_name,
            "source_url": source_url,
            "enable_llm_summary": True,
        },
    )
    assert second.status_code == 200
    assert calls["count"] == 2
    assert second.json()["insight"]["cache"]["strategy"] == "deterministic+llm"
