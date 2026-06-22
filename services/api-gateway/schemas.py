"""API Gateway request and response schemas."""

from typing import Any

from pydantic import AnyHttpUrl, BaseModel, Field


class APIMessage(BaseModel):
    """Standard API status response."""

    status: str
    message: str
    detail: Any | None = None


class OptimizeRequest(BaseModel):
    """Request body for POST /api/v1/optimize."""

    job_url: AnyHttpUrl
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"


class OptimizationResponse(BaseModel):
    """Response body for POST /api/v1/optimize."""

    status: str
    message: str
    job_id: str


class PatchRequest(BaseModel):
    """Request body for /api/v1/cv/patch-from-bullets."""

    drafted_bullets: list[str]
    cv_data: dict[str, Any]
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"


class CoverLetterRequest(BaseModel):
    """Request body for /api/v1/cover-letter."""

    cv_data: dict[str, Any]
    job_insights: dict[str, Any]
    instructions: str = ""
    example_letter: str | None = None
    provider: str = "groq"
    model_name: str = "llama-3.3-70b-versatile"


class ScoreRequest(BaseModel):
    """Request body for /api/v1/cv/score."""

    cv_data: dict[str, Any]
    job_insights: dict[str, Any]
    provider: str = "groq"
    model_name: str = "llama-3.1-8b-instant"


class CVDocumentRequest(BaseModel):
    """Request body for saving the current CV."""

    cv_data: dict[str, Any]
    source: str = "json"


class CompanyAnalyzeRequest(BaseModel):
    """Request body for company intelligence."""

    company_name: str = Field(min_length=1)
    provider: str = "groq"
    model_name: str = "llama-3.1-8b-instant"


class ApplicationCreateRequest(BaseModel):
    """Create an application tracker item."""

    job_id: int | None = None
    status: str = "wishlist"
    company: str
    role: str
    url: str | None = None
    notes: str = ""
    cover_letter_id: int | None = None
    ats_report_id: int | None = None


class ApplicationUpdateRequest(BaseModel):
    """Patch an application tracker item."""

    status: str | None = None
    company: str | None = None
    role: str | None = None
    url: str | None = None
    notes: str | None = None
    cover_letter_id: int | None = None
    ats_report_id: int | None = None


class ApplicationMoveRequest(BaseModel):
    """Move an application to a Kanban status and position."""

    status: str
    position: int = 0
