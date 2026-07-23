import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from mindris_cli.backup import (  # noqa: E402
    create_backup,
    inspect_backup,
    restore_backup,
)
from mindris_cli.cli import build_parser, main  # noqa: E402
from mindris_cli.commands import logs, release_verify  # noqa: E402
from mindris_cli.context import (  # noqa: E402
    PROCESS_LOG_DIR,
    RUNTIME_DIR,
    CliError,
    require_contributor_runtime,
)
from mindris_cli.context import run as run_command  # noqa: E402
from mindris_cli.services import (  # noqa: E402
    port_available,
    stop_services,
    validate_ports,
)


def test_parser_exposes_expected_commands() -> None:
    parser = build_parser()

    assert parser.parse_args(["doctor", "--json"]).json_output is True
    assert parser.parse_args(["test", "--scope", "backend"]).scope == "backend"
    assert parser.parse_args(["release", "verify", "v1.2.3"]).tag == "v1.2.3"
    assert parser.parse_args(["backup", "create", "backup.zip"]).archive == Path(
        "backup.zip"
    )
    parsed_logs = parser.parse_args(
        ["logs", "api-gateway", "--since", "10m", "--request-id", "request-1"]
    )
    assert parsed_logs.since == "10m"
    assert parsed_logs.request_id == "request-1"


def test_cli_uses_separate_process_and_runtime_log_directories() -> None:
    assert PROCESS_LOG_DIR.name == "process"
    assert RUNTIME_DIR.name == "runtime"
    assert PROCESS_LOG_DIR.parent == RUNTIME_DIR.parent


def test_contributor_runtime_requires_uv(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("mindris_cli.context.executable", lambda name: None)

    with pytest.raises(CliError, match="uv est requis"):
        require_contributor_runtime()


def test_main_returns_operator_error_without_traceback(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        "mindris_cli.cli.doctor",
        lambda json_output=False: (_ for _ in ()).throw(CliError("test", 2)),
    )

    assert main(["doctor"]) == 2
    assert "Erreur : test" in capsys.readouterr().out


def test_runner_redacts_sensitive_values(
    capsys: pytest.CaptureFixture[str],
) -> None:
    run_command(
        [sys.executable, "-c", "pass", "secret-value"],
        sensitive_values=("secret-value",),
    )

    output = capsys.readouterr().out
    assert "secret-value" not in output
    assert "***" in output


def test_runner_supports_a_working_directory_with_spaces(tmp_path: Path) -> None:
    working_directory = tmp_path / "workspace with spaces"
    working_directory.mkdir()

    result = run_command(
        [sys.executable, "-c", "from pathlib import Path; print(Path.cwd().name)"],
        cwd=working_directory,
    )

    assert result.returncode == 0


def test_backup_round_trip_excludes_runtime_secrets(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    (source / "mindris.db").write_bytes(b"sqlite-data")
    (source / "vectordb").mkdir()
    (source / "vectordb" / "index.bin").write_bytes(b"vector-data")
    (source / "runtime-secrets.json").write_text('{"token":"secret"}')
    archive = tmp_path / "mindris-backup.zip"

    created = create_backup(archive, storage=source)
    inspected = inspect_backup(archive)
    target = tmp_path / "restored"
    restored = restore_backup(archive, storage=target)

    assert created["secrets_included"] is False
    assert inspected["file_count"] == 2
    assert restored["restored_to"] == str(target.resolve())
    assert (target / "mindris.db").read_bytes() == b"sqlite-data"
    assert (target / "vectordb" / "index.bin").read_bytes() == b"vector-data"
    assert not (target / "runtime-secrets.json").exists()


def test_backup_restore_replaces_existing_storage(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    (source / "mindris.db").write_bytes(b"new")
    archive = tmp_path / "mindris-backup.zip"
    create_backup(archive, storage=source)
    target = tmp_path / "target"
    target.mkdir()
    (target / "mindris.db").write_bytes(b"old")
    (target / "obsolete.txt").write_text("obsolete")

    restore_backup(archive, storage=target)

    assert (target / "mindris.db").read_bytes() == b"new"
    assert not (target / "obsolete.txt").exists()


def test_port_available_detects_a_reserved_port() -> None:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(("127.0.0.1", 0))
        port = server.getsockname()[1]
        assert port_available(port) is False


@pytest.mark.parametrize("ports", [(0, 4000, 3000), (8000, 8000, 3000)])
def test_validate_ports_rejects_invalid_or_duplicate_ports(
    ports: tuple[int, int, int],
) -> None:
    with pytest.raises(CliError):
        validate_ports(*ports)


def test_stop_ignores_a_reused_process_identifier(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state_file = tmp_path / "state.json"
    state_file.write_text(
        json.dumps(
            {"services": [{"name": "api", "pid": 42, "identity": "old-process"}]}
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("mindris_cli.services.STATE_FILE", state_file)
    monkeypatch.setattr(
        "mindris_cli.services._process_identity", lambda pid: "new-process"
    )
    terminated: list[int] = []
    monkeypatch.setattr(
        "mindris_cli.services.os.killpg",
        lambda pid, sig: terminated.append(pid),
    )

    assert stop_services() == 0
    assert terminated == []
    assert not state_file.exists()


def test_logs_filter_service_since_and_request_id(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    service_dir = tmp_path / "services"
    service_dir.mkdir()
    (service_dir / "api-gateway.log").write_text(
        "[2026-07-23 08:00:00] INFO legacy\n"
        '{"timestamp":"2026-07-23T09:00:00Z","request_id":"old"}\n'
        '{"timestamp":"2026-07-23T11:00:00Z","request_id":"wanted"}\n',
        encoding="utf-8",
    )
    monkeypatch.setattr("mindris_cli.commands.LOG_DIR", tmp_path)

    assert (
        logs(
            "api-gateway",
            since="2026-07-23T10:00:00Z",
            request_id="wanted",
        )
        == 0
    )
    output = capsys.readouterr().out
    assert "services/api-gateway.log" in output
    assert "wanted" in output
    assert '"old"' not in output


def _git(directory: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args],
        cwd=directory,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def test_python_release_verifier_accepts_equivalent_merge_tree(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _git(tmp_path, "init", "-q", "-b", "main")
    _git(tmp_path, "config", "user.name", "Mindris CI")
    _git(tmp_path, "config", "user.email", "ci@mindris.local")
    (tmp_path / "release.txt").write_text("candidate", encoding="utf-8")
    _git(tmp_path, "add", "release.txt")
    _git(tmp_path, "commit", "-qm", "candidate")
    _git(tmp_path, "tag", "v1.2.3-rc.1")
    _git(tmp_path, "commit", "--allow-empty", "-qm", "merge equivalent")
    _git(tmp_path, "tag", "v1.2.3")
    monkeypatch.setattr("mindris_cli.commands.ROOT", tmp_path)
    monkeypatch.setattr("mindris_cli.commands.require_tool", lambda name: "git")

    assert release_verify("v1.2.3", main_ref="main") == 0
    result = json.loads(capsys.readouterr().out)
    assert result["rc_tag"] == "v1.2.3-rc.1"


@pytest.mark.skipif(os.name == "nt", reason="Le lanceur sh est testé par la CI Linux")
def test_unix_launcher_displays_help() -> None:
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [str(root / "mindris"), "--help"],
        cwd=root,
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0
    assert "CLI contributeur Mindris AI" in result.stdout
