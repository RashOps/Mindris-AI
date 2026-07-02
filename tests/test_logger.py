import logging

from utils.logger import get_logger


class _SecretValue:
    def __init__(self, value: str) -> None:
        self._value = value

    def get_secret_value(self) -> str:
        return self._value


def test_get_logger_redacts_known_secret_values_from_log_output(tmp_path, monkeypatch):
    monkeypatch.setattr("utils.logger.settings.logs_dir", tmp_path)
    monkeypatch.setattr(
        "utils.logger.settings.api_key",
        _SecretValue("dev-secret-token"),
    )
    monkeypatch.setattr(
        "utils.logger.settings.openai_api_key",
        _SecretValue("sk-openai-secret"),
        raising=False,
    )

    logger = get_logger("services.secure", service_name="api-gateway")
    logger.warning("auth=%s provider=%s", "dev-secret-token", "sk-openai-secret")

    contents = (tmp_path / "api-gateway.log").read_text(encoding="utf-8")
    assert "dev-secret-token" not in contents
    assert "sk-openai-secret" not in contents
    assert "[REDACTED]" in contents


def test_get_logger_writes_to_service_specific_file(tmp_path, monkeypatch):
    monkeypatch.setattr("utils.logger.settings.logs_dir", tmp_path)

    logger = get_logger("routers.cv", service_name="api-gateway")
    file_handlers = [
        handler
        for handler in logger.handlers
        if isinstance(handler, logging.FileHandler)
        and getattr(handler, "_mindris_handler", False)
    ]

    assert file_handlers, "expected a file handler to be configured"
    assert file_handlers[0].baseFilename == str(tmp_path / "api-gateway.log")


def test_get_logger_ignores_parent_handlers_and_configures_its_own(
    tmp_path, monkeypatch
):
    monkeypatch.setattr("utils.logger.settings.logs_dir", tmp_path)

    parent = logging.getLogger("services")
    parent_handler = logging.StreamHandler()
    parent.addHandler(parent_handler)

    try:
        logger = get_logger("services.api", service_name="api-gateway")
        assert logger.handlers, "expected local handlers on the child logger"
        assert logger.handlers[0] is not parent_handler
        assert logger.propagate is False
    finally:
        parent.removeHandler(parent_handler)
        parent_handler.close()
