"""Common API schema primitives."""

from typing import Literal

from intelligence.model_catalogue import validate_llm_selection
from pydantic import BaseModel, model_validator

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


class LLMRequest(BaseModel):
    """Base request carrying an allowed LLM provider/model pair."""

    provider: Provider = "groq"
    model_name: str = "llama-3.3-70b-versatile"

    @model_validator(mode="after")
    def validate_model_name(self) -> "LLMRequest":
        """Ensure clients can only request models in the backend registry."""
        validate_llm_selection(self.provider, self.model_name)
        return self
