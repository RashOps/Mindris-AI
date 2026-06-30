"""Open resume export helpers."""

import re
from html import escape
from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape as xml_escape
from zipfile import ZIP_DEFLATED, ZipFile

from database.records import ResumeRecord
from persistence import load_json
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")

DEFAULT_SECTION_TITLES = {
    "profile": "Profile",
    "experience": "Experience",
    "projects": "Projects",
    "certifications": "Certifications",
    "volunteering": "Volunteering",
    "publications": "Publications",
    "references": "References",
    "custom": "Custom sections",
    "skills": "Skills",
    "education": "Education",
    "languages": "Languages",
    "interests": "Interests",
}

SECTION_FALLBACK_ORDER = [
    "profile",
    "experience",
    "projects",
    "certifications",
    "volunteering",
    "publications",
    "references",
    "custom",
    "skills",
    "education",
    "languages",
    "interests",
]


def safe_export_filename(name: str, extension: str) -> str:
    """Return a conservative download filename."""
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip()).strip("._")
    return f"{stem or 'mindris_cv'}.{extension}"


def resume_to_markdown(record: ResumeRecord) -> str:
    """Render a persisted resume as portable Markdown."""
    logger.info("Rendering resume %s to Markdown", record.id)
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    lines: list[str] = []
    sections = _section_configs(cv_data)
    configured_types = _configured_section_types(cv_data)

    full_name = _text(profile.get("full_name")) or record.name
    title = _text(profile.get("title"))
    contacts = _contact_parts(profile)

    lines.append(f"# {full_name}")
    if title:
        lines.append("")
        lines.append(f"**{title}**")
    if contacts:
        lines.append("")
        lines.append(" | ".join(contacts))

    rendered_types: set[str] = set()
    for section in sections:
        section_type = _text(section.get("type"))
        rendered_types.add(section_type)
        section_title = _section_title(section)
        if section_type == "profile":
            _append_markdown_section(
                lines, section_title, _text(profile.get("text_markdown"))
            )
        elif section_type == "experience":
            _append_experience(lines, cv_data.get("experience"), section_title)
        elif section_type == "projects":
            _append_projects(lines, cv_data.get("projects"), section_title)
        elif section_type == "certifications":
            _append_certifications(lines, cv_data.get("certifications"), section_title)
        elif section_type == "volunteering":
            _append_volunteering(lines, cv_data.get("volunteering"), section_title)
        elif section_type == "publications":
            _append_publications(lines, cv_data.get("publications"), section_title)
        elif section_type == "references":
            _append_references(lines, cv_data.get("references"), section_title)
        elif section_type == "custom":
            _append_custom_sections(lines, cv_data.get("custom_sections"))
        elif section_type == "skills":
            _append_skills(lines, cv_data.get("skills"), section_title)
        elif section_type == "education":
            _append_education(lines, cv_data.get("education"), section_title)
        elif section_type == "languages":
            _append_languages(lines, cv_data.get("languages"), section_title)
        elif section_type == "interests":
            _append_hobbies(lines, cv_data.get("hobbies"), section_title)

    for section_type in SECTION_FALLBACK_ORDER:
        if section_type in rendered_types or section_type in configured_types:
            continue
        section_data = _section_data_for_type(cv_data, section_type, profile)
        if section_type == "profile":
            _append_markdown_section(
                lines, DEFAULT_SECTION_TITLES[section_type], section_data
            )
        elif section_type == "experience":
            _append_experience(
                lines, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "projects":
            _append_projects(lines, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "certifications":
            _append_certifications(
                lines, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "volunteering":
            _append_volunteering(
                lines, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "publications":
            _append_publications(
                lines, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "references":
            _append_references(
                lines, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "custom":
            _append_custom_sections(lines, section_data)
        elif section_type == "skills":
            _append_skills(lines, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "education":
            _append_education(lines, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "languages":
            _append_languages(lines, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "interests":
            _append_hobbies(lines, section_data, DEFAULT_SECTION_TITLES[section_type])

    rendered = "\n".join(lines).strip() + "\n"
    logger.debug("Rendered Markdown resume %s (%d chars)", record.id, len(rendered))
    return rendered


def resume_to_latex(record: ResumeRecord) -> str:
    """Render a persisted resume as a compile-ready LaTeX document."""
    logger.info("Rendering resume %s to LaTeX", record.id)
    rendered = _markdown_to_latex(resume_to_markdown(record))
    logger.debug("Rendered LaTeX resume %s (%d chars)", record.id, len(rendered))
    return rendered


def resume_to_typst(record: ResumeRecord) -> str:
    """Render a persisted resume as a compile-ready Typst document."""
    logger.info("Rendering resume %s to Typst", record.id)
    rendered = _markdown_to_typst(resume_to_markdown(record))
    logger.debug("Rendered Typst resume %s (%d chars)", record.id, len(rendered))
    return rendered


def resume_to_html(record: ResumeRecord) -> str:
    """Render a persisted resume as standalone, script-free HTML."""
    logger.info("Rendering resume %s to HTML", record.id)
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    sections = _section_configs(cv_data)
    configured_types = _configured_section_types(cv_data)
    full_name = _text(profile.get("full_name")) or record.name
    title = _text(profile.get("title"))
    contacts = _contact_parts(profile)

    profile_html = _markdownish_html(_text(profile.get("text_markdown")))
    rendered_sections: list[str] = []
    rendered_types: set[str] = set()
    for section in sections:
        section_type = _text(section.get("type"))
        rendered_types.add(section_type)
        section_title = _section_title(section)
        if section_type == "profile":
            rendered = _html_section(section_title, profile_html)
        elif section_type == "experience":
            rendered = _experience_html(cv_data.get("experience"), section_title)
        elif section_type == "projects":
            rendered = _projects_html(cv_data.get("projects"), section_title)
        elif section_type == "certifications":
            rendered = _certifications_html(
                cv_data.get("certifications"), section_title
            )
        elif section_type == "volunteering":
            rendered = _volunteering_html(cv_data.get("volunteering"), section_title)
        elif section_type == "publications":
            rendered = _publications_html(cv_data.get("publications"), section_title)
        elif section_type == "references":
            rendered = _references_html(cv_data.get("references"), section_title)
        elif section_type == "custom":
            rendered = _custom_sections_html(cv_data.get("custom_sections"))
        elif section_type == "skills":
            rendered = _skills_html(cv_data.get("skills"), section_title)
        elif section_type == "education":
            rendered = _education_html(cv_data.get("education"), section_title)
        elif section_type == "languages":
            rendered = _languages_html(cv_data.get("languages"), section_title)
        elif section_type == "interests":
            rendered = _hobbies_html(cv_data.get("hobbies"), section_title)
        else:
            rendered = ""
        if rendered:
            rendered_sections.append(rendered)
    for section_type in SECTION_FALLBACK_ORDER:
        if section_type in rendered_types or section_type in configured_types:
            continue
        section_data = _section_data_for_type(cv_data, section_type, profile)
        if section_type == "profile":
            rendered = _html_section(DEFAULT_SECTION_TITLES[section_type], profile_html)
        elif section_type == "experience":
            rendered = _experience_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "projects":
            rendered = _projects_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "certifications":
            rendered = _certifications_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "volunteering":
            rendered = _volunteering_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "publications":
            rendered = _publications_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "references":
            rendered = _references_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "custom":
            rendered = _custom_sections_html(section_data)
        elif section_type == "skills":
            rendered = _skills_html(section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "education":
            rendered = _education_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "languages":
            rendered = _languages_html(
                section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "interests":
            rendered = _hobbies_html(section_data, DEFAULT_SECTION_TITLES[section_type])
        else:
            rendered = ""
        if rendered:
            rendered_sections.append(rendered)
    body_sections = "\n".join(rendered_sections)
    contact_html = ""
    if contacts:
        contact_html = (
            '<p class="contact">'
            + " <span>/</span> ".join(escape(part) for part in contacts)
            + "</p>"
        )

    rendered = f"""<!doctype html>
<html lang="{escape(str(record.locale or "en"))}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(full_name)} - Resume</title>
  <style>
    :root {{
      color-scheme: light;
      --text: #111827;
      --muted: #4b5563;
      --line: #d1d5db;
      --accent: #2563eb;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #f3f4f6;
      color: var(--text);
      font: 14px/1.55 Arial, Helvetica, sans-serif;
    }}
    main {{
      width: min(880px, calc(100% - 32px));
      margin: 32px auto;
      padding: 48px;
      background: #fff;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    }}
    header {{
      border-bottom: 2px solid var(--line);
      padding-bottom: 18px;
      margin-bottom: 28px;
    }}
    h1 {{
      margin: 0;
      font-size: 34px;
      line-height: 1.1;
      letter-spacing: 0;
    }}
    h2 {{
      margin: 28px 0 10px;
      color: var(--accent);
      font-size: 13px;
      letter-spacing: 0;
      text-transform: uppercase;
    }}
    h3 {{
      margin: 0;
      font-size: 16px;
    }}
    p {{ margin: 6px 0; }}
    ul {{ margin: 8px 0 0 20px; padding: 0; }}
    li {{ margin: 3px 0; }}
    .title, .meta, .contact {{ color: var(--muted); }}
    .item {{ margin: 0 0 16px; break-inside: avoid; }}
    .chips {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }}
    .chip {{
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 2px 7px;
      color: var(--muted);
    }}
    @media print {{
      body {{ background: #fff; }}
      main {{ width: auto; margin: 0; padding: 0; box-shadow: none; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>{escape(full_name)}</h1>
      {f'<p class="title">{escape(title)}</p>' if title else ""}
      {contact_html}
    </header>
    {body_sections}
  </main>
</body>
</html>
"""
    logger.debug("Rendered HTML resume %s (%d chars)", record.id, len(rendered))
    return rendered


def _markdown_to_latex(markdown: str) -> str:
    lines = [
        r"\documentclass[11pt]{article}",
        r"\usepackage[margin=1in]{geometry}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage{enumitem}",
        r"\usepackage[hidelinks]{hyperref}",
        r"\setlength{\parindent}{0pt}",
        r"\setlength{\parskip}{0.35em}",
        r"\begin{document}",
    ]
    in_list = False
    seen_title = False
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append("")
            continue

        if line.startswith("# "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            title = _latex_escape(_strip_markdown_formatting(line[2:]))
            if not seen_title:
                lines.extend(
                    [r"\begin{center}", rf"{{\LARGE {title}}}", r"\end{center}"]
                )
                seen_title = True
            else:
                lines.append(rf"\section*{{{title}}}")
            continue

        if line.startswith("## "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append(
                rf"\section*{{{_latex_escape(_strip_markdown_formatting(line[3:]))}}}"
            )
            continue

        if line.startswith("### "):
            if in_list:
                lines.append(r"\end{itemize}")
                in_list = False
            lines.append(
                rf"\subsection*{{{_latex_escape(_strip_markdown_formatting(line[4:]))}}}"
            )
            continue

        if line.startswith("- "):
            if not in_list:
                lines.append(r"\begin{itemize}[leftmargin=*]")
                in_list = True
            lines.append(
                rf"\item {_latex_escape(_strip_markdown_formatting(line[2:]))}"
            )
            continue

        if in_list:
            lines.append(r"\end{itemize}")
            in_list = False
        lines.append(_latex_escape(_strip_markdown_formatting(line)))

    if in_list:
        lines.append(r"\end{itemize}")
    lines.append(r"\end{document}")
    return "\n".join(lines).strip() + "\n"


def _markdown_to_typst(markdown: str) -> str:
    lines = [
        "#set page(margin: 1in)",
        '#set text(font: "Liberation Serif", size: 11pt)',
        "",
    ]
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue

        if line.startswith("# "):
            lines.append(f"= {_typst_escape(_strip_markdown_formatting(line[2:]))}")
            continue
        if line.startswith("## "):
            lines.append(f"== {_typst_escape(_strip_markdown_formatting(line[3:]))}")
            continue
        if line.startswith("### "):
            lines.append(f"=== {_typst_escape(_strip_markdown_formatting(line[4:]))}")
            continue

        lines.append(_typst_escape(_strip_markdown_formatting(line)))
    return "\n".join(lines).strip() + "\n"


def resume_to_docx(record: ResumeRecord) -> bytes:
    """Render a persisted resume as a text-based DOCX document."""
    logger.info("Rendering resume %s to DOCX", record.id)
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    sections = _section_configs(cv_data)
    configured_types = _configured_section_types(cv_data)
    full_name = _text(profile.get("full_name")) or record.name
    title = _text(profile.get("title"))
    contacts = _contact_parts(profile)

    blocks: list[dict[str, Any]] = [{"style": "Title", "text": full_name}]
    if title:
        blocks.append({"style": "Subtitle", "text": title})
    if contacts:
        blocks.append({"style": "Contact", "text": " | ".join(contacts)})

    rendered_types: set[str] = set()
    for section in sections:
        section_type = _text(section.get("type"))
        rendered_types.add(section_type)
        section_title = _section_title(section)
        if section_type == "profile":
            _docx_profile(blocks, _text(profile.get("text_markdown")), section_title)
        elif section_type == "experience":
            _docx_experience(blocks, cv_data.get("experience"), section_title)
        elif section_type == "projects":
            _docx_projects(blocks, cv_data.get("projects"), section_title)
        elif section_type == "certifications":
            _docx_certifications(blocks, cv_data.get("certifications"), section_title)
        elif section_type == "volunteering":
            _docx_volunteering(blocks, cv_data.get("volunteering"), section_title)
        elif section_type == "publications":
            _docx_publications(blocks, cv_data.get("publications"), section_title)
        elif section_type == "references":
            _docx_references(blocks, cv_data.get("references"), section_title)
        elif section_type == "custom":
            _docx_custom_sections(blocks, cv_data.get("custom_sections"))
        elif section_type == "skills":
            _docx_skills(blocks, cv_data.get("skills"), section_title)
        elif section_type == "education":
            _docx_education(blocks, cv_data.get("education"), section_title)
        elif section_type == "languages":
            _docx_languages(blocks, cv_data.get("languages"), section_title)
        elif section_type == "interests":
            _docx_hobbies(blocks, cv_data.get("hobbies"), section_title)

    for section_type in SECTION_FALLBACK_ORDER:
        if section_type in rendered_types or section_type in configured_types:
            continue
        section_data = _section_data_for_type(cv_data, section_type, profile)
        if section_type == "profile":
            _docx_profile(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "experience":
            _docx_experience(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "projects":
            _docx_projects(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "certifications":
            _docx_certifications(
                blocks, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "volunteering":
            _docx_volunteering(
                blocks, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "publications":
            _docx_publications(
                blocks, section_data, DEFAULT_SECTION_TITLES[section_type]
            )
        elif section_type == "references":
            _docx_references(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "custom":
            _docx_custom_sections(blocks, section_data)
        elif section_type == "skills":
            _docx_skills(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "education":
            _docx_education(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "languages":
            _docx_languages(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])
        elif section_type == "interests":
            _docx_hobbies(blocks, section_data, DEFAULT_SECTION_TITLES[section_type])

    document_xml = _docx_document_xml(blocks)
    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", _docx_content_types())
        docx.writestr("_rels/.rels", _docx_root_rels())
        docx.writestr("word/_rels/document.xml.rels", _docx_document_rels())
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", _docx_styles())
        docx.writestr("docProps/core.xml", _docx_core_props(full_name))
        docx.writestr("docProps/app.xml", _docx_app_props())
    rendered = buffer.getvalue()
    logger.debug("Rendered DOCX resume %s (%d bytes)", record.id, len(rendered))
    return rendered


def _cv_data(record: ResumeRecord) -> dict[str, Any]:
    data = load_json(record.data_json, {})
    return data if isinstance(data, dict) else {}


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _strip_markdown_formatting(value: str) -> str:
    return value.replace("**", "").replace("*", "")


def _latex_escape(value: str) -> str:
    token = "__MINDRIS_LATEX_BACKSLASH__"
    escaped = value.replace("\\", token)
    replacements = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    for source, target in replacements.items():
        escaped = escaped.replace(source, target)
    return escaped.replace(token, r"\textbackslash{}")


def _typst_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("#", r"\#")


def _section_configs(cv_data: dict[str, Any]) -> list[dict[str, Any]]:
    settings = _mapping(cv_data.get("global_settings"))
    sections = _items(settings.get("sections"))
    configs: list[dict[str, Any]] = []
    for section in sections:
        item = _mapping(section)
        section_type = _text(item.get("type"))
        if not section_type or item.get("visible", True) is False:
            continue
        configs.append(item)
    return configs


def _configured_section_types(cv_data: dict[str, Any]) -> set[str]:
    settings = _mapping(cv_data.get("global_settings"))
    sections = _items(settings.get("sections"))
    configured_types: set[str] = set()
    for section in sections:
        section_type = _text(_mapping(section).get("type"))
        if section_type:
            configured_types.add(section_type)
    return configured_types


def _section_title(section: dict[str, Any]) -> str:
    section_type = _text(section.get("type"))
    return _text(section.get("label")) or DEFAULT_SECTION_TITLES.get(
        section_type, section_type.title()
    )


def _section_data_for_type(
    cv_data: dict[str, Any], section_type: str, profile: dict[str, Any]
) -> Any:
    if section_type == "profile":
        return _text(profile.get("text_markdown"))
    if section_type == "experience":
        return cv_data.get("experience")
    if section_type == "projects":
        return cv_data.get("projects")
    if section_type == "certifications":
        return cv_data.get("certifications")
    if section_type == "volunteering":
        return cv_data.get("volunteering")
    if section_type == "publications":
        return cv_data.get("publications")
    if section_type == "references":
        return cv_data.get("references")
    if section_type == "custom":
        return cv_data.get("custom_sections")
    if section_type == "skills":
        return cv_data.get("skills")
    if section_type == "education":
        return cv_data.get("education")
    if section_type == "languages":
        return cv_data.get("languages")
    if section_type == "interests":
        return cv_data.get("hobbies")
    return None


def _join_non_empty(values: list[str], separator: str = " - ") -> str:
    return separator.join(value for value in values if value)


def _location_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if not isinstance(value, dict):
        return ""
    return _join_non_empty(
        [_text(value.get("city")), _text(value.get("country"))],
        ", ",
    )


def _contact_parts(profile: dict[str, Any]) -> list[str]:
    parts = [
        _text(profile.get("email")),
        _text(profile.get("phone")),
        _location_text(profile.get("location")),
    ]
    for social in _items(profile.get("socials")):
        item = _mapping(social)
        label = _text(item.get("label")) or _text(item.get("type"))
        url = _text(item.get("url"))
        if label and url:
            parts.append(f"{label}: {url}")
        elif url:
            parts.append(url)
    return [part for part in parts if part]


def _append_markdown_section(lines: list[str], title: str, content: str) -> None:
    if not content:
        return
    lines.extend(["", f"## {title}", "", content.strip()])


def _append_experience(lines: list[str], value: Any, title: str = "Experience") -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("company")) or _text(item.get("role"))
    ]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        heading = _join_non_empty([_text(item.get("role")), _text(item.get("company"))])
        meta = _join_non_empty(
            [_text(item.get("period")), _location_text(item.get("location"))],
            " | ",
        )
        lines.extend(["", f"### {heading or 'Experience'}"])
        if meta:
            lines.append(f"*{meta}*")
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])
        keywords = _string_items(item.get("keywords"))
        if keywords:
            lines.append("")
            lines.append("Keywords: " + ", ".join(keywords))


def _append_projects(lines: list[str], value: Any, title: str = "Projects") -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("name"))]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        name = _text(item.get("name"))
        url = _text(item.get("url"))
        lines.extend(["", f"### {name}"])
        if url:
            lines.append(url)
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])
        stack = _string_items(item.get("tech_stack"))
        if stack:
            lines.append("")
            lines.append("Stack: " + ", ".join(stack))


def _append_certifications(
    lines: list[str], value: Any, title: str = "Certifications"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("name")) or _text(item.get("issuer"))
    ]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        heading = _join_non_empty([_text(item.get("name")), _text(item.get("issuer"))])
        meta = _text(item.get("date"))
        lines.extend(["", f"### {heading or 'Certification'}"])
        if meta:
            lines.append(f"*{meta}*")
        url = _text(item.get("url"))
        if url:
            lines.append(url)
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])


def _append_volunteering(
    lines: list[str], value: Any, title: str = "Volunteering"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("organization")) or _text(item.get("role"))
    ]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("role")), _text(item.get("organization"))]
        )
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        lines.extend(["", f"### {heading or 'Volunteering'}"])
        if meta:
            lines.append(f"*{meta}*")
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])


def _append_publications(
    lines: list[str], value: Any, title: str = "Publications"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("title"))]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        lines.extend(["", f"### {_text(item.get('title'))}"])
        meta = _join_non_empty(
            [_text(item.get("publisher")), _text(item.get("date"))],
            " | ",
        )
        if meta:
            lines.append(f"*{meta}*")
        url = _text(item.get("url"))
        if url:
            lines.append(url)
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])


