# ADR 005 : Dynamic CV Ingestion Pipeline & PDF Parsing with LlamaCloud

**État :** ACCEPTÉ  
**Date :** 13 Mai 2026  
**Auteur :** Rayhan (Lead Architect)  
**Projet :** Mindris AI

---

## 1. Contexte et Problématique

Jusqu'à cette session, le pipeline RAG de Mindris AI utilisait un **profil de CV hardcodé** (données AXA fictives) stocké dans ChromaDB via le script `ingest_cv.py`, exécuté manuellement. Cela posait deux problèmes majeurs :

1. **Données incorrectes** : L'agent CrewAI rédigeait des bullet points basés sur ce profil fictif, peu importe l'offre d'emploi soumise. Le pipeline fonctionnait techniquement mais était inutilisable en conditions réelles.
2. **Absence d'interface d'upload** : Il n'existait aucun moyen pour l'utilisateur de soumettre son propre CV sans modifier les fichiers source.

L'objectif est de rendre le pipeline entièrement dynamique : l'utilisateur doit pouvoir uploader son vrai CV (JSON structuré ou PDF brut), et le système doit automatiquement écraser l'ancien profil dans ChromaDB.

---

## 2. Décisions Architecturales

### 2.1 Refactorisation de l'ingestion : `ingest_cv_data(dict)`

**Décision :** Extraire la logique d'ingestion de ChromaDB de `ingest_master_cv(path)` vers une nouvelle fonction `ingest_cv_data(cv_data: dict)`.

**Justification :**
- Permet d'appeler l'ingestion directement depuis l'API Gateway avec des données déjà en mémoire (sans passer par le disque).
- Maintien de la compatibilité ascendante : `ingest_master_cv()` délègue désormais à `ingest_cv_data()`.
- `store.clear()` est **toujours** appelé avant l'ingestion pour garantir qu'il n'y a jamais de vecteurs fantômes ("données mortes") dans ChromaDB.

```python
# Avant
def ingest_master_cv(cv_json_path: str) -> None: ...

# Après
def ingest_cv_data(cv_data: dict) -> None:
    store.clear()  # Toujours écraser l'ancien profil
    store.add_texts(...)

def ingest_master_cv(cv_json_path: str) -> None:
    cv_data = json.load(...)
    ingest_cv_data(cv_data)  # Délègue
```

### 2.2 Deux nouvelles routes sur l'API Gateway (FastAPI)

| Route | Méthode | Payload | Cas d'usage |
| :--- | :--- | :--- | :--- |
| `/api/v1/cv/upload` | `POST` | `application/json` | Upload d'un CV structuré au format JSON |
| `/api/v1/cv/upload-pdf` | `POST` | `multipart/form-data` | Upload d'un CV PDF brut via LlamaCloud |

Les deux routes appellent `ingest_cv_data()` en interne et retournent `{"status": "success", "cv_data": {...}}` pour permettre au frontend de mettre à jour l'éditeur instantanément.

**Dépendances ajoutées** à `services/api-gateway/pyproject.toml` :
- `llama-cloud>=2.0.0` — SDK officiel LlamaCloud v2 pour le parsing PDF.
- `python-multipart>=0.0.20` — Requis par FastAPI pour lire les fichiers `multipart/form-data`.

### 2.3 Pipeline PDF → Markdown → JSON structuré (`pdf_parser.py`)

**Décision :** Créer un service d'ingestion PDF en deux étapes dans `services/intelligence/pdf_parser.py`.

```
PDF (bytes)
    ↓  LlamaCloud SDK (AsyncLlamaCloud.parsing.parse)
Markdown (texte propre)
    ↓  LiteLLM + Groq llama-3.3-70b-versatile (T=0.0)
JSON structuré (conforme au schéma Mindris)
    ↓  ingest_cv_data()
ChromaDB (profil indexé, ancien effacé)
```

**Choix techniques :**
- **LlamaCloud** (vs alternatives comme PDFMiner, PyMuPDF) : Meilleure extraction des CV multi-colonnes, gestion des tableaux et des mises en page complexes. Free tier : 10 000 crédits/mois.
- **Tier `cost_effective`** avec `version="latest"` et `expand=["markdown"]` : Équilibre qualité/coût pour un CV standard (3 crédits/page vs 45 pour `agentic_plus`).
- **LLM de structuration à `temperature=0.0`** : Déterminisme total pour l'extraction JSON — on veut du parsing, pas de la créativité.
- **Configuration via `LLAMA_CLOUD_API_KEY`** : La clé est lue depuis le fichier `.env` racine via le système `Settings` (Pydantic BaseSettings) centralisé dans `packages/utils/config.py`.

