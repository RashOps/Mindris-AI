"""Implémentation des commandes opérateur."""

from __future__ import annotations

import json
import os
import subprocess
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


def lint(scope: str = "all") -> int:
    """Lance les validations statiques sélectionnées."""
    require_contributor_runtime()
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


def logs(service: str | None = None, *, follow: bool = False) -> int:
    """Affiche les logs canoniques sans commande Unix externe."""
    candidates = sorted(LOG_DIR.glob("*.log"))
    if service:
        candidates = [path for path in candidates if service in path.stem]
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
                    print(f"\n==> {path.name} <==")
                    print(content, end="" if content.endswith("\n") else "\n")
            if not follow:
                return 0
            import time

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
    import re

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
