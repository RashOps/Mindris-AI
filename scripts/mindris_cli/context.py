"""Contexte partagé, chemins et exécution de processus."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = ROOT / ".logs"
STATE_FILE = LOG_DIR / "mindris-dev.json"
MIN_PYTHON = (3, 12)


class CliError(RuntimeError):
    """Erreur attendue affichable sans traceback."""

    def __init__(self, message: str, exit_code: int = 1) -> None:
        super().__init__(message)
        self.exit_code = exit_code


@dataclass(frozen=True)
class Tool:
    """État d'un outil externe."""

    name: str
    path: str | None
    required: bool = True

    @property
    def available(self) -> bool:
        """Indique si l'exécutable a été trouvé."""
        return self.path is not None


def executable(name: str) -> str | None:
    """Résout un exécutable, avec les extensions Windows gérées par shutil."""
    return shutil.which(name)


def require_tool(name: str, message: str | None = None) -> str:
    """Retourne un exécutable ou interrompt proprement la commande."""
    path = executable(name)
    if path:
        return path
    raise CliError(message or f"Outil requis introuvable : {name}", 2)


def workspace_env(extra: Mapping[str, str] | None = None) -> dict[str, str]:
    """Construit un environnement enfant sans journaliser les secrets."""
    env = os.environ.copy()
    if extra:
        env.update(extra)
    return env


def run(
    command: Sequence[str],
    *,
    cwd: Path = ROOT,
    env: Mapping[str, str] | None = None,
    check: bool = True,
    sensitive_values: Sequence[str] = (),
) -> subprocess.CompletedProcess[str]:
    """Exécute une commande de manière portable et lisible."""
    visible = list(command)
    for index, argument in enumerate(visible):
        if argument and argument in sensitive_values:
            visible[index] = "***"
    print(f"→ {' '.join(visible)}")
    return subprocess.run(
        list(command),
        cwd=cwd,
        env=workspace_env(env),
        check=check,
        text=True,
    )


def require_contributor_runtime(*, needs_bun: bool = True) -> None:
    """Applique le contrat de contribution reproductible du dépôt."""
    if sys.version_info < MIN_PYTHON:
        version = ".".join(map(str, MIN_PYTHON))
        raise CliError(f"Python {version} ou supérieur est requis.", 2)
    if not executable("uv"):
        raise CliError(uv_install_help(), 2)
    if needs_bun and not executable("bun"):
        raise CliError(
            "Bun est requis pour le frontend et le renderer : https://bun.sh/docs/installation",
            2,
        )


def uv_install_help() -> str:
    """Retourne l'aide officielle adaptée à la plateforme."""
    if os.name == "nt":
        command = (
            "powershell -ExecutionPolicy ByPass -c "
            '"irm https://astral.sh/uv/install.ps1 | iex"'
        )
    else:
        command = "curl -LsSf https://astral.sh/uv/install.sh | sh"
    return (
        "uv est requis pour garantir le même workspace Python en local et en CI.\n"
        "pip, Poetry et Conda ne sont pas supportés pour valider une contribution.\n\n"
        f"Installation :\n  {command}"
    )
