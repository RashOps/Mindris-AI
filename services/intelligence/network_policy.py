"""Network destination policy used by local-strict intelligence runtimes."""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass
from urllib.parse import urlparse

from .privacy import PrivacyMode

EXTERNAL_PROVIDER_HOSTS = frozenset(
    {
        "api.openai.com",
        "api.groq.com",
        "generativelanguage.googleapis.com",
        "api.mistral.ai",
        "api.cloud.llamaindex.ai",
    }
)


@dataclass(frozen=True)
class NetworkDecision:
    """One deterministic local network policy decision."""

    allowed: bool
    reason: str
    host: str


def evaluate_destination(
    url: str,
    *,
    mode: PrivacyMode,
    local_allowlist: frozenset[str] = frozenset({"localhost", "127.0.0.1", "ollama"}),
) -> NetworkDecision:
    """Evaluate a destination without performing a network request."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not host:
        return NetworkDecision(False, "privacy.network.invalid_destination", host)
    if mode != PrivacyMode.LOCAL_STRICT:
        return NetworkDecision(True, "privacy.network.cloud_mode", host)
    if host in local_allowlist:
        return NetworkDecision(True, "privacy.network.local_allowlist", host)
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address and (address.is_loopback or address.is_private):
        return NetworkDecision(True, "privacy.network.private_address", host)
    return NetworkDecision(False, "privacy.network.local_strict_blocked", host)


def assert_destination_allowed(url: str, *, mode: PrivacyMode) -> None:
    """Raise when the configured privacy mode forbids a destination."""
    decision = evaluate_destination(url, mode=mode)
    if not decision.allowed:
        raise PermissionError(decision.reason)


def apply_runtime_privacy_environment(mode: PrivacyMode) -> None:
    """Disable supported telemetry mechanisms when local strict is active."""
    if mode != PrivacyMode.LOCAL_STRICT:
        return
    os.environ["OTEL_SDK_DISABLED"] = "true"
    os.environ["DO_NOT_TRACK"] = "1"
    os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
    os.environ["LITELLM_LOG"] = "ERROR"
