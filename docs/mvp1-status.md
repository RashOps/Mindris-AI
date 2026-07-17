# Etat MVP1 - Mindris AI

Date : 17 juillet 2026

## Statut global

Le MVP1 est testable localement avec trois services :

- API Gateway FastAPI : source de verite applicative.
- Renderer Bun/Elysia : rendu PDF et Markdown.
- Frontend Next.js : client d'interaction qui appelle les APIs.

Le principe architectural reste respecte : le frontend n'est pas un service metier. Il orchestre les appels, affiche l'etat et conserve uniquement de l'etat UI local.

## Termine

- Bibliotheque de CV backend : creation, import JSON, duplication, suppression, exports JSON/Markdown/HTML.
- Autosave backend des CV actifs.
- Catalogue backend de 5 templates prets : `modern`, `compact`, `ats`, `student`, `creative`.
- Builder CV structure avec preview temps reel via renderer.
- Export PDF sans watermark via renderer.
- Exports ouverts backend : Markdown GitHub-readable et HTML autonome sans script.
- Import PDF structure via backend.
- Drafts backend pour ATS, Markdown et lettre de motivation.
- Tracker de candidatures backend-driven avec vue SaaS.
- Configuration centralisee des URLs API/renderer dans le frontend.
- Commandes locales documentees dans `docs/command_control.md`.
- Shell SaaS partage pour les pages produit et commandes locales non-Docker.
- RuntimeGate officiel : le frontend attend l'API Gateway et le renderer avant d'ouvrir l'AppShell.
- CV Builder restructure avec modes `Simple`, `Normal` et `Avance`.
- Section Style integree en tab avec Structure dans le CV Builder, sans overlay bloquant.
- Selects/dropdowns centralises et alignes visuellement sur les boutons toolbar.
- Workflow conserve en Beta visible, avec lineage job ↔ CV ↔ ATS ↔ lettre ↔ tracker.
- Historique unifie avec filtres, detail de lignée et purge destructive backend transactionnelle.
- Guide produit visuel avec parcours, checklists et rappel des frontieres runtime.
- UI prioritaire francais-first sur Dashboard, CV Builder, Guide et History.
- Docker release one-command via GHCR, compose release, scripts install/update/uninstall/smoke.

## Partiel

- Tests backend complets : la commande standard reste documentee, mais l'environnement d'agent peut etre lent ou bloque par SQLite/cache. Le chemin fiable utilise `UV_CACHE_DIR=/tmp/uv-cache` et `STORAGE_DIR=/tmp/mindris-ai-test-storage`.
- Import PDF : depend encore des providers IA configures et des cles disponibles.
- Score ATS et generation de lettre : fonctionnels dans le flow, mais dependants du provider LLM selectionne.
- Markdown PDF : persistence des lettres disponible, mais l'UX d'ouverture/versioning de lettres existantes reste a polir.
- ATS Score : scoring et persistence fonctionnels, mais l'interface peut encore etre simplifiee.
- Workflow Beta : contrats et liens backend presents, UX a maturer avant de le presenter comme stable.
- i18n : francais-first applique aux surfaces prioritaires, pas encore centralise dans un systeme de traduction complet.
- Tests end-to-end navigateur : parcours Playwright disponibles/cibles, mais la suite complete reste a consolider.

## Hors scope MVP1

- Authentification SaaS multi-utilisateur.
- Stripe ou billing.
- Versioning Git-like complet.
- Marketplace communautaire de templates.
- IA locale avancee via Ollama comme mode principal.
- Portfolio public.
- Application Tauri/Desktop complete.

## Verification phase 5

Backend cible :

```bash
STORAGE_DIR=/tmp/mindris-ai-phase5-smoke \
UV_CACHE_DIR=/tmp/uv-cache \
uv run --no-sync python tests/smoke_mvp1_backend.py
```

Resultat obtenu :

```text
mvp1-backend-smoke-ok
```

Frontend :

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

Resultat : OK.

Renderer :

```bash
cd services/renderer
bun run typecheck
bun run build
```

Resultat : OK.

## Prochaine phase recommandee historique - juin 2026

Phase 6 : differenciation open-source.

Priorites recommandees :

- Docker self-hosting verifie de bout en bout.
- Export Markdown/HTML/DOCX.
- Mode ATS strict plus transparent.
- Duplication/versioning plus robuste.
- Multi-langue FR/EN.

## Verification phase 6A

Self-hosting Docker :

```bash
docker compose config --quiet
sh -n scripts/smoke_self_hosting.sh
```

Resultat : OK.

Build Compose complet :

```bash
docker compose up --build
```

Resultat : non force dans l'environnement courant, car le build peut necessiter le reseau Docker pour les images et dependances.

## Verification phase 6B

Exports ouverts :

```bash
UV_CACHE_DIR=/tmp/uv-cache \
STORAGE_DIR=/tmp/mindris-ai-phase6b-smoke \
uv run --no-sync python tests/smoke_mvp1_backend.py
```

Resultat obtenu :

```text
mvp1-backend-smoke-ok
```

