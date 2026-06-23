"""Lightweight SQLite schema migrations for Mindris AI.

The project uses SQLAlchemy metadata as the schema source.  This module adds a
small version table around that metadata so startup is explicit and auditable
instead of relying on ad-hoc table creation from application code.
"""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy import Connection, text

from .records import Base

SCHEMA_VERSION = 1


Migration = Callable[[Connection], None]


def _ensure_version_table(connection: Connection) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )
    )


def _current_version(connection: Connection) -> int:
    row = connection.execute(
        text("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
    ).first()
    return int(row[0] if row else 0)


def _stamp(connection: Connection, version: int) -> None:
    connection.execute(
        text(
            """
            INSERT OR IGNORE INTO schema_migrations (version, applied_at)
            VALUES (:version, :applied_at)
            """
        ),
        {"version": version, "applied_at": datetime.now().isoformat()},
    )


def _migration_001_create_current_schema(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)


MIGRATIONS: dict[int, Migration] = {
    1: _migration_001_create_current_schema,
}


def migrate(connection: Connection) -> int:
    """Apply pending SQLite schema migrations and return the schema version."""
    _ensure_version_table(connection)
    current = _current_version(connection)
    for version in range(current + 1, SCHEMA_VERSION + 1):
        MIGRATIONS[version](connection)
        _stamp(connection, version)
    return SCHEMA_VERSION
