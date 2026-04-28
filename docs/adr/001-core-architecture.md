# ADR 001: Architecture Core & Stack Technique - Mindris AI

**État :** ACCEPTÉ  
**Date :** 28 Avril 2026  
**Auteur :** Rayhan (Lead Architect)  
**Projet :** Mindris AI

---

## 1. Contexte et Problématique
Le projet **Mindris AI** vise à créer une plateforme d'automatisation de carrière "end-to-end". Les défis majeurs incluent :
- L'extraction de données sur des sites avec protections anti-bots (LinkedIn).
- L'orchestration d'agents IA pour le matching sémantique (RAG).
- La génération de PDF "pixel-perfect" avec une personnalisation ultra-profonde (type Canva).
- Une scalabilité permettant d'évoluer vers un modèle SaaS.

## 2. Décisions Architecturales

### 2.1 Pattern Architectural : Monolithe Modulaire
Nous optons pour un **Monolithe Modulaire** organisé par services. 
- **Justification :** Facilité de développement initial tout en garantissant une séparation stricte des domaines pour une transition future vers des microservices (K8s/Docker).

### 2.2 Stack Technique
| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Runtime Python** | `uv` | Gestionnaire de paquets ultra-rapide et gestion d'espaces de travail. |
| **API Gateway** | `FastAPI` | Performance, typage Pydantic et documentation automatique. |
| **Orchestration IA** | `LangGraph` + `CrewAI` | Gestion des workflows cycliques (auto-correction) et agents spécialisés. |
| **Base de Données** | `Supabase` (PostgreSQL) | Intégration native de l'Auth et de `pgvector` pour le RAG. |
| **Scraping** | `Playwright` + `Stealth` | Capacité à rendre le JS des SPAs et contourner les détections. |
| **Interface** | `Next.js` + `dnd-kit` | Modularité du Drag & Drop pour l'aspect "Canva-like". |
| **Moteur de Rendu** | `Bun` + `Puppeteer` | Rapidité d'exécution et isolation via Shadow DOM pour le PDF. |

## 3. Pipeline d'Exécution (The AI Flow)
1. **Ingestion :** Extraction brute via Playwright.
2. **Analyse :** CrewAI transforme le HTML en JSON structuré.
3. **Matching :** LangGraph récupère les briques du profil via `pgvector`.
4. **Rédaction :** Génération de contenu Markdown par agent spécialisé.
5. **Édition :** Interface utilisateur interactive (JSON -> UI).
6. **Export :** Conversion HTML (Shadow DOM) vers PDF via Puppeteer.

## 4. Conséquences
- **Positives :** Contrôle total sur chaque étape, stack hautement performante, infrastructure prête pour le scale.
- **Négatives :** Complexité de maintenance due à l'utilisation de deux environnements (Python pour l'IA, Bun/JS pour le rendu).