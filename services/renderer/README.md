# Mindris Renderer

Service Bun/Elysia responsable du rendu HTML/PDF de Mindris AI.

Le renderer est volontairement séparé du frontend et du gateway. Il reçoit des
payloads déjà préparés par le backend, applique les templates CV ou Markdown,
puis produit une preview HTML ou un PDF via Puppeteer.

## Responsabilités

- Générer le HTML dynamique des templates CV.
- Exporter les CV en PDF via `/render/pdf`.
- Générer preview HTML et PDF Markdown via `/render/markdown/preview` et
  `/render/markdown`.
- Exposer health/readiness/metrics/openapi pour RuntimeGate et diagnostics.
- Gérer un browser manager Puppeteer avec limite de pages concurrentes.
- Publier les contrats versionnés des templates et sélecteurs CSS.
- Mesurer un `RenderManifest` exploitable par le backend et les agents.

## Installation

```bash
bun install
```

## Développement

```bash
bun run dev
```

`bun run dev` est l’entrée locale recommandée : elle utilise le mode watch pour
recharger le renderer pendant le développement.

Démarrage simple sans watch :

```bash
bun run start
```

Le service écoute par défaut sur :

```text
http://localhost:4000
```

Le port peut être changé avec :

```bash
PORT=4100 bun run start
```

## Endpoints

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/metrics
curl http://localhost:4000/contracts
curl http://localhost:4000/openapi.json
```

Interactive docs:

```text
http://localhost:4000/docs
```

Endpoints de rendu :

- `POST /render/pdf` : CV data + template -> PDF ou HTML.
- `POST /render/manifest` : inspection géométrique non persistée du CV.
- `POST /render/markdown/preview` : Markdown -> HTML preview.
- `POST /render/markdown` : Markdown -> PDF.

Readiness attendue :

```json
{
  "status": "ready",
  "service": "renderer",
  "checks": {
    "templates": { "ok": true },
    "pdf": { "ok": true },
    "browser_manager": {
      "ok": true,
      "ready": false,
      "active_pages": 0,
      "max_concurrent_pages": 2
    }
  }
}
```

`browser_manager.ready` peut rester `false` tant qu’aucune page Puppeteer n’a
été ouverte. Ce n’est pas un échec si `status` vaut `ready`.

## Vérifications

```bash
bun run typecheck
bun run build
```

Tests Bun ciblés :

```bash
bun test
```

Build Docker depuis la racine :

```bash
docker build -f services/renderer/Dockerfile services/renderer
```

## Logs et artefacts

Le renderer ecrit des evenements structures JSONL dans :

```text
.logs/services/renderer.log
```

`LOGS_DIR` choisit la racine commune et `RENDERER_LOG_PATH` peut cibler un
fichier explicite. Le fichier est borné par rotation.

Ne pas committer :

- `dist/`
- caches Bun/Playwright/Puppeteer ;
- logs runtime ;
- fichiers PDF générés.

## Frontières à respecter

- Le renderer ne décide pas des defaults métier.
- Le renderer ne lit pas les secrets provider.
- Les templates doivent rester alignés avec le HTML dynamique généré par
  `src/templates/engine`.
- Les exports doivent passer par les contrats API existants plutôt que par des
  appels directs depuis le navigateur.
- Une classe CSS interne n'est pas une API. Les extensions utilisent les
  sélecteurs `data-*` publiés par `/contracts`.
- Une géométrie du manifeste n'est valide que pour son `contentHash`.

## Contrat CV

- [`docs/cv-renderer-contract.md`](../../docs/cv-renderer-contract.md)
- [`docs/custom-cv-css.md`](../../docs/custom-cv-css.md)
- [ADR 029](../../docs/adr/029-observable-versioned-cv-renderer-contract.md)
