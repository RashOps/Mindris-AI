"""Company intelligence analysis for Mindris AI."""

from __future__ import annotations

import asyncio
import re
from urllib.parse import urlparse

from crewai import Agent, Crew, Process, Task
from pydantic import BaseModel, Field
from utils.logger import get_logger

from intelligence.llm_config import get_llm

logger = get_logger(__name__, service_name="intelligence")


class CompanyInsight(BaseModel):
    """Structured company intelligence shown in job insights."""

    name: str
    canonical_domain: str | None = None
    homepage_url: str | None = None
    careers_url: str | None = None
    industry: str = "Unknown"
    size: str = "Unknown"
    work_mode: str = "unknown"
    locations: list[str] = Field(default_factory=list)
    culture_values: list[str] = Field(default_factory=list)
    recent_news: list[str] = Field(default_factory=list)
    glassdoor_summary: str | None = None
    tech_stack_known: list[str] = Field(default_factory=list)
    role_fit: dict[str, list[str]] = Field(default_factory=dict)
    risk_flags: list[dict[str, str]] = Field(default_factory=list)
    evidence: dict[str, list[str]] = Field(default_factory=dict)
    provenance: dict[str, str] = Field(default_factory=dict)
    cache: dict[str, str] = Field(default_factory=dict)
    unavailable_reason: str | None = None


TECH_KEYWORDS = [
    "python",
    "fastapi",
    "bun",
    "next.js",
    "react",
    "docker",
    "kubernetes",
    "typescript",
    "postgres",
    "sqlite",
    "ollama",
]

CULTURE_KEYWORDS = [
    "ownership",
    "transparency",
    "async",
    "collaboration",
    "autonomy",
    "craft",
    "quality",
    "customer obsession",
]

INDUSTRY_RULES: list[tuple[str, str]] = [
    ("saas", "SaaS"),
    ("fintech", "Fintech"),
    ("health", "Healthtech"),
    ("developer tools", "Developer Tools"),
    ("ai", "AI Software"),
    ("data platform", "Data Platform"),
    ("e-commerce", "E-commerce"),
]

SIZE_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b1[- ]?10 employees\b|\bsmall team\b|\bstartup\b", re.I), "1-10"),
    (re.compile(r"\b11[- ]?50 employees\b|\bgrowing team\b", re.I), "11-50"),
    (re.compile(r"\b51[- ]?200 employees\b|\bmid[- ]size\b", re.I), "51-200"),
    (re.compile(r"\benterprise\b|\bglobal team\b|\b1000\+ employees\b", re.I), "1000+"),
]

WORK_MODE_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bremote[- ]first\b|\bfully remote\b|\bremote\b", re.I), "remote"),
    (re.compile(r"\bhybrid\b", re.I), "hybrid"),
    (re.compile(r"\bon[- ]site\b|\bonsite\b", re.I), "onsite"),
]


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        normalized = value.strip()
        key = normalized.lower()
        if not normalized or key in seen:
            continue
        seen.add(key)
        ordered.append(normalized)
    return ordered


