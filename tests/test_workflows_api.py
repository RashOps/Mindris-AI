"""Workflow automation API tests."""

from uuid import uuid4

from database.records import ApplicationRecord, ResumeRecord, ScrapedJobRecord
from database.session import SessionLocal
from persistence import (
    delete_resume_locale_variant,
    save_ats_report,
    save_cover_letter,
)
from routers.workflows import (
    create_opportunity_route,
    get_opportunity_route,
    link_ats_route,
    link_cover_letter_route,
    link_resume_route,
    link_tracker_route,
    mark_ready_route,
    repair_opportunity_route,
)
from schemas import (
    OpportunityAtsLinkRequest,
    OpportunityCoverLetterLinkRequest,
    OpportunityCreateRequest,
    OpportunityRepairRequest,
    OpportunityResumeLinkRequest,
    OpportunityTrackerLinkRequest,
)


def _seed_job(url_suffix: str = "workflow") -> ScrapedJobRecord:
    with SessionLocal() as session:
        job = ScrapedJobRecord(
            url=f"https://example.com/jobs/{url_suffix}-{uuid4().hex}",
            title="Platform Engineer",
            company="Mindris",
            location="Paris",
            hard_skills='["Python", "FastAPI"]',
            soft_skills='["Ownership"]',
            description_markdown="Build robust backend workflows.",
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job


def _seed_resume(name: str = "Workflow Resume") -> ResumeRecord:
    with SessionLocal() as session:
        resume = ResumeRecord(
            name=name,
            data_json=(
                '{"multilingual":{"default_locale":"fr","active_locale":"fr","variants":'
                '{"fr":{"profile":{"full_name":"Ada Lovelace"},'
                '"global_settings":{"template_id":"modern","locale":{"label_language":"fr"}}}}}}'
            ),
            template_id="modern",
            locale="fr",
            source="manual",
        )
        session.add(resume)
        session.commit()
        session.refresh(resume)
        return resume


def test_workflow_opportunity_creation_and_linking() -> None:
    job = _seed_job("workflow-create")
    resume = _seed_resume("Workflow FR")

    with SessionLocal() as session:
        created = create_opportunity_route(
            OpportunityCreateRequest(
                job_id=job.id,
                notes="Imported from scrape flow.",
            ),
            session,
        )
        item = created["item"]
    assert item["job_id"] == job.id
    assert item["company"] == "Mindris"
    assert item["role"] == "Platform Engineer"
    assert item["current_state"] == "opportunity_created"
    assert [entry["state"] for entry in item["transitions"]][:2] == [
        "scrape_completed",
        "opportunity_created",
    ]

    with SessionLocal() as session:
        linked_resume = link_resume_route(
            item["id"],
            OpportunityResumeLinkRequest(resume_id=resume.id, locale="fr"),
            session,
        )
        linked_item = linked_resume["item"]
    assert linked_item["resume_id"] == resume.id
    assert linked_item["resume_locale"] == "fr"
    assert linked_item["current_state"] == "resume_linked"


def test_workflow_relinking_artifacts_replaces_links_and_appends_log() -> None:
    job = _seed_job("workflow-relink")
    resume = _seed_resume("Workflow EN")

    with SessionLocal() as session:
        created = create_opportunity_route(
            OpportunityCreateRequest(job_id=job.id),
            session,
        )
        opportunity_id = created["item"]["id"]
        link_resume_route(
            opportunity_id,
            OpportunityResumeLinkRequest(resume_id=resume.id, locale="fr"),
            session,
        )

    with SessionLocal() as session:
        ats_one = save_ats_report(
            session,
            {
                "score": 71,
                "summary": "Initial pass.",
                "mode": "standard",
                "rubric": {"version": "ats-v1", "dimensions": []},
                "keyword_analysis": [],
                "scoring_breakdown": [],
                "deductions": [],
                "recommendations": [],
                "context": {"job_id": job.id, "resume_id": resume.id},
            },
            "groq",
            "llama-3.1-8b-instant",
            job_id=job.id,
        )
        ats_two = save_ats_report(
            session,
            {
                "score": 82,
                "summary": "Improved fit.",
                "mode": "strict",
                "rubric": {"version": "ats-v1", "dimensions": []},
                "keyword_analysis": [],
                "scoring_breakdown": [],
                "deductions": [],
                "recommendations": [],
                "context": {"job_id": job.id, "resume_id": resume.id},
            },
            "groq",
            "llama-3.1-8b-instant",
            job_id=job.id,
        )
        letter = save_cover_letter(
            session,
            "Dear Mindris,\n\nI build resilient platforms.",
            "groq",
            "llama-3.3-70b-versatile",
            job_id=job.id,
        )

    with SessionLocal() as session:
        link_ats_route(
            opportunity_id,
            OpportunityAtsLinkRequest(ats_report_id=ats_one.id),
            session,
        )
        link_ats_route(
            opportunity_id,
            OpportunityAtsLinkRequest(ats_report_id=ats_two.id),
            session,
        )
        link_cover_letter_route(
            opportunity_id,
            OpportunityCoverLetterLinkRequest(cover_letter_id=letter.id),
            session,
        )
        fetched = get_opportunity_route(opportunity_id, session)
        item = fetched["item"]
    assert item["ats_report_id"] == ats_two.id
    assert item["cover_letter_id"] == letter.id
    assert item["current_state"] == "cover_letter_linked"
    ats_transitions = [
        entry for entry in item["transitions"] if entry["state"] == "ats_report_linked"
    ]
    assert len(ats_transitions) == 2
    assert ats_transitions[-1]["metadata"]["replaced"] is True


def test_workflow_tracker_creation_and_ready_to_apply() -> None:
    job = _seed_job("workflow-ready")
    resume = _seed_resume("Workflow Ready")

    with SessionLocal() as session:
        created = create_opportunity_route(
            OpportunityCreateRequest(job_id=job.id),
            session,
        )
        opportunity_id = created["item"]["id"]
        link_resume_route(
            opportunity_id,
            OpportunityResumeLinkRequest(resume_id=resume.id, locale="fr"),
            session,
        )

    with SessionLocal() as session:
        ats = save_ats_report(
            session,
            {
                "score": 90,
                "summary": "Ready to send.",
                "mode": "strict",
                "rubric": {"version": "ats-v1", "dimensions": []},
                "keyword_analysis": [],
                "scoring_breakdown": [],
                "deductions": [],
                "recommendations": [],
                "context": {"job_id": job.id, "resume_id": resume.id},
            },
            "groq",
            "llama-3.1-8b-instant",
            job_id=job.id,
        )
        letter = save_cover_letter(
            session,
            "Dear Mindris,\n\nThis application is ready.",
            "groq",
            "llama-3.3-70b-versatile",
            job_id=job.id,
        )

    with SessionLocal() as session:
        link_ats_route(
            opportunity_id,
            OpportunityAtsLinkRequest(ats_report_id=ats.id),
            session,
        )
        link_cover_letter_route(
            opportunity_id,
            OpportunityCoverLetterLinkRequest(cover_letter_id=letter.id),
            session,
        )
        tracker = link_tracker_route(
            opportunity_id,
            OpportunityTrackerLinkRequest(create=True, status="wishlist"),
            session,
        )
        tracker_item = tracker["item"]
    assert tracker_item["application_id"] is not None
    assert tracker_item["current_state"] == "tracker_entry_created"

    with SessionLocal() as session:
        ready = mark_ready_route(opportunity_id, session)
        ready_item = ready["item"]
    assert ready_item["current_state"] == "ready_to_apply"
    assert ready_item["application_id"] == tracker_item["application_id"]


def test_workflow_surfaces_missing_tracker_link_as_degraded_integrity() -> None:
    job = _seed_job("workflow-orphan-application")
    resume = _seed_resume("Workflow Orphan App")

    with SessionLocal() as session:
        created = create_opportunity_route(
            OpportunityCreateRequest(job_id=job.id),
            session,
        )
        opportunity_id = created["item"]["id"]
        link_resume_route(
            opportunity_id,
            OpportunityResumeLinkRequest(resume_id=resume.id, locale="fr"),
            session,
        )
        tracker = link_tracker_route(
            opportunity_id,
            OpportunityTrackerLinkRequest(create=True, status="wishlist"),
            session,
        )
        application_id = tracker["item"]["application_id"]

    with SessionLocal() as session:
        application = session.get(ApplicationRecord, application_id)
        assert application is not None
        session.delete(application)
        session.commit()

        fetched = get_opportunity_route(opportunity_id, session)

    integrity = fetched["item"]["integrity"]
    assert integrity["status"] == "degraded"
    assert "detach_missing_application" in integrity["repair_actions"]
    assert any(
        issue["code"] == "missing_application_link" for issue in integrity["issues"]
    )

    with SessionLocal() as session:
        repaired = repair_opportunity_route(
            opportunity_id,
            OpportunityRepairRequest(action="detach_missing_application"),
            session,
        )

    repaired_item = repaired["item"]
    assert repaired_item["application_id"] is None
    assert repaired_item["integrity"]["status"] == "healthy"
    assert repaired_item["current_state"] == "resume_linked"
    assert (
        repaired_item["transitions"][-1]["action"]
        == "repair:detach_missing_application"
    )


def test_workflow_surfaces_invalid_resume_locale_as_degraded_integrity() -> None:
    job = _seed_job("workflow-invalid-locale")

    with SessionLocal() as session:
        resume = ResumeRecord(
            name="Workflow Locale Drift",
            data_json=(
                '{"multilingual":{"default_locale":"fr","active_locale":"fr","variants":'
                '{"fr":{"profile":{"full_name":"Ada Lovelace"},'
                '"global_settings":{"template_id":"modern","locale":{"label_language":"fr"}}},'
                '"en":{"profile":{"full_name":"Ada Lovelace"},'
                '"global_settings":{"template_id":"modern","locale":{"label_language":"en"}}}}}}'
            ),
            template_id="modern",
            locale="fr",
            source="manual",
        )
        session.add(resume)
        session.commit()
        session.refresh(resume)
        resume_id = resume.id

        created = create_opportunity_route(
            OpportunityCreateRequest(job_id=job.id),
            session,
        )
        opportunity_id = created["item"]["id"]
        link_resume_route(
            opportunity_id,
            OpportunityResumeLinkRequest(resume_id=resume_id, locale="en"),
            session,
        )

        persisted_resume = session.get(ResumeRecord, resume_id)
        assert persisted_resume is not None
        delete_resume_locale_variant(session, persisted_resume, locale="en")
        fetched = get_opportunity_route(opportunity_id, session)

    integrity = fetched["item"]["integrity"]
    assert integrity["status"] == "degraded"
    assert "reset_resume_locale" in integrity["repair_actions"]
    assert any(
        issue["code"] == "invalid_resume_locale"
        and issue["metadata"]["resume_locale"] == "en"
        for issue in integrity["issues"]
    )

    with SessionLocal() as session:
        repaired = repair_opportunity_route(
            opportunity_id,
            OpportunityRepairRequest(action="reset_resume_locale"),
            session,
        )

    repaired_item = repaired["item"]
    assert repaired_item["resume_locale"] == "fr"
    assert repaired_item["integrity"]["status"] == "healthy"
    assert repaired_item["transitions"][-1]["action"] == "repair:reset_resume_locale"
