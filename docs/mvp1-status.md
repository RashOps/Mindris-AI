# Etat MVP1 - Mindris AI

Date : 24 juin 2026

## Statut global

Le MVP1 est testable localement avec trois services :

- API Gateway FastAPI : source de verite applicative.
- Renderer Bun/Elysia : rendu PDF et Markdown.
- Frontend Next.js : client d'interaction qui appelle les APIs.

Le principe architectural reste respecte : le frontend n'est pas un service metier. Il orchestre les appels, affiche l'etat et conserve uniquement de l'etat UI local.

## Termine

- Bibliotheque de CV backend : creation, import JSON, duplication, suppression, export JSON.
- Autosave backend des CV actifs.
- Catalogue backend de 5 templates prets : `modern`, `compact`, `ats`, `student`, `creative`.
- Builder CV structure avec preview temps reel via renderer.
- Export PDF sans watermark via renderer.
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
- Docker Compose : documente, mais pas revalide dans cette phase.
- Tests end-to-end navigateur : checklist manuelle disponible, pas encore automatisee.

## Hors scope MVP1

- Authentification SaaS multi-utilisateur.
- Stripe ou billing.
- Export DOCX/HTML avance.
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
