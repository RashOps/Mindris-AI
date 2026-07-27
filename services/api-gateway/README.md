# Mindris API Gateway

FastAPI service principal de Mindris AI.

Il expose les contrats produit consommés par le frontend et orchestre les
services Python/Bun du workspace : CV, parsing PDF, optimisation, score ATS,
lettres, historique, tracker, workflows, templates et configuration runtime.

## Responsabilités

- Initialiser la base locale via `database.session.init_db`.
- Exposer les routes `/api/v1/*` utilisées par le frontend.
- Protéger les routes produit avec `X-API-Key`, sauf readiness système.
- Normaliser les erreurs API avec `request_id`.
- Persister les artefacts durables : CV, révisions, offres scrapées, rapports
  ATS, lettres, drafts, tracker, opportunities et transitions Workflow.
- Appeler les modules `intelligence`, `scraper`, `database` et le renderer via
  contrats explicites.

## Frontières à respecter

- Le frontend ne doit pas contourner ce service pour accéder aux secrets ou à
  l’état produit durable.
- Les clés provider ne doivent jamais être renvoyées en clair.
- Les actions destructives et décisions métier restent côté backend.
- Les logs/runtime locaux ne doivent pas être committés.

## Routes principales

Routes publiques :

- `GET /`
- `GET /api/v1/system/ready`

Routes protégées par `X-API-Key` :

- `/api/v1/system/*` : configuration runtime, diagnostics, secrets write-only.
- `/api/v1/cv/*` : CV courant, upload PDF, score, export.
- `/api/v1/optimize/*` : pipeline d’optimisation et SSE.
- `/api/v1/history/*` : ledger, jobs, ATS, lettres, lignée d’artefacts.
- `/api/v1/tracker/*` : candidatures et relances.
- `/api/v1/workflows/*` : opportunities, liens job/CV/ATS/lettre/tracker.
- `/api/v1/resumes/*` : bibliothèque de CV.
- `/api/v1/drafts/*` : drafts Markdown/CV.
- `/api/v1/templates/*` : templates CV.
- `POST /api/v1/templates/resolve-render-payload` : état de rendu normalisé et
  hashé pour preview, inspection et export.
- `POST /api/v1/resumes/{id}/sections/move` : insertion ou permutation
  révisionnée d'une section.
- `/api/v1/markdown/*` : sauvegarde/versioning des lettres Markdown.
- `/api/v1/llm/*` : providers, modèles et tâches IA.
- `/api/v1/company/*` : analyse entreprise.

Documentation interactive locale :

```text
http://localhost:8000/docs
http://localhost:8000/redoc
```

## Développement local

Depuis la racine du repo :

```bash
uv sync --all-packages
uv run uvicorn main:app --reload --app-dir services/api-gateway --host 0.0.0.0 --port 8000
```

Ou via le script stack complet :

```bash
./scripts/dev_local.sh
```

Le service écoute par défaut sur :

```text
http://localhost:8000
```

## Configuration utile

Variables courantes :

- `API_KEY` : clé attendue pour les routes protégées.
- `STORAGE_DIR` : stockage local SQLite, vectordb, browser profile.
- `LOGS_DIR` : dossier de logs applicatifs.
- `RENDERER_URL` : URL du renderer Bun, par défaut `http://localhost:4000`.
- `CHROMA_DB_DIR` : chemin vector DB.
- `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`,
  `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `LLAMA_CLOUD_API_KEY` :
  secrets provider write-only côté UI.
- `SCRAPER_STRATEGY`, `SCRAPER_HEADLESS`, `SCRAPER_PROXY_FALLBACK`,
  `SCRAPE_DO_API`, `SCRAPINGBEE_API` : scraping.

Voir aussi `.env.example` et `.env.self-hosted.example` à la racine.

## Vérifications

Tests ciblés backend :

```bash
uv run pytest tests/test_history_api.py tests/test_workflows_api.py -q
uv run pytest tests/test_drafts_api.py tests/test_tracker_crud.py -q
```

Smoke local backend :

```bash
uv run python tests/smoke_mvp1_backend.py
```

Lint/format Python :

```bash
uv run ruff check services/api-gateway tests
uv run ruff format --check services/api-gateway tests
```

Readiness :

```bash
curl --max-time 5 http://localhost:8000/
curl --max-time 5 http://localhost:8000/api/v1/system/ready
```

## Logs et données locales

Logs canoniques :

```text
.logs/services/api-gateway.log
```

Données locales :

```text
storage/
```

Ne pas committer :

- `__pycache__/`
- `*.egg-info/`
- `.logs/`
- `storage/`
- bases SQLite locales.

## Contrat de rendu CV

Le gateway applique l'ordre de précédence système → template → CV persisté →
overrides explicites → validation. Le renderer reçoit ce payload résolu ; le
frontend ne recalcule pas les defaults.

Voir [`docs/cv-renderer-contract.md`](../../docs/cv-renderer-contract.md).
