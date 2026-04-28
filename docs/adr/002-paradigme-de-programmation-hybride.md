# ADR 002: Paradigme de Programmation Hybride - Mindris AI

**État :** ACCEPTÉ  
**Date :** 28 Avril 2026  
**Auteur :** Rayhan (Lead Architect)  
**Projet :** Mindris AI

---

## 1. Contexte et Problématique
Le projet nécessite de gérer des interactions techniques complexes (sessions de navigateurs, connexions DB) tout en manipulant des flux de données IA (transformations de texte, RAG). Un choix de paradigme unique ("Full POO" ou "Full Fonctionnel") risquerait de rendre le code soit trop verbeux, soit difficile à modulariser.

## 2. Décisions Architecturales

### 2.1 Services & Infrastructure (POO)
- **Choix :** Programmation Orientée Objet.
- **Application :** Scrapers, Connecteurs de base de données, Générateur PDF.
- **Justification :** Utilisation de l'encapsulation pour gérer l'état (sessions, drivers) et de l'héritage pour spécialiser les comportements (ex: `BaseScraper` -> `LinkedInScraper`).

### 2.2 Pipeline de Données & IA (Fonctionnel)
- **Choix :** Programmation Fonctionnelle / Data-Driven.
- **Application :** Transformations RAG, Nettoyage de texte, Parsing JSON, Orchestration LangGraph.
- **Justification :** Les transformations de données sont plus robustes lorsqu'elles sont traitées par des fonctions pures (immuabilité), facilitant les tests unitaires et le debugging des agents.

### 2.3 Modélisation des Données
- **Outils :** `Pydantic` (Python) et `Zod` (TypeScript).
- **Application :** Contrats de données rigides pour toutes les communications inter-services.

## 3. Conséquences
- **Positives :** Code hautement testable, séparation claire des responsabilités, maintenance facilitée des briques techniques (scrapers).
- **Négatives :** Nécessite une discipline rigoureuse pour ne pas mélanger les logiques au sein d'un même module.