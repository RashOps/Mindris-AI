"""Parser de commandes de la CLI Mindris."""

from __future__ import annotations

import argparse
import subprocess

from . import __version__
from .commands import (
    check,
    docker,
    e2e,
    lint,
    logs,
    release_verify,
    reset_dependencies,
    setup,
    smoke,
    test,
)
from .context import CliError
from .doctor import doctor
from .services import dev, status, stop_services


def _scope(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--scope",
        choices=("all", "backend", "frontend", "renderer"),
        default="all",
    )


def build_parser() -> argparse.ArgumentParser:
    """Construit le contrat public de commandes."""
    parser = argparse.ArgumentParser(
        prog="mindris", description="CLI contributeur Mindris AI"
    )
    parser.add_argument(
        "--version", action="version", version=f"%(prog)s {__version__}"
    )
    commands = parser.add_subparsers(dest="command", required=True)

    doctor_parser = commands.add_parser("doctor", help="Diagnostiquer l'environnement")
    doctor_parser.add_argument("--json", action="store_true", dest="json_output")

    setup_parser = commands.add_parser("setup", help="Initialiser le workspace")
    setup_parser.add_argument("--check", action="store_true", dest="check_only")
    commands.add_parser("reset-deps", help="Réinstaller les dépendances locales")

    dev_parser = commands.add_parser("dev", help="Lancer la stack locale")
    dev_parser.add_argument("--api-port", type=int, default=8000)
    dev_parser.add_argument("--renderer-port", type=int, default=4000)
    dev_parser.add_argument("--web-port", type=int, default=3000)
    dev_parser.add_argument("--no-open", action="store_false", dest="open_browser")
    dev_parser.set_defaults(open_browser=True)

    commands.add_parser("stop", help="Arrêter la stack lancée par la CLI")
    status_parser = commands.add_parser("status", help="Vérifier les services locaux")
    status_parser.add_argument("--api-port", type=int, default=8000)
    status_parser.add_argument("--renderer-port", type=int, default=4000)
    status_parser.add_argument("--web-port", type=int, default=3000)

    lint_parser = commands.add_parser("lint", help="Lancer lint, types et builds")
    _scope(lint_parser)
    test_parser = commands.add_parser("test", help="Lancer les tests")
    _scope(test_parser)
    test_parser.add_argument("--with-e2e", action="store_true")
    check_parser = commands.add_parser("check", help="Lancer tous les contrôles")
    check_parser.add_argument("--with-e2e", action="store_true")
    check_parser.add_argument("--with-smoke", action="store_true")

    smoke_parser = commands.add_parser("smoke", help="Tester la stack locale")
    smoke_parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    smoke_parser.add_argument("--renderer-url", default="http://127.0.0.1:4000")
    smoke_parser.add_argument("--web-url", default="http://127.0.0.1:3000")
    e2e_parser = commands.add_parser("e2e", help="Lancer le navigateur E2E")
    e2e_parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    e2e_parser.add_argument("--web-url", default="http://127.0.0.1:3000")

    logs_parser = commands.add_parser("logs", help="Lire les logs .logs")
    logs_parser.add_argument("service", nargs="?")
    logs_parser.add_argument("--follow", "-f", action="store_true")
    logs_parser.add_argument(
        "--since",
        help="Limiter à une durée (10m, 2h) ou une date ISO 8601",
    )
    logs_parser.add_argument("--request-id", help="Filtrer par identifiant de requête")

    docker_parser = commands.add_parser("docker", help="Piloter Docker Compose")
    docker_parser.add_argument(
        "action",
        choices=("doctor", "build", "up", "down", "smoke", "logs", "status"),
    )
    release_parser = commands.add_parser("release", help="Contrôles de release")
    release_commands = release_parser.add_subparsers(
        dest="release_command", required=True
    )
    verify_parser = release_commands.add_parser("verify", help="Vérifier un tag stable")
    verify_parser.add_argument("tag")
    verify_parser.add_argument("--main-ref", default="origin/main")
    return parser


def dispatch(args: argparse.Namespace) -> int:
    """Distribue une commande parsée."""
    handlers = {
        "doctor": lambda: doctor(json_output=args.json_output),
        "setup": lambda: setup(check_only=args.check_only),
        "reset-deps": reset_dependencies,
        "dev": lambda: dev(
            api_port=args.api_port,
            renderer_port=args.renderer_port,
            web_port=args.web_port,
            open_browser=args.open_browser,
        ),
        "stop": stop_services,
        "status": lambda: status(args.api_port, args.renderer_port, args.web_port),
        "lint": lambda: lint(args.scope),
        "test": lambda: test(args.scope, with_e2e=args.with_e2e),
        "check": lambda: check(with_e2e=args.with_e2e, with_smoke=args.with_smoke),
        "smoke": lambda: smoke(
            api_url=args.api_url,
            renderer_url=args.renderer_url,
            web_url=args.web_url,
        ),
        "e2e": lambda: e2e(web_url=args.web_url, api_url=args.api_url),
        "logs": lambda: logs(
            args.service,
            follow=args.follow,
            since=args.since,
            request_id=args.request_id,
        ),
        "docker": lambda: docker(args.action),
        "release": lambda: release_verify(args.tag, main_ref=args.main_ref),
    }
    return handlers[args.command]()


def main(argv: list[str] | None = None) -> int:
    """Exécute la CLI avec des erreurs opérateur concises."""
    try:
        return dispatch(build_parser().parse_args(argv))
    except CliError as error:
        print(f"Erreur : {error}")
        return error.exit_code
    except subprocess.CalledProcessError as error:
        print(f"Commande échouée avec le code {error.returncode}.")
        return error.returncode or 1