def _append_references(lines: list[str], value: Any, title: str = "References") -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("name")) or _text(item.get("company"))
    ]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        heading = _join_non_empty(
            [
                _text(item.get("name")),
                _text(item.get("role")),
                _text(item.get("company")),
            ]
        )
        lines.extend(["", f"### {heading or 'Reference'}"])
        contact = _text(item.get("contact"))
        if contact:
            lines.append(contact)
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])


def _append_custom_sections(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("title"))]
    if not items:
        return
    for item in items:
        title = _text(item.get("title"))
        lines.extend(["", f"## {title}"])
        content = _text(item.get("content_markdown"))
        if content:
            lines.extend(["", content])
        bullets = _string_items(item.get("items"))
        if bullets:
            lines.append("")
            lines.extend([f"- {bullet}" for bullet in bullets])


def _append_skills(lines: list[str], value: Any, title: str = "Skills") -> None:
    items = [_mapping(item) for item in _items(value)]
    groups = [
        (_text(item.get("category")), _string_items(item.get("skills")))
        for item in items
    ]
    groups = [(category, skills) for category, skills in groups if category or skills]
    if not groups:
        return
    lines.extend(["", f"## {title}"])
    for category, skills in groups:
        label = category or "Skills"
        if skills:
            lines.append(f"- **{label}:** {', '.join(skills)}")
        else:
            lines.append(f"- **{label}**")


