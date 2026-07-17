"""Standalone HTML resume exporter."""

from html import escape
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
