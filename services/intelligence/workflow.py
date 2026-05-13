"""LangGraph workflow for Mindris AI RAG Pipeline.

Orchestrates the process of matching a Job Offer with the user's CV chunks,
drafting a tailored CV response, and scoring it against the job offer.
"""

from typing import TypedDict

from crewai import Agent, Crew, Process, Task
from database.models import JobOffer
from database.vector_store import MindrisVectorStore
from langgraph.graph import END, StateGraph

from intelligence.agents import MindrisAgents

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


# ── Nodes ────────────────────────────────────────────────────────────────────

def retrieve_context(state: GraphState) -> GraphState:
    """Retrieve relevant CV chunks from ChromaDB based on the Job Offer."""
    print("🔍 [Node: Retrieval] Searching ChromaDB for relevant CV experiences...")

    job = state["job_offer"]
    # Create a query based on the job title and hard skills
    skills_str = ", ".join(job.hard_skills)
    query = f"{job.title} {skills_str}"

    store = MindrisVectorStore()
    results = store.search(query=query, k=5)

    context = ""
    for r in results:
        context += f"- {r['document']}\n"

    state["retrieved_context"] = context
    print(f"✅ [Node: Retrieval] Found {len(results)} relevant chunks.")
    return state


def draft_cv(state: GraphState) -> GraphState:
    """Draft tailored CV bullet points using CrewAI."""
    print(f"✍️  [Node: Drafting] Tailoring CV (Iteration {state['iterations'] + 1})...")

    agents_factory = MindrisAgents(provider=state["provider"], model_name=state["model_name"])

    # We create an ad-hoc Copywriter agent for this specific task
    copywriter = Agent(
        role="Expert CV Copywriter",
        goal="Adapt the user's experiences to perfectly match the target job description.",
        backstory=(
            "You are a top-tier tech recruiter. Your job is to take a user's raw experiences "
            "and rewrite them into impactful bullet points tailored for a specific job offer."
        ),
        llm=agents_factory.llm,
        allow_delegation=False,
        verbose=True,
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
    state["iterations"] += 1
    print("✅ [Node: Drafting] CV tailored.")
    return state


def score_cv(state: GraphState) -> GraphState:
    """Score the drafted CV against the Job Offer."""
    print("⚖️  [Node: Scoring] Evaluating ATS compatibility...")

    agents_factory = MindrisAgents(provider=state["provider"], model_name=state["model_name"])

    ats_scorer = Agent(
        role="ATS Scoring System",
        goal="Score the drafted CV bullet points against the job requirements.",
        backstory="You are an Applicant Tracking System. You only care about keyword matching and impact.",
        llm=agents_factory.llm,
        allow_delegation=False,
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
        # Extract the integer from the raw text
        score_text = str(result.raw).strip()
        score = int(''.join(filter(str.isdigit, score_text)))
        state["score"] = score
    except Exception:
        state["score"] = 50  # Default if parsing fails

    print(f"✅ [Node: Scoring] Score: {state['score']}/100")
    return state


# ── Edges / Routing ──────────────────────────────────────────────────────────

def decide_next_step(state: GraphState) -> str:
    """Decide whether to finish or revise the draft."""
    if state["score"] >= 80 or state["iterations"] >= 3:
        print(f"🏁 [Router] Acceptable score ({state['score']}) or max iterations reached. Finishing.")
        return "end"
    print(f"🔄 [Router] Score too low ({state['score']}). Revising...")
    return "revise"


# ── Workflow Setup ───────────────────────────────────────────────────────────

def create_rag_workflow() -> StateGraph:
    """Build and compile the LangGraph workflow."""
    workflow = StateGraph(GraphState)

    # Add nodes
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("draft", draft_cv)
    workflow.add_node("score", score_cv)

    # Add edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "draft")
    workflow.add_edge("draft", "score")

    # Conditional edge from score
    workflow.add_conditional_edges(
        "score",
        decide_next_step,
        {
            "end": END,
            "revise": "draft"
        }
    )

    return workflow.compile()
