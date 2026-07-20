"""Pydantic models for persisted documents in Mindris AI.

``JobOfferExtract`` is the **LLM-facing** model — it only contains fields the
LLM is expected to produce.  Its JSON Schema is kept minimal so it fits within
Groq's free-tier TPM limits and passes tool-call validation reliably.

``JobOffer`` is the **full internal model** that enriches the extracted data
with server-side fields (url, description_markdown, analyzed_at) injected by
the pipeline *after* the LLM call.
"""

from datetime import datetime

from pydantic import AliasChoices, BaseModel, Field

# ── LLM-facing extraction model ───────────────────────────────────────────────


class JobOfferExtract(BaseModel):
    """Minimal schema exposed to the LLM for job-offer extraction.

    Only the fields the LLM is expected to produce are declared here.
    Server-side enrichment fields (url, description_markdown, analyzed_at)
    are intentionally absent so Groq's tool-call validation never fails
    because the model forgot to include them.

    Fields use ``AliasChoices`` to tolerate common LLM key-name variations
    (e.g. French translations produced by small models).
    """

    # ── Core identification ───────────────────────────────────────────────────
    title: str = Field(
        ...,
        validation_alias=AliasChoices("title", "job_title", "titre"),
        description="Exact job title as written in the offer.",
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

    # ── Skills ────────────────────────────────────────────────────────────────
    hard_skills: list[str] = Field(
        default_factory=list,
        description="Technical / hard skills required (e.g. Python, SQL, AWS).",
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description="Interpersonal / soft skills valued (e.g. Leadership, Autonomy).",
    )
    responsibilities: list[str] = Field(
        default_factory=list,
        description="Primary responsibilities explicitly stated in the offer.",
    )
    must_have_requirements: list[str] = Field(
        default_factory=list,
        description="Mandatory or clearly required qualifications.",
    )
    nice_to_have_requirements: list[str] = Field(
        default_factory=list,
        description="Optional or preferred qualifications.",
    )
    differentiators: list[str] = Field(
        default_factory=list,
        description="Candidate qualities presented as differentiating advantages.",
    )
    tools_environments: list[str] = Field(
        default_factory=list,
        description="Named tools, platforms, standards, and work environments.",
    )
    language_requirements: list[str] = Field(
        default_factory=list,
        description="Required spoken or written languages and levels.",
    )
    disqualifiers: list[str] = Field(
        default_factory=list,
        description="Explicit eligibility constraints or eliminating criteria.",
    )
    tone_keywords: list[str] = Field(
        default_factory=list,
        description="Words describing the offer's culture and communication tone.",
    )

    # ── Optional metadata ─────────────────────────────────────────────────────
    experience_level: str | None = Field(
        None,
        description="Seniority level: Junior, Mid, Senior, 5+ years, etc.",
    )
    remote_policy: str | None = Field(
        None,
        description="Work arrangement: On-site, Hybrid, or Full Remote.",
    )
    salary_range: str | None = Field(
        None,
        description="Salary range if explicitly stated in the offer.",
    )
    posted_at: str | None = Field(
        None,
        description="Publication date of the offer if mentioned.",
    )


# ── Full internal model ───────────────────────────────────────────────────────


class JobOffer(BaseModel):
    """Full internal representation of a scraped job offer.

    Created by the pipeline by merging a :class:`JobOfferExtract` result with
    server-side fields injected after the LLM call.
    """

    # ── Core (from extraction) ────────────────────────────────────────────────
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
    hard_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    must_have_requirements: list[str] = Field(default_factory=list)
    nice_to_have_requirements: list[str] = Field(default_factory=list)
    differentiators: list[str] = Field(default_factory=list)
    tools_environments: list[str] = Field(default_factory=list)
    language_requirements: list[str] = Field(default_factory=list)
    disqualifiers: list[str] = Field(default_factory=list)
    tone_keywords: list[str] = Field(default_factory=list)
    experience_level: str | None = None
    remote_policy: str | None = None
    salary_range: str | None = None
    posted_at: str | None = None

    # ── Server-side enrichment (injected after LLM call) ─────────────────────
    url: str | None = Field(None, description="Source URL of the job offer.")
    description_markdown: str | None = Field(
        None, description="Full offer body converted to Markdown."
    )

    # ── Timing ────────────────────────────────────────────────────────────────
    analyzed_at: datetime = Field(default_factory=datetime.now)

    # ── Factory ───────────────────────────────────────────────────────────────

    @classmethod
    def from_extract(
        cls,
        extract: "JobOfferExtract",
        url: str,
        description_markdown: str = "",
    ) -> "JobOffer":
        """Build a full ``JobOffer`` from an LLM-extracted ``JobOfferExtract``.

        Args:
            extract:              The validated extraction result from the LLM.
            url:                  Source URL injected by the pipeline.
            description_markdown: Truncated offer body injected by the pipeline.

        Returns:
            A fully-populated :class:`JobOffer` instance.
        """
        data = extract.model_dump()
        data["url"] = url
        data["description_markdown"] = description_markdown
        return cls.model_validate(data)

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
