"""JSON serialization helpers for SQLite text columns."""

import json
from typing import Any

from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")


def dump_json(value: Any) -> str:
    """Serialize JSON safely for SQLite text columns."""
    return json.dumps(value, ensure_ascii=False)


def load_json(value: str | None, fallback: Any) -> Any:
    """Deserialize JSON from SQLite text columns."""
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        logger.warning(
            "Invalid JSON payload encountered in persistence layer; using fallback"
        )
        return fallback
