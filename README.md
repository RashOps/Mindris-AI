# Mindris AI

> Un cockpit local-first pour transformer une offre en candidature complète,
> vérifiable et exportable — sans disperser vos données entre six outils.

Mindris AI est un studio local-first pour préparer une candidature complète :
importer un CV, analyser une offre, adapter le contenu, générer les artefacts
utiles, exporter un PDF propre et suivre l’opportunité.

Le navigateur reste un client. Les décisions métier, secrets, historiques,
exports et orchestrations IA sont backend-owned.

## Ce que fait l’application

- CV Builder avec modes Simple, Normal et Avancé.
- Parsing de CV PDF via le backend.
- Scraping d’offres avec Playwright et stratégie de fallback.
- Analyse ATS avec historique persistant.
- Génération de lettres de motivation avec historique et versions.
- Markdown to PDF / DOCX pour éditer et exporter des documents.
- Tracker de candidatures.
- Workflow Beta pour relier job, CV, ATS, lettre et tracker.
- History ledger pour auditer les artefacts et runs IA.
- Renderer Bun/Puppeteer pour produire les exports HTML/PDF.
- Configuration locale des providers IA, defaults et diagnostics runtime.

## Installation rapide Docker

Quand les images GHCR sont publiées, l’installation self-hosted ne nécessite
pas de cloner le dépôt :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh | sh
```

Le script crée `~/.mindris-ai`, télécharge le compose de release, génère un
`.env` privé, récupère les images et lance le stack.

URLs par défaut :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

Si le port `3000` est déjà utilisé, choisissez `3100` dès l’installation :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh \
  | MINDRIS_WEB_PORT=3100 sh
```

L’interface sera disponible sur `http://localhost:3100`.

Commandes utiles :

```bash
~/.mindris-ai/update.sh
~/.mindris-ai/smoke.sh
~/.mindris-ai/uninstall.sh
```

Nettoyage complet d’un environnement de test depuis un clone :

```bash
REMOVE_DATA=true ./scripts/clean_self_hosted_test.sh
```

Guide détaillé : [docs/install.md](docs/install.md).

## Développement local depuis le dépôt

Prérequis :

| Outil | Usage |
|---|---|
| Python 3.12 | backend FastAPI, intelligence, scraper |
| uv | workspace Python |
| Bun | frontend Next.js et renderer |
| Docker | packaging self-hosted |
| Playwright Chromium | scraping, tests visuels, renderer |

Installation :

```bash
git clone git@github.com:RashOps/Mindris-AI.git
cd Mindris-AI
./scripts/setup_local.sh
```

Lancer le stack local :

```bash
./scripts/dev_local.sh
```

Smoke check :

```bash
./scripts/smoke_local.sh
```

Validation globale :

```bash
./scripts/check_all.sh
```

## Configuration

Crée un `.env` local à partir de l’exemple du dépôt si nécessaire. Ne commit
jamais de vraie clé.

Variables principales :

| Variable | Rôle |
|---|---|
| `API_KEY` | clé opérateur pour scripts et appels non navigateur |
| `RENDERER_URL` | URL du renderer Bun |
| `CORS_ORIGINS` | origines web réseau autorisées, séparées par des virgules ; les ports loopback sont autorisés automatiquement |
| `MAX_PDF_UPLOAD_BYTES` | limite d’upload PDF |
| `OPENAI_API_KEY` | provider OpenAI optionnel |
| `GROQ_API_KEY` | provider Groq optionnel |
| `GEMINI_API_KEY` | provider Gemini optionnel |
| `MISTRAL_API_KEY` | provider Mistral optionnel |
| `LLAMA_CLOUD_API_KEY` | parsing PDF optionnel via LlamaCloud |
| `SCRAPER_HEADLESS` | mode headless du scraper |

Les secrets sont write-only côté produit : l’UI peut indiquer qu’un secret est
configuré, mais ne doit jamais afficher sa valeur brute.

## Architecture

