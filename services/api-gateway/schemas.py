"""API Gateway request and response schemas."""

from typing import Any, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

Provider = Literal["ollama", "groq", "gemini", "openai", "mistral"]
AtsMode = Literal["standard", "strict"]
OpportunityState = Literal[
    "scrape_completed",
    "opportunity_created",
    "resume_linked",
    "cover_letter_linked",
    "ats_report_linked",
    "tracker_entry_created",
    "ready_to_apply",
]

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


class SystemConfigurationTaskDefault(BaseModel):
    """Resolved provider/model pair for a Mindris task."""

    provider: Provider
    model_name: str


class SystemConfigurationProviderStatus(BaseModel):
    """Safe provider configuration metadata exposed to clients."""

    configured: bool
    mode: Literal["local", "cloud"]
    reason: str


class SystemConfigurationSecretSlot(BaseModel):
    """Redacted secret-slot status for backend-managed credentials."""

    configured: bool
    masked: bool = True


class SystemConfigurationRuntime(BaseModel):
    """Effective runtime knobs owned by the backend."""

    renderer_url: str
    service_timeout_seconds: float
    pipeline_timeout_seconds: float
    max_pdf_upload_bytes: int
    ollama_api_base: str
    llm_num_ctx: int
    scraper_timeout_ms: int
    scraper_headless: bool
    scraper_strategy: str
    scraper_proxy_fallback: bool
    log_level: str


class SystemConfigurationStorage(BaseModel):
    """Effective storage locations owned by the backend."""

    logs_dir: str
    storage_dir: str
    chroma_db_dir: str


class SystemConfigurationLLM(BaseModel):
    """Resolved LLM defaults and provider availability."""

    defaults: dict[str, SystemConfigurationTaskDefault]
    providers: dict[str, SystemConfigurationProviderStatus]


class SystemConfigurationSecrets(BaseModel):
    """Backend secret slots without leaking raw values."""

    api_key: SystemConfigurationSecretSlot
    openai_api_key: SystemConfigurationSecretSlot
    groq_api_key: SystemConfigurationSecretSlot
    gemini_api_key: SystemConfigurationSecretSlot
    mistral_api_key: SystemConfigurationSecretSlot
    llama_cloud_api_key: SystemConfigurationSecretSlot
    scrape_do_api_key: SystemConfigurationSecretSlot
    scrapingbee_api_key: SystemConfigurationSecretSlot


class SystemConfigurationItem(BaseModel):
    """Safe backend-owned configuration payload."""

    runtime: SystemConfigurationRuntime
    storage: SystemConfigurationStorage
    llm: SystemConfigurationLLM
    app: dict[str, Any]
    secrets: SystemConfigurationSecrets


class SystemDiagnosticsService(BaseModel):
    """Read-only runtime diagnostics for a service dependency."""

    status: str
    reachable: bool
    url: str | None = None
    checks: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class SystemDiagnosticsOllama(BaseModel):
    """Read-only local Ollama diagnostics."""

    status: str
    reachable: bool
    base_url: str
    model_count: int = 0
    items: list[dict[str, str]] = Field(default_factory=list)
    error: str | None = None


class SystemDiagnosticsItem(BaseModel):
    """Aggregated backend-owned diagnostics for local runtime control."""

    api: dict[str, Any]
    renderer: SystemDiagnosticsService
    ollama: SystemDiagnosticsOllama
    storage: SystemConfigurationStorage
    runtime: SystemConfigurationRuntime


class SystemConfigurationUpdateRequest(BaseModel):
    """Patch backend-owned app configuration."""

    defaults: dict[str, SystemConfigurationTaskDefault] | None = None
    pdf_ingestion_mode: Literal["auto", "llama_parse", "local_text"] | None = None


class SystemSecretUpdateRequest(BaseModel):
    """Write-only secret slot update from the browser."""

    value: str = Field(min_length=1)


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


def _hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    if not isinstance(value, str) or len(value) != 7 or not value.startswith("#"):
        return None
    try:
        return (
            int(value[1:3], 16),
            int(value[3:5], 16),
            int(value[5:7], 16),
        )
    except ValueError:
        return None


