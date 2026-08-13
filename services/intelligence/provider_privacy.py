"""Indicative, dated privacy metadata for supported intelligence providers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Any

_RETENTION_SUMMARY_FR = {
    "ollama": (
        "Mindris envoie les requêtes uniquement vers l'endpoint Ollama local configuré."
    ),
    "openai": (
        "La rétention API dépend de l'endpoint, du compte et des contrôles "
        "approuvés ; les journaux d'abus peuvent être conservés jusqu'à 30 jours."
    ),
    "groq": (
        "Le contenu d'inférence n'est pas conservé par défaut, sauf certains "
        "cas de fiabilité ou d'abus pendant 30 jours maximum."
    ),
    "gemini": (
        "Les services payants et les conditions EEE n'utilisent pas les prompts "
        "pour améliorer les produits ; d'autres services gratuits peuvent le faire."
    ),
    "mistral": (
        "Les entrées et sorties API stateless peuvent être conservées 30 jours "
        "glissants pour surveiller les abus, sauf si le ZDR est actif."
    ),
    "llama_cloud": (
        "Les documents téléversés sont traités selon les conditions LlamaCloud."
    ),
    "scrape_do": "L'URL publique de l'offre est transmise au proxy de scraping.",
    "scrapingbee": "L'URL publique de l'offre est transmise au proxy de scraping.",
}


@dataclass(frozen=True)
class ProviderPrivacyMetadata:
    """Dated provider statement displayed as indicative information."""

    provider: str
    last_verified_at: str
    training_default: str
    retention_summary: str
    zdr_available: bool
    zdr_requires_eligibility: bool
    source_url: str
    local: bool = False

    def as_public_dict(self, *, today: date | None = None) -> dict[str, Any]:
        """Serialize metadata and derive its age warning."""
        payload = asdict(self)
        verified = date.fromisoformat(self.last_verified_at)
        age_days = ((today or date.today()) - verified).days
        payload["information_age_days"] = max(0, age_days)
        payload["stale"] = age_days > 180
        payload["legal_notice"] = (
            "Information indicative only. Verify the provider terms and your "
            "account eligibility before relying on retention or ZDR claims."
        )
        payload["retention_summary_fr"] = _RETENTION_SUMMARY_FR.get(
            self.provider,
            self.retention_summary,
        )
        payload["legal_notice_fr"] = (
            "Information indicative uniquement. Vérifiez les conditions du "
            "provider et l'éligibilité de votre compte avant de vous appuyer "
            "sur une affirmation de rétention ou de ZDR."
        )
        return payload


# Sources are deliberately displayed to users.  Updating a date requires
# manually checking the linked first-party documentation.
PROVIDER_PRIVACY_CATALOGUE: dict[str, ProviderPrivacyMetadata] = {
    "ollama": ProviderPrivacyMetadata(
        provider="ollama",
        last_verified_at="2026-07-27",
        training_default="local_runtime",
        retention_summary=(
            "Mindris sends requests only to the configured local Ollama endpoint."
        ),
        zdr_available=True,
        zdr_requires_eligibility=False,
        source_url="https://docs.ollama.com/faq",
        local=True,
    ),
    "openai": ProviderPrivacyMetadata(
        provider="openai",
        last_verified_at="2026-07-27",
        training_default="disabled_for_api",
        retention_summary=(
            "API retention depends on endpoint, account and approved controls."
        ),
        zdr_available=True,
        zdr_requires_eligibility=True,
        source_url="https://platform.openai.com/docs/guides/your-data",
    ),
    "groq": ProviderPrivacyMetadata(
        provider="groq",
        last_verified_at="2026-07-27",
        training_default="not_used_for_training_by_default",
        retention_summary=(
            "Inference content is not retained by default, except limited "
            "reliability or abuse cases for up to 30 days."
        ),
        zdr_available=True,
        zdr_requires_eligibility=False,
        source_url="https://console.groq.com/docs/your-data",
    ),
    "gemini": ProviderPrivacyMetadata(
        provider="gemini",
        last_verified_at="2026-07-27",
        training_default="consult_api_terms",
        retention_summary=(
            "Paid and EEA API terms do not use prompts to improve products; "
            "other unpaid services may use submitted content."
        ),
        zdr_available=False,
        zdr_requires_eligibility=False,
        source_url="https://ai.google.dev/gemini-api/terms",
    ),
    "mistral": ProviderPrivacyMetadata(
        provider="mistral",
        last_verified_at="2026-07-27",
        training_default="disabled_for_api",
        retention_summary=(
            "Stateless API inputs and outputs may be retained for 30 rolling "
            "days for abuse monitoring unless ZDR is active."
        ),
        zdr_available=True,
        zdr_requires_eligibility=True,
        source_url="https://docs.mistral.ai/admin/monitor-comply/privacy-data-controls",
    ),
    "llama_cloud": ProviderPrivacyMetadata(
        provider="llama_cloud",
        last_verified_at="2026-07-27",
        training_default="consult_provider_terms",
        retention_summary=(
            "Uploaded documents are processed according to LlamaCloud terms."
        ),
        zdr_available=False,
        zdr_requires_eligibility=False,
        source_url="https://www.llamaindex.ai/privacy-policy",
    ),
    "scrape_do": ProviderPrivacyMetadata(
        provider="scrape_do",
        last_verified_at="2026-07-27",
        training_default="not_applicable",
        retention_summary="The public job URL is sent to the scraping proxy.",
        zdr_available=False,
        zdr_requires_eligibility=False,
        source_url="https://scrape.do/privacy-policy",
    ),
    "scrapingbee": ProviderPrivacyMetadata(
        provider="scrapingbee",
        last_verified_at="2026-07-27",
        training_default="not_applicable",
        retention_summary="The public job URL is sent to the scraping proxy.",
        zdr_available=False,
        zdr_requires_eligibility=False,
        source_url="https://www.scrapingbee.com/privacy/",
    ),
}


def provider_privacy_catalogue() -> dict[str, dict[str, Any]]:
    """Return all provider metadata with freshness and legal notices."""
    return {
        provider: metadata.as_public_dict()
        for provider, metadata in PROVIDER_PRIVACY_CATALOGUE.items()
    }
