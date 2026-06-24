# Etat MVP1 - Mindris AI

Date : 24 juin 2026

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
- Checklist QA MVP1 documentee dans `docs/mvp1-qa-checklist.md`.

## Partiel

- Tests backend complets : la commande standard reste documentee, mais l'environnement d'agent peut etre lent ou bloque par SQLite/cache. Le chemin fiable utilise `UV_CACHE_DIR=/tmp/uv-cache` et `STORAGE_DIR=/tmp/mindris-ai-test-storage`.
- Import PDF : depend encore des providers IA configures et des cles disponibles.
- Score ATS et generation de lettre : fonctionnels dans le flow, mais dependants du provider LLM selectionne.
- Docker Compose : configuration, healthchecks et documentation self-hosting valides; `docker compose up --build` reste a lancer dans un environnement avec acces reseau Docker.
- Tests end-to-end navigateur : checklist manuelle disponible, pas encore automatisee.

## Hors scope MVP1

- Authentification SaaS multi-utilisateur.
- Stripe ou billing.
- Export DOCX.
- Versioning Git-like complet.
- Marketplace communautaire de templates.
- IA locale avancee via Ollama comme mode principal.
- Portfolio public.

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

## Prochaine phase recommandee

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
