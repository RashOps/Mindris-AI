import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from mindris_cli.cli import build_parser, main  # noqa: E402
from mindris_cli.commands import release_verify  # noqa: E402
from mindris_cli.context import CliError, require_contributor_runtime  # noqa: E402
from mindris_cli.context import run as run_command  # noqa: E402
from mindris_cli.services import port_available  # noqa: E402


def test_parser_exposes_expected_commands() -> None:
    parser = build_parser()

    assert parser.parse_args(["doctor", "--json"]).json_output is True
    assert parser.parse_args(["test", "--scope", "backend"]).scope == "backend"
    assert parser.parse_args(["release", "verify", "v1.2.3"]).tag == "v1.2.3"


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


def test_port_available_detects_a_reserved_port() -> None:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(("127.0.0.1", 0))
        port = server.getsockname()[1]
        assert port_available(port) is False


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
