"""Typed, evidence-bound business operations for resume revisions."""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

from intelligence.resume_context import ResumeContextSnapshot, thaw_json

MAX_PATCH_OPERATIONS = 20
SAFE_PATH = re.compile(
    r"^(profile|contact|experience|education|projects|skills|languages|"
    r"certifications|interests|volunteering|awards|publications)"
    r"(?:\[\d+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*$"
)


class PatchOperation(BaseModel):
    """Common metadata required for partial acceptance and audit."""

    model_config = ConfigDict(extra="forbid")

    operation_id: str = Field(default_factory=lambda: f"op_{uuid4().hex[:12]}")
    evidence_ids: list[str] = Field(default_factory=list, max_length=20)


class SetFieldOperation(PatchOperation):
    """Replace one existing scalar field."""

    type: Literal["set_field"]
    path: str
    value: str | int | float | bool | None


class RewriteBulletOperation(PatchOperation):
    """Rewrite one existing bullet."""

    type: Literal["rewrite_bullet"]
    section: Literal["experience", "education", "projects", "volunteering"]
    item_index: int = Field(ge=0)
    bullet_index: int = Field(ge=0)
    value: str = Field(min_length=1, max_length=1000)


class AddBulletOperation(PatchOperation):
    """Insert one evidence-backed bullet."""

    type: Literal["add_bullet"]
    section: Literal["experience", "education", "projects", "volunteering"]
    item_index: int = Field(ge=0)
    value: str = Field(min_length=1, max_length=1000)
    position: int | None = Field(default=None, ge=0)


class RemoveBulletOperation(PatchOperation):
    """Remove one bullet with explicit deletion consent."""

    type: Literal["remove_bullet"]
    section: Literal["experience", "education", "projects", "volunteering"]
    item_index: int = Field(ge=0)
    bullet_index: int = Field(ge=0)
    confirm_significant_deletion: bool = False


class MoveSectionOperation(PatchOperation):
    """Move one known section to a column and position."""

    type: Literal["move_section"]
    section_id: str
    placement: Literal["main", "sidebar"]
    position: int = Field(ge=0)


class SetSectionVisibilityOperation(PatchOperation):
    """Show or explicitly hide one known section."""

    type: Literal["set_section_visibility"]
    section_id: str
    visible: bool
    confirm_significant_deletion: bool = False


class SetDesignTokenOperation(PatchOperation):
    """Change one renderer-supported visual token."""

    type: Literal["set_design_token"]
    token: Literal[
        "accent_color",
        "text_color",
        "muted_color",
        "font_family",
        "base_size",
        "line_height",
        "page_margin",
        "section_gap",
        "sidebar_width",
    ]
    value: str | int | float


class ChangeTemplateOperation(PatchOperation):
    """Select another registered template."""

    type: Literal["change_template"]
    template_id: str = Field(min_length=1, max_length=80)


class SetDensityOperation(PatchOperation):
    """Select a bounded document density preset."""

    type: Literal["set_density"]
    density: Literal["student", "compact", "normal", "senior"]


class SetPageBreakOperation(PatchOperation):
    """Toggle a page break before one known section."""

    type: Literal["set_page_break"]
    section_id: str
    before: bool


ResumePatchOperation = Annotated[
    SetFieldOperation
    | RewriteBulletOperation
    | AddBulletOperation
    | RemoveBulletOperation
    | MoveSectionOperation
    | SetSectionVisibilityOperation
    | SetDesignTokenOperation
    | ChangeTemplateOperation
    | SetDensityOperation
    | SetPageBreakOperation,
    Field(discriminator="type"),
]
OPERATION_ADAPTER = TypeAdapter(ResumePatchOperation)


class ExpectedPatchEffects(BaseModel):
    """Agent prediction presented as intent, not measured output."""

    model_config = ConfigDict(extra="forbid")

    page_count: int | None = Field(default=None, ge=1, le=20)
    target_score: Literal["improved", "maintained", "not_applicable"] | None = None
    visual_impact: str = Field(default="", max_length=500)


class ResumePatchProposal(BaseModel):
    """One bounded proposal against one immutable source revision."""

    model_config = ConfigDict(extra="forbid")

    base_revision: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list, max_length=100)
    operations: list[ResumePatchOperation] = Field(
        min_length=1,
        max_length=MAX_PATCH_OPERATIONS,
    )
    expected_effects: ExpectedPatchEffects = Field(
        default_factory=ExpectedPatchEffects
    )

    @model_validator(mode="after")
    def unique_operation_ids(self) -> ResumePatchProposal:
        """Reject ambiguous partial-acceptance identifiers."""
        ids = [operation.operation_id for operation in self.operations]
        if len(ids) != len(set(ids)):
            raise ValueError("operation_id values must be unique")
        return self


