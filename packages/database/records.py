"""SQLite persistence records for Mindris AI."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, LargeBinary, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for SQLAlchemy records."""


class CVDocumentRecord(Base):
    """Persisted CV document used as the backend source of truth."""

    __tablename__ = "cvdocumentrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    name: Mapped[str] = mapped_column(default="current", index=True)
    data_json: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(default="json")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ResumeRecord(Base):
    """Persisted resume document managed by the backend resume library."""

    __tablename__ = "resumerecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    name: Mapped[str] = mapped_column(default="Untitled CV", index=True)
    data_json: Mapped[str] = mapped_column(Text)
    template_id: Mapped[str] = mapped_column(default="modern", index=True)
    locale: Mapped[str] = mapped_column(default="fr")
    source: Mapped[str] = mapped_column(default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ResumeRevisionRecord(Base):
    """Snapshot history for a persisted resume document."""

    __tablename__ = "resumerevisionrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumerecord.id"), index=True)
    revision: Mapped[int] = mapped_column(index=True)
    name: Mapped[str] = mapped_column(default="Untitled CV")
    data_json: Mapped[str] = mapped_column(Text)
    template_id: Mapped[str] = mapped_column(default="modern")
    locale: Mapped[str] = mapped_column(default="fr")
    source: Mapped[str] = mapped_column(default="manual")
    label: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class WorkspaceDraftRecord(Base):
    """Backend-owned UI draft used for cross-page workflows."""

    __tablename__ = "workspacedraftrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    draft_key: Mapped[str] = mapped_column(unique=True, index=True)
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ScrapedJobRecord(Base):
    """History of scraped and analyzed job offers."""

    __tablename__ = "scrapedjobrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    url: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str]
    company: Mapped[str]
    location: Mapped[str] = mapped_column(default="")
    hard_skills: Mapped[str] = mapped_column(Text, default="[]")
    soft_skills: Mapped[str] = mapped_column(Text, default="[]")
    description_markdown: Mapped[str] = mapped_column(Text, default="")
    company_insight_json: Mapped[str | None] = mapped_column(Text, default=None)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class CoverLetterRecord(Base):
    """History of generated cover letters."""

    __tablename__ = "coverletterrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("scrapedjobrecord.id"), default=None
    )
    markdown_content: Mapped[str] = mapped_column(Text)
    provider: Mapped[str]
    model_name: Mapped[str]
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class AtsReportRecord(Base):
    """History of ATS reports."""

    __tablename__ = "atsreportrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("scrapedjobrecord.id"), default=None
    )
    score: Mapped[int]
    summary: Mapped[str] = mapped_column(Text, default="")
    mode: Mapped[str] = mapped_column(default="standard")
    keyword_analysis: Mapped[str] = mapped_column(Text, default="[]")
    rubric_json: Mapped[str] = mapped_column(Text, default="{}")
    scoring_breakdown: Mapped[str] = mapped_column(Text, default="[]")
    deductions_json: Mapped[str] = mapped_column(Text, default="[]")
    recommendations: Mapped[str] = mapped_column(Text, default="[]")
    context_json: Mapped[str] = mapped_column(Text, default="{}")
    provider: Mapped[str]
    model_name: Mapped[str]
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class CompanyInsightRecord(Base):
    """Cached company intelligence results."""

    __tablename__ = "companyinsightrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    company_name: Mapped[str] = mapped_column(index=True)
    cache_key: Mapped[str | None] = mapped_column(index=True, default=None)
    insight_json: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(default="")
    model_name: Mapped[str] = mapped_column(default="")
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ApplicationRecord(Base):
    """Application tracker item."""

    __tablename__ = "applicationrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("scrapedjobrecord.id"), default=None
    )
    status: Mapped[str] = mapped_column(default="wishlist", index=True)
    position: Mapped[int] = mapped_column(default=0)
    company: Mapped[str]
    role: Mapped[str]
    url: Mapped[str | None] = mapped_column(Text, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    cover_letter_id: Mapped[int | None] = mapped_column(
        ForeignKey("coverletterrecord.id"), default=None
    )
    ats_report_id: Mapped[int | None] = mapped_column(
        ForeignKey("atsreportrecord.id"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ApplicationReminderRecord(Base):
    """Follow-up reminder linked to one tracked application."""

    __tablename__ = "applicationreminderrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applicationrecord.id"), index=True
    )
    title: Mapped[str]
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(default="pending", index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class OpportunityRecord(Base):
    """Backend-owned workflow anchor for one application attempt."""

    __tablename__ = "opportunityrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("scrapedjobrecord.id"), default=None
    )
    source_url: Mapped[str | None] = mapped_column(Text, default=None)
    company: Mapped[str]
    role: Mapped[str]
    current_state: Mapped[str] = mapped_column(
        default="opportunity_created",
        index=True,
    )
    resume_id: Mapped[int | None] = mapped_column(
        ForeignKey("resumerecord.id"), default=None
    )
    resume_locale: Mapped[str | None] = mapped_column(default=None)
    ats_report_id: Mapped[int | None] = mapped_column(
        ForeignKey("atsreportrecord.id"), default=None
    )
    cover_letter_id: Mapped[int | None] = mapped_column(
        ForeignKey("coverletterrecord.id"), default=None
    )
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applicationrecord.id"), default=None
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    last_transition_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class OpportunityTransitionRecord(Base):
    """Chronological state transitions for an opportunity workflow."""

    __tablename__ = "opportunitytransitionrecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("opportunityrecord.id"), index=True
    )
    state: Mapped[str] = mapped_column(index=True)
    action: Mapped[str] = mapped_column(default="transition")
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class CommunityTemplateRecord(Base):
    """Installed community template package persisted by the backend."""

    __tablename__ = "communitytemplaterecord"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None)
    template_id: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str]
    author: Mapped[str]
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(default="general")
    accent: Mapped[str] = mapped_column(default="#2563eb")
    layout: Mapped[str] = mapped_column(default="two-column")
    base_template_id: Mapped[str | None] = mapped_column(default=None)
    manifest_json: Mapped[str] = mapped_column(Text)
    template_json: Mapped[str] = mapped_column(Text)
    package_bytes: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
