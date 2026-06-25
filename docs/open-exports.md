# Exports ouverts

Date : 24 juin 2026

Mindris AI expose les exports de CV depuis l'API backend. Le frontend declenche le telechargement, mais ne genere pas le contenu exporte.

## Formats disponibles

| Format | Endpoint | Usage |
| --- | --- | --- |
| JSON | `GET /api/v1/resumes/{id}/export-json` | Sauvegarde portable, import futur, debug open-source |
| Markdown | `GET /api/v1/resumes/{id}/export-markdown` | GitHub, documentation personnelle, edition texte |
| HTML | `GET /api/v1/resumes/{id}/export-html` | Page autonome, impression navigateur, publication statique |
| DOCX | `GET /api/v1/resumes/{id}/export-docx` | Document recruteur editable dans Word/LibreOffice |
| LaTeX | `GET /api/v1/resumes/{id}/export-latex` | Source tex native pour compilation et workflows avancés |
| Typst | `GET /api/v1/resumes/{id}/export-typst` | Source texte moderne, facile a versionner et a remixer |
| PDF | `POST /render/pdf` sur le renderer | Export final sans watermark |

Les exports JSON, Markdown, HTML, DOCX, LaTeX et Typst sont construits depuis `ResumeRecord.data_json`, la source de verite persistee par l'API Gateway.

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

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.docx \
  http://localhost:8000/api/v1/resumes/1/export-docx
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.tex \
  http://localhost:8000/api/v1/resumes/1/export-latex
```

```bash
curl -H "X-API-Key: dev-mindris-api-key" \
  -o resume.typ \
  http://localhost:8000/api/v1/resumes/1/export-typst
```

## Garanties HTML

- Document autonome.
- Pas de script embarque.
- Pas de police externe ni dependance reseau.
- Contenu utilisateur echappe avant insertion HTML.
- CSS inline dans le document pour conserver une impression simple.

## Garanties DOCX

- Document `.docx` text-based.
- Generation backend sans dependance reseau.
- Structure recruteur simple : profil, experience, projets, competences, formation, langues, interets.
- Objectif initial : lisibilite ATS/recruteur plutot que parite pixel-perfect avec les templates PDF.

## Garanties LaTeX / Typst

- Document source texte, sans canvas ou image.
- Generation backend sans dependance reseau.
- Fallback semantique si une option visuelle ne peut pas etre representee.
- Formats utilises pour compilation, versioning et remaniement avances.
