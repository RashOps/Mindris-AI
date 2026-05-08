"""Pydantic models for persisted documents in Mindris AI."""

from datetime import datetime

from pydantic import AliasChoices, BaseModel, Field


class JobOffer(BaseModel):
    """Structured representation of a scraped job offer.

    Fields use ``AliasChoices`` to tolerate common LLM key-name variations
    (e.g. French translations from small models).
    """

    # ── Identification ────────────────────────────────────────────────────────
    url: str | None = Field(None, description="Source URL of the job offer.")
    title: str = Field(
        ...,
        validation_alias=AliasChoices("title", "job_title", "titre"),
        description="Exact job title.",
    )
    company: str = Field(
        ...,
        validation_alias=AliasChoices("company", "entreprise"),
        description="Company name.",
    )
    location: str = Field(
        ...,
        validation_alias=AliasChoices("location", "localisation"),
        description="City and country, or 'Remote'.",
    )

    # ── Content ───────────────────────────────────────────────────────────────
    description_markdown: str | None = Field(
        None,
        description="Full offer body converted to Markdown.",
    )
    hard_skills: list[str] = Field(
        default_factory=list,
        description="Technical skills (e.g. Python, AWS).",
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description="Human qualities (e.g. Leadership, Autonomy).",
    )

    # ── Metadata ──────────────────────────────────────────────────────────────
    experience_level: str | None = Field(
        None,
        description="Seniority: Junior, Senior, 5+ years, etc.",
    )
    remote_policy: str | None = Field(
        None,
        description="Work arrangement: On-site, Hybrid, or Full Remote.",
    )
    salary_range: str | None = Field(
        None,
        description="Salary range if stated in the offer.",
    )

    # ── Timing ────────────────────────────────────────────────────────────────
    posted_at: str | None = None
    analyzed_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "AI Engineer",
                "company": "Mindris Tech",
                "hard_skills": ["Python", "PyTorch", "FastAPI"],
                "remote_policy": "Hybrid",
            },
        },
    }
