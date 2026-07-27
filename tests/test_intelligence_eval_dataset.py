"""Offline, provider-independent grounding evaluation cases."""

import json
from pathlib import Path

from intelligence.resume_agent_evaluation import (
    ResumeAgentEvaluationOutcome,
    aggregate_resume_agent_metrics,
)
from intelligence.workflow_models import (
    EvidenceFact,
    EvidenceMatch,
    ProposedChange,
    validate_evidence_matrix,
    validate_grounded_changes,
)

CASES_PATH = Path(__file__).parent / "fixtures" / "intelligence_eval_cases.json"
SCOPE_B_CASES_PATH = (
    Path(__file__).parent / "fixtures" / "resume_agent_scope_b_eval.json"
)


def test_scope_b_dataset_covers_required_resume_agent_risks() -> None:
    cases = json.loads(SCOPE_B_CASES_PATH.read_text(encoding="utf-8"))

    assert {case["locale"] for case in cases} == {"fr", "en"}
    assert {case["seniority"] for case in cases} == {"student", "senior"}
    assert {case["job_family"] for case in cases} == {
        "technical",
        "non_technical",
    }
    assert {"aligned", "unaligned"} <= {
        case["alignment"] for case in cases
    }
    assert "overloaded" in {case["resume_shape"] for case in cases}
    risks = {case["risk"] for case in cases}
    assert {
        "ambiguous_fact",
        "invented_diploma",
        "invented_skill",
        "invented_metric",
        "invented_experience",
    } <= risks
    assert {
        "cloud_identity",
        "stale_revision",
        "significant_deletion",
        "visual_overflow",
    } <= risks


def test_grounding_dataset_covers_languages_and_job_families() -> None:
    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))

    assert {case["locale"] for case in cases} == {"fr", "en"}
    assert len({case["job_family"] for case in cases}) >= 4

    for case in cases:
        accepted, warnings = validate_grounded_changes(
            [ProposedChange.model_validate(item) for item in case["changes"]],
            [EvidenceFact.model_validate(item) for item in case["evidence"]],
        )
        assert len(accepted) == case["accepted"], case["id"]
        assert bool(warnings) is (case["accepted"] != len(case["changes"])), case["id"]


def test_evidence_matrix_rejects_unknown_unsupported_and_duplicate_matches() -> None:
    evidence = [
        EvidenceFact(
            id="fact_1",
            section_type="experience",
            text="A développé une API Python en production.",
        )
    ]
    matches = [
        EvidenceMatch(
            requirement_id="python",
            requirement="Maîtrise de Python",
            requirement_type="hard_skill",
            matched_fact_ids=["fact_1"],
            status="matched",
            rationale="Une expérience vérifiable est disponible.",
        ),
        EvidenceMatch(
            requirement_id="python",
            requirement="Python confirmé",
            requirement_type="must_have",
            matched_fact_ids=["fact_1"],
            status="matched",
            rationale="Doublon volontaire.",
        ),
        EvidenceMatch(
            requirement_id="kubernetes",
            requirement="Maîtrise de Kubernetes",
            requirement_type="hard_skill",
            matched_fact_ids=[],
            status="matched",
            rationale="Aucune preuve disponible.",
        ),
        EvidenceMatch(
            requirement_id="anglais",
            requirement="Anglais professionnel",
            requirement_type="must_have",
            matched_fact_ids=["fact_404"],
            status="partial",
            rationale="Preuve inconnue.",
        ),
    ]

    accepted, warnings = validate_evidence_matrix(matches, evidence)

    assert [match.requirement_id for match in accepted] == ["python"]
    assert len(warnings) == 3


def test_scope_b_metrics_cover_facts_evidence_ats_meaning_and_renderer() -> None:
    metrics = aggregate_resume_agent_metrics(
        [
            ResumeAgentEvaluationOutcome(
                factual_claims=4,
                factual_errors=0,
                required_evidence=4,
                cited_evidence=4,
                patch_valid=True,
                ats_score_before=60,
                ats_score_after=75,
                meaning_preservation=0.95,
                visual_regression=False,
                renderer_iterations=2,
            ),
            ResumeAgentEvaluationOutcome(
                factual_claims=2,
                factual_errors=1,
                required_evidence=2,
                cited_evidence=1,
                patch_valid=False,
                meaning_preservation=0.8,
                visual_regression=True,
                renderer_iterations=1,
            ),
        ]
    )

    assert metrics.factual_accuracy == 5 / 6
    assert metrics.evidence_coverage == 5 / 6
    assert metrics.valid_patch_rate == 0.5
    assert metrics.average_ats_improvement == 15
    assert metrics.meaning_preservation == 0.875
    assert metrics.visual_regression_rate == 0.5
    assert metrics.average_renderer_iterations == 1.5
