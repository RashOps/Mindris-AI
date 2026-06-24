# ADR 008 : Consolidation MVP1 et release locale

**Etat :** ACCEPTE  
**Date :** 24 Juin 2026  
**Auteur :** Codex  
**Projet :** Mindris AI

---

## 1. Contexte

Les phases precedentes ont stabilise les briques principales du MVP1 :

- backend FastAPI source de verite ;
- frontend Next.js client pur ;
- renderer Bun pour PDF/Markdown ;
- catalogue de templates ;
- bibliotheque de CV ;
- tracker de candidatures ;
- drafts backend.

La phase 5 vise a rendre cet ensemble testable localement, documente et verifiable sans introduire de nouvelles fonctionnalites SaaS.

---

## 2. Decisions

### 2.1 Conserver le backend comme source de verite

**Decision :** Le frontend ne doit pas ajouter de stockage metier durable.

**Consequence :**
- Les CV, drafts, templates et candidatures restent pilotes par l'API.
- Le stockage frontend restant est limite a l'etat UI, par exemple le theme.

### 2.2 Documenter une checklist QA MVP1

**Decision :** Ajouter `docs/mvp1-qa-checklist.md`.

**Consequence :**
- Le flow complet peut etre teste manuellement avant chaque release locale.
- Les etats d'erreur attendus sont explicites.

### 2.3 Documenter un chemin de verification local robuste

**Decision :** Ajouter dans `docs/command_control.md` les variantes :

```bash
UV_CACHE_DIR=/tmp/uv-cache
STORAGE_DIR=/tmp/mindris-ai-test-storage
uv run --no-sync pytest tests/ -q --tb=short
```

et le smoke test rapide :

```bash
uv run --no-sync python tests/smoke_mvp1_backend.py
```

**Justification :**
- Certains environnements d'agent ne peuvent pas ecrire dans le cache `uv` du home.
- Les tests backend doivent pouvoir s'executer avec une base SQLite de test isolee.

### 2.4 Reduire le cout d'import backend

**Decision :** Rendre paresseux les imports IA lourds dans les routers et la factory LLM.

**Consequence :**
- Les routes non-IA peuvent etre importees sans charger immediatement CrewAI/LiteLLM.
- Les tests de templates, resumes, drafts et tracker ne dependent plus du chargement complet des providers IA au demarrage.

### 2.5 Publier l'etat MVP1

**Decision :** Ajouter `docs/mvp1-status.md`.

**Consequence :**
- Les parties terminees, partielles et hors scope sont explicites.
- La phase suivante peut se concentrer sur la differenciation open-source.

---

## 3. Verification

Verifications effectuees :

| Verification | Resultat |
| :--- | :--- |
| Backend smoke SQLite/templates/resume/draft | OK |
| `cd apps/web && bun run lint` | OK |
| `cd apps/web && bun run typecheck` | OK |
| `cd apps/web && bun run build` | OK |
| `cd services/renderer && bun run typecheck` | OK |
| `cd services/renderer && bun run build` | OK |

Note : le build Next/Turbopack peut necessiter une execution hors sandbox car il cree un processus interne et bind un port pendant la compilation.

---

## 4. Consequences

- Le MVP1 dispose maintenant d'une definition de readiness locale.
- Les commandes de validation sont plus fiables dans les environnements contraints.
- La dette restante est visible : Docker non revalide, E2E manuel, IA dependante des providers.
- La prochaine phase peut viser les avantages open-source : self-hosting Docker, exports ouverts, ATS strict, multi-langue et versioning.
