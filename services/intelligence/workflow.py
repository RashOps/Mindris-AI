"""LangGraph workflow for Mindris AI RAG Pipeline.

Orchestrates the process of matching a Job Offer with the user's CV chunks,
drafting a tailored CV response, and scoring it against the job offer.

Each node emits SSE events via the event_bus so the frontend Ghost Mode
terminal can display real-time progress.
"""

import json
from typing import Any, TypedDict

from crewai import Agent, Crew, Process, Task
from database.models import JobOffer
from database.vector_store import MindrisVectorStore
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, ValidationError
from utils.logger import get_logger

from intelligence.agents import MindrisAgents
from intelligence.event_bus import emit
from intelligence.workflow_models import (
    DraftResponse,
    EvidenceFact,
    ScoreFeedback,
    validate_evidence_matrix,
    validate_grounded_changes,
)

logger = get_logger(__name__, service_name="intelligence")


def _parse_model_output[ModelT: BaseModel](raw: str, model: type[ModelT]) -> ModelT:
    """Parse one strict JSON object, tolerating only a surrounding code fence."""
    candidate = raw.strip()
    if candidate.startswith("```") and candidate.endswith("```"):
        lines = candidate.splitlines()
        candidate = "\n".join(lines[1:-1]).strip()
    return model.model_validate_json(candidate)


def _result_model[ModelT: BaseModel](result: Any, model: type[ModelT]) -> ModelT:
    structured = getattr(result, "pydantic", None)
    if isinstance(structured, model):
        return structured
    if structured is not None:
        return model.model_validate(structured)
    return _parse_model_output(str(getattr(result, "raw", result)), model)


def parse_score_output(raw: str) -> tuple[ScoreFeedback | None, str]:
    """Parse evaluator output without inventing a fallback business score."""
    try:
        return _parse_model_output(raw, ScoreFeedback), ""
    except (ValidationError, ValueError, json.JSONDecodeError):
        return None, "The evaluator returned an invalid structured score."


# ── State Definition ─────────────────────────────────────────────────────────


class GraphState(TypedDict):
    """Represents the state of our RAG workflow."""

    job_offer: JobOffer  # The analyzed job offer
    provider: str  # LLM Provider to use
    model_name: str  # LLM Model name
    retrieved_context: str  # Relevant chunks from the CV
    drafted_cv: str  # The drafted/tailored CV sections
    score: int | None  # ATS/Matching score (0-100), or unavailable
    iterations: int  # Number of drafting iterations
    job_id: str  # SSE job identifier
    job_record_id: int | None  # Persisted scraped job ID
    source_url: str | None  # Persisted job source URL
    evidence_ledger: list[dict[str, Any]]
    evidence_matrix: list[dict[str, Any]]
    proposed_changes: list[dict[str, Any]]
    evaluation: dict[str, Any] | None
    warnings: list[str]
    resume_id: int | str | None
    resume_locale: str


# ── Node factory (receives job_id via closure) ────────────────────────────────


