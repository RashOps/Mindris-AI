"""API Gateway request and response schemas."""

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator

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


class CVDocumentRequest(BaseModel):
    """Request body for saving the current CV."""

    cv_data: dict[str, Any]
    source: str = "json"


class ResumeCreateRequest(BaseModel):
    """Create a resume in the backend library."""

    name: str = Field(default="Untitled CV", min_length=1)
    cv_data: dict[str, Any]
    template_id: str = "modern"
    locale: str = "fr"
    source: str = "manual"


class ResumeUpdateRequest(BaseModel):
    """Patch a resume in the backend library."""

    name: str | None = Field(default=None, min_length=1)
    cv_data: dict[str, Any] | None = None
    template_id: str | None = None
    locale: str | None = None
    source: str | None = None


class ResumeImportRequest(BaseModel):
    """Import a JSON resume document or raw CV data."""

    name: str | None = None
    cv_data: dict[str, Any] | None = None
    resume: dict[str, Any] | None = None
    source: str = "json"


class DraftUpsertRequest(BaseModel):
    """Upsert a backend-owned cross-page draft."""

    data: dict[str, Any]


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
