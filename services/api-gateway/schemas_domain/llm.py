"""LLM-backed product request schemas."""

from typing import Any

from pydantic import AnyHttpUrl, BaseModel, Field

from .common import AtsMode, LLMRequest, Provider


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
    job_id: int | None = None
    resume_id: int | None = None
    opportunity_id: int | None = None


class CoverLetterVersionRequest(BaseModel):
    """Request body for saving an edited cover letter version."""

    markdown: str = Field(min_length=1)
    provider: Provider | None = None
    model_name: str | None = None
    job_id: int | None = None


class ScoreRequest(LLMRequest):
    """Request body for /api/v1/cv/score."""

    cv_data: dict[str, Any]
    job_insights: dict[str, Any]
    model_name: str = "llama-3.1-8b-instant"
    ats_mode: AtsMode = "standard"
    job_id: int | None = None
    resume_id: int | None = None
    resume_locale: str | None = None
    opportunity_id: int | None = None


class CompanyAnalyzeRequest(LLMRequest):
    """Request body for company intelligence."""

    company_name: str = Field(min_length=1)
    source_url: AnyHttpUrl | None = None
    evidence_text: str = ""
    job_insights: dict[str, Any] | None = None
    cv_data: dict[str, Any] | None = None
    enable_llm_summary: bool = False
    model_name: str = "llama-3.1-8b-instant"