def _append_education(lines: list[str], value: Any, title: str = "Education") -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("institution")) or _text(item.get("degree"))
    ]
    if not items:
        return
    lines.extend(["", f"## {title}"])
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("degree")), _text(item.get("institution"))]
        )
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        lines.extend(["", f"### {heading or 'Education'}"])
        if meta:
            lines.append(f"*{meta}*")
        description = _text(item.get("description_markdown"))
        if description:
            lines.extend(["", description])


def _append_languages(lines: list[str], value: Any, title: str = "Languages") -> None:
    items = [_mapping(item) for item in _items(value)]
    values = [
        _join_non_empty([_text(item.get("language")), _text(item.get("level"))], " - ")
        for item in items
    ]
    values = [value for value in values if value]
    if values:
        lines.extend(["", f"## {title}", *[f"- {value}" for value in values]])


def _append_hobbies(lines: list[str], value: Any, title: str = "Interests") -> None:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    if values:
        lines.extend(["", f"## {title}", ", ".join(values)])


def _certifications_html(value: Any, title: str = "Certifications") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        name = _text(item.get("name"))
        issuer = _text(item.get("issuer"))
        if not name and not issuer:
            continue
        entry_title = _join_non_empty([name, issuer])
        meta = _text(item.get("date"))
        body = _markdownish_html(_text(item.get("description_markdown")))
        url = _text(item.get("url"))
        cards.append(
            f'<article class="item"><h3>{escape(entry_title or "Certification")}</h3>'
            f"{_meta_html(meta)}"
            f"{f'<p class="meta">{escape(url)}</p>' if url else ''}"
            f"{body}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _volunteering_html(value: Any, title: str = "Volunteering") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        entry_title = _join_non_empty(
            [_text(item.get("role")), _text(item.get("organization"))]
        )
        if not entry_title:
            continue
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        cards.append(
            f'<article class="item"><h3>{escape(entry_title)}</h3>'
            f"{_meta_html(meta)}"
            f"{_markdownish_html(_text(item.get('description_markdown')))}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _publications_html(value: Any, title: str = "Publications") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        entry_title = _text(item.get("title"))
        if not entry_title:
            continue
        meta = _join_non_empty(
            [_text(item.get("publisher")), _text(item.get("date"))],
            " | ",
        )
        url = _text(item.get("url"))
        cards.append(
            f'<article class="item"><h3>{escape(entry_title)}</h3>'
            f"{_meta_html(meta)}"
            f"{f'<p class="meta">{escape(url)}</p>' if url else ''}"
            f"{_markdownish_html(_text(item.get('description_markdown')))}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _references_html(value: Any, title: str = "References") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        entry_title = _join_non_empty(
            [
                _text(item.get("name")),
                _text(item.get("role")),
                _text(item.get("company")),
            ]
        )
        if not entry_title:
            continue
        contact = _text(item.get("contact"))
        content = _markdownish_html(_text(item.get("description_markdown")))
        cards.append(
            f'<article class="item"><h3>{escape(entry_title)}</h3>'
            f"{f'<p class="meta">{escape(contact)}</p>' if contact else ''}"
            f"{content}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _custom_sections_html(value: Any) -> str:
    items = [_mapping(item) for item in _items(value)]
    sections = []
    for item in items:
        entry_title = _text(item.get("title"))
        if not entry_title:
            continue
        content = _markdownish_html(_text(item.get("content_markdown")))
        chips = _chips_html(_string_items(item.get("items")))
        sections.append(_html_section(entry_title, content + chips))
    return "\n  ".join(section for section in sections if section)


def _docx_profile(
    blocks: list[dict[str, Any]], content: str, title: str = "Profile"
) -> None:
    if not content:
        return
    blocks.append({"style": "Heading1", "text": title})
    _docx_markdownish(blocks, content)


def _docx_experience(
    blocks: list[dict[str, Any]], value: Any, title: str = "Experience"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("company")) or _text(item.get("role"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        heading = _join_non_empty([_text(item.get("role")), _text(item.get("company"))])
        meta = _join_non_empty(
            [_text(item.get("period")), _location_text(item.get("location"))],
            " | ",
        )
        blocks.append({"style": "Heading2", "text": heading or "Experience"})
        if meta:
            blocks.append({"style": "Meta", "text": meta})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))
        keywords = _string_items(item.get("keywords"))
        if keywords:
            blocks.append({"style": "Meta", "text": "Keywords: " + ", ".join(keywords)})


def _docx_projects(
    blocks: list[dict[str, Any]], value: Any, title: str = "Projects"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("name"))]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        blocks.append({"style": "Heading2", "text": _text(item.get("name"))})
        url = _text(item.get("url"))
        if url:
            blocks.append({"style": "Meta", "text": url})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))
        stack = _string_items(item.get("tech_stack"))
        if stack:
            blocks.append({"style": "Meta", "text": "Stack: " + ", ".join(stack)})


