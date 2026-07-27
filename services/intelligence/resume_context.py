"""Canonical, versioned context shared by every resume-aware agent."""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SNAPSHOT_SCHEMA_VERSION = "1"
IDENTITY_FIELDS = frozenset(
    {
        "full_name",
        "first_name",
        "last_name",
        "email",
        "phone",
        "address",
        "photo_url",
    }
)


class FrozenDict(dict):
    """JSON-compatible mapping that rejects mutation after construction."""

    def _immutable(self, *_args: Any, **_kwargs: Any) -> None:
        raise TypeError("Resume context snapshots are immutable.")

    __setitem__ = _immutable
    __delitem__ = _immutable
    clear = _immutable
    pop = _immutable
    popitem = _immutable
    setdefault = _immutable
    update = _immutable


def freeze_json(value: Any) -> Any:
    """Recursively freeze JSON-compatible containers."""
    if isinstance(value, dict):
        return FrozenDict(
            {key: freeze_json(item) for key, item in value.items()}
        )
    if isinstance(value, list | tuple):
        return tuple(freeze_json(item) for item in value)
    return value


def thaw_json(value: Any) -> Any:
    """Return a mutable deep copy of a frozen JSON value."""
    if isinstance(value, dict):
        return {key: thaw_json(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [thaw_json(item) for item in value]
    return deepcopy(value)


class AgentTask(StrEnum):
    """Supported views over a canonical resume snapshot."""

    ATS = "ats"
    COVER_LETTER = "cover_letter"
    WORKFLOW = "workflow"
    STRATEGY = "strategy"
    EVALUATION = "evaluation"
    COMPOSITION = "composition"


class ResumeIdentity(BaseModel):
    """Identity kept separate so cloud tasks can omit it safely."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    full_name: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    title: str = ""


class ResumeJobContext(BaseModel):
    """Job facts attached to the run, never inferred from resume content."""

    model_config = ConfigDict(frozen=True, extra="allow")

    id: int | None = None
    title: str = ""
    company: str = ""
    source_url: str | None = None
    hard_skills: tuple[str, ...] = ()
    soft_skills: tuple[str, ...] = ()
    description: str = ""


class ResumeTemplateContext(BaseModel):
    """Renderer template selected for the source revision."""

    model_config = ConfigDict(frozen=True, extra="allow")

    id: str = "modern"
    contract_version: str = "2"
    capabilities: dict[str, Any] = Field(default_factory=dict)

    def model_post_init(self, __context: Any) -> None:
        """Freeze the renderer capability map."""
        object.__setattr__(
            self,
            "capabilities",
            freeze_json(self.capabilities),
        )


class ResumeEvidence(BaseModel):
    """One addressable fact copied verbatim from the source CV."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str
    path: str
    value: str
    kind: Literal["identity", "fact", "content"] = "fact"


class ResumePrivacyPolicy(BaseModel):
    """Privacy decision applied to the payload passed to an agent."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    execution: Literal["local", "cloud"] = "local"
    identity_included: bool = True
    pseudonymized: bool = False
    external_provider: str | None = None


class ResumeContextSnapshot(BaseModel):
    """Immutable source-of-truth view for one agent run."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    resume_id: int | None = None
    identity: ResumeIdentity
    revision: int = Field(ge=0)
    content_hash: str
    schema_version: str = SNAPSHOT_SCHEMA_VERSION
    locale: str = "fr"
    semantic_content: dict[str, Any]
    job_context: ResumeJobContext | None = None
    template: ResumeTemplateContext
    normalized_settings: dict[str, Any] = Field(default_factory=dict)
    render_manifest: dict[str, Any] | None = None
    evidence_registry: tuple[ResumeEvidence, ...] = ()
    privacy_policy: ResumePrivacyPolicy

    def model_post_init(self, __context: Any) -> None:
        """Freeze every nested payload after Pydantic validation."""
        object.__setattr__(
            self,
            "semantic_content",
            freeze_json(self.semantic_content),
        )
        object.__setattr__(
            self,
            "normalized_settings",
            freeze_json(self.normalized_settings),
        )
        object.__setattr__(
            self,
            "render_manifest",
            freeze_json(self.render_manifest),
        )

    def evidence(self, evidence_id: str) -> ResumeEvidence | None:
        """Resolve one fact without exposing storage or arbitrary lookup."""
        return next(
            (fact for fact in self.evidence_registry if fact.id == evidence_id),
            None,
        )

    def evidence_text(
        self,
        *,
        include_identity: bool = False,
        limit: int = 300,
    ) -> str:
        """Render bounded source facts for prompts while preserving citations."""
        facts = (
            fact
            for fact in self.evidence_registry
            if include_identity or fact.kind != "identity"
        )
        return "\n".join(
            f"[{fact.id}] {fact.path}: {fact.value}"
            for index, fact in enumerate(facts)
            if index < limit
        )

    def for_task(
        self,
        task: AgentTask,
        *,
        external_provider: str | None = None,
    ) -> ResumeContextSnapshot:
        """Return a task-safe copy while preserving revision and content hash."""
        identity_required = task is AgentTask.COVER_LETTER
        cloud = bool(external_provider)
        include_identity = identity_required and not cloud
        semantic = thaw_json(self.semantic_content)
        _remove_identity_values(semantic)
        evidence = tuple(
            fact for fact in self.evidence_registry if fact.kind != "identity"
        )
        return ResumeContextSnapshot.model_validate(
            {
                **self.model_dump(mode="python"),
                "identity": self.identity if include_identity else ResumeIdentity(),
                "semantic_content": semantic,
                "evidence_registry": evidence,
                "privacy_policy": ResumePrivacyPolicy(
                    execution="cloud" if cloud else "local",
                    identity_included=include_identity,
                    pseudonymized=cloud,
                    external_provider=external_provider,
                ),
            }
        )


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _fact_id(path: str, value: str) -> str:
    digest = hashlib.sha256(f"{path}\0{value}".encode()).hexdigest()[:16]
    return f"fact_{digest}"


def _is_identity_path(path: str) -> bool:
    leaf = path.rsplit(".", 1)[-1].split("[", 1)[0]
    return leaf in IDENTITY_FIELDS


def _extract_evidence(value: Any, path: str = "$") -> tuple[ResumeEvidence, ...]:
    facts: list[ResumeEvidence] = []
    if isinstance(value, dict):
        for key in sorted(value):
            facts.extend(_extract_evidence(value[key], f"{path}.{key}"))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            facts.extend(_extract_evidence(item, f"{path}[{index}]"))
    elif isinstance(value, (str, int, float, bool)) and str(value).strip():
        text = str(value).strip()
        facts.append(
            ResumeEvidence(
                id=_fact_id(path, text),
                path=path,
                value=text,
                kind="identity" if _is_identity_path(path) else "fact",
            )
        )
    return tuple(facts)


def _remove_identity_values(value: Any) -> None:
    if isinstance(value, dict):
        for key in tuple(value):
            if key in IDENTITY_FIELDS:
                value.pop(key, None)
            else:
                _remove_identity_values(value[key])
    elif isinstance(value, list):
        for item in value:
            _remove_identity_values(item)


def build_resume_context_snapshot(
    *,
    cv_data: dict[str, Any],
    revision: int,
    resume_id: int | None = None,
    locale: str = "fr",
    template_id: str = "modern",
    normalized_settings: dict[str, Any] | None = None,
    template_capabilities: dict[str, Any] | None = None,
    render_manifest: dict[str, Any] | None = None,
    job_context: dict[str, Any] | None = None,
) -> ResumeContextSnapshot:
    """Build the only canonical agent context from a persisted resume revision."""
    semantic = deepcopy(cv_data)
    profile = semantic.get("profile", {})
    if not isinstance(profile, dict):
        profile = {}
    identity = ResumeIdentity(
        full_name=str(profile.get("full_name", "")),
        email=str(profile.get("email", "")),
        phone=str(profile.get("phone", "")),
        address=str(profile.get("address", "")),
        title=str(profile.get("title", "")),
    )
    stable_content = _stable_json(semantic)
    return ResumeContextSnapshot(
        resume_id=resume_id,
        identity=identity,
        revision=revision,
        content_hash=hashlib.sha256(stable_content.encode()).hexdigest(),
        locale=locale,
        semantic_content=semantic,
        job_context=(
            ResumeJobContext.model_validate(job_context) if job_context else None
        ),
        template=ResumeTemplateContext(
            id=template_id,
            capabilities=deepcopy(template_capabilities or {}),
        ),
        normalized_settings=deepcopy(
            normalized_settings
            if normalized_settings is not None
            else semantic.get("global_settings", {})
        ),
        render_manifest=deepcopy(render_manifest),
        evidence_registry=_extract_evidence(semantic),
        privacy_policy=ResumePrivacyPolicy(),
    )
