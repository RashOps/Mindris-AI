# 🚀 Mindris AI - Project Roadmap

**Objectif :** Créer un moteur autonome d'optimisation de carrière (Scraping -> RAG -> Rendu PDF).

---

## 🟢 Phase 1 : Fondations & Architecture (Terminée)
- [x] Initialisation du Workspace (`uv`, `Bun`)
- [x] Définition de l'ADR-001 (Stack Technique)
- [x] Conception du **Mindris Core Schema** (JSON/Pydantic)
- [x] Configuration de l'environnement WSL (Dependencies & Playwright deps)

## 🟢 Phase 2 : Ingestion & Scraping (Terminée)
- [x] **Scraper Service :** Développement du module Playwright (LinkedIn/Indeed).
- [x] **Stealth Integration :** Contournement des anti-bots.
- [x] **Agent Analyste :** Premier agent CrewAI pour transformer le HTML brut en "Job JSON".
- [x] **Validation :** Schéma Pydantic pour valider l'extraction (JobOffer).

## 🟢 Phase 3 : Intelligence & RAG (Terminée)
- [x] **Vector Database :** Setup de ChromaDB en local (remplace Supabase/pgvector).
- [x] **Embedding Pipeline :** Script (`ingest_cv.py`) pour vectoriser le "Master Profile" (Hugging Face `sentence-transformers`).
- [x] **LangGraph Workflow :**
    - Noeud de Retrieval (Matching sémantique).
    - Noeud de Rédaction (Agent Copywriter).
    - Noeud de Scoring (ATS-Proof check).
- [x] **Multi-Model Support :** Intégration LiteLLM (Ollama / Groq / Gemini).

## 🟢 Phase 4 : Moteur de Rendu (Terminée)
- [x] **Renderer Service :** Setup de Bun + Puppeteer (ElysiaJS API).
- [x] **Shadow DOM Implementation :** Isolation des styles de templates (Engine Handlebars).
- [x] **Templates Pro :** Création du premier template CSS (Modern Minimalist).
- [x] **Conversion PDF :** API de génération haute fidélité (Puppeteer `page.pdf`).

## 🟢 Phase 5 : Interface "Canva-like" (Terminée)
- [x] **Frontend Next.js :** Dashboard principal.
- [x] **Drag & Drop Engine :** Intégration de `dnd-kit` liée au JSON.
- [x] **Live Preview :** Rendu en temps réel des modifications IA (Connecté au Shadow DOM Bun).
- [x] **Ghost Mode :** Feedback visuel des agents en plein travail (Connecté à l'API Gateway FastAPI).

## 🟢 Consolidation MVP1 locale (Terminée)
- [x] **Source de vérité backend :** CV, drafts, templates et tracker sont pilotés par l'API.
- [x] **QA MVP1 :** Checklist manuelle documentée dans `docs/mvp1-qa-checklist.md`.
- [x] **Commandes locales :** Variantes `UV_CACHE_DIR` et `STORAGE_DIR` documentées pour les environnements contraints.
- [x] **Validation :** Frontend et renderer validés par lint/typecheck/build ; backend validé par smoke test ciblé.

## 🔵 Phase 6 : Stabilisation outil & contenu recruteur
- [x] **Self-hosting Docker local :** Compose, healthchecks, `.env.example`, guide et smoke script.
- [x] **Exports ouverts :** JSON, Markdown et HTML backend-driven, avec PDF maintenu via renderer.
- [ ] **Export DOCX :** Differe jusqu'a une implementation locale fiable.
- [ ] **Durcissement Microservices :** Healthchecks, erreurs normalisees, timeouts, retries, stockage local robuste.
- [ ] **Validation Docker bout en bout :** `docker compose up --build` et smoke self-hosting.
- [ ] **E2E navigateur :** Automatiser CV Builder, exports, ATS Scorer et Job Tracker.

## 🟢 Phase 7 : UI unifiée & workflow local non-Docker (Terminée)
- [x] **SaaS App Shell :** Unifier dashboard et outils dans une navigation produit unique.
- [x] **Design system opérationnel :** Tokens, composants et états partagés pour remplacer les styles inline dispersés.
- [x] **Commandes locales :** Scripts `uv` + `bun` pour réinstaller, configurer et lancer API, renderer et frontend sans Docker.

## 🔵 Phase 8 : CV Customization Studio
- [ ] **Contrat backend de personnalisation :** Normaliser layout, typographie, couleurs, sections et labels dans le schema CV.
- [ ] **Renderer configurable :** Appliquer les tokens et la structure de sections depuis le contrat backend.
- [ ] **Studio UI backend-driven :** Exposer les contrôles avancés sans logique métier côté front.
- [ ] **Sections avancées :** Certifications, bénévolat, publications, références et sections personnalisées.
- [ ] **Validation ATS & accessibilité :** Garde-fous de contraste, mode ATS strict et tests E2E de personnalisation.

## 🔵 Phase 9 : Différenciation open-source v1
- [ ] **Export LaTeX/Typst :** Produire des exports texte natifs et réutilisables.
- [ ] **Comparaison de versions :** Diff sémantique entre snapshots de CV.
- [ ] **Mode “1 page challenge” :** Optimiser la densité sans perdre de données.
- [ ] **Local-first / BYOK / Ollama :** Durcir la configuration locale et les providers IA sans ajouter de service côté front.

## 🔵 Phase 10 : Runtime polish & local operations
- [x] **Header CV Builder épuré :** Regrouper les imports/exports dans deux menus `Upload CV` et `Download CV`.
- [x] **Startup gate frontend :** Attendre explicitement l'API Gateway et le renderer avant d'ouvrir l'application.
- [x] **OpenAPI renderer :** Exposer automatiquement la documentation du service Bun/Elysia.
- [x] **Logs Bun structurés :** Ecrire les événements renderer dans `.logs` avec métadonnées de route et durée.
- [x] **Logger Python refondu :** Reprendre `packages/utils/logger.py` pour une base plus robuste et plus lisible.
- [ ] **Ingestion PDF duale :** Conserver `llama-parse` et ajouter une option full local sélectionnable.
- [ ] **Monitoring léger :** Instrumentation minimale des services sans stack d'observabilité lourde.
