export const MARKDOWN_TEMPLATES = {
  blank: "",

  cover_letter: `# Rayhan Touboui
**AI Engineer** · Paris, France · rayhan@email.com · linkedin.com/in/rayhan

---

**À l'attention du service Recrutement**
Paris, le [date]

---

## Objet : Candidature au poste d'Ingénieur IA

Madame, Monsieur,

Passionné par l'intelligence artificielle et les systèmes autonomes, je me permets de vous adresser ma candidature pour le poste d'Ingénieur IA au sein de votre équipe.

Actuellement en formation double diplôme **Data & IA** à Paris School of Technology & Business, j'ai développé une expertise solide en **LangGraph**, **RAG** et déploiement d'architectures multi-agents. Mon projet **Mindris AI** — plateforme d'optimisation de carrière par agents IA — témoigne de ma capacité à mener des projets complexes de bout en bout.

Ce qui me motive particulièrement dans votre organisation, c'est votre approche pragmatique de l'IA appliquée. Je suis convaincu de pouvoir apporter une contribution immédiate et significative à vos équipes.

Dans l'attente d'un entretien, je reste à votre disposition pour tout complément d'information.

Cordialement,

**Rayhan Touboui**
`,

  technical_doc: `# Technical Documentation

## Overview

This document describes the architecture and usage of the system.

## Architecture

The system is composed of three main services:

- **API Gateway** — FastAPI, port 8000
- **Renderer** — Bun/Elysia, port 4000
- **Frontend** — Next.js, port 3000

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/mindrisai/mindris-ai

# Install dependencies
bun install

# Start services
bun run dev
\`\`\`

## API Reference

### POST /render/markdown

Converts Markdown to a PDF document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| markdown | string | Oui | Markdown content |
| style | string | Non | \`document\` or \`letter\` |
| title | string | Non | Document title |

**Response:** PDF binary stream (\`application/pdf\`)

## Notes

> This service uses Puppeteer for pixel-perfect A4 PDF rendering with Shadow DOM style isolation.
`,
};

export type MarkdownTemplateId = keyof typeof MARKDOWN_TEMPLATES;
