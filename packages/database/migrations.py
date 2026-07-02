"""Lightweight SQLite schema migrations for Mindris AI.

The project uses SQLAlchemy metadata as the schema source.  This module adds a
small version table around that metadata so startup is explicit and auditable
instead of relying on ad-hoc table creation from application code.
"""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy import Connection, text

from .records import Base

SCHEMA_VERSION = 7


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


def _migration_002_create_revision_history(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)


def _migration_003_create_community_template_storage(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)


def _add_column_if_missing(
    connection: Connection,
    table_name: str,
    column_name: str,
    column_sql: str,
) -> None:
    columns = connection.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    existing = {str(row[1]) for row in columns}
    if column_name in existing:
        return
    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}"))


def _migration_004_extend_ats_report_transparency(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)
    _add_column_if_missing(
        connection,
        "atsreportrecord",
        "mode",
        "mode TEXT NOT NULL DEFAULT 'standard'",
    )
    _add_column_if_missing(
        connection,
        "atsreportrecord",
        "rubric_json",
        "rubric_json TEXT NOT NULL DEFAULT '{}'",
    )
    _add_column_if_missing(
        connection,
        "atsreportrecord",
        "deductions_json",
        "deductions_json TEXT NOT NULL DEFAULT '[]'",
    )
    _add_column_if_missing(
        connection,
        "atsreportrecord",
        "context_json",
        "context_json TEXT NOT NULL DEFAULT '{}'",
    )


def _migration_005_create_opportunity_workflow_tables(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)


def _migration_006_create_application_reminder_tables(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)


def _migration_007_extend_company_insight_cache_keys(connection: Connection) -> None:
    Base.metadata.create_all(bind=connection)
    _add_column_if_missing(
        connection,
        "companyinsightrecord",
        "cache_key",
        "cache_key TEXT DEFAULT NULL",
    )


MIGRATIONS: dict[int, Migration] = {
    1: _migration_001_create_current_schema,
    2: _migration_002_create_revision_history,
    3: _migration_003_create_community_template_storage,
    4: _migration_004_extend_ats_report_transparency,
    5: _migration_005_create_opportunity_workflow_tables,
    6: _migration_006_create_application_reminder_tables,
    7: _migration_007_extend_company_insight_cache_keys,
}


def migrate(connection: Connection) -> int:
    """Apply pending SQLite schema migrations and return the schema version."""
    _ensure_version_table(connection)
    current = _current_version(connection)
    for version in range(current + 1, SCHEMA_VERSION + 1):
        MIGRATIONS[version](connection)
        _stamp(connection, version)
    return SCHEMA_VERSION
