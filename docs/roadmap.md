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
- [x] **BYOK securise via UI :** Saisie backend-owned, secrets masques, write-only, redaction logs.
- [x] **Audit des frontieres de confiance :** Uploads, templates, exports, auth locale, hygiene CI/release.
- [x] **Hygiène repo & contribution :** Purge des fichiers morts, repurposing utile, `AGENTS.md`.

## 🔵 Phase 15 : Configuration & Local Runtime Control
- [x] **Section Configuration AppShell :** Providers, modeles, toggles runtime et etat applicatif.
- [x] **Detection Ollama locale :** Probe backend des modeles installes et selection assistee.
- [x] **Ergonomie dev locale :** Reload Bun en developpement et diagnostics runtime.

## 🔵 Phase 16 : ATS Transparency & Evaluation Integrity
- [x] **Rubric ATS explicite :** Methode de scoring visible, severites et deductions.
- [x] **Modes d'evaluation :** Standard vs strict ATS avec preuves et explications.
- [x] **Traçabilite des scores :** Lien score ↔ CV ↔ offre ↔ contexte d'evaluation.

## 🔵 Phase 17 : Unified Activity History
- [x] **Ledger d'activite backend :** Historique unifie scrapes, CV, LM, ATS, tracker, LLM runs.
- [x] **Lineage des artefacts :** Liens entre opportunites, revisions de CV, LM et rapports.
- [x] **UI d'audit :** Consultation et filtrage de l'historique depuis l'application.

## 🔵 Phase 18 : Workflow Automation
- [x] **Opportunity workflow :** Scrape -> opportunite -> CV lie -> LM liee -> tracker.
- [x] **Automatisation explicite :** Creation guidee des artefacts avec etats metier auditable.
- [x] **Rappels & relances :** Taches de suivi integrees au Job Tracker.

## 🔵 Phase 19 : Recruiter Intelligence Layer
- [x] **Enrichissement entreprise :** Profil borne de l'entreprise et contexte de recrutement.
- [x] **Role-fit hints :** Signaux utiles pour adapter CV et LM.
- [x] **Risk & unknowns :** Alertes sur zones d'incertitude ou signaux faibles.

## 🔵 Phase 20 : Product Polish & Secondary UX
- [x] **Guide interne Mindris :** Aide produit integree et contextuelle dans l'AppShell.
- [x] **Theme system :** Dark/light mode aligne au design system.
- [x] **Markdown workspace plus riche :** Export DOCX et finitions du convertisseur.

## 🔵 Phase 21 : UI System Consolidation
- [x] **Guide produit dedie :** Page interne complete sur Mindris, ses workflows et ses frontieres runtime.
- [x] **Normalisation UI & dark mode :** Tokens partages, survols lisibles, surfaces coherentes et theme unifie.
- [x] **Historique gouverne :** Purge globale avec confirmation destructive et contrat backend transactionnel.
- [x] **Job Tracker compact :** Densite plus SaaS et details secondaires en disclosure.
- [x] **CV Builder stabilise :** Barre d'outils refondue et alignement robuste en shell etendu.

## 🔵 Phase 22 : Workflow Reliability & Data Integrity
- [x] **Workflow candidat fiable :** Durcir les transitions d'etat entre opportunite, ATS, CV, LM et tracker.
- [x] **Integrite des liens metier :** Detecter, prevenir et reparer les references orphelines ou incoherentes.
- [x] **Reprise et reprise sur erreur :** Exposer des etats clairs, retries bornes et recovery paths pour les workflows incomplets.
- [x] **QA de continuite produit :** Renforcer les tests API/E2E sur les parcours relies et les cas de donnees degradees.

## 🔵 Phase 23 : Security & Operational Hardening
- [x] **Durcissement des entrees et du rendu :** Valider et sanitiser uploads, templates, CSS, markdown/html et URLs non fiables.
- [x] **Durcissement runtime et API :** Renforcer config env, timeouts, retries, CORS/headers et erreurs normalisees.
- [x] **Durcissement secrets et etat local :** Revalider BYOK, frontieres de persistence client et redaction des logs.
- [x] **Resilience operationnelle :** Structurer logs, verifier health/readiness, documenter backup/restore et etendre les tests critiques.

## 🔵 Phase 24 : Theme System Completion & UI Contract Normalization
- [x] **Theme contract canonique :** Finaliser le bootstrap dark/light, les tokens semantiques et les regles de persistance.
- [x] **Surfaces unifiees :** Normaliser CV Builder, ATS, Tracker, History, Workflow et Runtime Gate sur des etats de surface partages.
- [x] **Regression theme/UI :** Ajouter des tests cibles pour le switch de theme, les hover states et la lisibilite.

## 🔵 Phase 25 : Frontend Surface Decomposition & IA Settings Refactor
- [x] **Decomposition des gros modules front :** Redecouper les surfaces les plus fragiles du web app pour reduire la derive UI.
- [x] **Configuration clarifiee :** Separer configuration operateur, secrets/providers et diagnostics runtime.
- [x] **CV Builder simplifie :** Reorganiser header et zones d'action sans casser les contrats backend.

