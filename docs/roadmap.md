# 🚀 Mindris AI - Project Roadmap

**Objectif :** Créer un moteur autonome d'optimisation de carrière (Scraping -> RAG -> Rendu PDF).

---

## 🟢 Phase 1 : Fondations & Architecture (En cours)
- [x] Initialisation du Workspace (`uv`, `Bun`)
- [x] Définition de l'ADR-001 (Stack Technique)
- [x] Conception du **Mindris Core Schema** (JSON/Zod)
- [x] Configuration de l'environnement WSL (Dependencies & Playwright deps)

## 🟡 Phase 2 : Ingestion & Scraping (Priorité 1)
- [ ] **Scraper Service :** Développement du module Playwright (LinkedIn/Indeed).
- [ ] **Stealth Integration :** Contournement des anti-bots.
- [ ] **Agent Analyste :** Premier agent CrewAI pour transformer le HTML brut en "Job JSON".
- [ ] **Validation :** Schéma Zod pour valider l'extraction.

## 🟠 Phase 3 : Intelligence & RAG
- [ ] **Supabase Setup :** Création des tables et activation de `pgvector`.
- [ ] **Embedding Pipeline :** Script pour vectoriser le "Master Profile" (ton parcours).
- [ ] **LangGraph Workflow :**
    - Noeud de Retrieval (Matching sémantique).
    - Noeud de Rédaction (Agent Copywriter).
    - Noeud de Scoring (ATS-Proof check).
- [ ] **Multi-Model Support :** Intégration LiteLLM (Ollama / Groq / Gemini).

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