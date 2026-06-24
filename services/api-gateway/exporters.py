"""Open resume export helpers."""

import re
from html import escape
from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape as xml_escape
from zipfile import ZIP_DEFLATED, ZipFile

from database.records import ResumeRecord
from persistence import load_json


def safe_export_filename(name: str, extension: str) -> str:
    """Return a conservative download filename."""
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip()).strip("._")
    return f"{stem or 'mindris_cv'}.{extension}"


def resume_to_markdown(record: ResumeRecord) -> str:
    """Render a persisted resume as portable Markdown."""
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    lines: list[str] = []

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

    _append_markdown_section(lines, "Profile", _text(profile.get("text_markdown")))
    _append_experience(lines, cv_data.get("experience"))
    _append_projects(lines, cv_data.get("projects"))
    _append_skills(lines, cv_data.get("skills"))
    _append_education(lines, cv_data.get("education"))
    _append_languages(lines, cv_data.get("languages"))
    _append_hobbies(lines, cv_data.get("hobbies"))

    return "\n".join(lines).strip() + "\n"


def resume_to_html(record: ResumeRecord) -> str:
    """Render a persisted resume as standalone, script-free HTML."""
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    full_name = _text(profile.get("full_name")) or record.name
    title = _text(profile.get("title"))
    contacts = _contact_parts(profile)

    profile_html = _markdownish_html(_text(profile.get("text_markdown")))
    sections = [
        _html_section("Profile", profile_html),
        _experience_html(cv_data.get("experience")),
        _projects_html(cv_data.get("projects")),
        _skills_html(cv_data.get("skills")),
        _education_html(cv_data.get("education")),
        _languages_html(cv_data.get("languages")),
        _hobbies_html(cv_data.get("hobbies")),
    ]
    body_sections = "\n".join(section for section in sections if section)
    contact_html = ""
    if contacts:
        contact_html = (
            '<p class="contact">'
            + " <span>/</span> ".join(escape(part) for part in contacts)
            + "</p>"
        )

    return f"""<!doctype html>
<html lang="{escape(str(record.locale or 'en'))}">
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
      {f'<p class="title">{escape(title)}</p>' if title else ''}
      {contact_html}
    </header>
    {body_sections}
  </main>
</body>
</html>
"""


def resume_to_docx(record: ResumeRecord) -> bytes:
    """Render a persisted resume as a text-based DOCX document."""
    cv_data = _cv_data(record)
    profile = _mapping(cv_data.get("profile"))
    full_name = _text(profile.get("full_name")) or record.name
    title = _text(profile.get("title"))
    contacts = _contact_parts(profile)

    blocks: list[dict[str, Any]] = [{"style": "Title", "text": full_name}]
    if title:
        blocks.append({"style": "Subtitle", "text": title})
    if contacts:
        blocks.append({"style": "Contact", "text": " | ".join(contacts)})

    _docx_profile(blocks, _text(profile.get("text_markdown")))
    _docx_experience(blocks, cv_data.get("experience"))
    _docx_projects(blocks, cv_data.get("projects"))
    _docx_skills(blocks, cv_data.get("skills"))
    _docx_education(blocks, cv_data.get("education"))
    _docx_languages(blocks, cv_data.get("languages"))
    _docx_hobbies(blocks, cv_data.get("hobbies"))

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
    return buffer.getvalue()


def _cv_data(record: ResumeRecord) -> dict[str, Any]:
    data = load_json(record.data_json, {})
    return data if isinstance(data, dict) else {}


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


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


def _append_experience(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("company")) or _text(item.get("role"))
    ]
    if not items:
        return
    lines.extend(["", "## Experience"])
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


def _append_projects(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("name"))]
    if not items:
        return
    lines.extend(["", "## Projects"])
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


def _append_skills(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    groups = [
        (_text(item.get("category")), _string_items(item.get("skills")))
        for item in items
    ]
    groups = [(category, skills) for category, skills in groups if category or skills]
    if not groups:
        return
    lines.extend(["", "## Skills"])
    for category, skills in groups:
        label = category or "Skills"
        if skills:
            lines.append(f"- **{label}:** {', '.join(skills)}")
        else:
            lines.append(f"- **{label}**")


def _append_education(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("institution")) or _text(item.get("degree"))
    ]
    if not items:
        return
    lines.extend(["", "## Education"])
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


