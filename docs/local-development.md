# Developpement local sans Docker

Date : 24 juin 2026

Ce workflow lance les trois services locaux sans Docker :

- API Gateway FastAPI : `http://localhost:8000`
- Renderer Bun/Elysia : `http://localhost:4000`
- Frontend Next.js : `http://localhost:3000`

## Prerequis

- `uv`
- `bun`
- Python 3.12 compatible avec le workspace
- Un fichier `.env` a la racine du projet

## Premiere installation

```bash
./scripts/setup_local.sh
```

Ce script :

- cree `.env` depuis `.env.example` si `.env` n'existe pas ;
- installe les dependances Python avec `uv sync --all-packages` ;
- installe Chromium Playwright ;
- installe les dependances du frontend ;
- installe les dependances du renderer.

## Reinstallation propre des dependances

```bash
./scripts/reset_local_deps.sh
```

Ce script supprime uniquement les installations locales :

- `.venv`
- `apps/web/node_modules`
- `services/renderer/node_modules`

Il conserve les lockfiles.

## Lancer les services

```bash
./scripts/dev_local.sh
```

Le script demarre :

- l'API Gateway avec reload Uvicorn ;
- le renderer avec `bun run dev` et watch reload ;
- le frontend avec `bun run dev`.

Logs :

```text
.logs/api-gateway.log
.logs/intelligence.log
.logs/renderer.log
.logs/scraper.log
.logs/web.log
```

`renderer.log` contient maintenant des lignes JSON structurees exploitables pour le debug local.
Les modules Python utilisent aussi des fichiers separes par service pour eviter le melange des traces.
Le dossier canonique pour les logs locaux est `.logs/`.

Ports personnalisables :

```bash
API_PORT=8010 RENDERER_PORT=4010 WEB_PORT=3010 ./scripts/dev_local.sh
```

## Smoke check

Dans un autre terminal, une fois les services lances :

```bash
./scripts/smoke_local.sh
```

## E2E navigateur MVP1

Une fois les trois services lances et le smoke check OK :

```bash
./scripts/e2e_browser.sh
```

Ce parcours automatise :

- import d'un community template package ;
- export du package depuis le dashboard ;
- creation d'un CV fixture via l'API ;
- ouverture du CV Builder ;
- creation et activation d'une variante multilingue FR/EN ;
- changement de template ;
- export DOCX ;
- export PDF via le renderer ;
- affichage d'un rapport ATS fixture ;
- creation et deplacement d'une candidature dans le Job Tracker.

Variables personnalisables :

```bash
API_URL=http://localhost:8010 \
RENDERER_URL=http://localhost:4010 \
WEB_URL=http://localhost:3010 \
./scripts/smoke_local.sh
```

## Job navigateur manuel en CI

Le workflow GitHub Actions expose aussi un job manuel `browser-e2e` via `workflow_dispatch`.

Il :

- installe les dependances `uv` et `bun` ;
- lance la stack locale via `./scripts/dev_local.sh` ;
- attend le `smoke_local.sh` ;
- execute `./scripts/e2e_browser.sh` ;
- publie les logs `.logs` en artefact.

## Notes

Les scripts ne lisent pas le contenu de `.env` dans la sortie terminal et ne doivent pas afficher de secrets.
Le dossier `logs/` est considere comme legacy local; les nouveaux flux utilisent `.logs/`.
