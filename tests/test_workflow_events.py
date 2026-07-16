"""Pipeline event contract tests."""

from types import SimpleNamespace

from intelligence import workflow


def test_job_result_event_includes_persisted_job_identity(monkeypatch) -> None:
    emitted: list[tuple[str, str, dict]] = []

    class FakeAgents:
        def __init__(self, *args, **kwargs) -> None:
            self.llm = object()

    class FakeResult:
        raw = "91"

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

    class FakeTask:
        def __init__(self, *args, **kwargs) -> None:
            pass

    class FakeCrew:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def kickoff(self) -> FakeResult:
            return FakeResult()

    def fake_emit(job_id: str, event: str, data: dict) -> None:
        emitted.append((job_id, event, data))

    monkeypatch.setattr(workflow, "MindrisAgents", FakeAgents)
    monkeypatch.setattr(workflow, "Agent", FakeAgent)
    monkeypatch.setattr(workflow, "Task", FakeTask)
    monkeypatch.setattr(workflow, "Crew", FakeCrew)
    monkeypatch.setattr(workflow, "emit", fake_emit)

    _, _, score_cv = workflow.make_nodes("sse-job")
    state = {
        "job_offer": SimpleNamespace(
            title="Platform Engineer",
            company="Mindris",
            hard_skills=["Python"],
            soft_skills=["Ownership"],
        ),
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",
        "retrieved_context": "",
        "drafted_cv": "- Built workflow systems",
        "score": 0,
        "iterations": 1,
        "job_id": "sse-job",
        "job_record_id": 123,
        "source_url": "https://example.com/jobs/platform",
    }

    score_cv(state)

    job_result = next(data for _, event, data in emitted if event == "job_result")
    assert job_result["job_id"] == 123
    assert job_result["job_record_id"] == 123
    assert job_result["source_url"] == "https://example.com/jobs/platform"
