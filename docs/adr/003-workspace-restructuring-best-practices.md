# ADR 003: Restructuration du Workspace UV et Standards de Services

**État :** ACCEPTÉ  
**Date :** 29 Avril 2026  
**Auteur :** Antigravity (AI Assistant) & Rayhan (Lead Architect)  
**Projet :** Mindris AI

---

## 1. Contexte et Problématique
Initialement, le projet utilisait `uv` pour la gestion du workspace, mais présentait plusieurs incohérences :
- Une déclaration de workspace incomplète (omission de `packages/` et de certains services).
- Une structure de dossiers redondante (`services/nom-service/src/nom-service/`).
- Des dépendances de runtime polluant le `pyproject.toml` racine.
- Des erreurs d'importation dues à une mauvaise reconnaissance des paquets par le moteur de build en mode "editable".

## 2. Décisions Architecturales

### 2.1 Standardisation du Workspace UV
Nous avons centralisé la gestion des dépendances via `uv` :
- **Workspace Complet :** Le fichier racine inclut désormais tous les dossiers pertinents (`services/*`, `packages/*`, `apps/*`).
- **Isolation des Dépendances :** Les dépendances de runtime sont déplacées dans les services/paquets spécifiques. Le `pyproject.toml` racine ne contient que les `dev-dependencies` globales (ex: `ruff`).
- **Synchronisation Globale :** Utilisation de `uv sync --all-packages` pour garantir que tous les membres du workspace et leurs dépendances croisées sont installés dans l'environnement virtuel unique du projet.

### 2.2 Structure "Absolute Flat" pour les Services
Pour réduire la complexité et la profondeur des chemins de fichiers, nous avons opté pour une structure plate :
- **Suppression du dossier `src/` :** Les fichiers sources sont placés directement à la racine de chaque service (ex: `services/scraper/core.py`).
- **Paquet à la racine :** Chaque service est son propre paquet Python (présence de `__init__.py` à la racine du service).

### 2.3 Choix du Moteur de Build : Setuptools
Bien que `hatchling` soit moderne, il impose des contraintes strictes sur la structure des dossiers (exigeant un sous-dossier portant le nom du paquet) pour fonctionner en mode "editable" avec `uv`.
- **Décision :** Utilisation de `setuptools` comme backend de build pour les services.
- **Justification :** Permet d'utiliser `package-dir = {"nom_paquet" = "."}` pour mapper la racine du service comme étant le contenu du paquet, garantissant la compatibilité avec les installations `uv` en mode développement.

### 2.4 Gestion du Code Partagé
- **Dossier `packages/` :** Création de paquets Python réels (ex: `packages/database`) pour le code partagé.
- **Liaisons Internes :** Utilisation de `tool.uv.sources` pour lier les paquets locaux entre eux au sein du workspace.

## 3. Conséquences
- **Positives :**
    - Structure de fichiers beaucoup plus légère et lisible.
    - Imports cohérents sur tout le projet (`import scraper`, `import database`).
    - Performance de build et de synchronisation optimale avec `uv`.
    - Meilleure isolation des services tout en facilitant le partage de code.
- **Négatives :**
    - Nécessite l'utilisation de `setuptools` au lieu de `hatchling` pour les services "plats".
    - Le calcul des chemins relatifs dans le code (ex: `Path(__file__).parents[N]`) doit être rigoureusement mis à jour lors de tout changement de structure.

## 4. Guide de Création d'un Nouveau Service
Pour tout nouveau service Python dans `services/` :
1. Placer `pyproject.toml` et `__init__.py` à la racine du dossier du service.
2. Utiliser `setuptools` comme build-backend.
3. Déclarer le paquet via `package-dir = {"nom_service" = "."}`.
4. L'ajouter au workspace via `uv sync --all-packages`.
