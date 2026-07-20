"""Structured contracts for the evidence-driven resume optimization workflow."""

from typing import Literal

from pydantic import BaseModel, Field


class EvidenceFact(BaseModel):
    """A candidate fact retrieved from the backend-owned profile index."""

    id: str
    section_type: str = "unknown"
    source_id: str | None = None
    text: str
    relevance: float | None = None


class ProposedChange(BaseModel):
    """One reviewable CV change linked to source facts."""

    section_id: str
    entry_id: str | None = None
    before: str = ""
    after: str
    reason: str
    source_fact_ids: list[str] = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)


class EvidenceMatch(BaseModel):
    """A job requirement mapped to zero or more candidate facts."""

    requirement_id: str
    requirement: str
    requirement_type: Literal["hard_skill", "soft_skill", "responsibility", "must_have"]
    matched_fact_ids: list[str] = Field(default_factory=list)
    status: Literal["matched", "partial", "missing"]
    rationale: str


class DraftResponse(BaseModel):
    """Structured draft produced by the resume writer."""

    evidence_matrix: list[EvidenceMatch] = Field(default_factory=list)
    proposed_changes: list[ProposedChange] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ScoreFeedback(BaseModel):
    """Structured evaluator output used by the next revision iteration."""

    score: int = Field(ge=0, le=100)
    keyword_match: int = Field(ge=0, le=100)
    evidence_quality: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)
    missing_skills: list[str] = Field(default_factory=list)
    revision_instructions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def validate_grounded_changes(
    changes: list[ProposedChange],
    evidence: list[EvidenceFact],
) -> tuple[list[ProposedChange], list[str]]:
    """Reject proposed changes that cite facts outside the retrieved ledger."""
    known_fact_ids = {fact.id for fact in evidence}
    accepted: list[ProposedChange] = []
    warnings: list[str] = []
    for change in changes:
        unknown_sources = set(change.source_fact_ids) - known_fact_ids
        if unknown_sources:
            warnings.append(
                "Rejected a proposed change with unknown evidence: "
                f"{sorted(unknown_sources)}"
            )
            continue
        accepted.append(change)
    return accepted, warnings


def validate_evidence_matrix(
    matches: list[EvidenceMatch],
    evidence: list[EvidenceFact],
) -> tuple[list[EvidenceMatch], list[str]]:
    """Reject requirement mappings that cite facts outside the ledger."""
    known_fact_ids = {fact.id for fact in evidence}
    seen_requirement_ids: set[str] = set()
    accepted: list[EvidenceMatch] = []
    warnings: list[str] = []
    for match in matches:
        if match.requirement_id in seen_requirement_ids:
            warnings.append(
                f"Rejected a duplicate requirement mapping: {match.requirement_id}"
            )
            continue
        seen_requirement_ids.add(match.requirement_id)
        unknown_sources = set(match.matched_fact_ids) - known_fact_ids
        if unknown_sources:
            warnings.append(
                "Rejected an evidence match with unknown facts: "
                f"{sorted(unknown_sources)}"
            )
            continue
        if match.status == "missing" and match.matched_fact_ids:
            warnings.append(
                f"Rejected inconsistent missing requirement: {match.requirement_id}"
            )
            continue
        if match.status == "matched" and not match.matched_fact_ids:
            warnings.append(
                f"Rejected an unsupported matched requirement: {match.requirement_id}"
            )
            continue
        accepted.append(match)
    return accepted, warnings
