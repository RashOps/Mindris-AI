"""Builtin CV template catalogue and backend-owned customization options."""

from schemas import TemplateCatalogItem

READY_TEMPLATES = [
    TemplateCatalogItem(
        id="modern",
        name="Atlas",
        description=(
            "Balanced two-column layout for tech, product, and business profiles."
        ),
        status="ready",
        category="tech",
        accent="#2563eb",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "modern",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "right",
                    "sidebar_width": "35%",
                    "density": "normal",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "Inter",
                    "heading_font": "Inter",
                    "base_size": "13px",
                    "line_height": "1.5",
                },
                "colors": {
                    "primary": "#2563eb",
                    "secondary": "#64748b",
                    "text": "#334155",
                    "heading": "#0f172a",
                    "sidebar_background": "#f8fafc",
                    "separators": "#e2e8f0",
                    "palette_preset": "tech",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="compact",
        name="Terminal",
        description=(
            "Dense one-page format for experienced profiles and long histories."
        ),
        status="ready",
        category="senior",
        accent="#0f766e",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "compact",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "right",
                    "sidebar_width": "38%",
                    "density": "compact",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "Inter",
                    "heading_font": "Inter",
                    "base_size": "11px",
                    "line_height": "1.4",
                },
                "colors": {
                    "primary": "#0f766e",
                    "secondary": "#475569",
                    "text": "#1f2937",
                    "heading": "#134e4a",
                    "sidebar_background": "#f0fdfa",
                    "separators": "#99f6e4",
                    "palette_preset": "minimal",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="ats",
        name="Mono ATS",
        description="Single-column, low-decoration template for ATS-friendly CVs.",
        status="ready",
        category="ats",
        accent="#475569",
        layout="single",
        preset_settings={
            "global_settings": {
                "template_id": "ats",
                "layout": {
                    "columns": 1,
                    "sidebar_position": "none",
                    "density": "compact",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "Inter",
                    "heading_font": "Inter",
                    "base_size": "12px",
                    "line_height": "1.45",
                },
                "colors": {
                    "primary": "#475569",
                    "secondary": "#475569",
                    "text": "#111827",
                    "heading": "#111827",
                    "sidebar_background": "#ffffff",
                    "separators": "#cbd5e1",
                    "palette_preset": "minimal",
                    "monochrome": True,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="student",
        name="Graduate",
        description="Education-first template for internships and first roles.",
        status="ready",
        category="student",
        accent="#7c3aed",
        layout="single",
        preset_settings={
            "global_settings": {
                "template_id": "student",
                "layout": {
                    "columns": 1,
                    "sidebar_position": "none",
                    "density": "student",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "Inter",
                    "heading_font": "Inter",
                    "base_size": "12px",
                    "line_height": "1.5",
                },
                "colors": {
                    "primary": "#7c3aed",
                    "secondary": "#64748b",
                    "text": "#334155",
                    "heading": "#2e1065",
                    "sidebar_background": "#faf5ff",
                    "separators": "#ddd6fe",
                    "palette_preset": "creative",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="creative",
        name="Studio",
        description="Editorial template for marketing, design, and content roles.",
        status="ready",
        category="creative",
        accent="#e11d48",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "creative",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "left",
                    "sidebar_width": "32%",
                    "density": "normal",
                    "header_alignment": "center",
                },
                "typography": {
                    "body_font": "Lato",
                    "heading_font": "Merriweather",
                    "base_size": "12px",
                    "line_height": "1.55",
                    "titles_uppercase": False,
                },
                "colors": {
                    "primary": "#e11d48",
                    "secondary": "#64748b",
                    "text": "#334155",
                    "heading": "#4c0519",
                    "sidebar_background": "#fff1f2",
                    "separators": "#fecdd3",
                    "palette_preset": "creative",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="atlas-sidebar",
        name="Atlas Sidebar",
        description="Balanced general-purpose layout with a calm profile sidebar.",
        status="ready",
        category="general",
        accent="#0f766e",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "atlas-sidebar",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "left",
                    "sidebar_width": "32%",
                    "density": "normal",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "DM Sans",
                    "heading_font": "DM Sans",
                    "base_size": "12px",
                    "line_height": "1.5",
                },
                "colors": {
                    "primary": "#0f766e",
                    "secondary": "#64748b",
                    "text": "#334155",
                    "heading": "#134e4a",
                    "sidebar_background": "#ecfdf5",
                    "separators": "#a7f3d0",
                    "palette_preset": "minimal",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="ledger",
        name="Ledger",
        description="Editorial serif template for legal, finance, and consulting.",
        status="ready",
        category="professional",
        accent="#7c2d12",
        layout="single",
        preset_settings={
            "global_settings": {
                "template_id": "ledger",
                "layout": {
                    "columns": 1,
                    "sidebar_position": "none",
                    "density": "senior",
                    "header_alignment": "center",
                },
                "typography": {
                    "body_font": "Lato",
                    "heading_font": "Merriweather",
                    "base_size": "12px",
                    "line_height": "1.6",
                    "titles_uppercase": False,
                },
                "colors": {
                    "primary": "#7c2d12",
                    "secondary": "#57534e",
                    "text": "#292524",
                    "heading": "#431407",
                    "sidebar_background": "#fafaf9",
                    "separators": "#d6d3d1",
                    "palette_preset": "corporate",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="executive",
        name="Executive",
        description="Confident, restrained template for senior leadership profiles.",
        status="ready",
        category="senior",
        accent="#1e3a5f",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "executive",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "right",
                    "sidebar_width": "30%",
                    "density": "senior",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "Lato",
                    "heading_font": "Merriweather",
                    "base_size": "12px",
                    "line_height": "1.55",
                },
                "colors": {
                    "primary": "#1e3a5f",
                    "secondary": "#64748b",
                    "text": "#334155",
                    "heading": "#172554",
                    "sidebar_background": "#f1f5f9",
                    "separators": "#cbd5e1",
                    "palette_preset": "corporate",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="signal",
        name="Signal",
        description="Crisp product and technology layout with visible impact markers.",
        status="ready",
        category="tech",
        accent="#4f46e5",
        layout="two-column",
        preset_settings={
            "global_settings": {
                "template_id": "signal",
                "layout": {
                    "columns": 2,
                    "sidebar_position": "right",
                    "sidebar_width": "34%",
                    "density": "compact",
                    "header_alignment": "left",
                },
                "typography": {
                    "body_font": "DM Sans",
                    "heading_font": "DM Sans",
                    "base_size": "12px",
                    "line_height": "1.45",
                },
                "colors": {
                    "primary": "#4f46e5",
                    "secondary": "#64748b",
                    "text": "#312e81",
                    "heading": "#1e1b4b",
                    "sidebar_background": "#eef2ff",
                    "separators": "#c7d2fe",
                    "palette_preset": "tech",
                    "monochrome": False,
                },
            }
        },
    ),
    TemplateCatalogItem(
        id="scholar",
        name="Scholar",
        description="Research-first layout for publications, education, and academia.",
        status="ready",
        category="academic",
        accent="#1d4ed8",
        layout="single",
        preset_settings={
            "global_settings": {
                "template_id": "scholar",
                "layout": {
                    "columns": 1,
                    "sidebar_position": "none",
                    "density": "student",
                    "header_alignment": "center",
                },
                "typography": {
                    "body_font": "Lato",
                    "heading_font": "Merriweather",
                    "base_size": "12px",
                    "line_height": "1.6",
                    "titles_uppercase": False,
                },
                "colors": {
                    "primary": "#1d4ed8",
                    "secondary": "#475569",
                    "text": "#1e293b",
                    "heading": "#172554",
                    "sidebar_background": "#ffffff",
                    "separators": "#94a3b8",
                    "palette_preset": "minimal",
                    "monochrome": False,
                },
            }
        },
    ),
]

COMMUNITY_TEMPLATES = [
    TemplateCatalogItem(
        id="opensource",
        name="Open Source",
        description=(
            "Community-made template for developers, GitHub links, "
            "and OSS contributions."
        ),
        status="community",
        category="developer",
        accent="#0f766e",
        layout="two-column",
        base_template_id="modern",
        author="Mindris Community",
        preset_settings={
            "global_settings": {
                "template_id": "modern",
                "typography": {"heading_scale": "1.1"},
                "colors": {"palette_preset": "tech"},
                "locale": {"label_language": "en"},
            }
        },
    ),
    TemplateCatalogItem(
        id="bilingual",
        name="Bilingual FR/EN",
        description=(
            "Community template tuned for bilingual CVs and international applications."
        ),
        status="community",
        category="international",
        accent="#7c3aed",
        layout="two-column",
        base_template_id="compact",
        author="Mindris Community",
        preset_settings={
            "global_settings": {
                "template_id": "compact",
                "layout": {"density": "compact"},
                "locale": {"label_language": "en"},
            }
        },
    ),
]

TEMPLATE_CATALOG = [*READY_TEMPLATES, *COMMUNITY_TEMPLATES]
CUSTOMIZATION_CATALOGUE = {
    "schemaVersion": "2",
    "page": {
        "formats": ["A4", "Letter"],
        "pageBreakModes": ["auto", "manual"],
        "margins": {
            "presets": {
                "small": {"horizontal": "32px", "vertical": "28px"},
                "normal": {"horizontal": "64px", "vertical": "48px"},
                "large": {"horizontal": "80px", "vertical": "64px"},
            },
            "range": {"min": 16, "max": 96, "unit": "px"},
        },
    },
    "layout": {
        "columns": [1, 2],
        "sidebarPositions": ["none", "left", "right"],
        "sidebarWidth": {
            "presets": ["25%", "30%", "35%"],
            "range": {"min": 20, "max": 70, "unit": "%"},
        },
        "densities": ["student", "compact", "normal", "senior"],
        "headerAlignments": ["left", "center", "right"],
        "headerPositions": ["top", "left", "right"],
        "headerDetailsArrangements": ["inline", "grid", "bullet", "bar", "icons"],
        "headerIconStyles": ["none", "outline", "filled"],
        "photo": {
            "enabled": [True, False],
            "grayscale": [True, False],
            "positions": ["left", "top", "right"],
            "sizes": ["xs", "s", "m", "l", "xl"],
            "shapes": ["round", "square", "rounded", "portrait"],
        },
        "placements": ["main", "sidebar"],
    },
    "typography": {
        "bodyFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "headingFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "baseSize": {"min": 9, "max": 14, "unit": "px"},
        "bodySize": {"min": 9, "max": 14, "unit": "px"},
        "nameSize": {"min": 20, "max": 40, "unit": "px"},
        "titleSize": {"min": 11, "max": 22, "unit": "px"},
        "sectionHeadingSize": {"min": 9, "max": 18, "unit": "px"},
        "entryHeadingSize": {"min": 10, "max": 20, "unit": "px"},
        "headingScale": {"min": 1.0, "max": 1.6, "step": 0.05},
        "weights": ["regular", "medium", "bold"],
        "capitalization": ["normal", "uppercase"],
        "lineHeights": ["1.25", "1.35", "1.5", "1.65"],
        "dateStyles": ["normal", "italic", "small", "right"],
        "bulletStyles": ["bullets", "dash", "dots", "icons"],
    },
    "colors": {
        "palettePresets": ["corporate", "tech", "minimal", "creative", "custom"],
        "editable": [
            "primary",
            "secondary",
            "text",
            "heading",
            "sidebar_background",
            "separators",
        ],
        "accentTargets": [
            "name",
            "title",
            "headings",
            "heading_lines",
            "dates",
            "links",
            "icons",
            "skills",
        ],
        "monochrome": [True, False],
        "minimumContrast": 4.5,
    },
    "links": {
        "underline": [True, False],
        "colors": ["accent", "blue", "inherit"],
        "showIcon": [True, False],
    },
    "sections": {
        "types": [
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
        ],
        "displayModes": ["list", "timeline", "cards", "compact"],
        "detailLevels": ["short", "normal", "detailed"],
        "headingStyles": ["line", "plain", "box", "accent"],
        "headingCapitalization": ["normal", "uppercase"],
        "titleSubtitleOrders": ["title_first", "subtitle_first"],
        "dateLocationPositions": ["inline", "right", "below"],
        "skillStyles": [
            "tags",
            "plain",
            "bars",
            "grid",
            "rows",
            "compact",
            "bubble",
            "level",
            "dots",
        ],
        "iconStyles": ["none", "outline", "filled"],
        "toggles": [
            "visible",
            "show_dates",
            "show_locations",
            "page_break_before",
            "heading_line",
        ],
        "placements": ["main", "sidebar"],
    },
    "locale": {
        "languages": ["fr", "en", "de", "es"],
        "directions": ["ltr", "rtl"],
        "dateFormats": ["MM/YYYY", "YYYY-MM", "MMM YYYY", "MMMM YYYY"],
    },
    "advancedCss": {
        "enabled": True,
        "maxLength": 8000,
        "modes": ["off", "tokens", "css_patch"],
        "allowedScopes": [
            ":host",
            ".cv-shell",
            "[data-section]",
            "[data-section-type]",
            "[data-section-placement]",
        ],
        "blockedAtRules": ["@import"],
        "blockedFunctions": ["expression(", "javascript:", "url("],
        "examples": [
            ":host { --primary-color: #0f172a; --heading-scale: 1.1; }",
            "[data-section-type='experience'] h2 { color: #0f766e; }",
        ],
    },
    "templates": {
        "modern": {
            "label": "Atlas",
            "category": "Généraliste",
            "accent": "#2563eb",
            "previewStyle": "atlas",
            "compatibleLayouts": [1, 2],
        },
        "atlas-sidebar": {
            "label": "Atlas Sidebar",
            "category": "Généraliste",
            "accent": "#0f766e",
            "previewStyle": "sidebar",
            "compatibleLayouts": [1, 2],
        },
        "compact": {
            "label": "Terminal",
            "category": "Ingénierie",
            "accent": "#0f766e",
            "previewStyle": "terminal",
            "compatibleLayouts": [1, 2],
        },
        "ats": {
            "label": "Mono ATS",
            "category": "ATS",
            "accent": "#475569",
            "previewStyle": "mono",
            "compatibleLayouts": [1],
            "enforced": {
                "layout": {"columns": 1, "sidebar_position": "none"},
                "photo": {"enabled": False},
                "colors": {"monochrome": True},
                "typography": {"bullet_style": "dash"},
            },
        },
        "student": {
            "label": "Graduate",
            "category": "Début de carrière",
            "accent": "#7c3aed",
            "previewStyle": "graduate",
            "compatibleLayouts": [1],
        },
        "creative": {
            "label": "Studio",
            "category": "Créatif",
            "accent": "#e11d48",
            "previewStyle": "studio",
            "compatibleLayouts": [1, 2],
        },
        "ledger": {
            "label": "Ledger",
            "category": "Éditorial",
            "accent": "#7c2d12",
            "previewStyle": "ledger",
            "compatibleLayouts": [1],
        },
        "executive": {
            "label": "Executive",
            "category": "Direction",
            "accent": "#1e3a5f",
            "previewStyle": "executive",
            "compatibleLayouts": [1, 2],
        },
        "signal": {
            "label": "Signal",
            "category": "Tech & Produit",
            "accent": "#4f46e5",
            "previewStyle": "signal",
            "compatibleLayouts": [1, 2],
        },
        "scholar": {
            "label": "Scholar",
            "category": "Académique",
            "accent": "#1d4ed8",
            "previewStyle": "scholar",
            "compatibleLayouts": [1],
        },
    },
}