### 2.4 Corrections du SDK LlamaCloud v2 (leçons apprises)

Le SDK `llama-cloud` v2 a une API significativement différente des versions précédentes (`llama-parse`, `llama-cloud-services`). Trois paramètres ont été corrigés itérativement :

| Erreur rencontrée | Cause | Correction |
| :--- | :--- | :--- |
| `got an unexpected keyword argument 'file'` | Le paramètre s'appelle `upload_file` en v2 | `upload_file=(name, fd, mime)` |
| `non-empty sequence for 'expand'` | `output_options` n'existe pas en v2 | `expand=["markdown"]` |
| `object of type 'Markdown' has no len()` | `result.markdown` est un objet `Markdown`, pas un `str` | `str(result.markdown)` |

### 2.5 Interface utilisateur : Deux boutons d'upload

**Décision :** Ajouter deux points d'entrée distincts dans le header de `apps/web/src/app/page.tsx` :
- **"Upload PDF CV"** — Bouton principal avec spinner animé pendant le traitement (10-30s LlamaCloud + LLM).
- **"JSON CV"** — Bouton secondaire pour un upload rapide sans parsing.

Un **toast de statut** (`uploadStatus`) s'affiche en haut à droite avec des messages d'état (parsing en cours, succès, erreur) et disparaît automatiquement après 3-6 secondes.

### 2.6 Correction de la régression Playwright

**Problème :** L'exécution de `uv pip install llama-cloud` a désynchronisé l'environnement virtuel du workspace, désinstallant silencieusement `playwright` et ses binaires.

**Résolution :** Utiliser **uniquement** `uv sync --all-packages` pour gérer les dépendances du workspace (jamais `uv pip install` directement). Suivi de `uv run playwright install chromium` pour réinstaller les binaires du navigateur.

**Règle établie :** Dans ce monorepo `uv`, toute installation de paquet doit passer par la modification du `pyproject.toml` du service concerné + `uv sync --all-packages`.

---

## 3. Configuration requise

Un champ a été ajouté au modèle `Settings` central (`packages/utils/config.py`) :

```python
llama_cloud_api_key: SecretStr | None = Field(default=None, alias="LLAMA_CLOUD_API_KEY")
```

À ajouter dans le fichier `.env` racine :

```bash
LLAMA_CLOUD_API_KEY="llx-xxxxxxxxxxxx"
```

Clé gratuite disponible sur [cloud.llamaindex.ai](https://cloud.llamaindex.ai) (10 000 crédits/mois).

---

## 4. Fichiers modifiés

| Fichier | Type de modification |
| :--- | :--- |
| `services/intelligence/ingest_cv.py` | Refactorisation : extraction de `ingest_cv_data()` |
| `services/intelligence/pdf_parser.py` | **Nouveau** : pipeline PDF → Markdown → JSON |
| `services/api-gateway/main.py` | Deux nouvelles routes : `/cv/upload` et `/cv/upload-pdf` |
| `services/api-gateway/pyproject.toml` | Ajout de `llama-cloud` et `python-multipart` |
| `packages/utils/config.py` | Ajout de `llama_cloud_api_key` |
| `apps/web/src/app/page.tsx` | Boutons d'upload, toast de statut, handlers PDF/JSON |

---

## 5. Conséquences

- **Positives :**
  - Le pipeline RAG utilise désormais les vraies données de l'utilisateur.
  - Zéro donnée fantôme dans ChromaDB grâce au `store.clear()` systématique.
  - L'architecture est extensible : on peut facilement ajouter d'autres formats (DOCX, LinkedIn URL) en branchant un nouveau parser sur la même route `/upload`.
- **Négatives / Points de vigilance :**
  - La dépendance à un service cloud externe (LlamaCloud) introduit une latence de 10-30s et un coût (3 crédits/page, 10 000 gratuits/mois).
  - Le SDK `llama-cloud` est en évolution rapide : vérifier les changements d'API lors des mises à jour de version.
