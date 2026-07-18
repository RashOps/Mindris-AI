"""Common API schema primitives."""

from typing import Literal

from pydantic import BaseModel, field_validator

Provider = Literal["ollama", "groq", "gemini", "openai", "mistral"]
AtsMode = Literal["standard", "strict"]
OpportunityState = Literal[
    "scrape_completed",
    "opportunity_created",
    "resume_linked",
    "cover_letter_linked",
    "ats_report_linked",
    "tracker_entry_created",
    "ready_to_apply",
]

MODEL_CATALOGUE: dict[str, set[str]] = {
    "groq": {
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    },
    "gemini": {"gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"},
    "openai": {"gpt-4o", "gpt-4o-mini", "gpt-4-turbo"},
    "mistral": {"mistral-large-latest", "mistral-small-latest", "open-mistral-7b"},
    "ollama": {"gemma4:32k", "llama3.2", "phi4"},
}


def validate_llm_selection(provider: str, model_name: str) -> None:
    """Validate a provider/model pair supplied outside a Pydantic body."""
    if provider not in MODEL_CATALOGUE:
        raise ValueError(f"Unsupported LLM provider: '{provider}'.")
    if model_name not in MODEL_CATALOGUE[provider]:
        raise ValueError(f"Unsupported model '{model_name}' for provider '{provider}'.")


class LLMRequest(BaseModel):
    """Base request carrying an allowed LLM provider/model pair."""

    provider: Provider = "groq"
    model_name: str = "llama-3.3-70b-versatile"

    @field_validator("model_name")
    @classmethod
    def validate_model_name(cls, model_name: str, info) -> str:  # noqa: ANN001
        """Ensure clients can only request models in the local catalogue."""
        provider = info.data.get("provider", "groq")
        if model_name not in MODEL_CATALOGUE.get(provider, set()):
            raise ValueError(
                f"Unsupported model '{model_name}' for provider '{provider}'."
            )
        return model_name
