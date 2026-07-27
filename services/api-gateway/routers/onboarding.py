"""Backend-owned first-run checklist and progress state."""

from __future__ import annotations

import json
from typing import Annotated, Literal

from database.records import ResumeRecord, ScrapedJobRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from utils.config import settings
from utils.runtime_config import load_runtime_configuration

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])
SessionDep = Annotated[Session, Depends(get_session)]
STATE_PATH = settings.storage_dir / "onboarding-state.json"

STEPS = (
    ("runtime_ready", "/app", False),
    ("first_resume", "/dashboard", False),
    ("provider_selected", "/tools/cv-creator", True),
    ("provider_tested", "/tools/cv-creator", True),
    ("first_job", "/tools/cv-creator", True),
    ("first_export", "/tools/cv-creator", True),
)


class OnboardingStepUpdate(BaseModel):
    """One explicit user decision for a checklist step."""

    status: Literal["completed", "skipped", "pending"]


def _load_state() -> dict[str, str]:
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}
    steps = payload.get("steps", {}) if isinstance(payload, dict) else {}
    return {
        key: value
        for key, value in steps.items()
        if isinstance(key, str) and value in {"completed", "skipped"}
    }


def _save_state(steps: dict[str, str]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(
        json.dumps({"version": 1, "steps": steps}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(STATE_PATH)


def _evidence(session: Session) -> dict[str, bool]:
    defaults = load_runtime_configuration().get("defaults", {})
    return {
        "runtime_ready": True,
        "first_resume": bool(
            session.exec(select(func.count()).select_from(ResumeRecord)).one()
        ),
        "provider_selected": bool(defaults),
        "first_job": bool(
            session.exec(select(func.count()).select_from(ScrapedJobRecord)).one()
        ),
    }


def checklist_payload(session: Session) -> dict:
    """Resolve automatic evidence before applying explicit persisted decisions."""
    saved = _load_state()
    evidence = _evidence(session)
    items = []
    for step_id, href, skippable in STEPS:
        status = "completed" if evidence.get(step_id) else saved.get(step_id, "pending")
        items.append(
            {
                "id": step_id,
                "status": status,
                "href": href,
                "skippable": skippable,
            }
        )
    completed = sum(item["status"] in {"completed", "skipped"} for item in items)
    return {
        "status": "success",
        "item": {
            "version": 1,
            "recommended_mode": "local",
            "completed": completed,
            "total": len(items),
            "done": completed == len(items),
            "steps": items,
        },
    }


@router.get("")
def get_onboarding(session: SessionDep) -> dict:
    """Return the current backend-owned first-run checklist."""
    return checklist_payload(session)


@router.patch("/steps/{step_id}")
def update_onboarding_step(
    step_id: str,
    request: OnboardingStepUpdate,
    session: SessionDep,
) -> dict:
    """Persist one completion, skip or reset decision."""
    known = {item[0]: item for item in STEPS}
    if step_id not in known:
        raise HTTPException(status_code=404, detail="Unknown onboarding step.")
    if request.status == "skipped" and not known[step_id][2]:
        raise HTTPException(status_code=422, detail="This step cannot be skipped.")
    state = _load_state()
    if request.status == "pending":
        state.pop(step_id, None)
    else:
        state[step_id] = request.status
    _save_state(state)
    return checklist_payload(session)