```text
apps/web
  Next.js client-only UI

services/api-gateway
  FastAPI, contrats produit, persistance, routes publiques locales

services/intelligence
  scoring ATS, génération de lettres, providers IA, logique workflow

services/scraper
  scraping Playwright et fallback providers

services/renderer
  Bun/Elysia + Puppeteer pour HTML/PDF

packages/database
  SQLite, records, migrations et persistance partagée

packages/utils
  settings, logs, runtime utilities
```

Flux simplifié :

```text
Offre URL/PDF/CV
  -> API Gateway
  -> Scraper ou parser
  -> Intelligence
  -> Database locale
  -> Frontend
  -> Renderer pour export PDF
```

## Frontières importantes

- Le frontend est client-only.
- Le frontend ne devient pas un backend caché.
- L’état durable et les secrets appartiennent au backend.
- Le browser lit/écrit via les APIs.
- Les exports passent par le renderer.
- `.logs/` est le répertoire canonique des logs locaux.
- Les routes API ne doivent pas exposer de secrets bruts dans les réponses ou logs.

## Surfaces produit

| Surface | Statut | Rôle |
|---|---|---|
| Dashboard | stable | vue d’entrée, résumés, diagnostics |
| CV Builder | prioritaire | édition CV, modes Simple/Normal/Avancé, preview/export |
| ATS Score | stable | rapport ATS persistant et lié au job quand disponible |
| Markdown PDF | stable | édition/export Markdown, lettres générées et versions |
| Tracker | stable | suivi des candidatures |
| History | stable | ledger unifié job ↔ ATS ↔ lettre ↔ workflow ↔ tracker |
| Workflow | Beta | chaînage d’opportunité, encore volontairement signalé comme Beta |
| Guide | actif | parcours visuels, checklists et règles d’usage |

## Validation développeur

Backend Python :

```bash
uv run pytest tests/test_history_api.py tests/test_workflows_api.py tests/test_ats_score.py
uv run ruff check services packages tests
```

Frontend :

```bash
cd apps/web
bun run lint
bun run typecheck
```

Renderer :

```bash
cd services/renderer
bun run typecheck
bun run build
```

Docker release :

```bash
docker compose -f docker-compose.release.yml config --quiet
MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh
```

Utilise `docker compose config --quiet` pour éviter d’imprimer des secrets
résolus depuis `.env`.

## Docker et release GitHub

La distribution self-hosted utilise :

- `docker-compose.release.yml`
- `.env.self-hosted.example`
- `scripts/install_self_hosted.sh`
- `scripts/update_self_hosted.sh`
- `scripts/uninstall_self_hosted.sh`
- `scripts/smoke_release.sh`
- `.github/workflows/release-candidate.yml`
- `.github/workflows/release-promote.yml`

Les images attendues sont publiées sur GHCR :

```text
ghcr.io/rashops/mindris-ai-api-gateway
ghcr.io/rashops/mindris-ai-renderer
ghcr.io/rashops/mindris-ai-web
```

## Documentation utile

- [Installation self-hosted](docs/install.md)
- [Développement local](docs/local-development.md)
- [Self-hosting Docker](docs/self-hosting.md)
- [Politique de release](docs/releases.md)
- [Runtime agent](docs/agent-runtime.md)
- [ADRs](docs/adr/)
- [Politique marque](TRADEMARKS.md)

## Roadmap courte

- Étendre progressivement la traduction anglaise à toutes les surfaces produit.
- Continuer le polish des dix templates CV et leurs tests visuels longs.
- Élargir le jeu d’évaluation du pipeline d’adaptation fondé sur les preuves.
- Garder Workflow en Beta jusqu’à maturité complète des liens et historiques.
- Ajouter une option one-command encore plus guidée pour utilisateurs non techniques.
- Reporter Tauri/Desktop à une phase dédiée.

## Licence et marque

Le code source est distribué sous licence [MIT](LICENSE).

La marque Mindris, le nom Mindris AI, les logos, wordmarks et éléments
d’identité ne sont pas concédés sous MIT. Les forks publics, services dérivés
ou distributions commerciales doivent se rebrander sauf autorisation écrite.

Voir [TRADEMARKS.md](TRADEMARKS.md).