def _relative_luminance(value: str) -> float | None:
    rgb = _hex_to_rgb(value)
    if rgb is None:
        return None
    channels = []
    for channel in rgb:
        normalized = channel / 255
        channels.append(
            normalized / 12.92
            if normalized <= 0.03928
            else ((normalized + 0.055) / 1.055) ** 2.4
        )
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def _contrast_ratio(foreground: str, background: str) -> float | None:
    fg = _relative_luminance(foreground)
    bg = _relative_luminance(background)
    if fg is None or bg is None:
        return None
    lighter = max(fg, bg)
    darker = min(fg, bg)
    return (lighter + 0.05) / (darker + 0.05)


class CVPageMargins(CVBaseModel):
    """Page margin settings for resume rendering."""

    horizontal: str = "64px"
    vertical: str = "48px"


class CVPageSettings(CVBaseModel):
    """Page-level customization settings."""

    format: Literal["A4", "Letter"] = "A4"
    margins: CVPageMargins = Field(default_factory=CVPageMargins)
    page_break_mode: Literal["auto", "manual"] = "auto"
    one_page_challenge: bool = False


class CVPhotoSettings(CVBaseModel):
    """Profile photo rendering settings."""

    enabled: bool = False
    shape: Literal["round", "square"] = "round"


class CVLayoutSettings(CVBaseModel):
    """Layout customization settings."""

    columns: Literal[1, 2] = 2
    sidebar_position: Literal["none", "left", "right"] = "right"
    sidebar_width: str = "35%"
    density: Literal["student", "compact", "normal", "senior"] = "normal"
    header_alignment: Literal["left", "center", "right"] = "left"
    photo: CVPhotoSettings = Field(default_factory=CVPhotoSettings)
    section_placement: dict[str, Literal["main", "sidebar"]] = Field(
        default_factory=dict
    )


class CVTypographySettings(CVBaseModel):
    """Typography customization settings."""

    body_font: str = "Inter"
    heading_font: str = "Inter"
    base_size: str = "13px"
    heading_scale: str = "1.0"
    weight: Literal["regular", "medium", "bold"] = "regular"
    titles_uppercase: bool = True
    line_height: str = "1.5"
    date_style: Literal["normal", "italic", "small", "right"] = "normal"
    bullet_style: Literal["bullets", "dash", "dots", "icons"] = "bullets"


class CVColorSettings(CVBaseModel):
    """Color customization settings with contrast guardrails."""

    primary: str = Field(default="#2563eb", pattern=r"^#[0-9a-fA-F]{6}$")
    secondary: str = Field(default="#64748b", pattern=r"^#[0-9a-fA-F]{6}$")
    text: str = Field(default="#334155", pattern=r"^#[0-9a-fA-F]{6}$")
    heading: str = Field(default="#0f172a", pattern=r"^#[0-9a-fA-F]{6}$")
    sidebar_background: str = Field(default="#f8fafc", pattern=r"^#[0-9a-fA-F]{6}$")
    separators: str = Field(default="#e2e8f0", pattern=r"^#[0-9a-fA-F]{6}$")
    palette_preset: Literal["corporate", "tech", "minimal", "creative", "custom"] = (
        "tech"
    )
    monochrome: bool = False

    @model_validator(mode="after")
    def validate_contrast(self) -> "CVColorSettings":
        """Ensure body text remains readable on sidebar backgrounds."""
        ratio = _contrast_ratio(self.text, self.sidebar_background)
        if ratio is not None and ratio < 4.5:
            raise ValueError(
                "Text and sidebar background contrast must be at least 4.5."
            )
        return self


class CVSectionSettings(CVBaseModel):
    """Per-section rendering settings."""

    id: str = Field(min_length=1)
    type: Literal[
        "profile",
        "contact",
        "experience",
        "education",
        "projects",
        "skills",
        "languages",
        "certifications",
        "volunteering",
        "interests",
        "publications",
        "references",
        "custom",
    ]
    label: str = Field(min_length=1)
    visible: bool = True
    placement: Literal["main", "sidebar"] = "main"
    display_mode: Literal["list", "timeline", "cards", "compact"] = "list"
    show_dates: bool = True
    show_locations: bool = True
    detail_level: Literal["short", "normal", "detailed"] = "normal"
    icon: str | None = None