def _docx_skills(
    blocks: list[dict[str, Any]], value: Any, title: str = "Skills"
) -> None:
    groups = [_mapping(item) for item in _items(value)]
    rows = []
    for item in groups:
        category = _text(item.get("category")) or "Skills"
        skills = _string_items(item.get("skills"))
        if category or skills:
            rows.append(f"{category}: {', '.join(skills)}" if skills else category)
    if rows:
        blocks.append({"style": "Heading1", "text": title})
        for row in rows:
            blocks.append({"style": "Bullet", "text": row})


def _docx_education(
    blocks: list[dict[str, Any]], value: Any, title: str = "Education"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("institution")) or _text(item.get("degree"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("degree")), _text(item.get("institution"))]
        )
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        blocks.append({"style": "Heading2", "text": heading or "Education"})
        if meta:
            blocks.append({"style": "Meta", "text": meta})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))


def _docx_languages(
    blocks: list[dict[str, Any]], value: Any, title: str = "Languages"
) -> None:
    labels = [
        _join_non_empty(
            [_text(item.get("language")), _text(item.get("level"))],
            " - ",
        )
        for item in (_mapping(item) for item in _items(value))
    ]
    labels = [label for label in labels if label]
    if labels:
        blocks.append({"style": "Heading1", "text": title})
        for label in labels:
            blocks.append({"style": "Bullet", "text": label})