## 🔵 Phase 26 : Online Boundary & API Trust Contract
- [x] **Transport client assaini :** Retirer les hypotheses de cle publique cote front pour preparer un futur mode online plus propre.
- [x] **Entrees API durcies :** Supprimer les alias de credentials en query string et resserrer le contrat auth/erreur.
- [x] **Frontiere local vs online explicite :** Documenter et tester une separation nette entre ergonomie locale et posture future hebergee.

## 🔵 Phase 27 : Product Coherence, QA & Content Governance
- [x] **Regression produit ciblee :** Revalider les parcours critiques avec Playwright Python sur Dashboard, CV Builder, Guide, History, Markdown, Tracker et Workflow.
- [x] **Guide/copy/branding alignes :** Harmoniser le guide interne, README public et surfaces prioritaires avec le comportement reel de Mindris.
- [x] **Derniere passe de coherence UI prioritaire :** Corriger les derniers ilots visuels sur Dashboard, CV Builder, History, Guide, Markdown, Tracker et Workflow.
- [x] **Francais-first prioritaire :** Dashboard, CV Builder, Guide et History utilisent une copy produit coherente en francais.

ADRs : [013](adr/013-runtime-gate-and-cv-builder-stabilization.md),
[014](adr/014-workflow-beta-and-artifact-lineage.md),
[015](adr/015-ui-simplification-theme-and-french-first.md),
[017](adr/017-documentation-governance-and-desktop-deferral.md).

## 🟢 Phase 28 : Self-hosted Release Distribution (Terminée)
- [x] **Compose release GHCR :** Ajouter `docker-compose.release.yml` avec images publiques versionnables.
- [x] **Install one-command :** Ajouter `install_self_hosted.sh` pour installer sans cloner le depot.
- [x] **Update/uninstall/smoke :** Ajouter scripts de mise a jour, desinstallation et verification release.
- [x] **GitHub Actions Docker release :** Publier `api-gateway`, `renderer` et `web` sur GHCR.
- [x] **Fresh install WSL Debian :** Valider pull images, healthchecks, RuntimeGate endpoints et override de port `MINDRIS_WEB_PORT=3100`.
- [x] **Cleanup test self-hosted :** Ajouter un script de nettoyage containers/images/volumes/network depuis la racine du repo.

ADR : [016](adr/016-ghcr-one-command-self-hosting.md).

## 🟢 Phase 29 : Secondary Tools Simplification (Terminée)
- [x] **Markdown PDF + lettres persistantes :** Ouvrir une lettre existante, afficher `cover_letter_id`, sauvegarder une version et revenir a History/Workflow.
- [x] **ATS Score simplifie :** Clarifier les CTA, etats vides, selection job/CV et restitution des deductions.
- [x] **Tracker simplifie :** Reduire la densite, clarifier les colonnes et rendre les actions secondaires moins envahissantes.
- [x] **History polish :** Garder le ledger lisible quand le volume augmente et faciliter les filtres par job/opportunite.

## 🔵 Phase 30 : Workflow Beta Maturity
- [x] **Filtrage job-aware :** Restreindre les artefacts proposes aux jobs/opportunites coherents.
- [x] **Checklist "pret a candidater" :** Exposer clairement ce qui manque avant tracker/envoi.
- [x] **Recovery paths :** Rendre reparables les liens orphelins ou incoherents sans action fragile.
- [ ] **Promotion hors Beta :** Ne retirer le badge Beta qu'apres validation des historiques, liens et parcours UX.

## 🔵 Phase 31 : I18n & Guide Experience
- [ ] **Textes UI centralises :** Sortir progressivement les strings produit des composants.
- [x] **Francais-first canonique :** Garder le francais comme langue produit par defaut.
- [x] **Infrastructure de traduction :** Fournir des dictionnaires FR/EN types et une locale backend-owned sans deplacer la logique metier dans le frontend.
- [ ] **Migration des surfaces :** Remplacer les strings restantes et traduire les contenus metier dynamiques.
- [x] **Guide contextualise :** Ajouter des parcours/checklists relies aux pages et actions critiques.

## ⚪ Phase 32 : Desktop/Tauri (Reportée)
- [ ] **Shell Tauri :** Reprendre apres stabilisation Docker, Workflow Beta et i18n.
- [ ] **Supervision services locaux :** Decider native binaries vs Docker containers.
- [ ] **Installateurs Linux/Windows :** Priorite apres one-command Docker et guide utilisateur mature.

## 🟢 Phase 33 : Release v0.4.0 (Terminée)

- [x] **Version et changelog candidat :** Synchroniser les manifests et les notes `Unreleased` sur `0.4.0`.
- [x] **Gates CI complets :** Ajouter les tests Bun frontend/renderer et les validations pre-publication Docker.
- [x] **Candidat GHCR :** Publier et valider le candidat final avec smoke et navigateur E2E post-publication.
- [x] **Fresh install Debian :** Valider installation, RuntimeGate, CV Builder et exports depuis les images candidates.
- [x] **Release stable :** Finaliser le changelog, taguer `v0.4.0` et publier la GitHub Release.

ADR : [021](adr/021-v0-4-release-gates-and-rc-distribution.md).
