"""Centralised configuration for Mindris AI, loaded from environment variables and .env file."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve the project root (packages/utils/ -> packages/ -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application-wide settings resolved from environment variables and .env.

    All fields can be overridden via environment variables (case-insensitive).
    """

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Project layout ────────────────────────────────────────────────────────
    project_root: Path = Field(default=_PROJECT_ROOT)
    logs_dir: Path = Field(default=_PROJECT_ROOT / "logs")
    storage_dir: Path = Field(default=_PROJECT_ROOT / "storage")

    # ── LLM / Ollama ─────────────────────────────────────────────────────────
    llm_type: str = Field(default="ollama", alias="LLM_TYPE")
    openai_api_base: str = Field(
        default="http://127.0.0.1:11434", alias="OPENAI_API_BASE"
    )
    openai_model_name: str = Field(default="gemma4:latest", alias="OPENAI_MODEL_NAME")
    openai_api_key: str = Field(default="ollama", alias="OPENAI_API_KEY")
    llm_num_ctx: int = Field(default=32768, alias="LLM_NUM_CTX")

    # ── Scraper ───────────────────────────────────────────────────────────────
    scraper_headless: bool = Field(default=True, alias="SCRAPER_HEADLESS")
    scraper_timeout_ms: int = Field(default=60_000, alias="SCRAPER_TIMEOUT_MS")

    def model_post_init(self, __context: object) -> None:
        """Ensure required directories exist after settings are loaded."""
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir.mkdir(parents=True, exist_ok=True)


# Singleton — import `settings` everywhere, do not re-instantiate.
settings = Settings()
