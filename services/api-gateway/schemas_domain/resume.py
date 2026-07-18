"""Resume, draft and template catalogue schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from .cv import CVDataModel


class ResumeCreateRequest(BaseModel):
    """Create a resume in the backend library."""

    name: str = Field(default="Untitled CV", min_length=1)
    cv_data: CVDataModel
    template_id: str = "modern"
    locale: str = "fr"
    source: str = "manual"


class ResumeUpdateRequest(BaseModel):
    """Patch a resume in the backend library."""

    name: str | None = Field(default=None, min_length=1)
    cv_data: CVDataModel | None = None
    target_locale: str | None = None
    template_id: str | None = None
    locale: str | None = None
    source: str | None = None


class ResumeLocaleCreateRequest(BaseModel):
    """Create a new locale variant for an existing resume."""

    locale: Literal["fr", "en", "de", "es"]
    source_locale: Literal["fr", "en", "de", "es"] | None = None


class ResumeImportRequest(BaseModel):
    """Import a JSON resume document or raw CV data."""

    name: str | None = None
    cv_data: CVDataModel | None = None
    resume: dict[str, Any] | None = None
    source: str = "json"


class DraftUpsertRequest(BaseModel):
    """Upsert a backend-owned cross-page draft."""

    data: dict[str, Any]


class TemplateCatalogItem(BaseModel):
    """Resume template exposed by the backend template catalogue."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str
    status: Literal["ready", "community"] = "ready"
    category: str = "general"
    accent: str = "#2563eb"
    layout: Literal["single", "two-column"] = "two-column"
    base_template_id: str | None = None
    author: str | None = None
    preset_settings: dict[str, Any] = Field(default_factory=dict)


class CommunityTemplateManifest(BaseModel):
    """Portable community template package manifest."""

    id: str = Field(min_length=3)
    name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    author: str = Field(min_length=1)
    license: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    engine_version: Literal["1"]


class CommunityTemplateConfig(BaseModel):
    """Portable community template rendering config."""

    base_template_id: str = Field(min_length=1)
    preset_settings: dict[str, Any] = Field(default_factory=dict)


class ResumeRevisionItem(BaseModel):
    """Snapshot entry returned by the resume versioning API."""

    id: str
    resumeId: str
    revision: int
    name: str
    templateId: str
    locale: str
    source: str
    label: str | None = None
    createdAt: str


class ResumeRevisionChangeItem(BaseModel):
    """Single field-level change between two resume revisions."""

    path: str
    kind: Literal["added", "removed", "changed"]
    before: Any | None = None
    after: Any | None = None


class ResumeRevisionSectionItem(BaseModel):
    """Semantic summary for a top-level CV section diff."""

    section: str
    label: str
    status: Literal["added", "removed", "changed", "unchanged"]
    beforeCount: int = 0
    afterCount: int = 0


class ResumeRevisionCompareItem(BaseModel):
    """Comparison payload for two resume snapshots."""

    resumeId: str
    baseRevision: ResumeRevisionItem
    targetRevision: ResumeRevisionItem
    changeCount: int
    sectionSummaries: list[ResumeRevisionSectionItem]
    changes: list[ResumeRevisionChangeItem]
