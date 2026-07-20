"""Offline, provider-independent grounding evaluation cases."""

import json
from pathlib import Path

from intelligence.workflow_models import (
    EvidenceFact,
    EvidenceMatch,
    ProposedChange,
    validate_evidence_matrix,
    validate_grounded_changes,
)

CASES_PATH = Path(__file__).parent / "fixtures" / "intelligence_eval_cases.json"


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
