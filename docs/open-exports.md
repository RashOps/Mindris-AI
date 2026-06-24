# Exports ouverts

Date : 24 juin 2026

Mindris AI expose les exports de CV depuis l'API backend. Le frontend declenche le telechargement, mais ne genere pas le contenu exporte.

## Formats disponibles

| Format | Endpoint | Usage |
| --- | --- | --- |
| JSON | `GET /api/v1/resumes/{id}/export-json` | Sauvegarde portable, import futur, debug open-source |
| Markdown | `GET /api/v1/resumes/{id}/export-markdown` | GitHub, documentation personnelle, edition texte |
| HTML | `GET /api/v1/resumes/{id}/export-html` | Page autonome, impression navigateur, publication statique |
| PDF | `POST /render/pdf` sur le renderer | Export final sans watermark |

Les exports Markdown et HTML sont construits depuis `ResumeRecord.data_json`, la source de verite persistee par l'API Gateway.

## Exemple local

Avec l'API lancee sur `http://localhost:8000` :

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.md \
  http://localhost:8000/api/v1/resumes/1/export-markdown
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.html \
  http://localhost:8000/api/v1/resumes/1/export-html
```

## Garanties HTML

- Document autonome.
- Pas de script embarque.
- Pas de police externe ni dependance reseau.
- Contenu utilisateur echappe avant insertion HTML.
- CSS inline dans le document pour conserver une impression simple.

## Statut DOCX

L'export DOCX reste differe. La phase 6B n'ajoute pas de dependance reseau ou de generation fragile. Le DOCX devra etre implemente plus tard avec une librairie locale fiable, testee et compatible self-hosting.