def make_nodes(job_id: str) -> tuple:
    """Return node functions bound to a specific SSE job_id."""

    def retrieve_context(state: GraphState) -> GraphState:
        """Retrieve relevant CV chunks from ChromaDB based on the Job Offer."""
        emit(
            job_id,
            "node_start",
            {
                "node": "retrieve",
                "message": "Searching ChromaDB for relevant CV experiences…",
            },
        )

        job = state["job_offer"]
        skills_str = ", ".join(job.hard_skills)
        soft_skills = ", ".join(job.soft_skills)
        responsibilities = ", ".join(getattr(job, "responsibilities", []))
        requirements = ", ".join(getattr(job, "must_have_requirements", []))
        query = (
            f"Role: {job.title}. Required technical skills: {skills_str}. "
            f"Expected interpersonal skills: {soft_skills}. "
            f"Responsibilities: {responsibilities}. Mandatory requirements: {requirements}."
        )

        store = MindrisVectorStore()
        resume_namespace = str(state.get("resume_id") or "current")
        resume_locale = state.get("resume_locale") or "fr"
        results = store.search(
            query=query,
            k=8,
            filter_dict={
                "$and": [
                    {"resume_id": {"$eq": resume_namespace}},
                    {"locale": {"$eq": resume_locale}},
                ]
            },
        )

        evidence_ledger = [
            EvidenceFact(
                id=f"fact_{index}",
                section_type=str(result.get("metadata", {}).get("type", "unknown")),
                source_id=str(result.get("metadata", {}).get("id") or result["id"]),
                text=result["document"],
                relevance=(
                    1 - float(result["distance"])
                    if result.get("distance") is not None
                    else None
                ),
            )
            for index, result in enumerate(results, start=1)
        ]
        context = "\n".join(
            f"[{fact.id}] ({fact.section_type}) {fact.text}" for fact in evidence_ledger
        )

        state["retrieved_context"] = context
        state["evidence_ledger"] = [
            fact.model_dump(mode="json") for fact in evidence_ledger
        ]
        n = len(results)

        emit(
            job_id,
            "node_done",
            {
                "node": "retrieve",
                "message": f"Found {n} relevant CV chunk{'s' if n != 1 else ''}.",
            },
        )
        return state

    def draft_cv(state: GraphState) -> GraphState:
        """Draft tailored CV bullet points using CrewAI."""
        iteration = state["iterations"] + 1
        emit(
            job_id,
            "node_start",
            {
                "node": "draft",
                "message": f"Tailoring CV — Iteration {iteration}…",
            },
        )

        agents_factory = MindrisAgents(
            provider=state["provider"], model_name=state["model_name"]
        )

        copywriter = Agent(
            role="Evidence-grounded resume strategist",
            goal="Propose precise CV changes supported by candidate facts.",
            backstory=(
                "You improve resumes across job families without fabricating skills, dates, "
                "employers, metrics, or responsibilities. Every change must cite source facts."
            ),
            llm=agents_factory.llm,
            allow_delegation=False,
            verbose=False,
        )

        previous_evaluation = state.get("evaluation") or {}
        revision_feedback = previous_evaluation.get("revision_instructions", [])
        task = Task(
            description=(
                f"Job Offer Details:\nTitle: {state['job_offer'].title}\n"
                f"Company: {state['job_offer'].company}\n"
                f"Required Skills: {', '.join(state['job_offer'].hard_skills)}\n"
                f"Soft Skills: {', '.join(state['job_offer'].soft_skills)}\n\n"
                f"Responsibilities: {json.dumps(getattr(state['job_offer'], 'responsibilities', []))}\n"
                f"Mandatory requirements: {json.dumps(getattr(state['job_offer'], 'must_have_requirements', []))}\n\n"
                f"Candidate fact ledger:\n{state['retrieved_context']}\n\n"
                f"Evaluator feedback from the previous iteration: {json.dumps(revision_feedback)}\n\n"
                "Return a JSON object matching the requested schema. Propose 3 to 5 targeted "
                "changes and build an evidence_matrix covering every hard skill and mandatory "
                "requirement. Mark requirements as missing rather than inventing evidence. "
                "Each change must identify its target section, preserve the original "
                "meaning, cite one or more fact IDs, and explain why it helps. Never invent "
                "facts or metrics. Put uncertainty in warnings."
            ),
            expected_output=(
                "A DraftResponse JSON object containing evidence_matrix, "
                "proposed_changes, and warnings."
            ),
            agent=copywriter,
            output_pydantic=DraftResponse,
        )

        crew = Crew(agents=[copywriter], tasks=[task], process=Process.sequential)
        result = crew.kickoff()

        warnings = list(state.get("warnings", []))
        try:
            draft = _result_model(result, DraftResponse)
        except (ValidationError, ValueError, json.JSONDecodeError):
            draft = DraftResponse()
            warnings.append("The writer returned an invalid structured draft.")

        evidence = [
            EvidenceFact.model_validate(fact)
            for fact in state.get("evidence_ledger", [])
        ]
        valid_changes, grounding_warnings = validate_grounded_changes(
            draft.proposed_changes,
            evidence,
        )
        valid_matches, matrix_warnings = validate_evidence_matrix(
            draft.evidence_matrix,
            evidence,
        )

        warnings.extend(grounding_warnings)
        warnings.extend(matrix_warnings)
        warnings.extend(draft.warnings)
        state["proposed_changes"] = [
            change.model_dump(mode="json") for change in valid_changes
        ]
        state["evidence_matrix"] = [
            match.model_dump(mode="json") for match in valid_matches
        ]
        state["drafted_cv"] = "\n".join(f"- {change.after}" for change in valid_changes)
        state["warnings"] = warnings
        state["iterations"] = iteration

        emit(
            job_id,
            "node_done",
            {
                "node": "draft",
                "message": f"Draft ready (iteration {iteration}).",
                "content": state["drafted_cv"][:300],
            },
        )
        return state

    def score_cv(state: GraphState) -> GraphState:
        """Score the drafted CV against the Job Offer."""
        emit(
            job_id,
            "node_start",
            {
                "node": "score",
                "message": "Evaluating ATS compatibility…",
            },
        )

        agents_factory = MindrisAgents(
            provider=state["provider"], model_name=state["model_name"]
        )

        ats_scorer = Agent(
            role="Resume evidence evaluator",
            goal="Evaluate job alignment, evidence quality, and writing clarity.",
            backstory=(
                "You evaluate proposed resume changes conservatively. Missing candidate "
                "evidence lowers the score and must be reported, never fabricated."
            ),
            llm=agents_factory.llm,
            allow_delegation=False,
            verbose=False,
        )

        task = Task(
            description=(
                f"Job Required Skills: {', '.join(state['job_offer'].hard_skills)}\n"
                f"Proposed changes: {json.dumps(state.get('proposed_changes', []))}\n"
                f"Evidence matrix: {json.dumps(state.get('evidence_matrix', []))}\n"
                f"Evidence ledger: {json.dumps(state.get('evidence_ledger', []))}\n\n"
                "Return a JSON object matching ScoreFeedback. Score keyword alignment, "
                "evidence quality, and clarity separately. Give actionable revision "
                "instructions when the overall score is below 80."
            ),
            expected_output="A ScoreFeedback JSON object.",
            agent=ats_scorer,
            output_pydantic=ScoreFeedback,
        )

        crew = Crew(agents=[ats_scorer], tasks=[task], process=Process.sequential)
        result = crew.kickoff()

        warning = ""
        try:
            evaluation = _result_model(result, ScoreFeedback)
        except (ValidationError, ValueError, json.JSONDecodeError):
            evaluation, warning = parse_score_output(
                str(getattr(result, "raw", result))
            )

        score = evaluation.score if evaluation is not None else None
        state["score"] = score
        state["evaluation"] = (
            evaluation.model_dump(mode="json") if evaluation is not None else None
        )
        if warning:
            state.setdefault("warnings", []).append(warning)

        emit(
            job_id,
            "node_done",
            {
                "node": "score",
                "message": (
                    f"ATS Score: {score}/100"
                    if score is not None
                    else "ATS score unavailable: invalid evaluator output."
                ),
                "score": score,
            },
        )

        # ── Emit full structured result for Job Insights Panel ────────────────
        drafted_markdown = state.get("drafted_cv", "")
        bullets = [
            line.lstrip("•-* ").strip()
            for line in drafted_markdown.splitlines()
            if line.strip() and line.strip()[0] in ("-", "•", "*")
        ]
        emit(
            job_id,
            "job_result",
            {
                "job_title": state["job_offer"].title,
                "company": state["job_offer"].company,
                "job_id": state.get("job_record_id"),
                "job_record_id": state.get("job_record_id"),
                "source_url": state.get("source_url"),
                "hard_skills": state["job_offer"].hard_skills,
                "soft_skills": state["job_offer"].soft_skills,
                "responsibilities": getattr(state["job_offer"], "responsibilities", []),
                "must_have_requirements": getattr(
                    state["job_offer"], "must_have_requirements", []
                ),
                "drafted_bullets": bullets,
                "raw_markdown": drafted_markdown,
                "score": score,
                "evidence_ledger": state.get("evidence_ledger", []),
                "evidence_matrix": state.get("evidence_matrix", []),
                "proposed_changes": state.get("proposed_changes", []),
                "evaluation": state.get("evaluation"),
                "warnings": state.get("warnings", []),
                "requires_user_review": True,
            },
        )

        return state

    return retrieve_context, draft_cv, score_cv


# ── Edges / Routing ──────────────────────────────────────────────────────────


def decide_next_step(state: GraphState) -> str:
    """Decide whether to finish or revise the draft."""
    if state.get("score") is None:
        return "end"
    if state["score"] >= 80 or state["iterations"] >= 3:
        return "end"
    return "revise"


# ── Workflow Setup ───────────────────────────────────────────────────────────


def create_rag_workflow(job_id: str = "") -> StateGraph:
    """Build and compile the LangGraph workflow.

    Args:
        job_id: SSE job identifier. If provided, each node will emit
                real-time events to the frontend Ghost Mode terminal.

    Returns:
        A compiled :class:`langgraph.graph.StateGraph` ready to be invoked.
    """
    retrieve_context, draft_cv, score_cv = make_nodes(job_id)

    workflow = StateGraph(GraphState)
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("draft", draft_cv)
    workflow.add_node("score", score_cv)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "draft")
    workflow.add_edge("draft", "score")
    workflow.add_conditional_edges(
        "score",
        decide_next_step,
        {"end": END, "revise": "draft"},
    )

    return workflow.compile()
