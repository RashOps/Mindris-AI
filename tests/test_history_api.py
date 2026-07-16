"""Unified history API tests."""

import json
from uuid import uuid4

from conftest import auth_headers, client
from database.records import (
    ApplicationRecord,
    ApplicationReminderRecord,
    OpportunityRecord,
    OpportunityTransitionRecord,
    ResumeRecord,
    ResumeRevisionRecord,
    ScrapedJobRecord,
)
from database.session import SessionLocal
from persistence import create_resume_revision, save_ats_report, save_cover_letter
from sqlalchemy import select


def test_history_ledger_requires_api_key() -> None:
    api = client(client_host="198.51.100.25", base_url="http://mindris.example")
    response = api.get("/api/v1/history/ledger")
    assert response.status_code == 401
    assert response.json()["status"] == "error"


def test_history_ledger_returns_normalized_items_and_filters(monkeypatch) -> None:
    async def _fake_score(*args, **kwargs):
        return {
            "score": 84,
            "mode": "standard",
            "summary": "Strong fit.",
            "rubric": {
                "version": "ats-v1",
                "mode": "standard",
                "dimensions": [],
            },
            "scoring_breakdown": [],
            "deductions": [],
            "keyword_analysis": [],
            "recommendations": [],
            "context": {
                "job_title": "AI Engineer",
                "job_company": "Mindris",
                "provider": "groq",
                "model_name": "llama-3.1-8b-instant",
            },
        }

    monkeypatch.setattr("intelligence.ats_score.calculate_ats_score", _fake_score)

    api = client()
    headers = auth_headers()

    score_response = api.post(
        "/api/v1/cv/score",
        headers=headers,
        json={
            "cv_data": {
                "global_settings": {
                    "template_id": "modern",
                    "locale": {"label_language": "fr"},
                },
                "profile": {
                    "full_name": "Ada Lovelace",
                    "title": "AI Engineer",
                    "phone": "",
                    "email": "ada@example.com",
                    "location": {"city": "Paris", "country": "France"},
                    "socials": [],
                    "text_markdown": "Production AI systems and FastAPI.",
                },
                "experience": [],
                "education": [],
                "skills": [],
                "projects": [],
                "languages": [],
                "hobbies": [],
                "certifications": [],
                "volunteering": [],
                "publications": [],
                "references": [],
                "custom_sections": [],
            },
            "job_insights": {
                "job_title": "AI Engineer",
                "company": "Mindris",
                "hard_skills": ["Python"],
                "soft_skills": ["Ownership"],
            },
            "provider": "groq",
            "model_name": "llama-3.1-8b-instant",
        },
    )
    assert score_response.status_code == 200

    ledger_response = api.get("/api/v1/history/ledger", headers=headers)
    assert ledger_response.status_code == 200
    payload = ledger_response.json()
    assert payload["status"] == "success"
    assert payload["items"]
    first = payload["items"][0]
    assert {
        "id",
        "subject_type",
        "subject_id",
        "title",
        "summary",
        "timestamp",
        "links",
        "metadata",
    } <= set(first)

    ats_response = api.get(
        "/api/v1/history/ledger?subject_type=ats_report",
        headers=headers,
    )
    assert ats_response.status_code == 200
    ats_items = ats_response.json()["items"]
    assert ats_items
    assert all(item["subject_type"] == "ats_report" for item in ats_items)


