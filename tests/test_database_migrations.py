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


def test_opportunity_tables_exist_after_migration() -> None:
    client()
    with SessionLocal() as session:
        tables = {
            row[0]
            for row in session.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).all()
        }
        opportunity_columns = {
            row[1]
            for row in session.execute(text("PRAGMA table_info(opportunityrecord)")).all()
        }
        transition_columns = {
            row[1]
            for row in session.execute(
                text("PRAGMA table_info(opportunitytransitionrecord)")
            ).all()
        }

    assert "opportunityrecord" in tables
    assert "opportunitytransitionrecord" in tables
    assert {
        "id",
        "job_id",
        "source_url",
        "company",
        "role",
        "current_state",
        "resume_id",
        "resume_locale",
        "ats_report_id",
        "cover_letter_id",
        "application_id",
        "notes",
        "metadata_json",
        "created_at",
        "updated_at",
        "last_transition_at",
    } <= opportunity_columns
    assert {
        "id",
        "opportunity_id",
        "state",
        "action",
        "metadata_json",
        "created_at",
    } <= transition_columns


def test_application_reminder_table_exists_after_migration() -> None:
    client()
    with SessionLocal() as session:
        tables = {
            row[0]
            for row in session.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).all()
        }
        reminder_columns = {
            row[1]
            for row in session.execute(
                text("PRAGMA table_info(applicationreminderrecord)")
            ).all()
        }

    assert "applicationreminderrecord" in tables
    assert {
        "id",
        "application_id",
        "title",
        "due_at",
        "status",
        "notes",
        "completed_at",
        "created_at",
        "updated_at",
    } <= reminder_columns