def _docx_hobbies(
    blocks: list[dict[str, Any]], value: Any, title: str = "Interests"
) -> None:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    if values:
        blocks.append({"style": "Heading1", "text": title})
        blocks.append({"style": "Normal", "text": ", ".join(values)})


def _docx_certifications(
    blocks: list[dict[str, Any]], value: Any, title: str = "Certifications"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("name")) or _text(item.get("issuer"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        heading = _join_non_empty([_text(item.get("name")), _text(item.get("issuer"))])
        blocks.append({"style": "Heading2", "text": heading or "Certification"})
        if _text(item.get("date")):
            blocks.append({"style": "Meta", "text": _text(item.get("date"))})
        if _text(item.get("url")):
            blocks.append({"style": "Meta", "text": _text(item.get("url"))})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))


def _docx_volunteering(
    blocks: list[dict[str, Any]], value: Any, title: str = "Volunteering"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("organization")) or _text(item.get("role"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("role")), _text(item.get("organization"))]
        )
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        blocks.append({"style": "Heading2", "text": heading or "Volunteering"})
        if meta:
            blocks.append({"style": "Meta", "text": meta})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))


def _docx_publications(
    blocks: list[dict[str, Any]], value: Any, title: str = "Publications"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("title"))]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        blocks.append({"style": "Heading2", "text": _text(item.get("title"))})
        meta = _join_non_empty(
            [_text(item.get("publisher")), _text(item.get("date"))],
            " | ",
        )
        if meta:
            blocks.append({"style": "Meta", "text": meta})
        if _text(item.get("url")):
            blocks.append({"style": "Meta", "text": _text(item.get("url"))})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))