def test_history_ledger_builds_lineage_links_for_related_artifacts() -> None:
    api = client()
    headers = auth_headers()

    with SessionLocal() as session:
        job = ScrapedJobRecord(
            url=f"https://example.com/job/ml-platform-history-ledger-{uuid4().hex}",
            title="ML Platform Engineer",
            company="Mindris",
            location="Paris",
            hard_skills='["Python", "MLOps"]',
            soft_skills='["Ownership"]',
            description_markdown="Build ML platform services.",
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        resume_payload = (
            '{"multilingual":{"default_locale":"fr","active_locale":"fr","variants":'
            '{"fr":{"profile":{"full_name":"Ada Lovelace"},'
            '"global_settings":{"template_id":"modern"}}}}}'
        )
        resume = ResumeRecord(
            name="Platform CV",
            data_json=resume_payload,
            template_id="modern",
            locale="fr",
            source="manual",
        )
        session.add(resume)
        session.commit()
        session.refresh(resume)
        revision = create_resume_revision(session, resume, label="initial")

        ats = save_ats_report(
            session,
            {
                "score": 88,
                "mode": "strict",
                "summary": "Excellent fit.",
                "rubric": {"version": "ats-v1", "mode": "strict", "dimensions": []},
                "keyword_analysis": [],
                "scoring_breakdown": [],
                "deductions": [],
                "recommendations": [],
                "context": {
                    "job_title": job.title,
                    "job_company": job.company,
                    "job_id": job.id,
                    "resume_id": resume.id,
                    "resume_locale": "fr",
                },
            },
            "groq",
            "llama-3.1-8b-instant",
            job_id=job.id,
        )
        letter = save_cover_letter(
            session,
            "Dear Mindris,\n\nI build ML platforms.",
            "groq",
            "llama-3.3-70b-versatile",
            job_id=job.id,
        )
        application = ApplicationRecord(
            job_id=job.id,
            status="applied",
            position=0,
            company=job.company,
            role=job.title,
            url=job.url,
            ats_report_id=ats.id,
            cover_letter_id=letter.id,
        )
        session.add(application)
        session.commit()
        session.refresh(application)

    ledger_response = api.get(
        f"/api/v1/history/ledger?job_id={job.id}",
        headers=headers,
    )
    assert ledger_response.status_code == 200
    items = ledger_response.json()["items"]
    assert items

    tracker_item = next(
        item for item in items if item["subject_type"] == "tracker_event"
    )
    assert any(
        link["subject_type"] == "ats_report" and link["subject_id"] == str(ats.id)
        for link in tracker_item["links"]
    )
    assert any(
        link["subject_type"] == "cover_letter"
        and link["subject_id"] == str(letter.id)
        for link in tracker_item["links"]
    )

    revision_response = api.get(
        f"/api/v1/history/ledger?resume_id={resume.id}",
        headers=headers,
    )
    assert revision_response.status_code == 200
    revision_items = revision_response.json()["items"]
    assert any(
        item["subject_type"] == "resume_revision"
        and item["subject_id"] == str(revision.id)
        for item in revision_items
    )


def test_history_ledger_can_be_cleared_without_deleting_resume_library() -> None:
    api = client()
    headers = auth_headers()

    with SessionLocal() as session:
        job = ScrapedJobRecord(
            url=f"https://example.com/job/history-purge-{uuid4().hex}",
            title="Platform Engineer",
            company="Mindris",
            location="Paris",
            hard_skills='["Python"]',
            soft_skills='["Ownership"]',
            description_markdown="Build internal systems.",
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        resume = ResumeRecord(
            name="Source Resume",
            data_json=json.dumps(
                {
                    "multilingual": {
                        "default_locale": "fr",
                        "active_locale": "fr",
                        "variants": {
                            "fr": {
                                "profile": {"full_name": "Ada Lovelace"},
                                "global_settings": {"template_id": "modern"},
                            }
                        },
                    }
                }
            ),
            template_id="modern",
            locale="fr",
            source="manual",
        )
        session.add(resume)
        session.commit()
        session.refresh(resume)

        revision = create_resume_revision(session, resume, label="before-purge")
        ats = save_ats_report(
            session,
            {
                "score": 78,
                "mode": "standard",
                "summary": "Good fit.",
                "rubric": {"version": "ats-v1", "mode": "standard", "dimensions": []},
                "keyword_analysis": [],
                "scoring_breakdown": [],
                "deductions": [],
                "recommendations": [],
                "context": {
                    "job_title": job.title,
                    "job_company": job.company,
                    "job_id": job.id,
                    "resume_id": resume.id,
                    "resume_locale": "fr",
                },
            },
            "groq",
            "llama-3.1-8b-instant",
            job_id=job.id,
        )
        letter = save_cover_letter(
            session,
            "Dear Mindris,\n\nI build platforms.",
            "groq",
            "llama-3.3-70b-versatile",
            job_id=job.id,
        )
        application = ApplicationRecord(
            job_id=job.id,
            status="wishlist",
            position=0,
            company=job.company,
            role=job.title,
            url=job.url,
            ats_report_id=ats.id,
            cover_letter_id=letter.id,
        )
        session.add(application)
        session.commit()
        session.refresh(application)

        reminder = ApplicationReminderRecord(
            application_id=application.id,
            title="Follow up",
            due_at=job.scraped_at,
        )
        session.add(reminder)

        opportunity = OpportunityRecord(
            job_id=job.id,
            source_url=job.url,
            company=job.company,
            role=job.title,
            resume_id=resume.id,
            resume_locale="fr",
            ats_report_id=ats.id,
            cover_letter_id=letter.id,
            application_id=application.id,
        )
        session.add(opportunity)
        session.commit()
        session.refresh(opportunity)

        transition = OpportunityTransitionRecord(
            opportunity_id=opportunity.id,
            state="opportunity_created",
            action="create",
        )
        session.add(transition)
        session.commit()

    response = api.delete("/api/v1/history/ledger", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["deleted"]["jobs"] >= 1
    assert payload["deleted"]["ats_reports"] >= 1
    assert payload["deleted"]["cover_letters"] >= 1
    assert payload["deleted"]["resume_revisions"] >= 1
    assert payload["deleted"]["applications"] >= 1
    assert payload["deleted"]["application_reminders"] >= 1
    assert payload["deleted"]["opportunities"] >= 1
    assert payload["deleted"]["opportunity_transitions"] >= 1

    with SessionLocal() as session:
        assert session.exec(select(ScrapedJobRecord)).first() is None
        assert session.exec(select(ResumeRevisionRecord)).first() is None
        assert session.exec(select(ApplicationRecord)).first() is None
        assert session.exec(select(ApplicationReminderRecord)).first() is None
        assert session.exec(select(OpportunityRecord)).first() is None
        assert session.exec(select(OpportunityTransitionRecord)).first() is None
        assert session.get(ResumeRecord, resume.id) is not None
        assert revision.id is not None
