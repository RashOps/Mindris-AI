"""CrewAI agent definitions for Mindris AI intelligence pipeline."""

from pathlib import Path

import yaml
from crewai import Agent
from utils.logger import get_logger
from utils.runtime_config import load_runtime_configuration

from .llm_config import get_llm
from .privacy import PrivacyTask

logger = get_logger(__name__, service_name="intelligence")


class MindrisAgents:
    """Factory for CrewAI agents used in the Mindris intelligence pipeline."""

    def __init__(
        self,
        provider: str | None = None,
        model_name: str | None = None,
        privacy_task: PrivacyTask = PrivacyTask.CV_COMPOSITION,
    ) -> None:
        """Load agent configuration and initialize the LLM.

        Args:
            provider: The LLM provider (e.g., "ollama", "groq", "gemini", "openai").
            model_name: The specific model name for the provider.
            privacy_task: Backend privacy policy applied to every model call.
        """
        runtime_default = load_runtime_configuration()["defaults"]["optimize"]
        provider = provider or runtime_default["provider"]
        model_name = model_name or runtime_default["model_name"]
        config_path = Path(__file__).parent / "agents.yaml"
        logger.debug("Loading agent configuration from %s", config_path)
        with config_path.open(encoding="utf-8") as f:
            self.agents_config: dict = yaml.safe_load(f)
        logger.info(
            "Initializing intelligence agents with provider=%s model=%s",
            provider,
            model_name,
        )
        self.llm = get_llm(
            provider=provider,
            model_name=model_name,
            privacy_task=privacy_task,
        )

    def job_analyst_agent(self) -> Agent:
        """Return a configured job-offer analyst agent.

        The agent's role, goal, and backstory are loaded from ``agents.yaml``
        to keep configuration decoupled from code.

        Returns:
            A :class:`crewai.Agent` ready to be assigned to a task.
        """
        cfg = self.agents_config["job_analyst_agent"]
        logger.debug("Creating job analyst agent")
        return Agent(
            role=cfg["role"],
            goal=cfg["goal"],
            backstory=cfg["backstory"],
            llm=self.llm,
            allow_delegation=False,
            verbose=True,
        )
