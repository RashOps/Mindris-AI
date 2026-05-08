"""Shared utilities package for Mindris AI."""

from .config import settings
from .logger import get_logger

__all__ = ["get_logger", "settings"]
