"""Portable, versioned backup archives for local Mindris data."""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

from .context import ROOT, CliError

ARCHIVE_FORMAT = 1
MANIFEST_NAME = "mindris-backup.json"
EXCLUDED_NAMES = {"runtime-secrets.json", ".env"}


def storage_directory() -> Path:
    """Resolve the local data root without reading or exporting secrets."""
    configured = os.environ.get("STORAGE_DIR")
    return Path(configured).expanduser().resolve() if configured else ROOT / "storage"


def _manifest() -> dict[str, object]:
    return {
        "archive_format": ARCHIVE_FORMAT,
        "created_at": datetime.now(UTC).isoformat(),
        "contents_root": "storage",
        "secrets_included": False,
    }


def create_backup(archive: Path, *, storage: Path | None = None) -> dict[str, object]:
    """Create a deterministic portable archive from the configured storage root."""
    source = (storage or storage_directory()).resolve()
    if not source.is_dir():
        raise CliError(f"Dossier de données introuvable : {source}", 2)
    archive = archive.expanduser().resolve()
    archive.parent.mkdir(parents=True, exist_ok=True)
    files = [
        path
        for path in source.rglob("*")
        if path.is_file() and not path.is_symlink() and path.name not in EXCLUDED_NAMES
    ]
    manifest = {**_manifest(), "file_count": len(files)}
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
        bundle.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2))
        for path in sorted(files):
            member = PurePosixPath("storage", *path.relative_to(source).parts)
            bundle.write(path, member)
    return {**manifest, "archive": str(archive)}


def inspect_backup(archive: Path) -> dict[str, object]:
    """Validate an archive manifest and every member path before restoration."""
    archive = archive.expanduser().resolve()
    if not archive.is_file():
        raise CliError(f"Archive introuvable : {archive}", 2)
    try:
        with ZipFile(archive) as bundle:
            names = bundle.namelist()
            if MANIFEST_NAME not in names:
                raise CliError("Archive Mindris invalide : manifeste absent.", 2)
            manifest = json.loads(bundle.read(MANIFEST_NAME))
            if manifest.get("archive_format") != ARCHIVE_FORMAT:
                raise CliError(
                    "Version d'archive Mindris incompatible avec cette CLI.",
                    2,
                )
            for name in names:
                member = PurePosixPath(name)
                if member.is_absolute() or ".." in member.parts:
                    raise CliError(f"Chemin dangereux dans l'archive : {name}", 2)
                if name != MANIFEST_NAME and (
                    not member.parts
                    or member.parts[0] != "storage"
                    or member.name in EXCLUDED_NAMES
                ):
                    raise CliError(f"Contenu non autorisé dans l'archive : {name}", 2)
            return {**manifest, "archive": str(archive), "members": len(names) - 1}
    except (OSError, ValueError) as error:
        raise CliError(f"Archive Mindris illisible : {error}", 2) from error


def restore_backup(archive: Path, *, storage: Path | None = None) -> dict[str, object]:
    """Restore through a validated staging directory with rollback on failure."""
    manifest = inspect_backup(archive)
    target = (storage or storage_directory()).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix=".mindris-restore-",
        dir=target.parent,
    ) as temporary:
        staging_root = Path(temporary)
        with ZipFile(archive.expanduser().resolve()) as bundle:
            bundle.extractall(staging_root)
        staged_storage = staging_root / "storage"
        rollback = target.with_name(f".{target.name}.restore-rollback")
        if rollback.exists():
            shutil.rmtree(rollback)
        had_target = target.exists()
        try:
            if had_target:
                target.replace(rollback)
            staged_storage.replace(target)
        except Exception:
            if target.exists():
                shutil.rmtree(target)
            if had_target and rollback.exists():
                rollback.replace(target)
            raise
        else:
            if rollback.exists():
                shutil.rmtree(rollback)
    return {**manifest, "restored_to": str(target)}
