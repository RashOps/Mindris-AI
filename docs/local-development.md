# Developpement local sans Docker

Date : 17 juillet 2026

Ce workflow lance les trois services locaux sans Docker :

- API Gateway FastAPI : `http://localhost:8000`
- Renderer Bun/Elysia : `http://localhost:4000`
- Frontend Next.js : `http://localhost:3000`

Pour la configuration de sandbox, les permissions persistantes recommandees et les niveaux d'autonomie d'un agent de code, voir aussi [`docs/agent-runtime.md`](./agent-runtime.md).

## Prerequis

- `uv`
- `bun`
- Python 3.12 compatible avec le workspace
- Un fichier `.env` a la racine du projet

## Premiere installation

```bash
./scripts/setup_local.sh
```

Ce script :

- cree `.env` depuis `.env.example` si `.env` n'existe pas ;
- installe les dependances Python avec `uv sync --all-packages` ;
- installe Chromium Playwright ;
- installe les dependances du frontend ;
- installe les dependances du renderer.

## Reinstallation propre des dependances

```bash
./scripts/reset_local_deps.sh
```

Ce script supprime uniquement les installations locales :

- `.venv`
- `apps/web/node_modules`
- `services/renderer/node_modules`

Il conserve les lockfiles.

## Lancer les services

```bash
./scripts/dev_local.sh
```

Le script demarre :

- l'API Gateway avec reload Uvicorn ;
- le renderer avec `bun run dev` et watch reload ;
- le frontend avec `bun run dev`.

Logs :

```text
.logs/services/api-gateway.log
.logs/services/intelligence.log
.logs/services/renderer.log
.logs/services/scraper.log
.logs/process/api-gateway.stdout.log
.logs/process/renderer.stdout.log
.logs/process/web.stdout.log
```

Les événements applicatifs vivent sous `services/`, tandis que la sortie brute
des processus supervisés vit sous `process/`. Le dossier canonique pour tous
les logs locaux est `.logs/`, indépendamment du répertoire courant.

Chaque reponse API expose aussi un header `X-Request-Id`.
En cas d'erreur backend, utilise cet identifiant pour recouper le terminal,
`.logs/services/api-gateway.log` et les appels navigateur.

Ports personnalisables :

```bash
API_PORT=8010 RENDERER_PORT=4010 WEB_PORT=3010 ./scripts/dev_local.sh
```

## Smoke check

Dans un autre terminal, une fois les services lances :

```bash
./scripts/smoke_local.sh
```

## Validation repo-first

Pour les checks qui ne dependent pas d'une stack locale deja demarree :

```bash
./scripts/check_all.sh
```

`check_all.sh` regroupe par defaut :

- `./scripts/lint_all.sh`
- `./scripts/test_all.sh`

Options :

```bash
RUN_LOCAL_SMOKE=1 ./scripts/check_all.sh
RUN_LOCAL_SMOKE=1 RUN_BROWSER_E2E=1 ./scripts/check_all.sh
```

`lint_all.sh` couvre :

- Ruff sur la surface Python stable du runtime local ;
- lint et typecheck du frontend ;
- typecheck et build du renderer.

`test_all.sh` couvre :

- un set cible de tests backend Python ;
- les tests frontend ;
- les tests renderer.

Le smoke local et l'E2E navigateur restent opt-in et ne s'executent via `check_all.sh` que si tu actives explicitement les variables d'environnement.

## E2E navigateur MVP1

Une fois les trois services lances et le smoke check OK :

```bash
./scripts/e2e_browser.sh
```

Ce parcours automatise :

- import d'un community template package ;
- export du package depuis le dashboard ;
- creation d'un CV fixture via l'API ;
- ouverture du CV Builder ;
- creation et activation d'une variante multilingue FR/EN ;
- changement de template ;
- export DOCX ;
- export PDF via le renderer ;
- affichage d'un rapport ATS fixture ;
- creation et deplacement d'une candidature dans le Job Tracker.

Variables personnalisables :

```bash
API_URL=http://localhost:8010 \
RENDERER_URL=http://localhost:4010 \
WEB_URL=http://localhost:3010 \
./scripts/smoke_local.sh
```

## Audit visuel Playwright

Quand `js_repl` n'est pas disponible dans l'environnement Codex, utiliser
Playwright via Python.

Regles de verification visuelle :

- verifier la route modifiee en `1600x900` ;
- verifier la meme route en `390x844` ;
- inspecter overflow horizontal, alignements, contraste, spacing, etats vides
  et interactions principales ;
- stocker les captures temporaires dans `.screenshots/` ;
- ne pas committer `.screenshots/`.

Les derniers audits de consolidation ont couvert :

- `/dashboard`
- `/tools/cv-creator`
- `/tools/markdown`
- `/tools/tracker`
- `/tools/workflow`
- `/tools/history`
- `/tools/guide`

## Release self-hosted locale

Pour valider le package release sans publier ni lancer les images :

```bash
MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh
```

Pour valider la syntaxe des scripts release :

```bash
sh -n scripts/install_self_hosted.sh \
  scripts/update_self_hosted.sh \
  scripts/uninstall_self_hosted.sh \
  scripts/smoke_release.sh \
  scripts/clean_self_hosted_test.sh
```

Pour nettoyer un test release installe dans `~/.mindris-ai` :

```bash
./scripts/clean_self_hosted_test.sh
```

Avec suppression des donnees :

```bash
REMOVE_DATA=true ./scripts/clean_self_hosted_test.sh
```

## Job navigateur manuel en CI

Le workflow GitHub Actions expose aussi un job manuel `browser-e2e` via `workflow_dispatch`.

Il :

- installe les dependances `uv` et `bun` ;
- lance la stack locale via `./scripts/dev_local.sh` ;
- attend le `smoke_local.sh` ;
- execute `./scripts/e2e_browser.sh` ;
- publie les logs `.logs` en artefact.

## Notes

## Sauvegarde locale rapide

Sauvegarder l'etat local utile :

```bash
mkdir -p /tmp/mindris-backup
cp -R storage /tmp/mindris-backup/storage
cp -R .logs /tmp/mindris-backup/logs
```

Restaurer :

```bash
rm -rf storage .logs
cp -R /tmp/mindris-backup/storage ./storage
cp -R /tmp/mindris-backup/logs ./.logs
```

Si seuls les logs t'interessent, ne restaure pas `storage/`.

Les scripts ne lisent pas le contenu de `.env` dans la sortie terminal et ne doivent pas afficher de secrets.
Les dossiers `logs/`, `tests/logs/` et `services/api-gateway/logs/` sont legacy ;
les nouveaux flux utilisent uniquement `.logs/`.

Ne pas partager la sortie de `docker compose config` si `.env` contient de
vraies cles : Compose y developpe les secrets en clair. Utiliser les variantes
`config --quiet` ou les scripts `doctor/smoke`.