def _docx_references(
    blocks: list[dict[str, Any]], value: Any, title: str = "References"
) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item for item in items if _text(item.get("name")) or _text(item.get("company"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": title})
    for item in items:
        heading = _join_non_empty(
            [
                _text(item.get("name")),
                _text(item.get("role")),
                _text(item.get("company")),
            ]
        )
        blocks.append({"style": "Heading2", "text": heading or "Reference"})
        if _text(item.get("contact")):
            blocks.append({"style": "Meta", "text": _text(item.get("contact"))})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))


def _docx_custom_sections(blocks: list[dict[str, Any]], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    for item in items:
        title = _text(item.get("title"))
        if not title:
            continue
        blocks.append({"style": "Heading1", "text": title})
        content = _text(item.get("content_markdown"))
        if content:
            _docx_markdownish(blocks, content)
        bullets = _string_items(item.get("items"))
        for bullet in bullets:
            blocks.append({"style": "Bullet", "text": bullet})


def _docx_markdownish(blocks: list[dict[str, Any]], content: str) -> None:
    for raw in content.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith(("- ", "* ")):
            blocks.append({"style": "Bullet", "text": line[2:].strip()})
        else:
            blocks.append({"style": "Normal", "text": line})


def _docx_document_xml(blocks: list[dict[str, Any]]) -> str:
    body = "".join(_docx_paragraph(block) for block in blocks if block.get("text"))
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134"
        w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""


def _docx_paragraph(block: dict[str, Any]) -> str:
    style = str(block.get("style") or "Normal")
    text = xml_escape(str(block.get("text") or ""))
    prefix = "• " if style == "Bullet" else ""
    paragraph_style = "Normal" if style == "Bullet" else style
    return (
        "<w:p>"
        f'<w:pPr><w:pStyle w:val="{paragraph_style}"/></w:pPr>'
        f"<w:r><w:t>{xml_escape(prefix)}{text}</w:t></w:r>"
        "</w:p>"
    )


def _docx_content_types() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels"
    ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml"
    ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml"
    ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""


def _docx_root_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"
    Target="docProps/core.xml"/>
  <Relationship Id="rId3"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties"
    Target="docProps/app.xml"/>
</Relationships>"""


def _docx_document_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>"""


def _docx_styles() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:color w:val="475569"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Contact">
    <w:name w:val="Contact"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:color w:val="475569"/><w:sz w:val="18"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="260" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="23"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Meta">
    <w:name w:val="Meta"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="19"/></w:rPr>
  </w:style>
</w:styles>"""


def _docx_core_props(title: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{xml_escape(title)} - Resume</dc:title>
  <dc:creator>Mindris AI</dc:creator>
</cp:coreProperties>"""


def _docx_app_props() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Mindris AI</Application>
</Properties>"""


def _html_section(title: str, content: str) -> str:
    if not content:
        return ""
    return f"<section>\n  <h2>{escape(title)}</h2>\n  {content}\n</section>"


def _markdownish_html(content: str) -> str:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if not lines:
        return ""

    html_parts: list[str] = []
    list_items: list[str] = []
    for line in lines:
        if line.startswith(("- ", "* ")):
            list_items.append(f"<li>{escape(line[2:].strip())}</li>")
            continue
        if list_items:
            html_parts.append("<ul>" + "".join(list_items) + "</ul>")
            list_items = []
        html_parts.append(f"<p>{escape(line)}</p>")
    if list_items:
        html_parts.append("<ul>" + "".join(list_items) + "</ul>")
    return "\n  ".join(html_parts)


def _experience_html(value: Any, title: str = "Experience") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        heading = _join_non_empty([_text(item.get("role")), _text(item.get("company"))])
        if not heading:
            continue
        meta = _join_non_empty(
            [_text(item.get("period")), _location_text(item.get("location"))],
            " | ",
        )
        description = _markdownish_html(_text(item.get("description_markdown")))
        keywords = _string_items(item.get("keywords"))
        chips = _chips_html(keywords)
        cards.append(
            f'<article class="item"><h3>{escape(heading)}</h3>'
            f"{_meta_html(meta)}"
            f"{description}{chips}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _projects_html(value: Any, title: str = "Projects") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        name = _text(item.get("name"))
        if not name:
            continue
        url = _text(item.get("url"))
        description = _markdownish_html(_text(item.get("description_markdown")))
        stack = _string_items(item.get("tech_stack"))
        link = f'<p class="meta">{escape(url)}</p>' if url else ""
        cards.append(
            f'<article class="item"><h3>{escape(name)}</h3>{link}'
            f"{description}{_chips_html(stack)}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _skills_html(value: Any, title: str = "Skills") -> str:
    items = [_mapping(item) for item in _items(value)]
    rows = []
    for item in items:
        category = _text(item.get("category")) or "Skills"
        skills = _string_items(item.get("skills"))
        if category or skills:
            rows.append(
                f"<p><strong>{escape(category)}:</strong> "
                f"{escape(', '.join(skills))}</p>"
            )
    return _html_section(title, "\n  ".join(rows))


def _education_html(value: Any, title: str = "Education") -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("degree")), _text(item.get("institution"))]
        )
        if not heading:
            continue
        meta = _join_non_empty(
            [_text(item.get("period")), _text(item.get("location"))],
            " | ",
        )
        description = _markdownish_html(_text(item.get("description_markdown")))
        cards.append(
            f'<article class="item"><h3>{escape(heading)}</h3>'
            f"{_meta_html(meta)}"
            f"{description}</article>"
        )
    return _html_section(title, "\n  ".join(cards))


def _languages_html(value: Any, title: str = "Languages") -> str:
    items = [_mapping(item) for item in _items(value)]
    labels = [
        _join_non_empty([_text(item.get("language")), _text(item.get("level"))], " - ")
        for item in items
    ]
    return _html_section(title, _list_html([label for label in labels if label]))


def _hobbies_html(value: Any, title: str = "Interests") -> str:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    return _html_section(title, _chips_html(values))


def _string_items(value: Any) -> list[str]:
    return [item for item in _items(value) if isinstance(item, str) and item.strip()]


def _meta_html(value: str) -> str:
    return f'<p class="meta">{escape(value)}</p>' if value else ""


def _chips_html(values: list[str]) -> str:
    if not values:
        return ""
    return (
        '<div class="chips">'
        + "".join(f'<span class="chip">{escape(value)}</span>' for value in values)
        + "</div>"
    )


def _list_html(values: list[str]) -> str:
    if not values:
        return ""
    return "<ul>" + "".join(f"<li>{escape(value)}</li>" for value in values) + "</ul>"
