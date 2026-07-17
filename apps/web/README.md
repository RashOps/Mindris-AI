# Mindris Web

Frontend Next.js de Mindris AI.

Cette app est une surface client-only : elle rend le workspace, appelle les API
backend et garde seulement de l’état UI court comme le thème, les modes
d’affichage ou les drafts côté navigateur. Elle ne doit pas devenir une couche
de service cachée.

## Rôle dans l’architecture

- Afficher la landing et le workspace produit.
- Piloter les outils : CV Builder, ATS Score, Workflow Beta, Tracker, History,
  Guide et Markdown PDF.
- Lire/écrire l’état produit via `services/api-gateway`.
- Demander les previews/exports au backend ou au renderer via contrats API.
- Respecter les defaults et décisions métier fournis par le backend.

## Frontières à respecter

- Pas de logique métier durable dans le frontend.
- Pas de secrets provider en clair dans le navigateur.
- Pas de persistance produit parallèle à l’API.
- Pas de contournement direct de SQLite, vector DB, LLM providers ou scraper.
- Les changements qui modifient le résultat produit doivent être portés par le
  backend, puis exposés via l’UI.

## Stack

- Next.js `16`
- React `19`
- TypeScript
- Tailwind CSS
- Base UI / composants locaux
- Zustand pour l’état UI/CV côté client
- Bun pour installation, dev et validation

## Installation

Depuis la racine du repo :

```bash
./scripts/setup_local.sh
```

Ou uniquement pour le frontend :

```bash
cd apps/web
bun install --frozen-lockfile
```

## Développement

Stack complète recommandée :

```bash
./scripts/dev_local.sh
```

Frontend seul :

```bash
cd apps/web
bun run dev --port 3000
```

Le serveur Next écoute sur :

```text
http://127.0.0.1:3000
```

Le workspace attend normalement :

- API Gateway : `http://localhost:8000`
- Renderer : `http://localhost:4000`

## Variables publiques utiles

- `NEXT_PUBLIC_API_URL` : URL appelée par le navigateur pour l’API.
- `NEXT_PUBLIC_RENDERER_URL` : URL appelée pour les diagnostics renderer.

En Docker release, ces variables restent en `localhost` parce qu’elles sont
utilisées par le navigateur de l’utilisateur, pas par le réseau interne Docker.

## Routes principales

- `/` : landing page.
- `/dashboard` : résumé workspace, CV, templates, actions rapides.
- `/tools/cv-creator` : CV Builder avec modes Simple/Normal/Avancé.
- `/tools/ats-score` : score ATS job-aware.
- `/tools/workflow` : Workflow Beta job -> CV -> ATS -> lettre -> tracker.
- `/tools/tracker` : suivi des candidatures et relances.
- `/tools/history` : ledger et lignée des artefacts.
- `/tools/guide` : guide visuel et parcours recommandés.
- `/tools/markdown` : édition Markdown, lettres persistées et export PDF.

## Dossiers importants

- `src/app` : routes Next.js.
- `src/components` : composants réutilisables.
- `src/components/layout` : shell, navigation, RuntimeGate.
- `src/components/settings` : drawer de configuration runtime.
- `src/config` : navigation et layout produit.
- `src/lib` : clients API, helpers UI, copy produit.
- `src/store` : Zustand stores, notamment CV et app settings.
- `src/types` : types frontend partagés.

## RuntimeGate

Le workspace passe par `RuntimeGate`.

Il vérifie que les services locaux répondent avant d’ouvrir l’app :

- `GET /api/v1/system/ready`
- `GET /ready` côté renderer

Si le gate reste bloqué, vérifier d’abord les endpoints backend/renderer et les
ports configurés avant de modifier l’UI.

## Thème et i18n

- Le thème clair/sombre est géré par `ThemeProvider`.
- Le socle de textes globaux est centralisé dans `src/lib/product-copy.ts`.
- L’UI produit est française-first.
- Une future traduction EN doit partir du dictionnaire central plutôt que de
  multiplier les chaînes dispersées.

## Validation

Depuis `apps/web` :

```bash
bun run lint
bun run typecheck
bun run build
```

Depuis la racine, validation groupée :

```bash
./scripts/lint_all.sh
./scripts/test_all.sh
```

## Vérification visuelle

Pour les changements UI :

- rendre la route modifiée dans un vrai navigateur ;
- vérifier desktop et mobile ;
- contrôler console, overflow, contraste, alignement et responsive ;
- stocker les captures temporaires dans `.screenshots/`.

Viewports de référence :

- `1600 x 900`
- `390 x 844`

## Build Docker

Le frontend a son propre Dockerfile :

```bash
docker build -f apps/web/Dockerfile apps/web
```

La distribution release utilise l’image :

```text
ghcr.io/rashops/mindris-ai-web
```

## À ne pas committer

- `node_modules/`
- `.next/`
- `coverage/`
- `tsconfig.tsbuildinfo`
- captures temporaires si elles ne sont pas explicitement demandées ;
- fichiers générés ou caches locaux.
