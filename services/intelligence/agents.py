"""CrewAI agent definitions for Mindris AI intelligence pipeline."""

from pathlib import Path

import yaml
from crewai import Agent

from .llm_config import get_llm


class MindrisAgents:
    """Factory for CrewAI agents used in the Mindris intelligence pipeline."""

    def __init__(
        self,
        provider: str = "ollama",
        model_name: str = "gemma4:32k",
    ) -> None:
        """Load agent configuration and initialize the LLM.

        Args:
            provider: The LLM provider (e.g., "ollama", "groq", "gemini", "openai").
            model_name: The specific model name for the provider.
        """
        config_path = Path(__file__).parent / "agents.yaml"
        with config_path.open(encoding="utf-8") as f:
            self.agents_config: dict = yaml.safe_load(f)
        self.llm = get_llm(provider=provider, model_name=model_name)

    def job_analyst_agent(self) -> Agent:
        """Return a configured job-offer analyst agent.

        The agent's role, goal, and backstory are loaded from ``agents.yaml``
        to keep configuration decoupled from code.

        Returns:
            A :class:`crewai.Agent` ready to be assigned to a task.
        """
        cfg = self.agents_config["job_analyst_agent"]
        return Agent(
            role=cfg["role"],
            goal=cfg["goal"],
            backstory=cfg["backstory"],
            llm=self.llm,
            allow_delegation=False,
            verbose=True,
        )
