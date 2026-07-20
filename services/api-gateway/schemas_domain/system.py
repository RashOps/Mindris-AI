"""System configuration and diagnostics schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from .common import Provider


class APIMessage(BaseModel):
    """Standard API status response."""

    status: str
    message: str
    detail: Any | None = None


class SystemConfigurationTaskDefault(BaseModel):
    """Resolved provider/model pair for a Mindris task."""

    provider: Provider
    model_name: str


class SystemConfigurationProviderStatus(BaseModel):
    """Safe provider configuration metadata exposed to clients."""

    configured: bool
    mode: Literal["local", "cloud"]
    reason: str


class SystemConfigurationSecretSlot(BaseModel):
    """Redacted secret-slot status for backend-managed credentials."""

    configured: bool
    masked: bool = True


class SystemConfigurationRuntime(BaseModel):
    """Effective runtime knobs owned by the backend."""

    renderer_url: str
    service_timeout_seconds: float
    pipeline_timeout_seconds: float
    max_pdf_upload_bytes: int
    ollama_api_base: str
    llm_num_ctx: int
    scraper_timeout_ms: int
    scraper_headless: bool
    scraper_strategy: str
    scraper_proxy_fallback: bool
    log_level: str


class SystemConfigurationStorage(BaseModel):
    """Effective storage locations owned by the backend."""

    logs_dir: str
    storage_dir: str
    chroma_db_dir: str


class SystemConfigurationLLM(BaseModel):
    """Resolved LLM defaults and provider availability."""

    defaults: dict[str, SystemConfigurationTaskDefault]
    providers: dict[str, SystemConfigurationProviderStatus]


class SystemConfigurationSecrets(BaseModel):
    """Backend secret slots without leaking raw values."""

    api_key: SystemConfigurationSecretSlot
    openai_api_key: SystemConfigurationSecretSlot
    groq_api_key: SystemConfigurationSecretSlot
    gemini_api_key: SystemConfigurationSecretSlot
    mistral_api_key: SystemConfigurationSecretSlot
    llama_cloud_api_key: SystemConfigurationSecretSlot
    scrape_do_api_key: SystemConfigurationSecretSlot
    scrapingbee_api_key: SystemConfigurationSecretSlot


class SystemConfigurationItem(BaseModel):
    """Safe backend-owned configuration payload."""

    runtime: SystemConfigurationRuntime
    storage: SystemConfigurationStorage
    llm: SystemConfigurationLLM
    app: dict[str, Any]
    secrets: SystemConfigurationSecrets


class SystemDiagnosticsService(BaseModel):
    """Read-only runtime diagnostics for a service dependency."""

    status: str
    reachable: bool
    url: str | None = None
    checks: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class SystemDiagnosticsOllama(BaseModel):
    """Read-only local Ollama diagnostics."""

    status: str
    reachable: bool
    base_url: str
    model_count: int = 0
    items: list[dict[str, str]] = Field(default_factory=list)
    error: str | None = None


class SystemDiagnosticsItem(BaseModel):
    """Aggregated backend-owned diagnostics for local runtime control."""

    api: dict[str, Any]
    renderer: SystemDiagnosticsService
    ollama: SystemDiagnosticsOllama
    storage: SystemConfigurationStorage
    runtime: SystemConfigurationRuntime


class SystemConfigurationUpdateRequest(BaseModel):
    """Patch backend-owned app configuration."""

    defaults: dict[str, SystemConfigurationTaskDefault] | None = None
    pdf_ingestion_mode: Literal["auto", "llama_parse", "local_text"] | None = None
    ui_locale: Literal["fr", "en"] | None = None


class SystemSecretUpdateRequest(BaseModel):
    """Write-only secret slot update from the browser."""

    value: str = Field(min_length=1)
