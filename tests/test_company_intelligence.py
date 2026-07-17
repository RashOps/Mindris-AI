"""Deterministic company intelligence tests."""

from intelligence.company_analyzer import analyze_company


def test_company_intelligence_builds_deterministic_profile_from_local_evidence(
) -> None:
    insight = __import__("asyncio").run(
        analyze_company(
            "Mindris",
            source_url="https://jobs.mindris.com/careers/platform-engineer",
            evidence_text=(
                "Mindris is a remote-first SaaS platform building AI workflow tools. "
                "Our stack includes Python, FastAPI, Bun, Next.js and Docker. "
                "We value ownership, transparency and async collaboration."
            ),
        )
    )

    assert insight["name"] == "Mindris"
    assert insight["canonical_domain"] == "mindris.com"
    assert insight["homepage_url"] == "https://mindris.com"
    assert insight["careers_url"] == "https://jobs.mindris.com/careers/platform-engineer"
    assert insight["work_mode"] == "remote"
    assert "python" in [item.lower() for item in insight["tech_stack_known"]]
    assert "ownership" in [item.lower() for item in insight["culture_values"]]
    assert insight["provenance"]["canonical_domain"] == "verified"
    assert insight["provenance"]["industry"] in {"derived", "unknown"}
    assert insight["cache"]["strategy"] == "deterministic"


def test_company_intelligence_marks_unknown_fields_explicitly() -> None:
    insight = __import__("asyncio").run(analyze_company("Unknown Co"))

    assert insight["name"] == "Unknown Co"
    assert insight["canonical_domain"] is None
    assert insight["work_mode"] == "unknown"
    assert insight["industry"] == "Unknown"
    assert insight["provenance"]["canonical_domain"] == "unknown"
    assert insight["provenance"]["industry"] == "unknown"
    assert isinstance(insight["evidence"]["industry"], list)


def test_company_intelligence_computes_role_fit_and_risk_flags_locally() -> None:
    insight = __import__("asyncio").run(
        analyze_company(
            "Mindris",
            source_url="https://jobs.mindris.com/careers/platform-engineer",
            evidence_text=(
                "Mindris is a remote-first SaaS platform. "
                "We use Python, FastAPI, Docker and Next.js. "
                "We value ownership, transparency and async collaboration."
            ),
            job_insights={
                "job_title": "Platform Engineer",
                "company": "Mindris",
                "hard_skills": ["Python", "FastAPI", "Docker", "Kubernetes"],
                "soft_skills": ["Ownership", "Communication"],
            },
            cv_data={
                "profile": {
                    "title": "Backend Engineer",
                    "text_markdown": "FastAPI systems",
                },
                "skills": [
                    {
                        "category": "Backend",
                        "skills": ["Python", "FastAPI", "PostgreSQL"],
                    }
                ],
                "experience": [
                    {
                        "role": "Backend Engineer",
                        "company": "Acme",
                        "description_markdown": "Built APIs and deployment automation.",
                    }
                ],
                "projects": [{"name": "Ops Tooling", "tech_stack": ["Docker", "Bun"]}],
            },
        )
    )

    assert "python" in [
        item.lower() for item in insight["role_fit"]["skills_to_foreground"]
    ]
    assert "ownership" in [
        item.lower() for item in insight["role_fit"]["wording_to_mirror"]
    ]
    assert any(flag["code"] == "missing_job_skill" for flag in insight["risk_flags"])
    assert any(
        flag["code"] == "missing_location_signal" for flag in insight["risk_flags"]
    )
