"""Database migration tests."""

from conftest import client
from database.migrations import SCHEMA_VERSION
from database.session import SessionLocal
from sqlalchemy import text


def test_init_db_stamps_schema_version() -> None:
    client()
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT MAX(version) FROM schema_migrations")
        ).first()
    assert row is not None
    assert row[0] == SCHEMA_VERSION
