"""API Gateway request and response schemas."""

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator

Provider = Literal["ollama", "groq", "gemini", "openai", "mistral"]

MODEL_CATALOGUE: dict[str, set[str]] = {
    "groq": {
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    },
    "gemini": {"gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"},
    "openai": {"gpt-4o", "gpt-4o-mini", "gpt-4-turbo"},
    "mistral": {"mistral-large-latest", "mistral-small-latest", "open-mistral-7b"},
    "ollama": {"gemma4:32k", "llama3.2", "phi4"},
}


def validate_llm_selection(provider: str, model_name: str) -> None:
    """Validate a provider/model pair supplied outside a Pydantic body."""
    if provider not in MODEL_CATALOGUE:
        raise ValueError(f"Unsupported LLM provider: '{provider}'.")
    if model_name not in MODEL_CATALOGUE[provider]:
        raise ValueError(f"Unsupported model '{model_name}' for provider '{provider}'.")


class APIMessage(BaseModel):
    """Standard API status response."""

    status: str
    message: str
    detail: Any | None = None


class LLMRequest(BaseModel):
    """Base request carrying an allowed LLM provider/model pair."""

    provider: Provider = "groq"
    model_name: str = "llama-3.3-70b-versatile"

    @field_validator("model_name")
    @classmethod
    def validate_model_name(cls, model_name: str, info) -> str:  # noqa: ANN001
        """Ensure clients can only request models in the local catalogue."""
        provider = info.data.get("provider", "groq")
        if model_name not in MODEL_CATALOGUE.get(provider, set()):
            raise ValueError(
                f"Unsupported model '{model_name}' for provider '{provider}'."
            )
        return model_name


class OptimizeRequest(LLMRequest):
    """Request body for POST /api/v1/optimize."""

    job_url: AnyHttpUrl


class OptimizationResponse(BaseModel):
    """Response body for POST /api/v1/optimize."""

    status: str
    message: str
    job_id: str


class PatchRequest(LLMRequest):
    """Request body for /api/v1/cv/patch-from-bullets."""

    drafted_bullets: list[str]
    cv_data: dict[str, Any]


class CoverLetterRequest(LLMRequest):
    """Request body for /api/v1/cover-letter."""

    cv_data: dict[str, Any]
    job_insights: dict[str, Any]
    instructions: str = ""
    example_letter: str | None = None


class ScoreRequest(LLMRequest):
    """Request body for /api/v1/cv/score."""

    cv_data: dict[str, Any]
    job_insights: dict[str, Any]
    model_name: str = "llama-3.1-8b-instant"


class CVBaseModel(BaseModel):
    """Base model for CV payloads that tolerates forward-compatible fields."""

    model_config = ConfigDict(extra="allow")


class CVLocation(CVBaseModel):
    """Location object used in profile and experiences."""

    city: str = ""
    country: str = ""


class CVSocial(CVBaseModel):
    """Social/contact link in a CV profile."""

    type: str = "other"
    url: str = ""
    label: str | None = None


class CVGlobalSettings(CVBaseModel):
    """Rendering settings stored with the CV data."""

    font_family: str = "Inter"
    font_size: str = "13px"
    primary_color: str = "#2563eb"
    line_height: str = "1.5"
    margin_page: str = "48px"
    margin_h: str = "64px"
    margin_v: str = "48px"
    entry_spacing: str = "20px"
    col_left_width: str = "65"
    col_swap: str = "false"
    template_id: str = "modern"


class CVProfile(CVBaseModel):
    """Candidate profile section."""

    full_name: str = ""
    title: str = ""
    phone: str = ""
    email: str = ""
    location: CVLocation = Field(default_factory=CVLocation)
    socials: list[CVSocial] = Field(default_factory=list)
    text_markdown: str = ""


class CVExperienceItem(CVBaseModel):
    """Professional experience entry."""

    id: str = ""
    company: str = ""
    role: str = ""
    period: str = ""
    location: CVLocation = Field(default_factory=CVLocation)
    description_markdown: str = ""
    keywords: list[str] = Field(default_factory=list)


class CVEducationItem(CVBaseModel):
    """Education entry."""

    id: str = ""
    institution: str = ""
    degree: str = ""
    period: str = ""
    location: str = ""
    description_markdown: str = ""


class CVSkillGroup(CVBaseModel):
    """Skill group entry."""

    id: str = ""
    category: str = ""
    skills: list[str] = Field(default_factory=list)


class CVProjectItem(CVBaseModel):
    """Project entry."""

    id: str = ""
    name: str = ""
    url: str | None = None
    description_markdown: str = ""
    tech_stack: list[str] = Field(default_factory=list)


class CVLanguageItem(CVBaseModel):
    """Language entry."""

    id: str = ""
    language: str = ""
    level: str = ""


class CVDataModel(CVBaseModel):
    """Validated backend shape for a resume CV payload."""

    global_settings: CVGlobalSettings = Field(default_factory=CVGlobalSettings)
    profile: CVProfile
    experience: list[CVExperienceItem] = Field(default_factory=list)
    education: list[CVEducationItem] = Field(default_factory=list)
    skills: list[CVSkillGroup] = Field(default_factory=list)
    projects: list[CVProjectItem] = Field(default_factory=list)
    languages: list[CVLanguageItem] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)


class CVDocumentRequest(BaseModel):
    """Request body for saving the current CV."""

    cv_data: CVDataModel
    source: str = "json"


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
    template_id: str | None = None
    locale: str | None = None
    source: str | None = None


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
    status: Literal["ready"] = "ready"
    category: str = "general"
    accent: str = "#2563eb"
    layout: Literal["single", "two-column"] = "two-column"


class CompanyAnalyzeRequest(LLMRequest):
    """Request body for company intelligence."""

    company_name: str = Field(min_length=1)
    model_name: str = "llama-3.1-8b-instant"


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
