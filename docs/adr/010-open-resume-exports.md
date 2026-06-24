# ADR 010 - Exports ouverts backend

Date : 24 juin 2026

## Statut

Accepte

## Contexte

Le MVP open-source doit proposer des formats reutilisables au-dela du PDF : JSON, Markdown et HTML. Le projet garde aussi une contrainte forte : le frontend est un client d'API et ne doit pas devenir une source de logique metier durable.

## Decision

Les exports de CV ouverts sont generes dans l'API Gateway depuis `ResumeRecord.data_json`.

Endpoints ajoutes :

- `GET /api/v1/resumes/{id}/export-markdown`
- `GET /api/v1/resumes/{id}/export-html`

L'export JSON existant reste disponible via :

- `GET /api/v1/resumes/{id}/export-json`

Le frontend telecharge les blobs renvoyes par l'API. Il ne construit pas localement le Markdown ou l'HTML.

L'HTML exporte est autonome, text-based, sans script, sans police externe et echappe le contenu utilisateur.

## Consequences

- Les exports sont compatibles self-hosting et utilisables via `curl`.
- Le dashboard et le builder peuvent proposer JSON, Markdown et HTML avec le meme contrat API.
- Le renderer reste responsable du PDF haute fidelite.
- Le DOCX est differe jusqu'a l'ajout d'une dependance locale fiable et testee.
