"""Contracts for canonical snapshots and evidence-bound resume patches."""

from __future__ import annotations

import pytest
from intelligence.resume_context import (
    AgentTask,
    ResumeContextSnapshot,
    build_resume_context_snapshot,
)
from intelligence.resume_patches import (
    AddBulletOperation,
    MoveSectionOperation,
    RemoveBulletOperation,
    ResumePatchProposal,
    ResumeRevisionConflictError,
    RewriteBulletOperation,
    SetDesignTokenOperation,
    apply_resume_patch,
    validate_resume_patch,
)
from pydantic import ValidationError


def _cv_data() -> dict:
    return {
        "profile": {
            "full_name": "Ada Lovelace",
            "email": "ada@example.com",
            "phone": "+33 600000000",
            "title": "Software Engineer",
            "text_markdown": "Builds reliable analytical systems.",
        },
        "experience": [
            {
                "company": "Analytical Engines",
                "role": "Engineer",
                "bullets": ["Reduced processing time by 30%."],
            }
        ],
        "skills": [{"name": "Programming", "skills": ["Python"]}],
        "global_settings": {
            "layout": {"density": "normal"},
            "colors": {"primary": "#2563eb"},
            "sections": [
                {
                    "id": "experience",
                    "type": "experience",
                    "placement": "main",
                    "order": 0,
                    "visible": True,
                },
                {
                    "id": "skills",
                    "type": "skills",
                    "placement": "sidebar",
                    "order": 1,
                    "visible": True,
                },
            ],
        },
    }


def _snapshot() -> ResumeContextSnapshot:
    return build_resume_context_snapshot(
        resume_id=7,
        revision=4,
        cv_data=_cv_data(),
        locale="en",
        template_id="modern",
        job_context={
            "id": 11,
            "title": "Platform Engineer",
            "company": "Example",
            "hard_skills": ["Python"],
        },
    )


def _evidence_id(snapshot: ResumeContextSnapshot, suffix: str) -> str:
    return next(
        fact.id for fact in snapshot.evidence_registry if fact.path.endswith(suffix)
    )


def test_snapshot_is_deterministic_versioned_and_task_filtered() -> None:
    first = _snapshot()
    second = _snapshot()

    assert first.content_hash == second.content_hash
    assert first.revision == 4
    assert first.schema_version == "1"
    assert first.identity.full_name == "Ada Lovelace"
    assert first.evidence_registry

    ats = first.for_task(AgentTask.ATS, external_provider="mistral")
    assert ats.revision == first.revision
    assert ats.content_hash == first.content_hash
    assert ats.identity.full_name == ""
    assert ats.privacy_policy.pseudonymized is True
    assert "email" not in ats.semantic_content["profile"]
    assert all(fact.kind != "identity" for fact in ats.evidence_registry)

    with pytest.raises(ValidationError):
        first.revision = 9
    with pytest.raises(TypeError):
        first.semantic_content["profile"]["title"] = "Mutated"


def test_patch_rejects_hallucinated_fact_and_stale_revision() -> None:
    snapshot = _snapshot()
    proposal = ResumePatchProposal(
        base_revision=4,
        reason="Tailor the evidence to the role.",
        evidence_ids=["fact_does_not_exist"],
        operations=[
            AddBulletOperation(
                type="add_bullet",
                section="experience",
                item_index=0,
                value="Managed a team of 40 engineers.",
            )
        ],
    )

    result = validate_resume_patch(snapshot, proposal)
    assert result.valid is False
    assert {issue.code for issue in result.issues} == {
        "invalid_evidence",
    }

    with pytest.raises(ResumeRevisionConflictError):
        validate_resume_patch(snapshot, proposal, current_revision=5)


def test_patch_supports_partial_acceptance_without_mutating_snapshot() -> None:
    snapshot = _snapshot()
    evidence_id = _evidence_id(snapshot, ".bullets[0]")
    rewrite = RewriteBulletOperation(
        type="rewrite_bullet",
        section="experience",
        item_index=0,
        bullet_index=0,
        value="Improved analytical processing time by 30%.",
        evidence_ids=[evidence_id],
    )
    color = SetDesignTokenOperation(
        type="set_design_token",
        token="accent_color",
        value="#0f766e",
    )
    move = MoveSectionOperation(
        type="move_section",
        section_id="skills",
        placement="main",
        position=0,
    )
    proposal = ResumePatchProposal(
        base_revision=4,
        reason="Improve clarity and rebalance the main column.",
        operations=[rewrite, color, move],
    )

    patched = apply_resume_patch(
        snapshot,
        proposal,
        accepted_operation_ids={rewrite.operation_id, move.operation_id},
    )

    assert patched["experience"][0]["bullets"][0].startswith("Improved")
    assert patched["global_settings"]["colors"]["primary"] == "#2563eb"
    assert patched["global_settings"]["sections"][0]["id"] == "skills"
    assert snapshot.semantic_content["experience"][0]["bullets"][0].startswith(
        "Reduced"
    )


def test_significant_deletion_requires_explicit_confirmation() -> None:
    snapshot = _snapshot()
    operation = RemoveBulletOperation(
        type="remove_bullet",
        section="experience",
        item_index=0,
        bullet_index=0,
    )
    result = validate_resume_patch(
        snapshot,
        ResumePatchProposal(
            base_revision=4,
            reason="Shorten the oldest experience.",
            operations=[operation],
        ),
    )

    assert result.valid is False
    assert result.issues[0].code == "deletion_confirmation_required"


def test_patch_operation_limit_is_enforced_by_schema() -> None:
    operations = [
        SetDesignTokenOperation(
            type="set_design_token",
            token="line_height",
            value=1.4,
        )
        for _ in range(21)
    ]
    with pytest.raises(ValidationError):
        ResumePatchProposal(
            base_revision=4,
            reason="Too many changes.",
            operations=operations,
        )


def test_patch_schema_rejects_raw_css_and_arbitrary_mutation_paths() -> None:
    with pytest.raises(ValidationError):
        SetDesignTokenOperation(
            type="set_design_token",
            token="raw_css",
            value="body { display: none }",
        )
