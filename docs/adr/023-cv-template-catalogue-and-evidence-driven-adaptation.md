# ADR 023 - Catalogue de templates CV et adaptation fondée sur les preuves

Date : 20 juillet 2026

## Statut

Accepté

## Contexte

Le renderer partage un HTML dynamique sain, mais la précédence du template,
les presets et les cinq directions visuelles historiques ne garantissaient pas
que la sélection affichée corresponde au rendu exporté. Le pipeline IA
retournait par ailleurs des bullets et un score sans registre factuel assez
fort pour empêcher une reformulation non justifiée.

## Décision

### Templates

- Une sélection explicite de template prévaut sur le template enregistré,
  puis sur le défaut backend.
- L’application d’un preset est une action explicite distincte du rendu.
- Le catalogue builtin contient dix templates : Atlas, Atlas Sidebar,
  Terminal, Mono ATS, Graduate, Studio, Ledger, Executive, Signal et Scholar.
- Les templates partagent les primitives du renderer et composent des CSS de
  famille avec des overrides spécialisés ; ils ne dupliquent pas le moteur.
- La galerie et ses métadonnées viennent du catalogue backend, avec previews
  code-native côté client.

### Intelligence CV

- Les sorties rédacteur et évaluateur utilisent des contrats Pydantic.
- Le RAG est isolé par CV et locale ; une ingestion ne vide plus les autres
  espaces de profil.
- Chaque fait récupéré reçoit un identifiant stable pour l’exécution.
- Chaque exigence de l’offre est classée `matched`, `partial` ou `missing` et
  reliée à des faits connus.
- Toute proposition citant une preuve inconnue est rejetée.
- Le feedback structuré de l’évaluateur alimente l’itération suivante.
- Un score invalide devient indisponible au lieu d’être remplacé par une
  valeur métier arbitraire.
- Le navigateur affiche les propositions, mais leur application reste une
  décision humaine explicite et passe par l’API backend.

## Conséquences

- La galerie, la preview et l’export partagent la même règle de résolution.
- Dix modèles peuvent évoluer sans dix moteurs HTML indépendants.
- L’adaptation devient explicable et testable sur plusieurs familles de
  métiers et plusieurs langues.
- La qualité visuelle finale des templates reste un travail de polish continu,
  mais aucune nouvelle famille ne doit être ajoutée sans jeu de données long
  et capture de non-régression.

## Vérification

```bash
uv run pytest tests/test_templates_api.py tests/test_resumes_api.py \
  tests/test_workflow_events.py tests/test_cv_vector_index.py \
  tests/test_intelligence_eval_dataset.py -q
cd services/renderer && bun test && bun run typecheck && bun run build
cd apps/web && bun test && bun run lint && bun run typecheck
```

Les captures des dix templates sont conservées dans
`.screenshots/template-catalogue-2026-07-20/`.
