# ADR 006 : Stabilisation Backend, Source de Vérité SQLite et Frontend Client Pur

**État :** ACCEPTÉ  
**Date :** 22 Juin 2026  
**Auteur :** Rayhan (Lead Architect), Codex  
**Projet :** Mindris AI

---

## 1. Contexte et Problématique

Mindris AI avait déjà un pipeline fonctionnel pour scraper une offre, analyser ses exigences, personnaliser un CV via RAG et générer des exports PDF. En revanche, plusieurs limites empêchaient le projet de devenir stable et maintenable :

1. L'API Gateway contenait trop de responsabilités dans un seul fichier.
2. Le frontend conservait trop de logique et d'état durable côté client.
3. Les URLs backend/renderer étaient codées en dur en `localhost`.
4. L'historique, les rapports ATS, les lettres générées et le tracker n'étaient pas persistés.
5. L'authentification locale de l'API n'était pas formalisée.
6. Les logs n'étaient pas systématiquement routés vers le logger centralisé.
7. Les prochains modules produit (tracker, company intel, ATS transparent) nécessitaient une base applicative persistante.

Le principe directeur retenu est : **le frontend est un client pur ; le backend est la source de vérité métier et applicative.**

---

## 2. Décisions Architecturales

### 2.1 Découper l'API Gateway en routers FastAPI

**Décision :** Remplacer le fichier monolithique `services/api-gateway/main.py` par une composition de routers :

- `system`
- `llm`
- `cv`
- `optimize`
- `history`
- `tracker`
- `company`

Les modèles de requêtes/réponses sont extraits dans `services/api-gateway/schemas.py`.

**Justification :**
- Réduire la taille et la complexité de `main.py`.
- Isoler les domaines métier.
- Permettre l'ajout de nouvelles routes sans rendre l'API Gateway fragile.

**Conséquences :**
- `main.py` devient le point d'assemblage : app, lifespan, middleware, auth et routers.
- Les routes existantes critiques restent compatibles (`/api/v1/optimize`, `/api/v1/cv/upload`, `/api/v1/cv/upload-pdf`, `/api/v1/cv/score`, etc.).

### 2.2 Utiliser SQLite comme stockage applicatif local

**Décision :** Ajouter une base SQLite locale `storage/mindris.db` pour stocker :

- CV courant.
- Offres analysées.
- Rapports ATS.
- Lettres de motivation.
- Résultats Company Intel.
- Candidatures du tracker.

**Choix final :** SQLAlchemy est utilisé directement au lieu de SQLModel.

**Justification :**
- SQLite suffit pour le mode local/private-first.
- SQLAlchemy était déjà présent dans `uv.lock`, alors que SQLModel aurait nécessité une mise à jour du lock impossible dans l'environnement courant sans accès réseau.
- Le RAG reste séparé : ChromaDB conserve uniquement les vecteurs CV.

**Conséquences :**
- `packages/database/records.py` contient les tables SQLAlchemy.
- `packages/database/session.py` expose `init_db()` et `get_session()`.
- `init_db()` est appelé au démarrage de FastAPI.

### 2.3 Protéger `/api/v1/*` par clé API

**Décision :** Ajouter une authentification simple par header `X-API-Key` pour les routes `/api/v1/*`.

Configuration :

```env
API_KEY=dev-mindris-api-key
```

**Cas particulier SSE :** `EventSource` ne permet pas d'envoyer de header custom. La clé API est donc aussi acceptée en query string `?api_key=...` pour les endpoints SSE.

**Conséquences :**
- Les routes métier sont protégées localement.
- `/` et `/api/v1/system/status` restent publics pour le healthcheck.
- `/docs` et `/redoc` sont désactivés par défaut dans FastAPI.

### 2.4 Centraliser les URLs frontend dans un client API

