# Etat MVP1 - Mindris AI

Date : 23 juillet 2026

## Statut global

Le MVP1 est testable localement avec trois services :

- API Gateway FastAPI : source de verite applicative.
- Renderer Bun/Elysia : rendu PDF et Markdown.
- Frontend Next.js : client d'interaction qui appelle les APIs.

Le principe architectural reste respecte : le frontend n'est pas un service metier. Il orchestre les appels, affiche l'etat et conserve uniquement de l'etat UI local.

## Termine

- Bibliotheque de CV backend : creation, import JSON, duplication, suppression, exports JSON/Markdown/HTML.
- Autosave backend des CV actifs.
- Catalogue backend de 10 templates prêts avec presets et directions visuelles
  distinctes : Atlas, Atlas Sidebar, Terminal, Mono ATS, Graduate, Studio,
  Ledger, Executive, Signal et Scholar.
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
- CLI contributeur multiplateforme canonique avec lanceurs Unix, PowerShell et
  CMD ; les anciens scripts locaux sont désormais de simples wrappers.
- Racine de logs unique par instance : `.logs/` dans un clone et `logs/` dans
  une installation self-hosted.
- Format communautaire import/export disponible hors ligne pour les templates.

## Partiel

- Tests backend complets : la commande standard reste documentee, mais l'environnement d'agent peut etre lent ou bloque par SQLite/cache. Le chemin fiable utilise `UV_CACHE_DIR=/tmp/uv-cache` et `STORAGE_DIR=/tmp/mindris-ai-test-storage`.
- Import PDF : depend encore des providers IA configures et des cles disponibles.
- Score ATS et generation de lettre : fonctionnels dans le flow, mais dependants du provider LLM selectionne.
- Workflow Beta : filtrage job-aware, checklist et recovery paths sont presents,
  mais la promotion hors Beta reste une decision produit ulterieure.
- i18n : locale backend-owned et dictionnaires FR/EN types disponibles ; la
  migration des strings produit restantes demeure partielle.
- Tests end-to-end navigateur : parcours Playwright disponibles et executes
  manuellement en CI ; la release Docker les execute apres publication des images.

## Hors scope MVP1

- Authentification SaaS multi-utilisateur.
- Stripe ou billing.
- Versioning Git-like complet.
- Marketplace publique de templates : le format portable et l’import/export
  existent, mais pas encore le catalogue distant ni la publication modérée.
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

### Run D - Release immuable et CLI multiplateforme

ADRs : [`025`](adr/025-immutable-release-candidates-and-ghcr-digest-promotion.md),
[`026`](adr/026-cross-platform-contributor-cli.md).

Terminé :

- PR limitées à la validation, sans publication d’images.
- Builds Docker déclenchés uniquement par tags `v*-rc.*`.
- Promotion stable par digest GHCR, sans rebuild.
- CLI Python standard avec lanceurs Unix, PowerShell et CMD.
- `uv` reste obligatoire pour toute commande qui touche au workspace Python.
- Supervision locale, diagnostics, validation et contrôles de release unifiés.

### Run E - Observabilité runtime centralisée

ADR : [`027`](adr/027-canonical-runtime-log-root.md).

Terminé :

- `.logs/services/` pour les événements applicatifs.
- `.logs/process/` pour stdout/stderr des processus supervisés.
- `.logs/runtime/` pour l’état de supervision.
- résolution indépendante du répertoire courant ;
- rotation bornée Python et Bun ;
- tests ordinaires isolés dans un dossier temporaire ;
- persistance Docker des logs API et renderer.

### Run A - Runtime, backend contracts et CV Builder

Objectif : remettre l'application en coherence avec les contrats documentes et
garder la logique metier hors frontend.

ADRs : [`013`](adr/013-runtime-gate-and-cv-builder-stabilization.md),
[`014`](adr/014-workflow-beta-and-artifact-lineage.md).

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

ADR : [`015`](adr/015-ui-simplification-theme-and-french-first.md).

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

ADRs : [`016`](adr/016-ghcr-one-command-self-hosting.md),
[`017`](adr/017-documentation-governance-and-desktop-deferral.md).

Termine :

- `docker-compose.release.yml` avec images GHCR.
- `.env.self-hosted.example`.
- Scripts :
  - `scripts/install_self_hosted.sh`
  - `scripts/update_self_hosted.sh`
  - `scripts/uninstall_self_hosted.sh`
  - `scripts/smoke_release.sh`
  - `scripts/clean_self_hosted_test.sh`
- Workflows GitHub Actions séparés : `.github/workflows/release-candidate.yml`
  construit les RC et `.github/workflows/release-promote.yml` promeut les
  manifests validés par digest pour les tags stables.
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

## Release stable v0.4.0 - 18 juillet 2026

`v0.4.0` consolide les runs Runtime, UI, artefact lineage, self-hosting et
personnalisation avancée du CV Builder. La release a été publiée après :

- checks Python, frontend et renderer verts ;
- navigateur E2E sur les images GHCR candidates ;
- fresh install Debian depuis GHCR ;
- validation des endpoints RuntimeGate et des exports CV ;
- validation de l'override `MINDRIS_WEB_PORT=3100`.

## Prochaine phase recommandee actuelle - juillet 2026

Priorites recommandees hors Tauri/Desktop :

1. Conserver Workflow en Beta jusqu'a une decision de promotion explicite.
2. Migrer progressivement les strings restantes vers l'i18n FR/EN déjà en place.
3. Observer le comportement de la release self-hosted `v0.4.0`.
4. Reporter Desktop/Tauri apres stabilisation de cette release.

## Run 23 - Templates, intelligence factuelle et simplification produit - 20 juillet 2026

ADRs : [`023`](adr/023-cv-template-catalogue-and-evidence-driven-adaptation.md),
[`024`](adr/024-progressive-product-ui-backend-owned-i18n-and-guide.md).

Terminé :

- Résolution déterministe des templates et séparation rendu/application de preset.
- Catalogue de dix templates avec galerie filtrable et previews distinctes.
- Photo, page breaks, placements de sections et options renderer testés.
- Pipeline d’adaptation structuré avec registre de faits, matrice
  exigences/preuves, feedback évaluateur et validation humaine.
- Index RAG isolé par CV et locale.
- Markdown mobile en tabs, ATS progressif, Tracker mobile filtré, Workflow
  master/detail et History groupé par candidature backend-owned.
- i18n typé FR/EN avec `ui_locale` persisté par le backend.
- Guide en trois parcours avec progression enregistrée côté backend.
- README Docker et landing mis à jour ; le cas `MINDRIS_WEB_PORT=3100` est
  visible dans l’installation rapide.

Évidence visuelle :

- `.screenshots/template-catalogue-2026-07-20/`
- `.screenshots/product-simplification-2026-07-20/`

Desktop/Tauri reste explicitement hors de ce run.
