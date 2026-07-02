"""Logger factory for Mindris AI.

Usage::

    from utils import get_logger
    logger = get_logger(__name__, service_name="api-gateway")
    logger.info("Pipeline started")
"""

import json
import logging
from logging.handlers import RotatingFileHandler

from .config import settings

_LOG_FORMAT = (
    "[%(asctime)s] %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
_HANDLER_MARKER = "_mindris_handler"
_SERVICE_MARKER = "_mindris_service_name"
_LOG_PATH_MARKER = "_mindris_log_path"


class _SecretRedactionFilter(logging.Filter):
    """Redact configured secret values from emitted log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:  # pragma: no cover - logging fallback path
            return True
        redacted = _redact_text(message)
        record.msg = redacted
        record.args = ()
        return True


def _normalize_level(level_name: str) -> int:
    return getattr(logging, level_name.upper(), logging.INFO)


def _service_log_path(service_name: str | None) -> str:
    slug = (service_name or "app").strip() or "app"
    return str(settings.logs_dir / f"{slug}.log")


def _mindris_handlers(logger: logging.Logger) -> list[logging.Handler]:
    return [
        handler
        for handler in logger.handlers
        if getattr(handler, _HANDLER_MARKER, False)
    ]


def _redact_text(value: str) -> str:
    text = value
    for secret in _configured_secrets():
        text = text.replace(secret, "[REDACTED]")
    return text


def _configured_secrets() -> list[str]:
    values = []
    secrets_path = settings.storage_dir / "runtime-secrets.json"
    if secrets_path.exists():
        try:
            raw = json.loads(secrets_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            raw = {}
        if isinstance(raw, dict):
            values.extend(
                value
                for value in raw.values()
                if isinstance(value, str) and value.strip()
            )
    for attr in (
        "api_key",
        "openai_api_key",
        "groq_api_key",
        "gemini_api_key",
        "mistral_api_key",
        "llama_cloud_api_key",
        "scrape_do_api_key",
        "scrapingbee_api_key",
    ):
        candidate = getattr(settings, attr, None)
        getter = getattr(candidate, "get_secret_value", None)
        if callable(getter):
            value = getter()
            if value:
                values.append(value)
    return sorted({value for value in values if value})


def get_logger(name: str, *, service_name: str | None = None) -> logging.Logger:
    """Return a configured logger for the given module name.

    The logger writes service-specific DEBUG+ traces to a rotating file and
    mirrors WARNING+ to the console. Calling this function multiple times with
    the same *name* is safe — Mindris handlers are added only once per logger.

    Args:
        name: The logger name, typically ``__name__`` of the calling module.
        service_name: Optional service slug used for the log filename.

    Returns:
        A fully configured :class:`logging.Logger` instance.
    """
    logger = logging.getLogger(name)
    existing_handlers = _mindris_handlers(logger)
    configured_service = getattr(logger, _SERVICE_MARKER, None)
    expected_log_path = _service_log_path(service_name)
    configured_log_path = getattr(logger, _LOG_PATH_MARKER, None)

    if (
        existing_handlers
        and configured_service == service_name
        and configured_log_path == expected_log_path
    ):
        return logger

    for handler in existing_handlers:
        logger.removeHandler(handler)
        handler.close()

    logger.setLevel(_normalize_level(settings.log_level))

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)
    settings.logs_dir.mkdir(parents=True, exist_ok=True)

    # Console — WARNING and above only (not too noisy in terminals)
    console_h = logging.StreamHandler()
    console_h.setLevel(logging.WARNING)
    console_h.setFormatter(formatter)
    console_h.addFilter(_SecretRedactionFilter())
    setattr(console_h, _HANDLER_MARKER, True)

    # Rotating file — full DEBUG trace, 5 MB × 5 files
    file_h = RotatingFileHandler(
        expected_log_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_h.setLevel(logging.DEBUG)
    file_h.setFormatter(formatter)
    file_h.addFilter(_SecretRedactionFilter())
    setattr(file_h, _HANDLER_MARKER, True)

    logger.addHandler(console_h)
    logger.addHandler(file_h)
    logger.propagate = False
    setattr(logger, _SERVICE_MARKER, service_name)
    setattr(logger, _LOG_PATH_MARKER, expected_log_path)

    return logger
