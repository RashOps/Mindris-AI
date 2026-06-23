"""Centralised configuration for Mindris AI, loaded from environment variables and .env file."""

from pathlib import Path

from pydantic import Field, SecretStr
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
    api_key: SecretStr = Field(
        default=SecretStr("dev-mindris-api-key"),
        alias="API_KEY",
    )
    renderer_url: str = Field(default="http://localhost:4000", alias="RENDERER_URL")
    max_pdf_upload_bytes: int = Field(
        default=10 * 1024 * 1024,
        alias="MAX_PDF_UPLOAD_BYTES",
    )

    # ── Local Ollama Configuration ────────────────────────────────────────────
    ollama_api_base: str = Field(
        default="http://127.0.0.1:11434", alias="OLLAMA_API_BASE"
    )
    llm_num_ctx: int = Field(default=32768, alias="OLLAMA_NUM_CTX")

    # ── Cloud LLM Providers API Keys ──────────────────────────────────────────
    openai_api_key: SecretStr | None = Field(default=None, alias="OPENAI_API_KEY")
    groq_api_key: SecretStr | None = Field(default=None, alias="GROQ_API_KEY")
    gemini_api_key: SecretStr | None = Field(default=None, alias="GEMINI_API_KEY")
    mistral_api_key: SecretStr | None = Field(default=None, alias="MISTRAL_API_KEY")
    llama_cloud_api_key: SecretStr | None = Field(
        default=None, alias="LLAMA_CLOUD_API_KEY"
    )

    # ── Vector Database & Embeddings ──────────────────────────────────────────
    chroma_db_dir: Path = Field(default=_PROJECT_ROOT / "storage" / "vectordb")
    # Defaulting to an offline HuggingFace model (sentence-transformers)
    embedding_model: str = Field(default="all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")

    # ── Scraper ───────────────────────────────────────────────────────────────
    scraper_headless: bool = Field(default=True, alias="SCRAPER_HEADLESS")
    scraper_timeout_ms: int = Field(default=60_000, alias="SCRAPER_TIMEOUT_MS")

    # ── Proxy / Rotation providers ──────────────────────────────────────────
    scrape_do_api_key: SecretStr | None = Field(default=None, alias="SCRAPE_DO_API")
    scrapingbee_api_key: SecretStr | None = Field(default=None, alias="SCRAPINGBEE_API")
    # Strategy: "auto" (Playwright → Scrape.do → ScrapingBee)
    #           "playwright_only" (never use cloud proxies)
    #           "proxy_first" (skip Playwright, hit proxies directly)
    scraper_strategy: str = Field(default="auto", alias="SCRAPER_STRATEGY")
    scraper_proxy_fallback: bool = Field(default=True, alias="SCRAPER_PROXY_FALLBACK")

    # ── Logging ────────────────────────────────────────────────────────────
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    def model_post_init(self, __context: object) -> None:
        """Ensure required directories exist after settings are loaded."""
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_db_dir.mkdir(parents=True, exist_ok=True)


# Singleton — import `settings` everywhere, do not re-instantiate.
settings = Settings()
