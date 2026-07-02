"""Tracker CRUD tests."""

from conftest import auth_headers, client


def test_tracker_create_list_move_delete() -> None:
    api = client()
    headers = auth_headers()

    created = api.post(
        "/api/v1/tracker/applications",
        headers=headers,
        json={
            "company": "Acme",
            "role": "AI Engineer",
            "status": "wishlist",
            "url": "https://example.com/job",
        },
    )
    assert created.status_code == 200
    item = created.json()["item"]
    assert item["url"] == "https://example.com/job"

    listed = api.get("/api/v1/tracker/applications", headers=headers)
    assert listed.status_code == 200
    assert any(row["id"] == item["id"] for row in listed.json()["items"])

    moved = api.patch(
        f"/api/v1/tracker/applications/{item['id']}/move",
        headers=headers,
        json={"status": "applied", "position": 0},
    )
    assert moved.status_code == 200
    assert moved.json()["item"]["status"] == "applied"

    deleted = api.delete(f"/api/v1/tracker/applications/{item['id']}", headers=headers)
    assert deleted.status_code == 200


def test_tracker_rejects_invalid_url() -> None:
    api = client()
    response = api.post(
        "/api/v1/tracker/applications",
        headers=auth_headers(),
        json={"company": "Acme", "role": "AI Engineer", "url": "not-a-url"},
    )
    assert response.status_code == 422


def test_tracker_full_view_exposes_ats_transparency_metadata(monkeypatch) -> None:
    async def _fake_score(*args, **kwargs):
        return {
            "score": 72,
            "mode": "strict",
            "summary": "Strong fit with a few hard-skill gaps.",
            "rubric": {
                "version": "ats-v1",
                "mode": "strict",
                "dimensions": [
                    {
                        "key": "keyword_match",
                        "label": "Keyword Match Rate",
                        "weight": 35,
                        "description": "Coverage of required hard and soft skills.",
                    }
                ],
            },
            "scoring_breakdown": [
                {
                    "criterion": "Keyword Match Rate",
                    "weight": 35,
                    "score": 24,
                    "max_score": 35,
                    "explanation": "Most required skills are present.",
                }
            ],
            "deductions": [
                {
                    "code": "missing_sql",
                    "title": "SQL missing",
                    "severity": "high",
                    "points_lost": 8,
                    "evidence": "SQL was not found in skills or experience.",
                    "recommendation": "Add SQL evidence in the resume.",
                }
            ],
            "keyword_analysis": [],
            "recommendations": ["Add measurable impact and SQL usage."],
            "context": {
                "job_title": "AI Engineer",
                "job_company": "Acme",
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
                    "template_id": "ats",
                    "locale": {"label_language": "en"},
                },
                "profile": {
                    "full_name": "Ada Lovelace",
                    "title": "ML Engineer",
                    "phone": "",
                    "email": "ada@example.com",
                    "location": {"city": "Paris", "country": "France"},
                    "socials": [],
                    "text_markdown": "Built production AI systems.",
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
                "company": "Acme",
                "hard_skills": ["Python", "SQL"],
                "soft_skills": ["Ownership"],
            },
            "provider": "groq",
            "model_name": "llama-3.1-8b-instant",
            "ats_mode": "strict",
            "resume_id": 42,
        },
    )
    assert score_response.status_code == 200
    assert score_response.json()["report"]["mode"] == "strict"

    history_response = api.get("/api/v1/history/ats-reports", headers=headers)
    assert history_response.status_code == 200
    ats_report = history_response.json()["items"][0]
    assert ats_report["mode"] == "strict"
    assert ats_report["rubric"]["version"] == "ats-v1"
    assert ats_report["deductions"][0]["code"] == "missing_sql"
    assert ats_report["context"]["resume_id"] == 42
    assert ats_report["context"]["resume_locale"] == "en"

    application_response = api.post(
        "/api/v1/tracker/applications",
        headers=headers,
        json={
            "company": "Acme",
            "role": "AI Engineer",
            "status": "applied",
            "url": "https://example.com/job",
            "ats_report_id": ats_report["id"],
        },
    )
    assert application_response.status_code == 200
    application_id = application_response.json()["item"]["id"]

    full_response = api.get(
        f"/api/v1/tracker/applications/{application_id}/full",
        headers=headers,
    )
    assert full_response.status_code == 200
    full_payload = full_response.json()
    assert full_payload["ats_report"]["mode"] == "strict"
    assert full_payload["ats_report"]["context"]["job_company"] == "Acme"


def test_tracker_reminder_lifecycle() -> None:
    api = client()
    headers = auth_headers()

    created = api.post(
        "/api/v1/tracker/applications",
        headers=headers,
        json={
            "company": "Mindris",
            "role": "Platform Engineer",
            "status": "wishlist",
            "url": "https://example.com/platform-role",
        },
    )
    assert created.status_code == 200
    application_id = created.json()["item"]["id"]

    reminder = api.post(
        f"/api/v1/tracker/applications/{application_id}/reminders",
        headers=headers,
        json={
            "title": "Follow up with recruiter",
            "due_at": "2026-07-10T09:30:00",
            "notes": "Send a short check-in after one week.",
        },
    )
    assert reminder.status_code == 200
    reminder_item = reminder.json()["item"]
    assert reminder_item["status"] == "pending"

    listed = api.get(
        f"/api/v1/tracker/applications/{application_id}/reminders",
        headers=headers,
    )
    assert listed.status_code == 200
    assert listed.json()["items"][0]["title"] == "Follow up with recruiter"

    completed = api.patch(
        f"/api/v1/tracker/applications/{application_id}/reminders/{reminder_item['id']}",
        headers=headers,
        json={"status": "completed"},
    )
    assert completed.status_code == 200
    assert completed.json()["item"]["status"] == "completed"
    assert completed.json()["item"]["completed_at"] is not None

    full = api.get(
        f"/api/v1/tracker/applications/{application_id}/full",
        headers=headers,
    )
    assert full.status_code == 200
    assert full.json()["application"]["reminder_counts"]["completed"] == 1
    assert full.json()["reminders"][0]["id"] == reminder_item["id"]

    deleted = api.delete(
        f"/api/v1/tracker/applications/{application_id}/reminders/{reminder_item['id']}",
        headers=headers,
    )
    assert deleted.status_code == 200
