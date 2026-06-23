"""Manual CrewAI/Ollama integration smoke test.

Run explicitly with: RUN_LLM_TESTS=1 uv run pytest test_llm.py -q -s
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LLM_TESTS") != "1",
    reason="LLM integration tests require a running local model.",
)


def test_crewai_ollama_smoke() -> None:
    """Verify CrewAI can call the configured local Ollama endpoint."""
    from crewai import LLM, Agent, Crew, Process, Task

    llm = LLM(
        model="ollama/gemma4:e2b",
        base_url=os.getenv("OLLAMA_API_BASE", "http://127.0.0.1:11434"),
    )
    agent = Agent(
        role="Tester",
        goal="Test",
        backstory="You are a tester.",
        llm=llm,
        verbose=True,
    )
    task = Task(
        description="Say 'Hello World'",
        expected_output="Hello World",
        agent=agent,
    )
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential)
    result = crew.kickoff()
    assert "Hello" in str(result)
