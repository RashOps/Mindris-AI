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
- [x] **Export DOCX :** Export backend-owned disponible et documente.
- [x] **Durcissement Microservices :** Healthchecks, erreurs normalisees, timeouts, retries, stockage local robuste.
- [x] **Validation Docker bout en bout :** `docker compose up --build` et smoke self-hosting.
- [x] **E2E navigateur :** Automatiser CV Builder, exports, ATS Scorer et Job Tracker.

## 🟢 Phase 7 : UI unifiée & workflow local non-Docker (Terminée)
- [x] **SaaS App Shell :** Unifier dashboard et outils dans une navigation produit unique.
- [x] **Design system opérationnel :** Tokens, composants et états partagés pour remplacer les styles inline dispersés.
- [x] **Commandes locales :** Scripts `uv` + `bun` pour réinstaller, configurer et lancer API, renderer et frontend sans Docker.

## 🔵 Phase 8 : CV Customization Studio
- [x] **Contrat backend de personnalisation :** Normaliser layout, typographie, couleurs, sections et labels dans le schema CV.
- [x] **Renderer configurable :** Appliquer les tokens et la structure de sections depuis le contrat backend.
- [x] **Studio UI backend-driven :** Exposer les contrôles avancés sans logique métier côté front.
- [x] **Sections avancées :** Certifications, bénévolat, publications, références et sections personnalisées.
- [x] **Validation ATS & accessibilité :** Garde-fous de contraste, mode ATS strict et tests E2E de personnalisation.

## 🔵 Phase 9 : Différenciation open-source v1
- [x] **Export LaTeX/Typst :** Produire des exports texte natifs et réutilisables.
- [x] **Comparaison de versions :** Diff sémantique entre snapshots de CV.
- [x] **Mode “1 page challenge” :** Optimiser la densité sans perdre de données.
- [x] **Local-first / BYOK / Ollama :** Durcir la configuration locale et les providers IA sans ajouter de service côté front.

## 🔵 Phase 10 : Runtime polish & local operations
- [x] **Header CV Builder épuré :** Regrouper les imports/exports dans deux menus `Upload CV` et `Download CV`.
- [x] **Startup gate frontend :** Attendre explicitement l'API Gateway et le renderer avant d'ouvrir l'application.
- [x] **OpenAPI renderer :** Exposer automatiquement la documentation du service Bun/Elysia.
- [x] **Logs Bun structurés :** Ecrire les événements renderer dans `.logs` avec métadonnées de route et durée.
- [x] **Logger Python refondu :** Reprendre `packages/utils/logger.py` pour une base plus robuste et plus lisible.
- [x] **Ingestion PDF duale :** Conserver `llama-parse` et ajouter une option full local sélectionnable.
- [x] **Monitoring léger :** Instrumentation minimale des services sans stack d'observabilité lourde.

## 🔵 Phase 11 : Advanced CSS Editor
- [x] **Contrat CSS avancé :** Etendre le contrat `global_settings` avec un bloc `advanced_css` backend-owned.
- [x] **Sanitation renderer :** Filtrer et appliquer le CSS custom uniquement dans le Shadow DOM du CV.
- [x] **UI éditeur expert :** Ajouter un panneau CSS avancé, warnings et snippets sans déplacer de logique métier côté front.
- [x] **Validation export :** Garantir preview/PDF stables et ignorer le CSS avancé pour les exports sémantiques.

## 🔵 Phase 12 : Multilingual CV System
- [x] **Variantes de langue backend-owned :** Supporter plusieurs locales sous un meme resume logique.
- [x] **Edition ciblee par locale :** Permettre au builder de creer, selectionner et modifier une variante sans fusion cote front.
- [x] **Exports et versioning par locale :** Resoudre preview, exports et revisions depuis la variante selectionnee.
- [x] **Compatibilite ascendante :** Migrer les resumes mono-langue existants sans rupture de contrat.

## 🔵 Phase 13 : QA Hardening & Community Templates
- [x] **E2E navigateur en CI ou job manuel :** Executer automatiquement les parcours critiques sur stack locale ou pipeline dedie.
- [x] **Couverture multilingue :** Verifier explicitement les flows FR/EN et les regressions de variantes de langue.
- [x] **Selecteurs UI robustes :** Durcir les affordances et les tests pour eviter les collisions de labels dans Playwright.
- [x] **Format de template communautaire :** Definir un package import/export avec manifeste, metadonnees, preset settings, CSS autorise et preview.
- [x] **Import/export de templates :** Permettre de telecharger, installer, exporter et reinstaller un template sans edition manuelle fragile.
- [x] **Contribution flow & marketplace bootstrap :** Preparer le circuit auteur -> publication -> installation Mindris avec validation et moderation minimales.

## 🔵 Phase 14 : Security & Secret Boundary Hardening
- [ ] **BYOK securise via UI :** Saisie backend-owned, secrets masques, write-only, redaction logs.
- [ ] **Audit des frontieres de confiance :** Uploads, templates, exports, auth locale, hygiene CI/release.
- [ ] **Hygiène repo & contribution :** Purge des fichiers morts, repurposing utile, `AGENTS.md`.

## 🔵 Phase 15 : Configuration & Local Runtime Control
- [ ] **Section Configuration AppShell :** Providers, modeles, toggles runtime et etat applicatif.
- [ ] **Detection Ollama locale :** Probe backend des modeles installes et selection assistee.
- [ ] **Ergonomie dev locale :** Reload Bun en developpement et diagnostics runtime.

## 🔵 Phase 16 : ATS Transparency & Evaluation Integrity
- [ ] **Rubric ATS explicite :** Methode de scoring visible, severites et deductions.
- [ ] **Modes d'evaluation :** Standard vs strict ATS avec preuves et explications.
- [ ] **Traçabilite des scores :** Lien score ↔ CV ↔ offre ↔ contexte d'evaluation.

## 🔵 Phase 17 : Unified Activity History
- [ ] **Ledger d'activite backend :** Historique unifie scrapes, CV, LM, ATS, tracker, LLM runs.
- [ ] **Lineage des artefacts :** Liens entre opportunites, revisions de CV, LM et rapports.
- [ ] **UI d'audit :** Consultation et filtrage de l'historique depuis l'application.

## 🔵 Phase 18 : Workflow Automation
- [ ] **Opportunity workflow :** Scrape -> opportunite -> CV lie -> LM liee -> tracker.
- [ ] **Automatisation explicite :** Creation guidee des artefacts avec etats metier auditable.
- [ ] **Rappels & relances :** Taches de suivi integrees au Job Tracker.

## 🔵 Phase 19 : Recruiter Intelligence Layer
- [ ] **Enrichissement entreprise :** Profil borne de l'entreprise et contexte de recrutement.
- [ ] **Role-fit hints :** Signaux utiles pour adapter CV et LM.
- [ ] **Risk & unknowns :** Alertes sur zones d'incertitude ou signaux faibles.

## 🔵 Phase 20 : Product Polish & Secondary UX
- [ ] **Guide interne Mindris :** Aide produit integree et contextuelle dans l'AppShell.
- [ ] **Theme system :** Dark/light mode aligne au design system.
- [ ] **Markdown workspace plus riche :** Export DOCX et finitions du convertisseur.
