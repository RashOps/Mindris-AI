"""Diagnostic de l'environnement contributeur."""

from __future__ import annotations

import json
import platform
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

from .context import MIN_PYTHON, ROOT, executable


@dataclass(frozen=True)
class Check:
    """Résultat sérialisable d'un diagnostic."""

    name: str
    ok: bool
    detail: str
    required: bool = True


def _version(command: list[str]) -> str:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "version indisponible"
    output = result.stdout.strip() or result.stderr.strip()
    return output.splitlines()[0] if output else "détecté"


def _tool(name: str, *, required: bool = True) -> Check:
    path = executable(name)
    detail = _version([path, "--version"]) if path else "introuvable"
    return Check(name, path is not None, detail, required)


def _port(port: int) -> Check:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        in_use = sock.connect_ex(("127.0.0.1", port)) == 0
    return Check(f"port:{port}", not in_use, "occupé" if in_use else "libre", False)


def _endpoint(name: str, url: str) -> Check:
    try:
        with urllib.request.urlopen(url, timeout=1) as response:  # noqa: S310
            ok = 200 <= response.status < 400
            return Check(name, ok, f"HTTP {response.status}", False)
    except (urllib.error.URLError, TimeoutError, OSError):
        return Check(name, False, "hors ligne", False)


def collect_checks() -> list[Check]:
    """Collecte les prérequis sans modifier le système."""
    python_ok = sys.version_info >= MIN_PYTHON
    checks = [
        Check("os", True, f"{platform.system()} {platform.machine()}", False),
        Check("python", python_ok, platform.python_version()),
        _tool("git"),
        _tool("uv"),
        _tool("bun"),
        _tool("docker", required=False),
        Check(
            ".env",
            (ROOT / ".env").is_file(),
            "présent" if (ROOT / ".env").is_file() else "absent",
            False,
        ),
    ]
    checks.extend(_port(port) for port in (3000, 4000, 8000))
    checks.extend(
        [
            _endpoint("web", "http://127.0.0.1:3000"),
            _endpoint("renderer", "http://127.0.0.1:4000/ready"),
            _endpoint("api", "http://127.0.0.1:8000/api/v1/system/ready"),
        ]
    )
    return checks


def doctor(*, json_output: bool = False) -> int:
    """Affiche le diagnostic et retourne un code selon les prérequis requis."""
    checks = collect_checks()
    if json_output:
        payload = [asdict(check) for check in checks]
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(f"Mindris doctor — {Path(ROOT).name}\n")
        for check in checks:
            marker = "✓" if check.ok else ("✗" if check.required else "·")
            print(f"{marker} {check.name:<14} {check.detail}")
    return 0 if all(check.ok for check in checks if check.required) else 2