**Décision :** Créer `apps/web/src/lib/api.ts` pour centraliser :

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_RENDERER_URL`
- `NEXT_PUBLIC_API_KEY`
- headers JSON + API key
- URL SSE avec `api_key`

**Justification :**
- Éliminer les appels hardcodés à `localhost:8000` et `localhost:4000`.
- Préparer Docker Compose et les déploiements locaux propres.
- Garder une seule surface à modifier si l'API change.

### 2.5 Enrichir le scoring ATS avec une grille transparente

**Décision :** Étendre le modèle ATS avec `scoring_breakdown`.

Pondération retenue :

| Critère | Poids |
| :--- | ---: |
| Keyword Match Rate | 40 |
| Experience Relevance | 25 |
| Formatting & Structure | 15 |
| Quantification | 10 |
| Overall Coherence | 10 |

**Conséquences :**
- Le candidat peut comprendre pourquoi il perd des points.
- La page `/tools/ats-score` affiche désormais la méthode d'évaluation.
- Les rapports ATS sont persistés en SQLite.

### 2.6 Ajouter Company Intel en mode non bloquant

**Décision :** Ajouter un analyseur entreprise `company_analyzer.py` et une route `/api/v1/company/analyze`.

**Règle :** l'analyse entreprise ne doit jamais casser l'optimisation CV. En cas d'échec LLM ou absence d'information fiable, le backend retourne une réponse dégradée avec `unavailable_reason`.

**Conséquences :**
- Le pipeline d'optimisation peut émettre un événement SSE `company_result`.
- Le panneau Job Insights affiche les informations entreprise quand elles sont disponibles.

### 2.7 Ajouter le tracker de candidatures

**Décision :** Ajouter un tracker Kanban backend-driven avec les statuts fixes :

- `wishlist`
- `applied`
- `interview`
- `offer`
- `rejected`

**Principe :** chaque création, modification ou déplacement appelle l'API, puis le frontend recharge l'état depuis SQLite.

**Conséquences :**
- Nouvelle page `/tools/tracker`.
- Nouvelles routes `/api/v1/tracker/applications*`.
- Le frontend reste un client d'affichage et d'interaction.

### 2.8 Logger centralisé

**Décision :** Faire utiliser `utils.logger.get_logger(__name__)` par les modules critiques et renforcer la création du dossier `logs/` dans la factory.

**Conséquences :**
- Les logs applicatifs écrivent dans `logs/app.log` quand les services démarrent.
- Les modules backend partagent un format de log commun.

---

## 3. Interfaces et Configuration

### Variables d'environnement ajoutées

```env
API_KEY=dev-mindris-api-key
RENDERER_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RENDERER_URL=http://localhost:4000
NEXT_PUBLIC_API_KEY=dev-mindris-api-key
```

### Nouvelles routes principales

| Route | Méthode | Usage |
| :--- | :--- | :--- |
| `/api/v1/system/status` | GET | Statut API, storage, vectordb, SQLite |
| `/api/v1/cv/current` | GET/PUT | CV courant persistant |
| `/api/v1/cv/import-json` | POST | Import CV JSON |
| `/api/v1/history/jobs` | GET | Historique des offres |
| `/api/v1/history/jobs/{id}` | GET/DELETE | Détail/suppression offre |
| `/api/v1/tracker/applications` | GET/POST | Tracker candidatures |
| `/api/v1/tracker/applications/{id}` | PATCH/DELETE | Modification candidature |
| `/api/v1/tracker/applications/{id}/move` | PATCH | Déplacement Kanban |
| `/api/v1/company/analyze` | POST | Analyse entreprise |

---

## 4. Fichiers Clés Modifiés

| Fichier | Type de modification |
| :--- | :--- |
| `services/api-gateway/main.py` | Refactorisation en point d'assemblage FastAPI |
| `services/api-gateway/routers/` | Nouveaux routers métier |
| `services/api-gateway/schemas.py` | Schémas API Gateway |
| `services/api-gateway/auth.py` | Auth API key |
| `services/api-gateway/persistence.py` | Helpers SQLite/sérialisation |
| `packages/database/records.py` | Tables SQLAlchemy |
| `packages/database/session.py` | Engine/session/init SQLite |
| `services/intelligence/ats_score.py` | Rapport ATS transparent |
| `services/intelligence/company_analyzer.py` | Analyse entreprise |
| `apps/web/src/lib/api.ts` | Client API frontend centralisé |
| `apps/web/src/app/tools/tracker/page.tsx` | Nouveau tracker |
| `Dockerfile`, `docker-compose.yml` | Orchestration locale |
| `.github/workflows/ci.yml` | CI backend/frontend |

---

## 5. Vérification

Vérifications effectuées dans l'environnement courant :

| Vérification | Résultat |
| :--- | :--- |
| Compilation syntaxique Python (`compileall`) | OK |
| `git diff --check` | OK |
| `uv run ruff check .` | Bloqué : environnement sans dépendances installées et réseau PyPI refusé |
| Build frontend | Non exécuté : pas de `node_modules` local et réseau indisponible |

---

## 6. Conséquences

- **Positives :**
  - Le backend devient la source de vérité métier.
  - Les fonctionnalités history/tracker/company/ATS transparent reposent sur une base persistante.
  - Le frontend est plus portable grâce aux variables d'environnement.
  - L'API est plus maintenable grâce aux routers.
  - Docker Compose peut lancer les trois services principaux.

- **Négatives / Points de vigilance :**
  - La clé API exposée via `NEXT_PUBLIC_API_KEY` est acceptable uniquement pour un outil local. Une future version SaaS devra remplacer ce modèle par une authentification serveur/session.
  - La CI n'utilise pas `uv sync --frozen` tant que le lock ne peut pas être régénéré dans un environnement avec réseau.
  - Les fichiers morts identifiés doivent encore être supprimés dans un environnement où l'opération destructive est autorisée.

---

## 7. Règle de Processus Adoptée

À partir de cette décision, toute fin de plan d'implémentation significatif dans Mindris AI doit produire automatiquement un ADR dans `docs/adr/`, en reprenant le format des ADR existants.
