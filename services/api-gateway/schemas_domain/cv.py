"""CV document and renderer payload schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    grayscale: bool = False
    position: Literal["left", "top", "right"] = "left"
    size: Literal["xs", "s", "m", "l", "xl"] = "m"
    shape: Literal["round", "square", "rounded", "portrait"] = "round"


class CVLayoutSettings(CVBaseModel):
    """Layout customization settings."""

    columns: Literal[1, 2] = 2
    sidebar_position: Literal["none", "left", "right"] = "right"
    sidebar_width: str = "35%"
    density: Literal["student", "compact", "normal", "senior"] = "normal"
    header_alignment: Literal["left", "center", "right"] = "left"
    header_details_arrangement: Literal[
        "inline", "grid", "bullet", "bar", "icons"
    ] = "inline"
    header_icon_style: Literal["none", "outline", "filled"] = "outline"
    photo: CVPhotoSettings = Field(default_factory=CVPhotoSettings)
    section_placement: dict[str, Literal["main", "sidebar"]] = Field(
        default_factory=dict
    )


class CVTypographySettings(CVBaseModel):
    """Typography customization settings."""

    body_font: str = "Inter"
    heading_font: str = "Inter"
    base_size: str = "13px"
    body_size: str = "13px"
    name_size: str = "28px"
    title_size: str = "15px"
    section_heading_size: str = "10px"
    entry_heading_size: str = "14px"
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
    accent_targets: list[
        Literal["name", "title", "headings", "dates", "links", "skills"]
    ] = Field(default_factory=lambda: ["title", "headings", "links", "skills"])

    @model_validator(mode="after")
    def validate_contrast(self) -> "CVColorSettings":
        """Ensure body text remains readable on sidebar backgrounds."""
        ratio = _contrast_ratio(self.text, self.sidebar_background)
        if ratio is not None and ratio < 4.5:
            raise ValueError(
                "Text and sidebar background contrast must be at least 4.5."
            )
        return self


class CVLinkSettings(CVBaseModel):
    """Renderer-owned styling for contact and project links."""

    underline: bool = False
    color: Literal["accent", "blue", "inherit"] = "accent"
    show_icon: bool = False


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
    page_break_before: bool = False
    heading_style: Literal["line", "plain", "box", "accent"] = "line"
    heading_capitalization: Literal["normal", "uppercase"] = "uppercase"
    title_subtitle_order: Literal["title_first", "subtitle_first"] = "title_first"
    date_location_position: Literal["inline", "right", "below"] = "inline"
    skill_style: Literal[
        "tags", "plain", "bars", "grid", "rows", "compact", "bubble", "level", "dots"
    ] = "tags"
    heading_line: bool = True
    icon_style: Literal["none", "outline", "filled"] = "none"
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


class CVGlobalSettings(CVBaseModel):
    """Rendering settings stored with the CV data."""

    schema_version: Literal["2"] = "2"
    page: CVPageSettings = Field(default_factory=CVPageSettings)
    layout: CVLayoutSettings = Field(default_factory=CVLayoutSettings)
    typography: CVTypographySettings = Field(default_factory=CVTypographySettings)
    colors: CVColorSettings = Field(default_factory=CVColorSettings)
    links: CVLinkSettings = Field(default_factory=CVLinkSettings)
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


class CVProfile(CVBaseModel):
    """Candidate profile section."""

    full_name: str = ""
    title: str = ""
    phone: str = ""
    email: str = ""
    location: CVLocation = Field(default_factory=CVLocation)
    socials: list[CVSocial] = Field(default_factory=list)
    text_markdown: str = ""
    photo_url: str | None = None


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
