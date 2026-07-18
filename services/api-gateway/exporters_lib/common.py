"""Common helpers for resume exporters."""

import re
from typing import Any

from database.records import ResumeRecord
from persistence_lib.json import load_json

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


def _cv_data(record: ResumeRecord) -> dict[str, Any]:
    data = load_json(record.data_json, {})
    return data if isinstance(data, dict) else {}


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


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


def _string_items(value: Any) -> list[str]:
    return [item for item in _items(value) if isinstance(item, str) and item.strip()]
