"""Dynamic LLM catalogue API tests."""

from __future__ import annotations

from conftest import auth_headers, client
from routers import llm


class StubRegistry:
    """Record explicit catalogue refresh requests."""

    def __init__(self) -> None:
        self.providers: list[str] | None = None

    def refresh(self, providers: list[str] | None = None) -> dict:
        self.providers = providers
        return {}


def test_catalogue_exposes_discovery_metadata() -> None:
    response = client().get("/api/v1/llm/catalogue", headers=auth_headers())

    assert response.status_code == 200
    payload = response.json()
    assert "updated_at" in payload
    assert payload["catalogue"]["groq"]
    assert payload["catalogue"]["groq"][0]["capabilities"] == ["chat"]
    assert payload["providers"]["groq"]["source"] in {"bootstrap", "provider"}


def test_catalogue_refresh_forwards_provider_filter(monkeypatch) -> None:
    registry = StubRegistry()
    monkeypatch.setattr(llm, "get_model_registry", lambda: registry)
    monkeypatch.setattr(
        llm,
        "catalogue_payload",
        lambda: {"catalogue": {}, "providers": {}, "defaults": {}},
    )

    response = client().post(
        "/api/v1/llm/catalogue/refresh?provider=groq&provider=ollama",
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert registry.providers == ["groq", "ollama"]
