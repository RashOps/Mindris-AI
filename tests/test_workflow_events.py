"""Pipeline event contract tests."""

from types import SimpleNamespace

from intelligence import workflow


def test_job_result_event_includes_persisted_job_identity(monkeypatch) -> None:
    emitted: list[tuple[str, str, dict]] = []

    class FakeAgents:
        def __init__(self, *args, **kwargs) -> None:
            self.llm = object()

    class FakeResult:
        raw = """{
          "score": 91,
          "keyword_match": 95,
          "evidence_quality": 88,
          "clarity": 90,
          "missing_skills": [],
          "revision_instructions": [],
          "warnings": []
        }"""

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
        "evidence_ledger": [],
        "proposed_changes": [],
        "evaluation": None,
        "warnings": [],
    }

    score_cv(state)

    job_result = next(data for _, event, data in emitted if event == "job_result")
    assert job_result["job_id"] == 123
    assert job_result["job_record_id"] == 123
    assert job_result["source_url"] == "https://example.com/jobs/platform"
    assert job_result["evaluation"]["score"] == 91
    assert job_result["requires_user_review"] is True


def test_invalid_score_output_is_not_disguised_as_a_business_score() -> None:
    evaluation, warning = workflow.parse_score_output("Score 80, clarity 90")

    assert evaluation is None
    assert "structured" in warning.lower()


def test_revision_uses_evaluator_feedback_and_rejects_unknown_evidence(
    monkeypatch,
) -> None:
    task_descriptions: list[str] = []

    class FakeAgents:
        def __init__(self, *args, **kwargs) -> None:
            self.llm = object()

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

    class FakeTask:
        def __init__(self, *args, **kwargs) -> None:
            task_descriptions.append(kwargs["description"])

    class FakeCrew:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def kickoff(self) -> SimpleNamespace:
            return SimpleNamespace(
                raw="""{
                  "proposed_changes": [
                    {
                      "section_id": "experience",
                      "entry_id": "exp-1",
                      "before": "Built systems",
                      "after": "Built reliable workflow systems",
                      "reason": "Matches the platform requirement",
                      "source_fact_ids": ["fact_1"],
                      "confidence": 0.9
                    },
                    {
                      "section_id": "experience",
                      "after": "Invented unsupported claim",
                      "reason": "Keyword match",
                      "source_fact_ids": ["fact_404"],
                      "confidence": 0.2
                    }
                  ],
                  "warnings": []
                }"""
            )

    monkeypatch.setattr(workflow, "MindrisAgents", FakeAgents)
    monkeypatch.setattr(workflow, "Agent", FakeAgent)
    monkeypatch.setattr(workflow, "Task", FakeTask)
    monkeypatch.setattr(workflow, "Crew", FakeCrew)
    monkeypatch.setattr(workflow, "emit", lambda *args, **kwargs: None)

    _, draft_cv, _ = workflow.make_nodes("sse-job")
    state = {
        "job_offer": SimpleNamespace(
            title="Platform Engineer",
            company="Mindris",
            hard_skills=["Python"],
            soft_skills=["Ownership"],
            responsibilities=["Build reliable workflows"],
            must_have_requirements=["Production experience"],
        ),
        "provider": "groq",
        "model_name": "model",
        "retrieved_context": "[fact_1] Built workflow systems",
        "drafted_cv": "",
        "score": 60,
        "iterations": 1,
        "job_id": "sse-job",
        "job_record_id": 123,
        "source_url": None,
        "evidence_ledger": [
            {"id": "fact_1", "section_type": "experience", "text": "Built systems"}
        ],
        "proposed_changes": [],
        "evaluation": {"revision_instructions": ["Use stronger evidence wording"]},
        "warnings": [],
        "resume_id": 1,
        "resume_locale": "en",
    }

    draft_cv(state)

    assert len(state["proposed_changes"]) == 1
    assert state["proposed_changes"][0]["source_fact_ids"] == ["fact_1"]
    assert "fact_404" in state["warnings"][0]
    assert "Use stronger evidence wording" in task_descriptions[0]
