"""Manual Ollama integration smoke test.

Run explicitly with: RUN_LLM_TESTS=1 uv run pytest test_ollama.py -q -s
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LLM_TESTS") != "1",
    reason="Ollama integration tests require a running local model.",
)


def test_ollama_smoke() -> None:
    """Verify LiteLLM/CrewAI can call the local Ollama endpoint."""
    from crewai import LLM

    llm = LLM(
        model="ollama/gemma4:e2b",
        base_url=os.getenv("OLLAMA_API_BASE", "http://127.0.0.1:11434"),
        extra_body={"options": {"num_ctx": 32768}},
    )
    response = llm.call([{"role": "user", "content": "Repete le mot test"}])
    assert response
