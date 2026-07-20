"""Workflow, history and tracker schemas."""

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, model_validator

from .common import OpportunityState


class ActivityLedgerLink(BaseModel):
    """Link from one ledger item to a related artifact."""

    subject_type: str
    subject_id: str
    relation: str


class ActivityLedgerItem(BaseModel):
    """Normalized history ledger item."""

    id: str
    subject_type: str
    subject_id: str
    title: str
    summary: str
    timestamp: str
    provider: str | None = None
    model_name: str | None = None
    status: str | None = None
    group_id: str
    group_label: str
    links: list[ActivityLedgerLink] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OpportunityTransitionItem(BaseModel):
    """Chronological workflow transition entry."""

    id: int
    state: OpportunityState
    action: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class OpportunityIntegrityIssueItem(BaseModel):
    """One degraded workflow integrity issue detected by the backend."""

    code: str
    severity: str = "warning"
    artifact: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class OpportunityIntegrityItem(BaseModel):
    """Backend-owned integrity summary for one opportunity workflow."""

    status: str = "healthy"
    issues: list[OpportunityIntegrityIssueItem] = Field(default_factory=list)
    repair_actions: list[str] = Field(default_factory=list)


class OpportunityItem(BaseModel):
    """Serialized opportunity workflow aggregate."""

    id: int
    job_id: int | None = None
    source_url: str | None = None
    company: str
    role: str
    current_state: OpportunityState
    resume_id: int | None = None
    resume_locale: str | None = None
    ats_report_id: int | None = None
    cover_letter_id: int | None = None
    application_id: int | None = None
    notes: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    last_transition_at: str
    transitions: list[OpportunityTransitionItem] = Field(default_factory=list)
    linked_artifacts: dict[str, Any] = Field(default_factory=dict)
    next_actions: list[str] = Field(default_factory=list)
    integrity: OpportunityIntegrityItem = Field(
        default_factory=OpportunityIntegrityItem
    )


class OpportunityCreateRequest(BaseModel):
    """Create an opportunity anchor from a job or a manual payload."""

    job_id: int | None = None
    source_url: AnyHttpUrl | None = None
    company: str | None = Field(default=None, min_length=1)
    role: str | None = Field(default=None, min_length=1)
    notes: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_source(self) -> "OpportunityCreateRequest":
        """Require either an existing job reference or manual company/role input."""
        if self.job_id is not None:
            return self
        if self.company and self.role:
            return self
        raise ValueError("Provide job_id or both company and role.")


class OpportunityResumeLinkRequest(BaseModel):
    """Link a resume locale variant to an opportunity."""

    resume_id: int
    locale: str | None = None


class OpportunityAtsLinkRequest(BaseModel):
    """Link an ATS report to an opportunity."""

    ats_report_id: int


class OpportunityCoverLetterLinkRequest(BaseModel):
    """Link a cover letter to an opportunity."""

    cover_letter_id: int


class OpportunityTrackerLinkRequest(BaseModel):
    """Create or attach a tracker application from workflow context."""

    application_id: int | None = None
    create: bool = False
    status: str = "wishlist"
    notes: str = ""

    @model_validator(mode="after")
    def validate_action(self) -> "OpportunityTrackerLinkRequest":
        """Require an explicit attachment or creation intent."""
        if self.application_id is None and not self.create:
            raise ValueError("Provide application_id or set create=true.")
        return self


class OpportunityRepairRequest(BaseModel):
    """Execute one bounded backend-owned repair action on an opportunity."""

    action: str = Field(min_length=1)


class ApplicationCreateRequest(BaseModel):
    """Create an application tracker item."""

    job_id: int | None = None
    status: str = "wishlist"
    company: str = Field(min_length=1)
    role: str = Field(min_length=1)
    url: AnyHttpUrl | None = None
    notes: str = ""
    cover_letter_id: int | None = None
    ats_report_id: int | None = None


class ApplicationReminderCreateRequest(BaseModel):
    """Create a follow-up reminder for one application."""

    title: str = Field(min_length=1)
    due_at: str = Field(min_length=1)
    notes: str = ""


class ApplicationReminderUpdateRequest(BaseModel):
    """Patch a follow-up reminder."""

    title: str | None = Field(default=None, min_length=1)
    due_at: str | None = None
    status: Literal["pending", "completed", "dismissed"] | None = None
    notes: str | None = None


class ApplicationUpdateRequest(BaseModel):
    """Patch an application tracker item."""

    status: str | None = None
    company: str | None = Field(default=None, min_length=1)
    role: str | None = Field(default=None, min_length=1)
    url: AnyHttpUrl | None = None
    notes: str | None = None
    cover_letter_id: int | None = None
    ats_report_id: int | None = None


class ApplicationMoveRequest(BaseModel):
    """Move an application to a Kanban status and position."""

    status: str
    position: int = Field(default=0, ge=0)
