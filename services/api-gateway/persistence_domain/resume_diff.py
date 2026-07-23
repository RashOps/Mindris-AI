"""Pure helpers for semantic resume revision comparisons."""

from typing import Any

from database.records import ResumeRevisionRecord


def diff_revision_metadata(
    base: ResumeRevisionRecord,
    target: ResumeRevisionRecord,
    changes: list[dict[str, Any]],
) -> None:
    """Append metadata changes shared by two resume revisions."""
    pairs = [
        ("name", base.name, target.name),
        ("templateId", base.template_id, target.template_id),
        ("locale", base.locale, target.locale),
        ("source", base.source, target.source),
        ("label", base.label, target.label),
    ]
    for path, before, after in pairs:
        if before == after:
            continue
        kind = "changed"
        if before in (None, "") and after not in (None, ""):
            kind = "added"
        elif before not in (None, "") and after in (None, ""):
            kind = "removed"
        changes.append({"path": path, "kind": kind, "before": before, "after": after})


def diff_values(
    path: str,
    before: Any,
    after: Any,
    changes: list[dict[str, Any]],
) -> None:
    """Recursively append value changes using stable item ids when present."""
    if before == after:
        return
    if isinstance(before, dict) and isinstance(after, dict):
        for key in sorted(set(before) | set(after)):
            nested_path = f"{path}.{key}" if path else key
            if key not in before:
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "added",
                        "before": None,
                        "after": after[key],
                    }
                )
            elif key not in after:
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "removed",
                        "before": before[key],
                        "after": None,
                    }
                )
            else:
                diff_values(nested_path, before[key], after[key], changes)
        return

    if isinstance(before, list) and isinstance(after, list):
        if all(isinstance(item, dict) and item.get("id") for item in before + after):
            before_map = {str(item["id"]): item for item in before}
            after_map = {str(item["id"]): item for item in after}
            for key in sorted(set(before_map) | set(after_map)):
                nested_path = f"{path}[{key}]" if path else f"[{key}]"
                if key not in before_map:
                    changes.append(
                        {
                            "path": nested_path,
                            "kind": "added",
                            "before": None,
                            "after": after_map[key],
                        }
                    )
                elif key not in after_map:
                    changes.append(
                        {
                            "path": nested_path,
                            "kind": "removed",
                            "before": before_map[key],
                            "after": None,
                        }
                    )
                else:
                    diff_values(
                        nested_path,
                        before_map[key],
                        after_map[key],
                        changes,
                    )
            return

        for index in range(max(len(before), len(after))):
            nested_path = f"{path}[{index}]"
            if index >= len(before):
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "added",
                        "before": None,
                        "after": after[index],
                    }
                )
            elif index >= len(after):
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "removed",
                        "before": before[index],
                        "after": None,
                    }
                )
            else:
                diff_values(nested_path, before[index], after[index], changes)
        return

    changes.append(
        {"path": path or "root", "kind": "changed", "before": before, "after": after}
    )


def section_diff_summary(
    before: dict[str, Any],
    after: dict[str, Any],
) -> list[dict[str, Any]]:
    """Summarize semantic changes for each supported resume section."""
    sections = [
        ("profile", "Profile"),
        ("experience", "Experience"),
        ("projects", "Projects"),
        ("certifications", "Certifications"),
        ("volunteering", "Volunteering"),
        ("publications", "Publications"),
        ("references", "References"),
        ("custom_sections", "Custom sections"),
        ("skills", "Skills"),
        ("education", "Education"),
        ("languages", "Languages"),
        ("hobbies", "Interests"),
    ]
    summaries: list[dict[str, Any]] = []
    for key, label in sections:
        before_value = before.get(key)
        after_value = after.get(key)
        before_count = section_count(before_value)
        after_count = section_count(after_value)
        status = "unchanged"
        if before_value != after_value:
            if before_count == 0 and after_count > 0:
                status = "added"
            elif before_count > 0 and after_count == 0:
                status = "removed"
            else:
                status = "changed"
        summaries.append(
            {
                "section": key,
                "label": label,
                "status": status,
                "beforeCount": before_count,
                "afterCount": after_count,
            }
        )
    return summaries


def section_count(value: Any) -> int:
    """Return a comparable cardinality for one resume section value."""
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return len(value)
    if isinstance(value, str):
        return 1 if value.strip() else 0
    return 0
