# Checklist QA MVP1

Date : 18 juillet 2026

Cette checklist sert de controle manuel rapide apres un run de consolidation ou
avant une release locale/self-hosted.

## Runtime

- [ ] API Gateway demarre.
- [ ] Renderer demarre.
- [ ] Frontend demarre.
- [ ] `GET /api/v1/system/ready` retourne `ready`.
- [ ] `GET /ready` renderer retourne `ready`.
- [ ] RuntimeGate ouvre l'AppShell quand les deux services sont prets.

Commandes :

```bash
curl http://localhost:8000/api/v1/system/ready
curl http://localhost:4000/ready
curl -I http://localhost:3000
```

## CV Builder

- [ ] Un CV existant peut etre charge.
- [ ] Un nouveau CV peut etre cree.
- [ ] Les modes `Simple`, `Normal` et `Avance` s'affichent sans casser le layout.
- [ ] La tab Structure fonctionne.
- [ ] La tab Style fonctionne sans overlay bloquant.
- [ ] La preview reste visible pendant les modifications.
- [ ] Import PDF et JSON affichent un etat clair.
- [ ] Export PDF fonctionne via le renderer.
- [ ] Les menus Importer/Exporter restent alignes sidebar ouverte et fermee.
- [ ] Les onglets du Studio utilisent des icones Lucide lisibles.
- [ ] Une section peut passer d'une colonne a l'autre par bouton et drag/drop.
- [ ] Les sections suivantes remontent sans laisser de vide dans la preview.
- [ ] Le modele une colonne masque les actions de transfert.
- [ ] La photo apparait de facon identique dans la preview et l'export.

## Templates et renderer

- [ ] Chaque template backend s'affiche dans la preview.
- [ ] Les CSS templates correspondent au HTML dynamique du renderer.
- [ ] Les exports PDF respectent le template choisi.
- [ ] Les controles `display_mode` et `detail_level` ont un effet visible.

## ATS Score

- [ ] Une analyse ATS peut etre lancee avec un CV et une offre.
- [ ] Le rapport retourne un `id` persistant.
- [ ] Le rapport porte `job_id` quand une offre backend est disponible.
- [ ] Le rapport apparait dans History.
- [ ] Les deductions et recommandations restent lisibles en dark/light.

## Cover Letter / Markdown PDF

- [ ] Une lettre de motivation peut etre generee.
- [ ] La reponse retourne `id`, `markdown`, `job_id` et `generated_at`.
- [ ] La lettre apparait dans History.
- [ ] Markdown PDF peut editer le markdown.
- [ ] `Save version` persiste une nouvelle version quand une lettre existante est ouverte.
- [ ] Export PDF/DOCX reste disponible.

## Workflow Beta

- [ ] Le badge Beta est visible comme exposant dans la navigation/header.
- [ ] Une opportunite peut etre creee depuis une offre.
- [ ] Un CV peut etre lie.
- [ ] Un rapport ATS coherent peut etre lie.
- [ ] Une lettre coherente peut etre liee.
- [ ] Une entree Tracker peut etre creee depuis l'opportunite.
- [ ] Les incoherences de liens sont bloquees ou signalees clairement.

## Tracker

- [ ] Une candidature peut etre creee.
- [ ] Une candidature peut changer de statut.
- [ ] Les colonnes ne creent pas d'overflow mobile.
- [ ] Les liens job/ATS/lettre restent visibles dans le detail.

## History

- [ ] Le ledger charge les jobs, CV revisions, ATS reports, cover letters,
  opportunities, tracker events et LLM runs.
- [ ] Les filtres par type fonctionnent.
- [ ] Le detail affiche les liens d'artefacts.
- [ ] La purge globale demande confirmation.
- [ ] La purge est executee par le backend.

## UI responsive et theme

- [ ] Verifier `/dashboard` en `1600x900`.
- [ ] Verifier `/dashboard` en `390x844`.
- [ ] Verifier `/tools/cv-creator` en `1600x900`.
- [ ] Verifier `/tools/cv-creator` en `390x844`.
- [ ] Verifier `/tools/markdown`, `/tools/tracker`, `/tools/workflow`,
  `/tools/history` et `/tools/guide` sans overflow horizontal.
- [ ] Light mode lisible.
- [ ] Dark mode lisible.

## Self-hosting release

- [ ] `docker compose -f docker-compose.release.yml config --quiet` passe.
- [ ] `MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh` passe.
- [ ] Les images GHCR se pullent depuis une distro propre.
- [ ] `api-gateway`, `renderer` et `web` sont `healthy`.
- [ ] Port `3000` occupe : `MINDRIS_WEB_PORT=3100` fonctionne.
- [ ] `scripts/clean_self_hosted_test.sh` nettoie le test.
- [ ] Le tag RC installe des images portant exactement le meme tag GHCR.
- [ ] Le navigateur E2E post-publication passe sur les images RC.

## Commandes de validation ciblees

```bash
cd apps/web && bun run lint && bun run typecheck
uv run pytest tests/test_history_api.py tests/test_workflows_api.py tests/test_ats_score.py -q
sh -n scripts/install_self_hosted.sh scripts/update_self_hosted.sh scripts/uninstall_self_hosted.sh scripts/smoke_release.sh scripts/clean_self_hosted_test.sh
```
