# ADR 007 : Stabilisation locale et CI

**État :** ACCEPTÉ  
**Date :** 23 Juin 2026  
**Auteur :** Codex  
**Projet :** Mindris AI

---

## 1. Contexte

Après la stabilisation backend décrite dans l'ADR 006, le backend Python était déjà sain :

- `uv run pytest tests/ -q --tb=short` : OK
- `uv run ruff check .` : OK

Le point faible restant était le frontend Next.js :

- erreurs ESLint React 19 et TypeScript strict ;
- build Next dépendant de `next/font/google`, donc fragile hors réseau ;
- CI qui ne vérifiait pas explicitement le typecheck Bun/TypeScript ;
- renderer Bun installé mais peu vérifié en CI.

La cible retenue est **Local + CI** : rendre le projet fiable en développement local et sur GitHub Actions, sans introduire une authentification SaaS ou une refonte d'infrastructure.

---

## 2. Décisions

### 2.1 Corriger le code plutôt qu'assouplir ESLint

**Décision :** conserver les règles strictes `eslint-config-next/core-web-vitals` et corriger les erreurs.

Corrections principales :

- remplacement des `any` par des types locaux ou `unknown` contrôlé ;
- mise à jour des callbacks SSE via `useEffect` plutôt que mutation de refs pendant le render ;
- initialisation depuis `localStorage` via initializers `useState` compatibles avec React 19 ;
- nettoyage des imports et variables inutilisés ;
- correction des entités JSX non échappées.

### 2.2 Supprimer la dépendance réseau aux Google Fonts

**Décision :** ne plus utiliser `next/font/google` dans le layout racine.

Les variables CSS historiques sont conservées :

- `--font-inter`
- `--font-space`
- `--font-mono`

Elles pointent désormais vers des stacks système/fallback, ce qui rend `bun run build` reproductible sans accès à `fonts.googleapis.com`.

### 2.3 Ajouter un typecheck explicite aux projets Bun

**Décision :** ajouter `bun run typecheck` dans :

- `apps/web`
- `services/renderer`

La CI exécute maintenant lint, typecheck et build pour le frontend, puis typecheck et build pour le renderer.

### 2.4 Figer l'installation backend en CI

**Décision :** utiliser `uv sync --all-packages --frozen` dans GitHub Actions.

Cela force la cohérence entre les manifests Python et `uv.lock`.

---

## 3. Vérification attendue

Commandes de référence :

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest tests/ -q --tb=short

cd apps/web
bun run lint
bun run typecheck
bun run build

cd ../../services/renderer
bun run typecheck
bun run build
```

---

## 4. Conséquences

- Le frontend devient compatible avec les règles React/Next strictes.
- Le build Next ne dépend plus du réseau pour les fonts.
- La CI couvre les trois surfaces critiques : backend Python, frontend Next.js, renderer Bun.
- Aucune route API, variable d'environnement ou migration SQLite n'est modifiée.