class CVLocaleSettings(CVBaseModel):
    """Localized label and direction settings."""

    label_language: Literal["fr", "en", "de", "es"] = "fr"
    text_direction: Literal["ltr", "rtl"] = "ltr"


def _contains_unsafe_css_fragment(value: str) -> str | None:
    lowered = value.lower()
    blocked_fragments = (
        "@import",
        "javascript:",
        "expression(",
        "url(",
    )
    for fragment in blocked_fragments:
        if fragment in lowered:
            return fragment
    return None


class CVAdvancedCssSettings(CVBaseModel):
    """Advanced CSS customization persisted with a resume."""

    enabled: bool = False
    mode: Literal["off", "tokens", "css_patch"] = "off"
    css_text: str = ""
    preset_id: str | None = None
    warnings: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_css_payload(self) -> "CVAdvancedCssSettings":
        """Reject oversized or obviously unsafe CSS payloads."""
        if len(self.css_text) > 8000:
            raise ValueError("advanced_css.css_text exceeds the maximum length.")
        blocked = _contains_unsafe_css_fragment(self.css_text)
        if blocked:
            raise ValueError(
                f"advanced_css.css_text contains blocked construct: {blocked}"
            )
        if self.mode == "off":
            self.enabled = False
        elif self.enabled is False and self.css_text.strip():
            self.enabled = True
        return self


def default_cv_sections() -> list[CVSectionSettings]:
    """Return the default semantic section order."""
    return [
        CVSectionSettings(id="profile", type="profile", label="Profil"),
        CVSectionSettings(id="experience", type="experience", label="Expériences"),
        CVSectionSettings(id="projects", type="projects", label="Projets"),
        CVSectionSettings(
            id="skills",
            type="skills",
            label="Compétences",
            placement="sidebar",
            display_mode="compact",
        ),
        CVSectionSettings(
            id="education",
            type="education",
            label="Formation",
            placement="sidebar",
        ),
        CVSectionSettings(
            id="languages",
            type="languages",
            label="Langues",
            placement="sidebar",
            display_mode="compact",
        ),
        CVSectionSettings(
            id="interests",
            type="interests",
            label="Intérêts",
            placement="sidebar",
            display_mode="compact",
        ),
    ]


class CVGlobalSettings(CVBaseModel):
    """Rendering settings stored with the CV data."""

    schema_version: Literal["2"] = "2"
    page: CVPageSettings = Field(default_factory=CVPageSettings)
    layout: CVLayoutSettings = Field(default_factory=CVLayoutSettings)
    typography: CVTypographySettings = Field(default_factory=CVTypographySettings)
    colors: CVColorSettings = Field(default_factory=CVColorSettings)
    sections: list[CVSectionSettings] = Field(default_factory=default_cv_sections)
    locale: CVLocaleSettings = Field(default_factory=CVLocaleSettings)
    advanced_css: CVAdvancedCssSettings = Field(default_factory=CVAdvancedCssSettings)

    # Legacy flat keys are kept for backward compatibility with the MVP1 frontend.
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

    @model_validator(mode="after")
    def migrate_legacy_settings(self) -> "CVGlobalSettings":
        """Mirror legacy flat settings into the versioned customization contract."""
        self.colors.primary = self.primary_color or self.colors.primary
        self.typography.body_font = self.font_family or self.typography.body_font
        self.typography.heading_font = (
            self.typography.heading_font or self.typography.body_font
        )
        self.typography.base_size = self.font_size or self.typography.base_size
        self.typography.line_height = self.line_height or self.typography.line_height
        self.page.margins.horizontal = self.margin_h or self.page.margins.horizontal
        self.page.margins.vertical = self.margin_v or self.page.margins.vertical
        if self.col_left_width:
            width = self.col_left_width.strip()
            self.layout.sidebar_width = width if width.endswith("%") else f"{width}%"
        if self.col_swap == "true":
            self.layout.sidebar_position = "right"

        if self.template_id == "ats":
            self.layout.columns = 1
            self.layout.sidebar_position = "none"
            self.layout.photo.enabled = False
            self.typography.bullet_style = "dash"
            self.colors.monochrome = True

        if self.page.one_page_challenge:
            self.page.page_break_mode = "auto"
            self.layout.density = "compact"
            self.layout.photo.enabled = False
            self.typography.date_style = (
                "small"
                if self.typography.date_style in {"normal", "italic"}
                else self.typography.date_style
            )
            self.typography.base_size = _min_css_size(
                self.typography.base_size,
                "11.5px",
            )
            self.typography.line_height = _min_line_height(
                self.typography.line_height,
                "1.35",
            )
            self.page.margins.horizontal = _min_css_size(
                self.page.margins.horizontal,
                "36px",
            )
            self.page.margins.vertical = _min_css_size(
                self.page.margins.vertical,
                "28px",
            )
            self.entry_spacing = _min_css_size(self.entry_spacing, "10px")

        self.font_size = self.typography.base_size
        self.line_height = self.typography.line_height
        self.margin_h = self.page.margins.horizontal
        self.margin_v = self.page.margins.vertical

        return self


