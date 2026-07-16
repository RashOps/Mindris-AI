"""DOCX resume and Markdown exporters."""

from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape as xml_escape
from zipfile import ZIP_DEFLATED, ZipFile

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

def markdown_to_docx(markdown: str, *, title: str = "Document") -> bytes:
    """Render freeform Markdown as a simple text-based DOCX document."""
    document_title = title.strip() or "Document"
    blocks: list[dict[str, Any]] = [{"style": "Title", "text": document_title}]
    _docx_markdownish(blocks, markdown)
    document_xml = _docx_document_xml(blocks)
    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", _docx_content_types())
        docx.writestr("_rels/.rels", _docx_root_rels())
        docx.writestr("word/_rels/document.xml.rels", _docx_document_rels())
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", _docx_styles())
        docx.writestr("docProps/core.xml", _docx_core_props(document_title))
        docx.writestr("docProps/app.xml", _docx_app_props())
    rendered = buffer.getvalue()
    logger.debug("Rendered Markdown DOCX (%d bytes)", len(rendered))
    return rendered

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
