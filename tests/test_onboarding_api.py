"""Backend-owned onboarding checklist tests."""

from pathlib import Path

from conftest import auth_headers, client


def test_onboarding_exposes_stable_backend_steps(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        "routers.onboarding.STATE_PATH",
        tmp_path / "onboarding-state.json",
    )
    response = client().get("/api/v1/onboarding", headers=auth_headers())

    assert response.status_code == 200
    item = response.json()["item"]
    assert item["recommended_mode"] == "local"
    assert [step["id"] for step in item["steps"]] == [
        "runtime_ready",
        "first_resume",
        "provider_selected",
        "provider_tested",
        "first_job",
        "first_export",
    ]
    assert item["steps"][0]["status"] == "completed"


def test_onboarding_persists_skip_and_completion(
    monkeypatch,
    tmp_path: Path,
) -> None:
    state_path = tmp_path / "onboarding-state.json"
    monkeypatch.setattr("routers.onboarding.STATE_PATH", state_path)
    api = client()

    skipped = api.patch(
        "/api/v1/onboarding/steps/provider_tested",
        headers=auth_headers(),
        json={"status": "skipped"},
    )
    completed = api.patch(
        "/api/v1/onboarding/steps/first_export",
        headers=auth_headers(),
        json={"status": "completed"},
    )

    assert skipped.status_code == 200
    assert completed.status_code == 200
    states = {step["id"]: step["status"] for step in completed.json()["item"]["steps"]}
    assert states["provider_tested"] == "skipped"
    assert states["first_export"] == "completed"
    assert state_path.exists()


def test_onboarding_rejects_skipping_required_runtime(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        "routers.onboarding.STATE_PATH",
        tmp_path / "onboarding-state.json",
    )
    response = client().patch(
        "/api/v1/onboarding/steps/runtime_ready",
        headers=auth_headers(),
        json={"status": "skipped"},
    )

    assert response.status_code == 422
