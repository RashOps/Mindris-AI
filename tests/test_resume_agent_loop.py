"""Integration tests for the bounded proposal-render-review loop."""

from __future__ import annotations

import asyncio

from intelligence.resume_agent_loop import run_resume_patch_inspection
from intelligence.resume_context import build_resume_context_snapshot
from intelligence.resume_patches import (
    ResumePatchProposal,
    SetDesignTokenOperation,
)


def _snapshot():
    return build_resume_context_snapshot(
        resume_id=12,
        revision=3,
        locale="fr",
        template_id="modern",
        template_capabilities={"sidebar": True, "page_breaks": True},
        cv_data={
            "profile": {"title": "Engineer"},
            "skills": [{"name": "Stack", "skills": ["Python"]}],
            "global_settings": {
                "layout": {"density": "normal"},
                "colors": {"primary": "#2563eb"},
                "sections": [
                    {
                        "id": "experience",
                        "type": "experience",
                        "placement": "main",
                    },
                    {
                        "id": "skills",
                        "type": "skills",
                        "placement": "main",
                    },
                ],
            },
        },
    )


def test_loop_applies_at_most_one_renderer_correction_and_never_commits() -> None:
    calls: list[dict] = []

    async def render(cv_data, _snapshot):
        calls.append(cv_data)
        if len(calls) == 1:
            return {
                "manifest": {
                    "document": {"pageCount": 3, "overflow": True},
                    "sections": [
                        {"id": "experience", "overflow": True, "clipped": False}
                    ],
                    "warnings": [
                        {
                            "messageId": "renderer.section_overflow",
                            "severity": "error",
                        }
                    ],
                }
            }
        return {
            "manifest": {
                "document": {"pageCount": 2, "overflow": False},
                "sections": [],
                "warnings": [],
            }
        }

    snapshot = _snapshot()
    proposal = ResumePatchProposal(
        base_revision=3,
        reason="Improve visual hierarchy.",
        operations=[
            SetDesignTokenOperation(
                type="set_design_token",
                token="accent_color",
                value="#0f766e",
            )
        ],
    )
    result = asyncio.run(
        run_resume_patch_inspection(snapshot, proposal, render=render)
    )

    assert result.iterations == 2
    assert result.renderer_correction_applied is True
    assert result.requires_user_review is True
    assert result.committed is False
    assert result.manifest_after["document"]["pageCount"] == 2
    assert len(calls) == 2
    assert calls[1]["global_settings"]["layout"]["density"] == "compact"
    skills = next(
        section
        for section in calls[1]["global_settings"]["sections"]
        if section["id"] == "skills"
    )
    assert skills["placement"] == "sidebar"


def test_loop_stops_after_clean_first_render() -> None:
    async def render(cv_data, _snapshot):
        return {
            "manifest": {
                "document": {"pageCount": 1, "overflow": False},
                "sections": [],
                "warnings": [],
            }
        }

    result = asyncio.run(
        run_resume_patch_inspection(
            _snapshot(),
            ResumePatchProposal(
                base_revision=3,
                reason="Use project accent.",
                operations=[
                    SetDesignTokenOperation(
                        type="set_design_token",
                        token="accent_color",
                        value="#0f766e",
                    )
                ],
            ),
            render=render,
        )
    )

    assert result.iterations == 1
    assert result.renderer_correction_applied is False
