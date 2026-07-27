"""Implémentation des commandes opérateur."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

from .context import (
    LOG_DIR,
    ROOT,
    CliError,
    require_contributor_runtime,
    require_tool,
    run,
)


def setup(*, check_only: bool = False) -> int:
    """Prépare le workspace avec les gestionnaires canoniques."""
    require_contributor_runtime()
    if check_only:
        print("✓ Python, uv et Bun sont disponibles.")
        return 0
    env_file = ROOT / ".env"
    example = ROOT / ".env.example"
    if not env_file.exists() and example.exists():
        env_file.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
        print("✓ .env créé depuis .env.example")
    run(["uv", "sync", "--all-packages", "--frozen"])
    run(["uv", "run", "playwright", "install", "chromium"])
    run(["bun", "install", "--frozen-lockfile"], cwd=ROOT / "apps/web")
    run(["bun", "install", "--frozen-lockfile"], cwd=ROOT / "services/renderer")
    require_tool("bunx")
    run(
        ["bunx", "puppeteer", "browsers", "install", "chrome"],
        cwd=ROOT / "services/renderer",
    )
    print("✓ Workspace Mindris initialisé.")
    return 0


def reset_dependencies() -> int:
    """Réinstalle les dépendances locales sans supprimer les lockfiles."""
    require_contributor_runtime()
    for path in (
        ROOT / ".venv",
        ROOT / "apps/web/node_modules",
        ROOT / "services/renderer/node_modules",
    ):
        if path.exists():
            shutil.rmtree(path)
    run(["uv", "sync", "--all-packages"])
    run(["bun", "install", "--frozen-lockfile"], cwd=ROOT / "apps/web")
    run(["bun", "install", "--frozen-lockfile"], cwd=ROOT / "services/renderer")
    print("✓ Dépendances locales réinstallées.")
    return 0


def lint(scope: str = "all") -> int:
    """Lance les validations statiques sélectionnées."""
    require_contributor_runtime()
    if scope == "all":
        run([sys.executable, "scripts/check_markdown_links.py"])
    if scope in {"all", "backend"}:
        run(["uv", "run", "--no-sync", "ruff", "check", "."])
        run(["uv", "run", "--no-sync", "ruff", "format", "--check", "."])
    if scope in {"all", "frontend"}:
        run(["bun", "run", "lint"], cwd=ROOT / "apps/web")
        run(["bun", "run", "typecheck"], cwd=ROOT / "apps/web")
        run(["bun", "run", "build"], cwd=ROOT / "apps/web")
    if scope in {"all", "renderer"}:
        run(["bun", "run", "typecheck"], cwd=ROOT / "services/renderer")
        run(["bun", "run", "build"], cwd=ROOT / "services/renderer")
    return 0


def test(scope: str = "all", *, with_e2e: bool = False) -> int:
    """Lance les tests sélectionnés."""
    require_contributor_runtime()
    if scope in {"all", "backend"}:
        run(["uv", "run", "--no-sync", "pytest", "tests/", "-q"])
    if scope in {"all", "frontend"}:
        run(["bun", "test"], cwd=ROOT / "apps/web")
    if scope in {"all", "renderer"}:
        run(["bun", "test"], cwd=ROOT / "services/renderer")
    if with_e2e:
        e2e()
    return 0


def check(*, with_e2e: bool = False, with_smoke: bool = False) -> int:
    """Enchaîne lint, tests et contrôles optionnels."""
    lint()
    test()
    if with_smoke:
        smoke()
    if with_e2e:
        e2e()
    return 0


def smoke(
    *,
    api_url: str = "http://127.0.0.1:8000",
    renderer_url: str = "http://127.0.0.1:4000",
    web_url: str = "http://127.0.0.1:3000",
) -> int:
    """Vérifie les endpoints locaux sans dépendre de curl."""
    from .services import _ready

    endpoints = [
        ("API", f"{api_url}/"),
        ("API status", f"{api_url}/api/v1/system/status"),
        ("Renderer", f"{renderer_url}/"),
        ("Web", f"{web_url}/"),
    ]
    failed = False
    for name, url in endpoints:
        ok = _ready(url)
        failed = failed or not ok
        print(f"{'✓' if ok else '✗'} {name:<12} {url}")
    return 1 if failed else 0


def e2e(
    *,
    web_url: str = "http://127.0.0.1:3000",
    api_url: str = "http://127.0.0.1:8000",
) -> int:
    """Lance le scénario navigateur via le Python géré par uv."""
    require_contributor_runtime(needs_bun=False)
    api_key = os.environ.get("API_KEY", "dev-mindris-api-key")
    run(
        [
            "uv",
            "run",
            "--no-sync",
            "python",
            "tests/e2e/mvp1_browser.py",
            "--base-url",
            web_url,
            "--api-url",
            api_url,
            "--api-key",
            api_key,
        ],
        sensitive_values=(api_key,),
    )
    return 0


def _since_timestamp(value: str | None) -> float | None:
    if value is None:
        return None
    units = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    if len(value) > 1 and value[-1] in units and value[:-1].isdigit():
        return time.time() - int(value[:-1]) * units[value[-1]]
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError as error:
        raise CliError(
            "--since attend une durée (30s, 10m, 2h, 1d) ou une date ISO 8601.",
            2,
        ) from error


def _line_timestamp(line: str) -> float | None:
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        match = re.match(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})]", line)
        if not match:
            return None
        parsed = datetime.strptime(match.group(1), "%Y-%m-%d %H:%M:%S")
        return parsed.astimezone().timestamp()
    raw = payload.get("timestamp") or payload.get("time")
    if not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _filter_log_content(
    content: str,
    *,
    since: float | None,
    request_id: str | None,
) -> str:
    selected: list[str] = []
    for line in content.splitlines(keepends=True):
        if request_id and request_id not in line:
            continue
        timestamp = _line_timestamp(line)
        if since is not None and timestamp is not None and timestamp < since:
            continue
        selected.append(line)
    return "".join(selected)


def logs(
    service: str | None = None,
    *,
    follow: bool = False,
    since: str | None = None,
    request_id: str | None = None,
) -> int:
    """Affiche les logs canoniques sans commande Unix externe."""
    since_timestamp = _since_timestamp(since)
    candidates = sorted(LOG_DIR.rglob("*.log"))
    if service:
        candidates = [path for path in candidates if path.stem == service]
    if not candidates:
        raise CliError(f"Aucun log correspondant dans {LOG_DIR}")
    positions: dict[Path, int] = {}
    try:
        while True:
            for path in candidates:
                with path.open(encoding="utf-8", errors="replace") as stream:
                    if follow:
                        stream.seek(positions.get(path, 0))
                    content = stream.read()
                    positions[path] = stream.tell()
                if content:
                    content = _filter_log_content(
                        content,
                        since=since_timestamp,
                        request_id=request_id,
                    )
                if content:
                    relative_path = path.relative_to(LOG_DIR)
                    print(f"\n==> {relative_path} <==")
                    print(content, end="" if content.endswith("\n") else "\n")
            if not follow:
                return 0
            time.sleep(1)
    except KeyboardInterrupt:
        return 0


def docker(command: str) -> int:
    """Pilote Docker Compose sans shell intermédiaire."""
    require_tool("docker", "Docker Engine ou Docker Desktop est requis.")
    if command == "doctor":
        if not (ROOT / ".env").exists():
            raise CliError(".env absent. Lancez : mindris setup", 2)
        run(["docker", "compose", "config", "--quiet"])
    elif command == "build":
        run(["docker", "compose", "build"])
    elif command == "up":
        run(["docker", "compose", "up", "--build"])
    elif command == "down":
        run(["docker", "compose", "down"])
    elif command == "logs":
        run(["docker", "compose", "logs", "--follow"])
    elif command == "status":
        run(["docker", "compose", "ps"])
    elif command == "smoke":
        return smoke()
    return 0


def release_verify(stable_tag: str, *, main_ref: str = "origin/main") -> int:
    """Vérifie en Python la même politique Git que le gate CI shell."""
    require_tool("git")
    if not re.fullmatch(r"v\d+\.\d+\.\d+", stable_tag):
        raise CliError(f"Tag stable invalide : {stable_tag}", 2)

    def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", *args],
            cwd=ROOT,
            capture_output=True,
            check=check,
            text=True,
        )

    stable = git("rev-parse", f"{stable_tag}^{{commit}}").stdout.strip()
    stable_tree = git("rev-parse", f"{stable_tag}^{{tree}}").stdout.strip()
    if git("merge-base", "--is-ancestor", stable, main_ref, check=False).returncode:
        raise CliError(f"{stable_tag} n'appartient pas à {main_ref}")
    tags = git(
        "tag", "--list", f"{stable_tag}-rc.*", "--sort=-version:refname"
    ).stdout.splitlines()
    for candidate in tags:
        commit = git("rev-parse", f"{candidate}^{{commit}}").stdout.strip()
        tree = git("rev-parse", f"{candidate}^{{tree}}").stdout.strip()
        ancestor = git("merge-base", "--is-ancestor", commit, stable, check=False)
        if ancestor.returncode == 0 and tree == stable_tree:
            payload = {
                "stable_tag": stable_tag,
                "rc_tag": candidate,
                "tree": stable_tree,
            }
            print(json.dumps(payload, indent=2))
            return 0
    raise CliError(f"Aucun RC ancêtre de {stable_tag} ne partage son arbre Git.")
