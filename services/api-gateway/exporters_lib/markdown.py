"""Markdown resume exporter."""

from typing import Any

from database.records import ResumeRecord
from utils.logger import get_logger

from .common import (
    DEFAULT_SECTION_TITLES,
    SECTION_FALLBACK_ORDER,
    _configured_section_types,
    _contact_parts,
    _cv_data,
    _items,
    _join_non_empty,
    _location_text,
    _mapping,
    _section_configs,
    _section_data_for_type,
    _section_title,
    _string_items,
    _text,
)

logger = get_logger(__name__, service_name="api-gateway")

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
