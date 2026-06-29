"""SQLite session helpers for Mindris AI."""

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session as SQLAlchemySession
from sqlalchemy.orm import sessionmaker
from utils.config import settings

from .migrations import migrate

DB_PATH = settings.storage_dir / "mindris.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Session(SQLAlchemySession):
    """Small compatibility wrapper exposing SQLModel-like exec()."""

    def exec(self, statement):  # noqa: ANN001, ANN201
        """Return scalar results for select(Model) statements."""
        return self.scalars(statement)


SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def init_db() -> None:
    """Apply database migrations."""
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    with engine.begin() as connection:
        migrate(connection)


async def get_session() -> AsyncGenerator[Session, None]:
    """FastAPI dependency that yields a SQLite session."""
    with SessionLocal() as session:
        yield session
