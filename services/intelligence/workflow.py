"""LangGraph workflow for Mindris AI RAG Pipeline.

Orchestrates the process of matching a Job Offer with the user's CV chunks,
drafting a tailored CV response, and scoring it against the job offer.

Each node emits SSE events via the event_bus so the frontend Ghost Mode
terminal can display real-time progress.
"""

from typing import TypedDict

from crewai import Agent, Crew, Process, Task
from database.models import JobOffer
from database.vector_store import MindrisVectorStore
from langgraph.graph import END, StateGraph

from intelligence.agents import MindrisAgents
from intelligence.event_bus import emit


# ── State Definition ─────────────────────────────────────────────────────────

class GraphState(TypedDict):
    """Represents the state of our RAG workflow."""
    job_offer: JobOffer           # The analyzed job offer
    provider: str                 # LLM Provider to use
    model_name: str               # LLM Model name
    retrieved_context: str        # Relevant chunks from the CV
    drafted_cv: str               # The drafted/tailored CV sections
    score: int                    # ATS/Matching score (0-100)
    iterations: int               # Number of drafting iterations
    job_id: str                   # SSE job identifier


# ── Node factory (receives job_id via closure) ────────────────────────────────

def make_nodes(job_id: str):
    """Return node functions bound to a specific SSE job_id."""

    def retrieve_context(state: GraphState) -> GraphState:
        """Retrieve relevant CV chunks from ChromaDB based on the Job Offer."""
        emit(job_id, "node_start", {
            "node": "retrieve",
            "icon": "🔍",
            "message": "Searching ChromaDB for relevant CV experiences…",
        })

        job = state["job_offer"]
        skills_str = ", ".join(job.hard_skills)
        query = f"{job.title} {skills_str}"

        store = MindrisVectorStore()
        results = store.search(query=query, k=5)

        context = ""
        for r in results:
            context += f"- {r['document']}\n"

        state["retrieved_context"] = context
        n = len(results)

        emit(job_id, "node_done", {
            "node": "retrieve",
            "icon": "✅",
            "message": f"Found {n} relevant CV chunk{'s' if n != 1 else ''}.",
        })
        return state

    def draft_cv(state: GraphState) -> GraphState:
        """Draft tailored CV bullet points using CrewAI."""
        iteration = state["iterations"] + 1
        emit(job_id, "node_start", {
            "node": "draft",
            "icon": "✍️",
            "message": f"Tailoring CV — Iteration {iteration}…",
        })

        agents_factory = MindrisAgents(
            provider=state["provider"], model_name=state["model_name"]
        )

        copywriter = Agent(
            role="Expert CV Copywriter",
            goal="Adapt the user's experiences to perfectly match the target job description.",
            backstory=(
                "You are a top-tier tech recruiter. Your job is to take a user's raw experiences "
                "and rewrite them into impactful bullet points tailored for a specific job offer."
            ),
            llm=agents_factory.llm,
            allow_delegation=False,
            verbose=False,
        )

        task = Task(
            description=(
                f"Job Offer Details:\nTitle: {state['job_offer'].title}\n"
                f"Required Skills: {', '.join(state['job_offer'].hard_skills)}\n\n"
                f"User's Relevant Experiences:\n{state['retrieved_context']}\n\n"
                "Task: Write 3 to 5 highly impactful bullet points for the user's CV that "
                "highlight their relevant skills for this specific job offer. "
                "Do not invent facts. Use only the provided user experiences."
            ),
            expected_output="A list of 3-5 tailored bullet points in Markdown format.",
            agent=copywriter,
        )

        crew = Crew(agents=[copywriter], tasks=[task], process=Process.sequential)
        result = crew.kickoff()

        state["drafted_cv"] = str(result.raw)
        state["iterations"] = iteration

        emit(job_id, "node_done", {
            "node": "draft",
            "icon": "✅",
            "message": f"Draft ready (iteration {iteration}).",
            "content": str(result.raw)[:300],  # snippet for terminal
        })
        return state

    def score_cv(state: GraphState) -> GraphState:
        """Score the drafted CV against the Job Offer."""
        emit(job_id, "node_start", {
            "node": "score",
            "icon": "⚖️",
            "message": "Evaluating ATS compatibility…",
        })

        agents_factory = MindrisAgents(
            provider=state["provider"], model_name=state["model_name"]
        )

        ats_scorer = Agent(
            role="ATS Scoring System",
            goal="Score the drafted CV bullet points against the job requirements.",
            backstory="You are an Applicant Tracking System. You only care about keyword matching and impact.",
            llm=agents_factory.llm,
            allow_delegation=False,
            verbose=False,
        )

        task = Task(
            description=(
                f"Job Required Skills: {', '.join(state['job_offer'].hard_skills)}\n"
                f"Drafted CV:\n{state['drafted_cv']}\n\n"
                "Task: Evaluate how well the drafted CV matches the required skills. "
                "Return ONLY a single integer between 0 and 100 representing the score."
            ),
            expected_output="A single integer between 0 and 100.",
            agent=ats_scorer,
        )

        crew = Crew(agents=[ats_scorer], tasks=[task], process=Process.sequential)
        result = crew.kickoff()

        try:
            score_text = str(result.raw).strip()
            score = int("".join(filter(str.isdigit, score_text)))
            score = min(max(score, 0), 100)
        except Exception:
            score = 50

        state["score"] = score

        emit(job_id, "node_done", {
            "node": "score",
            "icon": "🏅",
            "message": f"ATS Score: {score}/100",
            "score": score,
        })

        # ── Emit full structured result for Job Insights Panel ────────────────
        drafted_markdown = state.get("drafted_cv", "")
        bullets = [
            line.lstrip("•-* ").strip()
            for line in drafted_markdown.splitlines()
            if line.strip() and line.strip()[0] in ("-", "•", "*")
        ]
        emit(job_id, "job_result", {
            "job_title":       state["job_offer"].title,
            "company":         state["job_offer"].company,
            "hard_skills":     state["job_offer"].hard_skills,
            "soft_skills":     state["job_offer"].soft_skills,
            "drafted_bullets": bullets,
            "raw_markdown":    drafted_markdown,
            "score":           score,
        })

        return state

    return retrieve_context, draft_cv, score_cv


# ── Edges / Routing ──────────────────────────────────────────────────────────

def decide_next_step(state: GraphState) -> str:
    """Decide whether to finish or revise the draft."""
    if state["score"] >= 80 or state["iterations"] >= 3:
        return "end"
    return "revise"


# ── Workflow Setup ───────────────────────────────────────────────────────────

def create_rag_workflow(job_id: str = "") -> StateGraph:
    """Build and compile the LangGraph workflow.

    Args:
        job_id: SSE job identifier. If provided, each node will emit
                real-time events to the frontend Ghost Mode terminal.
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
