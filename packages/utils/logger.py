"""Logger factory for Mindris AI.

Usage::

    from utils import get_logger
    logger = get_logger(__name__)
    logger.info("Pipeline started")
"""

import logging
from logging.handlers import RotatingFileHandler

from .config import settings

_LOG_FORMAT = (
    "[%(asctime)s] %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger for the given module name.

    The logger writes DEBUG+ to a rotating file and WARNING+ to the console.
    Calling this function multiple times with the same *name* is safe — handlers
    are added only once.

    Args:
        name: The logger name, typically ``__name__`` of the calling module.

    Returns:
        A fully configured :class:`logging.Logger` instance.
    """
    logger = logging.getLogger(name)

    if logger.hasHandlers():
        return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)
    settings.logs_dir.mkdir(parents=True, exist_ok=True)

    # Console — WARNING and above only (not too noisy in terminals)
    console_h = logging.StreamHandler()
    console_h.setLevel(logging.WARNING)
    console_h.setFormatter(formatter)

    # Rotating file — full DEBUG trace, 5 MB × 5 files
    log_file = settings.logs_dir / "app.log"
    file_h = RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_h.setLevel(logging.DEBUG)
    file_h.setFormatter(formatter)

    logger.addHandler(console_h)
    logger.addHandler(file_h)
    logger.propagate = False

    return logger
