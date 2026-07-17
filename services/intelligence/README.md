# Mindris Intelligence

Package Python contenant les fonctions IA métier de Mindris AI.

Ce service n’expose pas d’API HTTP directement. Il est appelé par
`services/api-gateway` pour analyser des offres, scorer des CV, générer des
lettres et piloter le pipeline RAG/SSE.

## Responsabilités

- Résoudre les providers et modèles LLM via `llm_config.py`.
- Générer des rapports ATS structurés avec grille transparente.
- Générer des lettres de motivation Markdown.
- Analyser le contexte entreprise/offre.
- Parser des CV PDF avec stratégie locale ou LlamaCloud.
- Ingestion CV vers la vector DB.
- Orchestration RAG avec événements SSE pour Ghost Mode.

## Modules principaux

- `llm_config.py` : résolution provider/modèle et configuration LiteLLM/CrewAI.
- `ats_score.py` : score ATS standard/strict, rubric, deductions, context.
- `cover_letter.py` : génération de lettres job-aware.
- `company_analyzer.py` : signaux entreprise et contexte poste.
- `pdf_parser.py` : parsing PDF local/LlamaCloud.
- `ingest_cv.py` : ingestion CV dans le stockage vectoriel.
- `workflow.py` : pipeline LangGraph/CrewAI avec événements SSE.
- `event_bus.py` : files d’événements SSE utilisées par le gateway.
- `agents.py`, `tasks.py`, `crew.py`, `agents.yaml` : agents et tâches IA.

## Frontières à respecter

- Ce package ne doit pas connaître les composants React.
- La persistance durable reste dans `api-gateway` / `packages/database`.
- Les secrets provider doivent être lus via la configuration runtime, jamais
  loggés ou renvoyés.
- Les prompts peuvent produire des artefacts, mais les décisions de stockage et
  de liaison job/CV/ATS/lettre restent côté API.

## Développement local

Depuis la racine du repo :

```bash
uv sync --all-packages
```

Le package est utilisé par le gateway dans le workspace `uv`. Il n’y a pas de
commande serveur dédiée.

Exemple d’exécution indirecte via API locale :

```bash
./scripts/dev_local.sh
```

Puis utiliser les routes du gateway :

- `POST /api/v1/cv/score`
- `POST /api/v1/cover-letter`
- `POST /api/v1/cv/upload-pdf`
- `POST /api/v1/optimize`

## Configuration utile

Providers LLM :

- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `CEREBRAS_API_KEY`
- `OPENROUTER_API_KEY`

Parsing PDF :

- `LLAMA_CLOUD_API_KEY`
- `MAX_PDF_UPLOAD_BYTES`

Stockage/vector DB :

- `STORAGE_DIR`
- `CHROMA_DB_DIR`

## Vérifications

Tests ciblés :

```bash
uv run pytest tests/test_ats_score.py tests/test_llm_runs.py -q
uv run pytest tests/test_workflow_events.py tests/test_history_api.py -q
```

Lint ciblé :

```bash
uv run ruff check services/intelligence tests/test_ats_score.py tests/test_workflow_events.py
```

## Notes opérateur

- Les appels LLM réels dépendent des clés provider disponibles.
- Les tests doivent mocker les providers quand ils vérifient un contrat métier.
- Les événements SSE utilisent un `job_id` volatile ; quand un job est persisté,
  les payloads doivent aussi exposer l’identifiant DB (`job_record_id`).
- Ne pas committer `__pycache__/`, `*.egg-info/` ou fichiers runtime générés.
