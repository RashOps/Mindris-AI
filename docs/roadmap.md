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

## 🔵 Phase 6 : Finalisation & SaaS Ready
- [x] **Self-hosting Docker local :** Compose, healthchecks, `.env.example`, guide et smoke script.
- [x] **Exports ouverts :** JSON, Markdown et HTML backend-driven, avec PDF maintenu via renderer.
- [ ] **Export DOCX :** Differe jusqu'a une implementation locale fiable.
- [ ] **Refactoring Microservices :** Durcissement production au-delà du self-hosting local.
- [ ] **Auth & Stripe :** (Optionnel) Préparation à la mise sur le marché.
- [ ] **Telemetry :** Suivi des performances avec LangSmith/Phoenix.

## 🔵 Phase 7 : UI unifiée & workflow local non-Docker
- [ ] **SaaS App Shell :** Unifier dashboard et outils dans une navigation produit unique.
- [ ] **Design system opérationnel :** Tokens, composants et états partagés pour remplacer les styles inline dispersés.
- [ ] **Commandes locales :** Scripts `uv` + `bun` pour réinstaller, configurer et lancer API, renderer et frontend sans Docker.