def _extract_domain(source_url: str | None) -> str | None:
    if not source_url:
        return None
    parsed = urlparse(source_url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return None
    normalized = hostname[4:] if hostname.startswith("www.") else hostname
    parts = normalized.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return normalized


def _homepage_from_domain(domain: str | None) -> str | None:
    if not domain:
        return None
    return f"https://{domain}"


def _detect_keywords(text: str, candidates: list[str]) -> list[str]:
    lowered = text.lower()
    matches = [candidate for candidate in candidates if candidate.lower() in lowered]
    return _dedupe(matches)


def _flatten_cv_signals(cv_data: dict | None) -> dict[str, list[str]]:
    if not isinstance(cv_data, dict):
        return {"skills": [], "experience_titles": [], "experience_keywords": []}
    skill_values: list[str] = []
    for group in cv_data.get("skills", []):
        if isinstance(group, dict):
            skill_values.extend(
                skill for skill in group.get("skills", []) if isinstance(skill, str)
            )
    experience_titles = [
        item.get("role", "")
        for item in cv_data.get("experience", [])
        if isinstance(item, dict) and isinstance(item.get("role"), str)
    ]
    experience_keywords: list[str] = []
    for item in cv_data.get("experience", []):
        if isinstance(item, dict) and isinstance(
            item.get("description_markdown"), str
        ):
            experience_keywords.append(item["description_markdown"])
    for item in cv_data.get("projects", []):
        if isinstance(item, dict):
            experience_keywords.extend(
                value
                for value in item.get("tech_stack", [])
                if isinstance(value, str)
            )
    return {
        "skills": _dedupe(skill_values),
        "experience_titles": _dedupe(experience_titles),
        "experience_keywords": _dedupe(experience_keywords),
    }


def _build_role_fit(
    *,
    job_insights: dict | None,
    cv_data: dict | None,
    tech_stack: list[str],
    culture: list[str],
) -> dict[str, list[str]]:
    if not isinstance(job_insights, dict):
        return {
            "skills_to_foreground": [],
            "wording_to_mirror": [],
            "priority_experiences": [],
            "cv_emphasis": [],
            "cover_letter_emphasis": [],
        }

    cv_signals = _flatten_cv_signals(cv_data)
    job_hard = [
        value for value in job_insights.get("hard_skills", []) if isinstance(value, str)
    ]
    job_soft = [
        value for value in job_insights.get("soft_skills", []) if isinstance(value, str)
    ]
    job_terms = _dedupe(job_hard + job_soft)

    matched_skills = [
        term
        for term in job_hard
        if term.lower() in {skill.lower() for skill in cv_signals["skills"] + tech_stack}
    ]
    mirrored_terms = [
        term
        for term in job_terms
        if term.lower() in {value.lower() for value in culture + cv_signals["skills"]}
    ]
    priority_experiences = [
        title
        for title in cv_signals["experience_titles"]
        if any(token in title.lower() for token in ("engineer", "platform", "backend", "devops"))
    ]

    cv_emphasis = [
        f"Highlight {term} evidence in the top experience bullets." for term in matched_skills[:3]
    ]
    cover_letter_emphasis = [
        f"Mirror {term} in the recruiter-facing narrative." for term in mirrored_terms[:3]
    ]
    if culture:
        cover_letter_emphasis.append(
            f"Connect prior work style to {', '.join(culture[:2])}."
        )

    return {
        "skills_to_foreground": _dedupe(matched_skills),
        "wording_to_mirror": _dedupe(job_soft + culture),
        "priority_experiences": _dedupe(priority_experiences),
        "cv_emphasis": _dedupe(cv_emphasis),
        "cover_letter_emphasis": _dedupe(cover_letter_emphasis),
    }


def _build_risk_flags(
    *,
    job_insights: dict | None,
    cv_data: dict | None,
    work_mode: str,
    locations: list[str],
    tech_stack: list[str],
) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    if not isinstance(job_insights, dict):
        return flags

    cv_signals = _flatten_cv_signals(cv_data)
    cv_skill_set = {value.lower() for value in cv_signals["skills"] + tech_stack}
    for skill in job_insights.get("hard_skills", []):
        if isinstance(skill, str) and skill.lower() not in cv_skill_set:
            flags.append(
                {
                    "code": "missing_job_skill",
                    "severity": "medium",
                    "title": f"Missing {skill} evidence",
                    "detail": f"The target job mentions {skill} but it is not clearly surfaced in the CV signals.",
                    "provenance": "derived",
                }
            )
            break

    if work_mode == "unknown":
        flags.append(
            {
                "code": "missing_work_mode_signal",
                "severity": "low",
                "title": "Work mode unclear",
                "detail": "No explicit remote, hybrid, or onsite signal was found in deterministic company evidence.",
                "provenance": "unknown",
            }
        )
    if not locations:
        flags.append(
            {
                "code": "missing_location_signal",
                "severity": "low",
                "title": "Location context missing",
                "detail": "No reliable location signal was found for the company profile.",
                "provenance": "unknown",
            }
        )
    return flags


def _infer_industry(text: str) -> tuple[str, str]:
    lowered = text.lower()
    for needle, label in INDUSTRY_RULES:
        if needle in lowered:
            return label, "derived"
    return "Unknown", "unknown"


def _infer_size(text: str) -> tuple[str, str]:
    for pattern, label in SIZE_RULES:
        if pattern.search(text):
            return label, "derived"
    return "Unknown", "unknown"


def _infer_work_mode(text: str) -> tuple[str, str]:
    for pattern, label in WORK_MODE_RULES:
        if pattern.search(text):
            return label, "verified"
    return "unknown", "unknown"


async def analyze_company(
    company_name: str,
    provider: str = "groq",
    model_name: str = "llama-3.1-8b-instant",
    *,
    source_url: str | None = None,
    evidence_text: str | None = None,
    job_insights: dict | None = None,
    cv_data: dict | None = None,
    enable_llm_summary: bool = False,
) -> dict:
    """Analyze a company with deterministic local enrichment first."""
    name = company_name.strip()
    if not name:
        return CompanyInsight(
            name="Unknown",
            unavailable_reason="No company name was provided.",
        ).model_dump()

    source_snippets = [snippet for snippet in [source_url, evidence_text] if snippet]
    combined_text = " ".join([name, *source_snippets]).strip()
    canonical_domain = _extract_domain(source_url)
    homepage_url = _homepage_from_domain(canonical_domain)
    industry, industry_provenance = _infer_industry(combined_text)
    size, size_provenance = _infer_size(combined_text)
    work_mode, work_mode_provenance = _infer_work_mode(combined_text)
    tech_stack = _detect_keywords(combined_text, TECH_KEYWORDS)
    culture = _detect_keywords(combined_text, CULTURE_KEYWORDS)
    role_fit = _build_role_fit(
        job_insights=job_insights,
        cv_data=cv_data,
        tech_stack=tech_stack,
        culture=culture,
    )
    risk_flags = _build_risk_flags(
        job_insights=job_insights,
        cv_data=cv_data,
        work_mode=work_mode,
        locations=[],
        tech_stack=tech_stack,
    )

    deterministic = CompanyInsight(
        name=name,
        canonical_domain=canonical_domain,
        homepage_url=homepage_url,
        careers_url=source_url if source_url else None,
        industry=industry,
        size=size,
        work_mode=work_mode,
        locations=[],
        culture_values=culture,
        tech_stack_known=tech_stack,
        role_fit=role_fit,
        risk_flags=risk_flags,
        evidence={
            "name": [name],
            "canonical_domain": [source_url] if source_url else [],
            "homepage_url": [source_url] if source_url else [],
            "careers_url": [source_url] if source_url else [],
            "industry": [evidence_text] if evidence_text and industry != "Unknown" else [],
            "size": [evidence_text] if evidence_text and size != "Unknown" else [],
            "work_mode": [evidence_text] if evidence_text and work_mode != "unknown" else [],
            "tech_stack_known": [evidence_text] if evidence_text and tech_stack else [],
            "culture_values": [evidence_text] if evidence_text and culture else [],
            "locations": [],
        },
        provenance={
            "name": "verified",
            "canonical_domain": "verified" if canonical_domain else "unknown",
            "homepage_url": "derived" if homepage_url else "unknown",
            "careers_url": "verified" if source_url else "unknown",
            "industry": industry_provenance,
            "size": size_provenance,
            "work_mode": work_mode_provenance,
            "locations": "unknown",
            "tech_stack_known": "verified" if tech_stack else "unknown",
            "culture_values": "verified" if culture else "unknown",
        },
        cache={"strategy": "deterministic", "provider": "local", "freshness": "runtime"},
        unavailable_reason=(
            "Deterministic company profile only; no external company crawl evidence yet."
            if not evidence_text and not source_url
            else None
        ),
    )

    if not enable_llm_summary:
        return deterministic.model_dump()

    try:
        llm = get_llm(provider=provider, model_name=model_name)
        analyst = Agent(
            role="Company Research Analyst",
            goal="Summarize practical company intelligence for a job candidate.",
            backstory=(
                "You create concise, useful company briefings from your "
                "general knowledge. "
                "If recent facts are uncertain, say so instead of inventing details."
            ),
            llm=llm,
            allow_delegation=False,
            verbose=False,
        )
        task = Task(
            description=(
                f"Company: {name}\n\n"
                "Return a compact candidate-facing company briefing. "
                "Use only high-confidence information. "
                "If exact size, news, Glassdoor sentiment, or tech stack "
                "are unknown, use 'Unknown' or empty arrays."
            ),
            expected_output="A structured CompanyInsight JSON object.",
            output_pydantic=CompanyInsight,
            agent=analyst,
        )
        crew = Crew(agents=[analyst], tasks=[task], process=Process.sequential)
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, crew.kickoff)
        if hasattr(result, "pydantic") and result.pydantic:
            llm_payload = result.pydantic.model_dump()
            return {
                **deterministic.model_dump(),
                "industry": llm_payload.get("industry", deterministic.industry),
                "size": llm_payload.get("size", deterministic.size),
                "culture_values": _dedupe(
                    deterministic.culture_values + llm_payload.get("culture_values", [])
                ),
                "recent_news": llm_payload.get("recent_news", []),
                "glassdoor_summary": llm_payload.get("glassdoor_summary"),
                "tech_stack_known": _dedupe(
                    deterministic.tech_stack_known
                    + llm_payload.get("tech_stack_known", [])
                ),
                "cache": {
                    "strategy": "deterministic+llm",
                    "provider": provider,
                    "freshness": "runtime",
                },
                "role_fit": role_fit,
                "risk_flags": risk_flags,
            }
    except Exception as exc:
        logger.warning("Company analysis unavailable for %s: %s", name, exc)

    return deterministic.model_dump()
