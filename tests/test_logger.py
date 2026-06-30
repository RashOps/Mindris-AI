import logging

from utils.logger import get_logger


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
