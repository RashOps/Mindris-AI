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

## 🔵 Phase 4 : Moteur de Rendu (The Architect)
- [ ] **Renderer Service :** Setup de Bun + Puppeteer.
- [ ] **Shadow DOM Implementation :** Isolation des styles de templates.
- [ ] **Templates Pro :** Création du premier template CSS (Modern Minimalist).
- [ ] **Conversion PDF :** API de génération haute fidélité.

## 🟣 Phase 5 : Interface "Canva-like"
- [ ] **Frontend Next.js :** Dashboard principal.
- [ ] **Drag & Drop Engine :** Intégration de `dnd-kit` liée au JSON.
- [ ] **Live Preview :** Rendu en temps réel des modifications IA.
- [ ] **Ghost Mode :** Feedback visuel des agents en plein travail.

## ⚪ Phase 6 : Finalisation & SaaS Ready
- [ ] **Refactoring Microservices :** Dockerisation complète.
- [ ] **Auth & Stripe :** (Optionnel) Préparation à la mise sur le marché.
- [ ] **Telemetry :** Suivi des performances avec LangSmith/Phoenix.