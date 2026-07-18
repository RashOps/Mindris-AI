"""CORS contract tests for local and self-hosted browser clients."""

from conftest import client


def _preflight(origin: str):
    return client().request(
        "OPTIONS",
        "/api/v1/system/ready",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )


def test_loopback_frontends_are_allowed_on_custom_ports() -> None:
    for origin in ("http://localhost:3100", "http://127.0.0.1:4173"):
        response = _preflight(origin)

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_unconfigured_remote_origin_is_not_allowed() -> None:
    response = _preflight("https://untrusted.example")

    assert "access-control-allow-origin" not in response.headers