def _append_languages(lines: list[str], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    values = [
        _join_non_empty([_text(item.get("language")), _text(item.get("level"))], " - ")
        for item in items
    ]
    values = [value for value in values if value]
    if values:
        lines.extend(["", "## Languages", *[f"- {value}" for value in values]])


def _append_hobbies(lines: list[str], value: Any) -> None:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    if values:
        lines.extend(["", "## Interests", ", ".join(values)])


def _docx_profile(blocks: list[dict[str, Any]], content: str) -> None:
    if not content:
        return
    blocks.append({"style": "Heading1", "text": "Profile"})
    _docx_markdownish(blocks, content)


def _docx_experience(blocks: list[dict[str, Any]], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("company")) or _text(item.get("role"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": "Experience"})
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


def _docx_projects(blocks: list[dict[str, Any]], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [item for item in items if _text(item.get("name"))]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": "Projects"})
    for item in items:
        blocks.append({"style": "Heading2", "text": _text(item.get("name"))})
        url = _text(item.get("url"))
        if url:
            blocks.append({"style": "Meta", "text": url})
        _docx_markdownish(blocks, _text(item.get("description_markdown")))
        stack = _string_items(item.get("tech_stack"))
        if stack:
            blocks.append({"style": "Meta", "text": "Stack: " + ", ".join(stack)})


def _docx_skills(blocks: list[dict[str, Any]], value: Any) -> None:
    groups = [_mapping(item) for item in _items(value)]
    rows = []
    for item in groups:
        category = _text(item.get("category")) or "Skills"
        skills = _string_items(item.get("skills"))
        if category or skills:
            rows.append(f"{category}: {', '.join(skills)}" if skills else category)
    if rows:
        blocks.append({"style": "Heading1", "text": "Skills"})
        for row in rows:
            blocks.append({"style": "Bullet", "text": row})


def _docx_education(blocks: list[dict[str, Any]], value: Any) -> None:
    items = [_mapping(item) for item in _items(value)]
    items = [
        item
        for item in items
        if _text(item.get("institution")) or _text(item.get("degree"))
    ]
    if not items:
        return
    blocks.append({"style": "Heading1", "text": "Education"})
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


def _docx_languages(blocks: list[dict[str, Any]], value: Any) -> None:
    labels = [
        _join_non_empty(
            [_text(item.get("language")), _text(item.get("level"))],
            " - ",
        )
        for item in (_mapping(item) for item in _items(value))
    ]
    labels = [label for label in labels if label]
    if labels:
        blocks.append({"style": "Heading1", "text": "Languages"})
        for label in labels:
            blocks.append({"style": "Bullet", "text": label})


def _docx_hobbies(blocks: list[dict[str, Any]], value: Any) -> None:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    if values:
        blocks.append({"style": "Heading1", "text": "Interests"})
        blocks.append({"style": "Normal", "text": ", ".join(values)})


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


def _experience_html(value: Any) -> str:
    items = [_mapping(item) for item in _items(value)]
    cards = []
    for item in items:
        heading = _join_non_empty(
            [_text(item.get("role")), _text(item.get("company"))]
        )
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
    return _html_section("Experience", "\n  ".join(cards))


def _projects_html(value: Any) -> str:
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
    return _html_section("Projects", "\n  ".join(cards))


def _skills_html(value: Any) -> str:
    items = [_mapping(item) for item in _items(value)]
    rows = []
    for item in items:
        category = _text(item.get("category")) or "Skills"
        skills = _string_items(item.get("skills"))
        if category or skills:
            rows.append(
                f'<p><strong>{escape(category)}:</strong> '
                f'{escape(", ".join(skills))}</p>'
            )
    return _html_section("Skills", "\n  ".join(rows))


def _education_html(value: Any) -> str:
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
    return _html_section("Education", "\n  ".join(cards))


def _languages_html(value: Any) -> str:
    items = [_mapping(item) for item in _items(value)]
    labels = [
        _join_non_empty([_text(item.get("language")), _text(item.get("level"))], " - ")
        for item in items
    ]
    return _html_section("Languages", _list_html([label for label in labels if label]))


def _hobbies_html(value: Any) -> str:
    values = [item for item in _items(value) if isinstance(item, str) and item.strip()]
    return _html_section("Interests", _chips_html(values))


def _string_items(value: Any) -> list[str]:
    return [item for item in _items(value) if isinstance(item, str) and item.strip()]


def _meta_html(value: str) -> str:
    return f'<p class="meta">{escape(value)}</p>' if value else ""


def _chips_html(values: list[str]) -> str:
    if not values:
        return ""
    return '<div class="chips">' + "".join(
        f'<span class="chip">{escape(value)}</span>' for value in values
    ) + "</div>"


def _list_html(values: list[str]) -> str:
    if not values:
        return ""
    return "<ul>" + "".join(f"<li>{escape(value)}</li>" for value in values) + "</ul>"