Controles executes :

- `uv run --no-sync ruff check services/api-gateway/exporters.py services/api-gateway/routers/resumes.py tests/test_resumes_api.py tests/smoke_mvp1_backend.py`
- `cd apps/web && bun run lint`
- `cd apps/web && bun run typecheck`
- `cd apps/web && bun run build`
- `cd services/renderer && bun run typecheck`
- `cd services/renderer && bun run build`

Note : `pytest tests/test_resumes_api.py` a ete interrompu dans l'environnement d'agent apres blocage sans sortie. Les assertions ont ete ajoutees au test, mais la verification fiable de cette session repose sur le smoke backend cible et les checks de build.

## Verification phase 7

Workflow local non-Docker :

```bash
sh -n scripts/*.sh
```

Resultat : OK.

UI :

```bash
cd apps/web
bun run lint
bun run typecheck
```

Resultat intermediaire : OK.

## Runs de consolidation recents

### Run A - Runtime, backend contracts et CV Builder

Objectif : remettre l'application en coherence avec les contrats documentes et
garder la logique metier hors frontend.

Termine :

- RuntimeGate corrige et revalide contre `/api/v1/system/ready` et `/ready`.
- Renderer et templates réalignes sur le HTML dynamique.
- Defaults backend resolus avant preview/export.
- Controls `display_mode` et `detail_level` rendus effectifs.
- Style deplace dans le CV Builder comme tab a cote de Structure.
- Workflow marque Beta dans la navigation et le header produit.
- `ScoreRequest` et `CoverLetterRequest` portent `job_id`, `resume_id` et `opportunity_id`.
- ATS reports et cover letters persistent `job_id` et retournent leur ID durable.
- History relie jobs, ATS reports, cover letters, opportunities, tracker items et LLM runs.

Validations :

```bash
uv run pytest tests/test_history_api.py tests/test_workflows_api.py tests/test_ats_score.py -q
cd apps/web && bun run lint
cd apps/web && bun run typecheck
```

### Run B - UI, theme et CV Builder simplifie

Objectif : reduire la surcharge du CV Builder et corriger les incoherences
dark/light observees via Playwright.

Termine :

- Audit visuel Playwright desktop/mobile sur les pages produit.
- Remplacement de surfaces hardcodees par `bg-card`, `bg-background`,
  `text-foreground`, `text-muted-foreground` et `border-border`.
- Dropdowns toolbar centralises et alignes.
- Modes CV Builder `Simple`, `Normal`, `Avance`.
- Regroupement des panneaux avances : Offre, IA, Actions et diagnostics.
- Corrections responsive sur Dashboard, Markdown, Tracker, Workflow, Guide,
  History et CV Builder.

Validations :

```bash
cd apps/web && bun run lint
cd apps/web && bun run typecheck
```

Playwright Python :

- `/dashboard` en 1600x900 et 390x844.
- `/tools/cv-creator` en 1600x900 et 390x844.
- `/tools/markdown`, `/tools/tracker`, `/tools/workflow`, `/tools/guide`,
  `/tools/history` sans overflow horizontal.

### Run C - Documentation, guide et distribution self-hosted

Objectif : rendre le projet installable sans clone et aligner la documentation
publique avec le produit reel.

Termine :

- `docker-compose.release.yml` avec images GHCR.
- `.env.self-hosted.example`.
- Scripts :
  - `scripts/install_self_hosted.sh`
  - `scripts/update_self_hosted.sh`
  - `scripts/uninstall_self_hosted.sh`
  - `scripts/smoke_release.sh`
  - `scripts/clean_self_hosted_test.sh`
- Workflow GitHub Actions `.github/workflows/docker-release.yml`.
- `docs/install.md` pour l'installation one-command.
- README public reecrit en francais-first.
- Guide interne enrichi avec parcours, checklists et liens vers surfaces produit.
- Documentation du cas port `3000` occupe avec `MINDRIS_WEB_PORT=3100`.

Validations :

```bash
docker compose -f docker-compose.release.yml config --quiet
sh -n scripts/install_self_hosted.sh scripts/update_self_hosted.sh scripts/uninstall_self_hosted.sh scripts/smoke_release.sh scripts/clean_self_hosted_test.sh
MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh
```

Validation externe effectuee dans une distro Debian WSL propre :

- images GHCR telechargees ;
- `api-gateway`, `renderer` et `web` healthy ;
- port frontend override en `3100` fonctionnel ;
- `/api/v1/system/ready` retourne `ready` ;
- `/ready` renderer retourne `ready`.

## Prochaine phase recommandee actuelle - juillet 2026

Priorites recommandees hors Tauri/Desktop :

1. Finaliser Markdown PDF et l'ouverture/versioning des lettres persistantes.
2. Simplifier ATS Score et Tracker.
3. Maturer Workflow Beta avant de le presenter comme stable.
4. Centraliser l'i18n francais-first pour preparer une traduction utilisateur.
5. Enrichir le Guide avec parcours contextualises par page.
6. Ajouter un job CI de dry-run install self-hosted et smoke release post-publish.
