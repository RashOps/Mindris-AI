"""Integration tests for the permissioned resume agent tool registry."""

from __future__ import annotations

import asyncio
from contextlib import suppress

from database.records import AgentToolAuditRecord
from database.session import SessionLocal, init_db
from intelligence.resume_context import AgentTask
from persistence_domain.resumes import create_resume, serialize_resume
from resume_agent_tools import (
    ToolInvocationRequest,
    _masked,
    invoke_agent_tool,
    list_agent_tools,
)
from sqlalchemy import select


def _resume_payload() -> dict:
    return {
        "global_settings": {
            "template_id": "modern",
            "sections": [
                {
                    "id": "experience",
                    "type": "experience",
                    "label": "Expérience",
                    "placement": "main",
                    "visible": True,
                },
                {
                    "id": "skills",
                    "type": "skills",
                    "label": "Compétences",
                    "placement": "sidebar",
                    "visible": True,
                },
            ],
        },
        "profile": {
            "full_name": "Ada Lovelace",
            "title": "Ingénieure",
            "email": "ada@example.com",
            "phone": "",
            "location": {"city": "Paris", "country": "France"},
            "socials": [],
            "text_markdown": "Conçoit des systèmes fiables.",
        },
        "experience": [
            {
                "id": "exp-1",
                "company": "Example",
                "role": "Engineer",
                "period": "2024",
                "location": {"city": "Paris", "country": "France"},
                "description_markdown": "",
                "bullets": ["Réduction de la latence de 30 %."],
            }
        ],
        "education": [],
        "skills": [{"name": "Langages", "skills": ["Python"]}],
        "projects": [],
        "languages": [],
        "hobbies": [],
        "certifications": [],
        "volunteering": [],
        "publications": [],
        "references": [],
        "custom_sections": [],
    }


def _create_resume() -> tuple[int, int]:
    init_db()
    with SessionLocal() as session:
        record = create_resume(
            session,
            name="Agent tools CV",
            cv_data=_resume_payload(),
            template_id="modern",
            locale="fr",
        )
        item = serialize_resume(session, record)
        return int(item["id"]), int(item["revision"])


def test_registry_exposes_exactly_the_ten_allowed_tools() -> None:
    assert {item["name"] for item in list_agent_tools()} == {
        "get_resume_snapshot",
        "get_resume_section",
        "get_job_context",
        "search_resume_evidence",
        "propose_resume_patch",
        "validate_resume_patch",
        "render_resume_preview",
        "inspect_resume_render",
        "compare_resume_revisions",
        "commit_resume_revision",
    }
    assert all(item["input_schema"] for item in list_agent_tools())
    assert _masked(
        {
            "api_key": "secret",
            "nested": {"authorization": "Bearer secret"},
        }
    ) == {
        "api_key": "[REDACTED]",
        "nested": {"authorization": "[REDACTED]"},
    }


def test_tool_requires_permission_and_writes_audit_event() -> None:
    resume_id, revision = _create_resume()
    request = ToolInvocationRequest(
        actor="test_agent",
        arguments={
            "resume_id": resume_id,
            "revision": revision,
            "task": AgentTask.ATS,
        },
    )
    with SessionLocal() as session:
        try:
            asyncio.run(
                invoke_agent_tool(
                    session,
                    tool_name="get_resume_snapshot",
                    request=request,
                    granted_permissions=set(),
                )
            )
        except PermissionError:
            pass
        else:
            raise AssertionError("permission check did not reject the invocation")

        result = asyncio.run(
            invoke_agent_tool(
                session,
                tool_name="get_resume_snapshot",
                request=request,
                granted_permissions={"resume:read"},
            )
        )
        audit = session.exec(
            select(AgentToolAuditRecord)
            .where(AgentToolAuditRecord.resume_id == resume_id)
            .order_by(AgentToolAuditRecord.id.desc())
        ).first()

    assert result["item"]["revision"] == revision
    assert result["item"]["identity"]["full_name"] == ""
    assert audit is not None
    assert audit.tool_name == "get_resume_snapshot"
    assert audit.status == "success"


def test_denied_and_oversized_tool_calls_are_audited() -> None:
    resume_id, revision = _create_resume()
    with SessionLocal() as session:
        with suppress(PermissionError):
            asyncio.run(
                invoke_agent_tool(
                    session,
                    tool_name="get_resume_snapshot",
                    request=ToolInvocationRequest(
                        actor="restricted_agent",
                        arguments={
                            "resume_id": resume_id,
                            "revision": revision,
                        },
                    ),
                    granted_permissions=set(),
                )
            )

        with suppress(ValueError):
            asyncio.run(
                invoke_agent_tool(
                    session,
                    tool_name="get_resume_snapshot",
                    request=ToolInvocationRequest(
                        actor="oversized_agent",
                        arguments={
                            "resume_id": resume_id,
                            "revision": revision,
                            "locale": "x" * (300 * 1024),
                        },
                    ),
                    granted_permissions={"resume:read"},
                )
            )

        audit = session.exec(
            select(AgentToolAuditRecord)
            .where(AgentToolAuditRecord.resume_id == resume_id)
            .order_by(AgentToolAuditRecord.id.desc())
        ).first()

    assert audit is not None
    assert audit.status == "error"
    assert audit.actor == "oversized_agent"
    assert audit.input_size > 256 * 1024


def test_proposal_requires_human_approval_and_supports_partial_commit() -> None:
    resume_id, revision = _create_resume()
    with SessionLocal() as session:
        snapshot_response = asyncio.run(
            invoke_agent_tool(
                session,
                tool_name="get_resume_snapshot",
                request=ToolInvocationRequest(
                    arguments={
                        "resume_id": resume_id,
                        "revision": revision,
                        "task": "strategy",
                    }
                ),
                granted_permissions={"resume:read"},
            )
        )
        evidence = next(
            item
            for item in snapshot_response["item"]["evidence_registry"]
            if item["path"].endswith(".bullets[0]")
        )
        proposal = {
            "base_revision": revision,
            "reason": "Clarifier un résultat mesuré.",
            "operations": [
                {
                    "type": "rewrite_bullet",
                    "operation_id": "op_rewrite",
                    "section": "experience",
                    "item_index": 0,
                    "bullet_index": 0,
                    "value": "Latence réduite de 30 %.",
                    "evidence_ids": [evidence["id"]],
                },
                {
                    "type": "set_design_token",
                    "operation_id": "op_color",
                    "token": "accent_color",
                    "value": "#0f766e",
                },
            ],
        }
        proposed = asyncio.run(
            invoke_agent_tool(
                session,
                tool_name="propose_resume_patch",
                request=ToolInvocationRequest(
                    arguments={
                        "resume_id": resume_id,
                        "revision": revision,
                        "proposal": proposal,
                    }
                ),
                granted_permissions={"resume:propose"},
            )
        )
        proposal_id = proposed["item"]["id"]

        committed = asyncio.run(
            invoke_agent_tool(
                session,
                tool_name="commit_resume_revision",
                request=ToolInvocationRequest(
                    arguments={
                        "resume_id": resume_id,
                        "proposal_id": proposal_id,
                        "base_revision": revision,
                        "accepted_operation_ids": ["op_rewrite"],
                        "human_approved": True,
                    }
                ),
                granted_permissions={"resume:commit"},
            )
        )

    assert committed["created_revision"] == revision + 1
    assert committed["item"]["cvData"]["experience"][0]["bullets"] == [
        "Latence réduite de 30 %."
    ]
    assert (
        committed["item"]["cvData"]["global_settings"]["colors"]["primary"] != "#0f766e"
    )
