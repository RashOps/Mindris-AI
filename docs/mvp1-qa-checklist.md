# Checklist QA MVP1

Objectif : verifier le flow local complet avant de considerer le MVP1 testable.

## Pre-requis

- API Gateway lancee sur `http://localhost:8000`.
- Renderer lance sur `http://localhost:4000`.
- Frontend lance sur `http://localhost:3000`.
- `.env` aligne `API_KEY`, `NEXT_PUBLIC_API_KEY`, `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_RENDERER_URL`.

## Flow CV principal

- [ ] Ouvrir `/dashboard`.
- [ ] Creer un CV depuis un template.
- [ ] Ouvrir le CV dans `/tools/cv-creator`.
- [ ] Modifier le nom, le titre, une experience, une competence et un projet.
- [ ] Verifier que le statut de sauvegarde passe par `Saving...` puis `Saved`.
- [ ] Recharger la page et verifier que les donnees viennent du backend.
- [ ] Changer de template dans le panneau de style.
- [ ] Verifier que la preview se met a jour avec le template choisi.
- [ ] Exporter le PDF sans watermark.
- [ ] Exporter le JSON depuis le dashboard.
- [ ] Importer ce JSON comme nouveau CV.
- [ ] Dupliquer un CV et verifier que la copie est independante.
- [ ] Supprimer un CV non actif.

## Import PDF

- [ ] Importer un PDF depuis le dashboard.
- [ ] Verifier que le CV importe apparait dans la bibliotheque.
- [ ] Ouvrir le CV et verifier que les sections principales sont structurees.
- [ ] Importer un PDF depuis le builder.
- [ ] Verifier que le builder se met a jour sans double sauvegarde visible.

## ATS et documents

- [ ] Ouvrir `/tools/ats-score`.
- [ ] Coller ou charger un CV et une offre.
- [ ] Lancer le score ATS.
- [ ] Verifier que le rapport detaille est lisible et sauvegarde comme draft backend.
- [ ] Generer une lettre de motivation depuis les insights.
- [ ] Verifier que le draft Markdown est disponible dans `/tools/markdown`.
- [ ] Exporter un PDF Markdown.

## Tracker

- [ ] Ouvrir `/tools/tracker`.
- [ ] Ajouter une candidature avec entreprise, poste et URL.
- [ ] Deplacer la candidature entre `Wishlist`, `Applied`, `Interview`, `Offer`, `Rejected`.
- [ ] Recharger la page et verifier que le statut persiste.
- [ ] Rechercher la candidature par entreprise ou poste.
- [ ] Supprimer la candidature.

## Etats d'erreur attendus

- [ ] API arretee : le frontend affiche une erreur de chargement sans casser le rendu.
- [ ] Renderer arrete : la preview/export PDF signale l'echec ou reste en etat degrade.
- [ ] Cle API incorrecte : les appels `/api/v1/*` retournent une erreur d'autorisation.
- [ ] PDF non valide : l'import refuse le fichier avec un message explicite.

## Commandes de validation

```bash
UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-test-storage uv run --no-sync pytest tests/ -q --tb=short
```

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

```bash
cd services/renderer
bun run typecheck
bun run build
```
