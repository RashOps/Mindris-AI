"""Renderer-aware composition proposals that never generate raw CSS."""

from __future__ import annotations

from intelligence.resume_context import ResumeContextSnapshot
from intelligence.resume_patches import (
    ExpectedPatchEffects,
    MoveSectionOperation,
    ResumePatchProposal,
    SetDensityOperation,
    SetPageBreakOperation,
)


def propose_composition_patch(
    snapshot: ResumeContextSnapshot,
    manifest: dict,
) -> ResumePatchProposal | None:
    """Propose bounded layout operations from measured renderer evidence."""
    document = manifest.get("document", {})
    sections = manifest.get("sections", [])
    warnings = manifest.get("warnings", [])
    page_count = int(document.get("pageCount") or 1)
    overflow = bool(document.get("overflow")) or any(
        warning.get("severity") == "error"
        for warning in warnings
        if isinstance(warning, dict)
    )
    if not overflow and page_count <= 2:
        return None

    operations = [
        SetDensityOperation(type="set_density", density="compact"),
    ]
    sidebar_supported = bool(snapshot.template.capabilities.get("sidebar"))
    section_ids = {
        str(section.get("id"))
        for section in snapshot.normalized_settings.get("sections", [])
        if isinstance(section, dict)
    }
    if sidebar_supported and "skills" in section_ids:
        operations.append(
            MoveSectionOperation(
                type="move_section",
                section_id="skills",
                placement="sidebar",
                position=0,
            )
        )
    overflowing = next(
        (
            str(section.get("id"))
            for section in sections
            if isinstance(section, dict)
            and (section.get("overflow") or section.get("clipped"))
            and str(section.get("id")) in section_ids
        ),
        None,
    )
    if (
        overflowing
        and snapshot.template.capabilities.get("page_breaks")
        and page_count > 2
    ):
        operations.append(
            SetPageBreakOperation(
                type="set_page_break",
                section_id=overflowing,
                before=True,
            )
        )
    return ResumePatchProposal(
        base_revision=max(1, snapshot.revision),
        reason="agent.composition.reduce_overflow",
        operations=operations,
        expected_effects=ExpectedPatchEffects(
            page_count=max(1, min(2, page_count)),
            target_score="maintained",
            visual_impact="agent.composition.compact_layout",
        ),
    )