def _min_css_size(current: str, fallback: str) -> str:
    current_value = _numeric_prefix(current)
    fallback_value = _numeric_prefix(fallback)
    if current_value is None or fallback_value is None:
        return fallback
    return current if current_value <= fallback_value else fallback


def _min_line_height(current: str, fallback: str) -> str:
    try:
        current_value = float(current)
        fallback_value = float(fallback)
    except (TypeError, ValueError):
        return fallback
    return current if current_value <= fallback_value else fallback


def _numeric_prefix(value: str) -> float | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip().removesuffix("px").removesuffix("%")
    try:
        return float(candidate)
    except ValueError:
        return None


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


class CVCertificationItem(CVBaseModel):
    """Certification entry."""

    id: str = ""
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""
    description_markdown: str = ""


class CVVolunteeringItem(CVBaseModel):
    """Volunteering entry."""

    id: str = ""
    organization: str = ""
    role: str = ""
    period: str = ""
    location: str = ""
    description_markdown: str = ""


class CVPublicationItem(CVBaseModel):
    """Publication entry."""

    id: str = ""
    title: str = ""
    publisher: str = ""
    date: str = ""
    url: str = ""
    description_markdown: str = ""


class CVReferenceItem(CVBaseModel):
    """Reference entry."""

    id: str = ""
    name: str = ""
    role: str = ""
    company: str = ""
    contact: str = ""
    description_markdown: str = ""


class CVCustomSectionItem(CVBaseModel):
    """Custom section entry."""

    id: str = ""
    title: str = ""
    content_markdown: str = ""
    items: list[str] = Field(default_factory=list)


class CVDataModel(CVBaseModel):
    """Validated backend shape for a resume CV payload."""

    global_settings: CVGlobalSettings = Field(default_factory=CVGlobalSettings)
    profile: CVProfile
    experience: list[CVExperienceItem] = Field(default_factory=list)
    education: list[CVEducationItem] = Field(default_factory=list)
    skills: list[CVSkillGroup] = Field(default_factory=list)
    projects: list[CVProjectItem] = Field(default_factory=list)
    certifications: list[CVCertificationItem] = Field(default_factory=list)
    volunteering: list[CVVolunteeringItem] = Field(default_factory=list)
    publications: list[CVPublicationItem] = Field(default_factory=list)
    references: list[CVReferenceItem] = Field(default_factory=list)
    custom_sections: list[CVCustomSectionItem] = Field(default_factory=list)
    languages: list[CVLanguageItem] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)


class CVDocumentRequest(BaseModel):
    """Request body for saving the current CV."""

    cv_data: CVDataModel
    source: str = "json"


class TemplateRenderPayloadRequest(BaseModel):
    """Request body for resolving backend-owned template defaults before rendering."""

    cv_data: CVDataModel
    template_id: str | None = None


class MarkdownDocumentRequest(BaseModel):
    """Backend-owned request for Markdown workspace exports."""

    markdown: str = ""
    title: str = "Document"


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


class CompanyAnalyzeRequest(LLMRequest):
    """Request body for company intelligence."""

    company_name: str = Field(min_length=1)
    source_url: AnyHttpUrl | None = None
    evidence_text: str = ""
    job_insights: dict[str, Any] | None = None
    cv_data: dict[str, Any] | None = None
    enable_llm_summary: bool = False
    model_name: str = "llama-3.1-8b-instant"


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
