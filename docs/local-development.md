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

Logs :

```text
.logs/api-gateway.log
.logs/renderer.log
.logs/web.log
```

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

- creation d'un CV fixture via l'API ;
- ouverture du CV Builder ;
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

## Notes

Les scripts ne lisent pas le contenu de `.env` dans la sortie terminal et ne doivent pas afficher de secrets.
