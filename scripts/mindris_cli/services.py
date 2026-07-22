"""Supervision multiplateforme des services locaux."""

from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

from .context import (
    LOG_DIR,
    ROOT,
    STATE_FILE,
    CliError,
    require_contributor_runtime,
    workspace_env,
)


def port_available(port: int) -> bool:
    """Vérifie qu'un port loopback peut être réservé."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def _process_flags() -> dict[str, object]:
    if os.name == "nt":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


def _start(
    name: str,
    command: list[str],
    cwd: Path,
    env: dict[str, str],
) -> tuple[subprocess.Popen[str], object]:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    stream = (LOG_DIR / f"{name}.log").open("a", encoding="utf-8")
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=workspace_env(env),
        stdout=stream,
        stderr=subprocess.STDOUT,
        text=True,
        **_process_flags(),
    )
    return process, stream


def _ready(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=2) as response:  # noqa: S310
            return 200 <= response.status < 400
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def _terminate(pid: int) -> None:
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], check=False)
        else:
            os.killpg(pid, signal.SIGTERM)
    except (OSError, ProcessLookupError):
        pass


def stop_services() -> int:
    """Arrête les processus enregistrés par `mindris dev`."""
    if not STATE_FILE.exists():
        print("Aucune stack Mindris enregistrée.")
        return 0
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        for service in state.get("services", []):
            _terminate(int(service["pid"]))
    finally:
        STATE_FILE.unlink(missing_ok=True)
    print("Services Mindris arrêtés.")
    return 0


def dev(*, api_port: int, renderer_port: int, web_port: int, open_browser: bool) -> int:
    """Lance et supervise API, renderer et frontend."""
    require_contributor_runtime()
    if not (ROOT / ".env").exists():
        raise CliError(".env absent. Lancez d'abord : mindris setup", 2)
    occupied = [
        port for port in (api_port, renderer_port, web_port) if not port_available(port)
    ]
    if occupied:
        raise CliError(f"Ports déjà utilisés : {', '.join(map(str, occupied))}", 2)

    specs = [
        (
            "api-gateway",
            [
                "uv",
                "run",
                "uvicorn",
                "main:app",
                "--app-dir",
                "services/api-gateway",
                "--reload",
                "--port",
                str(api_port),
            ],
            ROOT,
            {},
        ),
        (
            "renderer",
            ["bun", "run", "dev"],
            ROOT / "services/renderer",
            {"PORT": str(renderer_port)},
        ),
        ("web", ["bun", "run", "dev", "--port", str(web_port)], ROOT / "apps/web", {}),
    ]
    processes: list[subprocess.Popen[str]] = []
    streams: list[object] = []
    try:
        for name, command, cwd, env in specs:
            process, stream = _start(name, command, cwd, env)
            processes.append(process)
            streams.append(stream)
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(
            json.dumps(
                {
                    "services": [
                        {"name": spec[0], "pid": process.pid}
                        for spec, process in zip(specs, processes, strict=True)
                    ]
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        urls = [
            ("API", f"http://127.0.0.1:{api_port}/api/v1/system/ready"),
            ("Renderer", f"http://127.0.0.1:{renderer_port}/ready"),
            ("Web", f"http://127.0.0.1:{web_port}"),
        ]
        for _ in range(60):
            if any(process.poll() is not None for process in processes):
                raise CliError(f"Un service s'est arrêté. Consultez {LOG_DIR}")
            if all(_ready(url) for _, url in urls):
                break
            time.sleep(1)
        else:
            raise CliError(f"La stack n'est pas prête. Consultez {LOG_DIR}")
        print("Mindris development stack\n")
        for name, url in urls:
            print(f"✓ {name:<10} {url}")
        print(f"\nLogs : {LOG_DIR}\nCtrl+C pour arrêter.")
        if open_browser:
            webbrowser.open(f"http://127.0.0.1:{web_port}")
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        for process in processes:
            _terminate(process.pid)
        for stream in streams:
            stream.close()
        STATE_FILE.unlink(missing_ok=True)


def status(api_port: int, renderer_port: int, web_port: int) -> int:
    """Affiche la disponibilité des trois surfaces locales."""
    checks = [
        ("API", f"http://127.0.0.1:{api_port}/api/v1/system/ready"),
        ("Renderer", f"http://127.0.0.1:{renderer_port}/ready"),
        ("Web", f"http://127.0.0.1:{web_port}"),
    ]
    ok = True
    for name, url in checks:
        ready = _ready(url)
        ok = ok and ready
        print(f"{'✓' if ready else '✗'} {name:<10} {url}")
    return 0 if ok else 1