class PatchIssue(BaseModel):
    """Structured validation issue translated by the client."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message_id: str
    operation_id: str | None = None
    severity: Literal["error", "warning"] = "error"


class PatchValidationResult(BaseModel):
    """Machine-readable outcome of patch validation."""

    model_config = ConfigDict(extra="forbid")

    valid: bool
    issues: list[PatchIssue] = Field(default_factory=list)
    accepted_operation_ids: list[str] = Field(default_factory=list)


class ResumeRevisionConflictError(ValueError):
    """Raised when a proposal targets a stale source revision."""


def _resolve_path(root: dict[str, Any], path: str) -> tuple[Any, str | int]:
    if not SAFE_PATH.fullmatch(path):
        raise KeyError(path)
    parts = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\]", path)
    current: Any = root
    for part in parts[:-1]:
        key: str | int = int(part[1:-1]) if part.startswith("[") else part
        current = current[key]
    last = parts[-1]
    return current, int(last[1:-1]) if last.startswith("[") else last


def _section_items(
    cv_data: dict[str, Any],
    section: str,
) -> list[dict[str, Any]] | tuple[dict[str, Any], ...]:
    items = cv_data.get(section)
    if not isinstance(items, list | tuple):
        raise KeyError(section)
    return items


def _section_setting(cv_data: dict[str, Any], section_id: str) -> dict[str, Any]:
    sections = cv_data.get("global_settings", {}).get("sections", [])
    if not isinstance(sections, list | tuple):
        raise KeyError(section_id)
    return next(
        section
        for section in sections
        if isinstance(section, dict) and section.get("id") == section_id
    )


def _bullets(item: dict[str, Any]) -> list[str] | tuple[str, ...]:
    for key in ("bullets", "highlights", "description_bullets"):
        value = item.get(key)
        if isinstance(value, list | tuple):
            return value
    item["bullets"] = []
    return item["bullets"]


def _requires_evidence(operation: ResumePatchOperation) -> bool:
    return isinstance(
        operation,
        (SetFieldOperation, RewriteBulletOperation, AddBulletOperation),
    )


def validate_resume_patch(
    snapshot: ResumeContextSnapshot,
    proposal: ResumePatchProposal,
    *,
    current_revision: int | None = None,
) -> PatchValidationResult:
    """Validate references, facts, limits, deletion intent, and revision."""
    effective_revision = (
        current_revision if current_revision is not None else snapshot.revision
    )
    if proposal.base_revision != effective_revision:
        raise ResumeRevisionConflictError(
            f"Patch revision {proposal.base_revision} is stale; "
            f"current revision is {effective_revision}."
        )
    evidence = {fact.id for fact in snapshot.evidence_registry}
    issues: list[PatchIssue] = []
    proposal_evidence = set(proposal.evidence_ids)
    unknown_proposal_evidence = proposal_evidence - evidence
    if unknown_proposal_evidence:
        issues.append(
            PatchIssue(
                code="invalid_evidence",
                message_id="agent.patch.invalid_evidence",
            )
        )
    for operation in proposal.operations:
        operation_evidence = set(operation.evidence_ids) | proposal_evidence
        if operation_evidence - evidence:
            issues.append(
                PatchIssue(
                    code="invalid_evidence",
                    message_id="agent.patch.invalid_evidence",
                    operation_id=operation.operation_id,
                )
            )
        if _requires_evidence(operation) and not operation_evidence:
            issues.append(
                PatchIssue(
                    code="evidence_required",
                    message_id="agent.patch.evidence_required",
                    operation_id=operation.operation_id,
                )
            )
        if isinstance(operation, RemoveBulletOperation) and not (
            operation.confirm_significant_deletion
        ):
            issues.append(
                PatchIssue(
                    code="deletion_confirmation_required",
                    message_id="agent.patch.deletion_confirmation_required",
                    operation_id=operation.operation_id,
                )
            )
        if isinstance(operation, SetSectionVisibilityOperation) and (
            not operation.visible and not operation.confirm_significant_deletion
        ):
            issues.append(
                PatchIssue(
                    code="deletion_confirmation_required",
                    message_id="agent.patch.deletion_confirmation_required",
                    operation_id=operation.operation_id,
                )
            )
        try:
            _validate_operation_reference(snapshot.semantic_content, operation)
        except (IndexError, KeyError, StopIteration, TypeError):
            issues.append(
                PatchIssue(
                    code="invalid_reference",
                    message_id="agent.patch.invalid_reference",
                    operation_id=operation.operation_id,
                )
            )
    rejected = {issue.operation_id for issue in issues if issue.operation_id}
    return PatchValidationResult(
        valid=not any(issue.severity == "error" for issue in issues),
        issues=issues,
        accepted_operation_ids=[
            operation.operation_id
            for operation in proposal.operations
            if operation.operation_id not in rejected
        ],
    )


def _validate_operation_reference(
    cv_data: dict[str, Any],
    operation: ResumePatchOperation,
) -> None:
    if isinstance(operation, SetFieldOperation):
        parent, key = _resolve_path(cv_data, operation.path)
        parent[key]
    elif isinstance(
        operation,
        (RewriteBulletOperation, RemoveBulletOperation),
    ):
        item = _section_items(cv_data, operation.section)[operation.item_index]
        _bullets(item)[operation.bullet_index]
    elif isinstance(operation, AddBulletOperation):
        _section_items(cv_data, operation.section)[operation.item_index]
    elif isinstance(
        operation,
        (MoveSectionOperation, SetSectionVisibilityOperation, SetPageBreakOperation),
    ):
        _section_setting(cv_data, operation.section_id)


def apply_resume_patch(
    snapshot: ResumeContextSnapshot,
    proposal: ResumePatchProposal,
    *,
    accepted_operation_ids: set[str] | None = None,
    current_revision: int | None = None,
) -> dict[str, Any]:
    """Apply validated operations to a copy; never mutate the source snapshot."""
    result = validate_resume_patch(
        snapshot,
        proposal,
        current_revision=current_revision,
    )
    if not result.valid and accepted_operation_ids is None:
        raise ValueError("Patch proposal is invalid.")
    selected = (
        set(result.accepted_operation_ids)
        if accepted_operation_ids is None
        else accepted_operation_ids
    )
    cv_data = thaw_json(snapshot.semantic_content)
    for operation in proposal.operations:
        if operation.operation_id not in selected:
            continue
        _apply_operation(cv_data, operation)
    return cv_data


def _apply_operation(
    cv_data: dict[str, Any],
    operation: ResumePatchOperation,
) -> None:
    if isinstance(operation, SetFieldOperation):
        parent, key = _resolve_path(cv_data, operation.path)
        parent[key] = operation.value
    elif isinstance(operation, RewriteBulletOperation):
        item = _section_items(cv_data, operation.section)[operation.item_index]
        _bullets(item)[operation.bullet_index] = operation.value
    elif isinstance(operation, AddBulletOperation):
        item = _section_items(cv_data, operation.section)[operation.item_index]
        bullets = _bullets(item)
        position = (
            operation.position if operation.position is not None else len(bullets)
        )
        bullets.insert(min(position, len(bullets)), operation.value)
    elif isinstance(operation, RemoveBulletOperation):
        item = _section_items(cv_data, operation.section)[operation.item_index]
        _bullets(item).pop(operation.bullet_index)
    elif isinstance(operation, MoveSectionOperation):
        section = _section_setting(cv_data, operation.section_id)
        section["placement"] = operation.placement
        sections = cv_data["global_settings"]["sections"]
        sections.remove(section)
        lane_indexes = [
            index
            for index, item in enumerate(sections)
            if item.get("placement", "main") == operation.placement
        ]
        insert_at = (
            lane_indexes[min(operation.position, len(lane_indexes) - 1)]
            if lane_indexes and operation.position < len(lane_indexes)
            else len(sections)
        )
        sections.insert(insert_at, section)
        for index, item in enumerate(sections):
            item["order"] = index
    elif isinstance(operation, SetSectionVisibilityOperation):
        _section_setting(cv_data, operation.section_id)["visible"] = operation.visible
    elif isinstance(operation, SetDesignTokenOperation):
        token_paths = {
            "accent_color": ("colors", "primary"),
            "text_color": ("colors", "text"),
            "muted_color": ("colors", "secondary"),
            "font_family": ("typography", "body_font"),
            "base_size": ("typography", "base_size"),
            "line_height": ("typography", "line_height"),
            "page_margin": ("page", "margins", "vertical"),
            "section_gap": ("spacing", "section_gap"),
            "sidebar_width": ("layout", "sidebar_width"),
        }
        target = cv_data.setdefault("global_settings", {})
        *parents, leaf = token_paths[operation.token]
        for parent in parents:
            target = target.setdefault(parent, {})
        target[leaf] = operation.value
    elif isinstance(operation, ChangeTemplateOperation):
        cv_data.setdefault("global_settings", {})["template_id"] = operation.template_id
    elif isinstance(operation, SetDensityOperation):
        cv_data.setdefault("global_settings", {}).setdefault("layout", {})[
            "density"
        ] = operation.density
    elif isinstance(operation, SetPageBreakOperation):
        _section_setting(cv_data, operation.section_id)["page_break_before"] = (
            operation.before
        )
