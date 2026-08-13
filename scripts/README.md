# Scripts Mindris AI

Sommaire des scripts opérateur du repo.

Tous les scripts se lancent depuis la racine du projet, sauf indication
contraire. Ils sont écrits en `sh` et doivent rester non interactifs quand ils
sont utilisés en CI.

## Lecture rapide

| Besoin | Script |
| --- | --- |
| CLI contributeur multiplateforme | [`mindris.py`](./mindris.py) |
| Installer les dépendances locales | [`setup_local.sh`](./setup_local.sh) |
| Réinstaller proprement les dépendances | [`reset_local_deps.sh`](./reset_local_deps.sh) |
| Lancer la stack locale sans Docker | [`dev_local.sh`](./dev_local.sh) |
| Lancer lint/typecheck/build ciblés | [`lint_all.sh`](./lint_all.sh) |
| Lancer les tests ciblés | [`test_all.sh`](./test_all.sh) |
| Lancer lint + tests + smokes optionnels | [`check_all.sh`](./check_all.sh) |
| Vérifier une stack locale déjà lancée | [`smoke_local.sh`](./smoke_local.sh) |
| Lancer l’E2E navigateur MVP1 | [`e2e_browser.sh`](./e2e_browser.sh) |
| Piloter Docker depuis un clone | [`docker_local.sh`](./docker_local.sh) |
| Vérifier une stack Docker locale | [`smoke_self_hosting.sh`](./smoke_self_hosting.sh) |
| Installer la release GHCR | [`install_self_hosted.sh`](./install_self_hosted.sh) |
| Installer la release GHCR sous Windows | [`install_self_hosted.ps1`](./install_self_hosted.ps1) |
| Mettre à jour une release installée | [`update_self_hosted.sh`](./update_self_hosted.sh) |
| Vérifier une release installée | [`smoke_release.sh`](./smoke_release.sh) |
| Arrêter/désinstaller une release | [`uninstall_self_hosted.sh`](./uninstall_self_hosted.sh) |
| Nettoyer un test self-hosted Docker | [`clean_self_hosted_test.sh`](./clean_self_hosted_test.sh) |
| Vérifier qu'un tag stable peut être promu | [`verify_release_promotion.sh`](./verify_release_promotion.sh) |
| Tester localement la politique de promotion | [`test_release_policy.sh`](./test_release_policy.sh) |
| Vérifier les liens Markdown locaux | [`check_markdown_links.py`](./check_markdown_links.py) |

## Scripts locaux sans Docker

### [`mindris.py`](./mindris.py)

Point d'entrée contributeur compatible Linux, macOS et Windows, écrit
uniquement avec la bibliothèque standard Python. Il peut diagnostiquer le poste
sans environnement virtuel, mais impose `uv` pour toute commande qui touche au
workspace Python.

Lanceurs disponibles depuis la racine :

```bash
./mindris doctor                 # Linux/macOS
python3 scripts/mindris.py doctor # Appel direct Unix
```

```powershell
.\mindris.ps1 doctor             # PowerShell
```

```bat
mindris.cmd doctor               rem Windows CMD
```

Commandes principales :

| Commande | Rôle | `uv` requis |
| --- | --- | --- |
| `doctor [--json]` | Vérifier outils, ports et services | Non |
| `setup [--check]` | Installer le workspace verrouillé | Oui |
| `reset-deps` | Réinstaller les dépendances sans toucher aux lockfiles | Oui |
| `dev [--web-port 3100]` | Superviser les trois services | Oui |
| `stop`, `status`, `logs` | Piloter une stack lancée par la CLI | Non |
| `lint`, `test`, `check`, `e2e` | Valider le dépôt | Oui |
| `smoke` | Vérifier les endpoints sans `curl` | Non |
| `docker ...` | Piloter Docker Compose | Non |
| `release verify vX.Y.Z` | Vérifier une promotion stable | Non |
| `backup create/inspect/restore` | Sauvegarder ou restaurer `storage/` | Non |

Exemples :

```bash
./mindris setup
./mindris dev --web-port 3100 --no-open
./mindris test --scope backend
./mindris check --with-smoke --with-e2e
./mindris logs renderer --follow
./mindris logs api-gateway --since 30m --request-id <request-id>
./mindris docker doctor
./mindris release verify v0.5.0
./mindris backup create ./backups/mindris.zip
./mindris backup inspect ./backups/mindris.zip
./mindris backup restore ./backups/mindris.zip
```

La CLI n'installe jamais avec `pip` et n'installe pas silencieusement `uv`.
Quand `uv` manque, elle affiche la commande officielle adaptée à la plateforme.
Les scripts shell historiques restent disponibles comme wrappers de
compatibilité. Ils délèguent à la CLI afin que Linux, macOS et Windows
partagent une seule implémentation. Les scripts self-hosted et release restent
natifs, car ils doivent fonctionner sans checkout Python préparé.

Le format de sauvegarde, l’exclusion des secrets et le parcours self-hosted
sont détaillés dans le [guide de sauvegarde](../docs/backup-restore.md).

### [`setup_local.sh`](./setup_local.sh)

Wrapper de compatibilité vers `./mindris setup`.

Actions :

- vérifie `uv` et `bun` ;
- crée `.env` depuis `.env.example` s’il n’existe pas ;
- installe tout le workspace Python avec `uv sync --all-packages` ;
- installe Chromium Playwright ;
- installe les dépendances Bun du frontend et du renderer.
- installe la version de Chrome attendue par Puppeteer pour les exports PDF.

Commande :

```bash
./scripts/setup_local.sh
```

À utiliser :

- juste après un clone ;
- après changement de dépendances ;
- quand Playwright, Chromium ou le navigateur Puppeteer du renderer manque.

### [`reset_local_deps.sh`](./reset_local_deps.sh)

Wrapper de compatibilité vers `./mindris reset-deps`.

Actions :

- supprime `.venv` ;
- supprime `apps/web/node_modules` ;
- supprime `services/renderer/node_modules` ;
- relance `uv sync --all-packages` ;
- relance `bun install --frozen-lockfile` pour web et renderer.

Commande :

```bash
./scripts/reset_local_deps.sh
```

À utiliser quand une dépendance locale est incohérente ou quand un run Codex a
été interrompu pendant l’installation.

### [`dev_local.sh`](./dev_local.sh)

Wrapper de compatibilité vers `./mindris dev`. Il lance la stack locale
complète sans Docker :

- API Gateway sur `8000` ;
- Renderer Bun sur `4000` ;
- Frontend Next.js sur `3000`.

Commande :

```bash
./scripts/dev_local.sh
```

Ports personnalisables :

```bash
API_PORT=8100 RENDERER_PORT=4100 WEB_PORT=3100 ./scripts/dev_local.sh
```

Logs :

```text
.logs/services/api-gateway.log
.logs/services/renderer.log
.logs/process/api-gateway.stdout.log
.logs/process/renderer.stdout.log
.logs/process/web.stdout.log
.logs/runtime/mindris-dev.json
```

La CLI refuse les ports invalides, dupliqués ou occupés. Son fichier d’état
stocke l’identité de création de chaque processus : `mindris stop` ignore donc
un PID qui aurait été réutilisé par le système.

## Validation locale

### [`lint_all.sh`](./lint_all.sh)

Lance les checks rapides de qualité.

Actions :

- `ruff check` sur un périmètre Python ciblé ;
- `bun run lint` et `bun run typecheck` dans `apps/web` ;
- `bun run typecheck` et `bun run build` dans `services/renderer`.

Commande :

```bash
./scripts/lint_all.sh
```

Variable utile :

```bash
UV_CACHE_DIR=/tmp/uv-cache ./scripts/lint_all.sh
```

### [`test_all.sh`](./test_all.sh)

Lance les tests ciblés du repo.

Actions :

- tests Python ciblés ;
- tests Bun du store/templates web ;
- tests Bun du renderer ;
- E2E navigateur optionnel.

Commande :

```bash
./scripts/test_all.sh
```

Avec E2E navigateur :

```bash
RUN_BROWSER_E2E=1 ./scripts/test_all.sh
```

Précondition pour l’E2E : stack locale déjà démarrée et accessible.

### [`check_all.sh`](./check_all.sh)

Wrapper de compatibilité vers `./mindris check`.

Les variables `RUN_LOCAL_SMOKE=1` et `RUN_BROWSER_E2E=1` sont traduites en
options `--with-smoke` et `--with-e2e`.

Commande standard :

```bash
./scripts/check_all.sh
```

Avec smoke local :

```bash
RUN_LOCAL_SMOKE=1 ./scripts/check_all.sh
```

Avec smoke et E2E :

```bash
RUN_LOCAL_SMOKE=1 RUN_BROWSER_E2E=1 ./scripts/check_all.sh
```

### [`smoke_local.sh`](./smoke_local.sh)

Vérifie une stack locale déjà lancée.

Endpoints testés :

- API `/`
- API `/api/v1/system/status`
- Renderer `/`
- Frontend `/`

Commande :

```bash
./scripts/smoke_local.sh
```

URLs personnalisables :

```bash
API_URL=http://localhost:8100 \
RENDERER_URL=http://localhost:4100 \
WEB_URL=http://localhost:3100 \
./scripts/smoke_local.sh
```

### [`e2e_browser.sh`](./e2e_browser.sh)

Lance le scénario navigateur MVP1 via Playwright Python.

Commande :

```bash
./scripts/e2e_browser.sh
```

Variables utiles :

```bash
WEB_URL=http://localhost:3000 \
API_URL=http://localhost:8000 \
API_KEY=dev-mindris-api-key \
./scripts/e2e_browser.sh
```

Préconditions :

- stack locale démarrée ;
- Chromium Playwright installé ;
- API key cohérente avec `.env`.

## Docker depuis un clone local

### [`docker_local.sh`](./docker_local.sh)

Wrapper pour `docker compose` depuis un clone du dépôt.

Commandes :

```bash
./scripts/docker_local.sh doctor
./scripts/docker_local.sh build
./scripts/docker_local.sh up
./scripts/docker_local.sh down
./scripts/docker_local.sh smoke
./scripts/docker_local.sh logs
./scripts/docker_local.sh status
```

Détails :

- `doctor` vérifie `.env`, `docker compose config --quiet` et la syntaxe du
  smoke Docker ;
- `up` lance `docker compose up --build` ;
- `smoke` lance [`smoke_self_hosting.sh`](./smoke_self_hosting.sh) ;
- `logs` suit les logs Compose ;
- `status` affiche `docker compose ps`.

### [`smoke_self_hosting.sh`](./smoke_self_hosting.sh)

Vérifie une stack Docker locale déjà lancée.

Endpoints testés :

- API `/`
- API `/api/v1/system/status`
- API `/api/v1/system/ready`
- Renderer `/`
- Renderer `/ready`
- Frontend `/`

Commande :

```bash
./scripts/smoke_self_hosting.sh
```

URLs personnalisables :

```bash
API_URL=http://localhost:8000 \
RENDERER_URL=http://localhost:4000 \
WEB_URL=http://localhost:3000 \
./scripts/smoke_self_hosting.sh
```

## Release self-hosted GHCR

Ces scripts ciblent l’installation sans clone complet du repo. Ils utilisent les
images GHCR et stockent l’installation dans `~/.mindris-ai` par défaut.

### [`install_self_hosted.sh`](./install_self_hosted.sh)

Installe la release self-hosted.

Actions :

- vérifie Docker et Docker Compose ;
- crée `MINDRIS_HOME` ;
- télécharge `docker-compose.release.yml` ;
- télécharge `.env.self-hosted.example` si `.env` n’existe pas ;
- génère une `API_KEY` locale ;
- valide `docker compose config --quiet` ;
- pull les images GHCR ;
- démarre la stack.

Commande one-command publique :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh | sh
```

Depuis un clone :

```bash
./scripts/install_self_hosted.sh
```

Port frontend alternatif :

```bash
MINDRIS_WEB_PORT=3100 ./scripts/install_self_hosted.sh
```

Dry-run sans démarrage :

```bash
MINDRIS_INSTALL_DRY_RUN=true ./scripts/install_self_hosted.sh
```

Confidentialité et modèle local :

```bash
MINDRIS_PRIVACY_MODE=local_strict \
MINDRIS_DOWNLOAD_LOCAL_MODEL=true \
MINDRIS_LOCAL_MODEL=llama3.2:3b \
./scripts/install_self_hosted.sh
```

- `local_strict` active le profil `local-ai`, désactive la télémétrie connue
  et affiche un diagnostic mémoire indicatif ;
- `private_cloud` prépare les providers BYOK et le consentement ;
- `full_context_cloud` reste volontaire et renforcé ;
- aucune clé provider ne doit être passée dans la commande ;
- le téléchargement n'a lieu que si `MINDRIS_DOWNLOAD_LOCAL_MODEL=true`.

Variables utiles :

- `MINDRIS_HOME` : dossier d’installation, par défaut `~/.mindris-ai`.
- `MINDRIS_RELEASE_REF` : branche/tag GitHub utilisé pour télécharger les
  fichiers release.
- `MINDRIS_RAW_BASE` : base URL raw GitHub, utile en CI.
- `MINDRIS_INSTALL_DRY_RUN` : valide les fichiers sans pull/up.

### [`install_self_hosted.ps1`](./install_self_hosted.ps1)

Équivalent Windows PowerShell de l'installateur self-hosted. Il ne nécessite ni
Python, ni `uv`, ni Bun : Docker Desktop avec Compose v2 suffit.

```powershell
irm https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.ps1 | iex
```

`MINDRIS_PRIVACY_MODE`, `MINDRIS_DOWNLOAD_LOCAL_MODEL` et
`MINDRIS_LOCAL_MODEL` ont le même contrat sous PowerShell. Le diagnostic
matériel utilise les informations Windows lorsqu'elles sont disponibles.

Avec un port frontend alternatif :

```powershell
$env:MINDRIS_WEB_PORT = "3100"
irm https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.ps1 | iex
```

### [`update_self_hosted.sh`](./update_self_hosted.sh)

Met à jour une installation self-hosted existante.

Actions :

- retélécharge `docker-compose.release.yml` ;
- valide le compose ;
- pull les nouvelles images ;
- redémarre la stack ;
- affiche `docker compose ps`.

Commande :

```bash
MINDRIS_HOME="$HOME/.mindris-ai" ./scripts/update_self_hosted.sh
```

### [`smoke_release.sh`](./smoke_release.sh)

Vérifie une release installée.

Actions :

- se place dans `MINDRIS_HOME` ;
- valide `docker compose config --quiet` ;
- teste le frontend ;
- teste API `/api/v1/system/ready` ;
- teste renderer `/ready`.

Les endpoints sont retentés pendant le démarrage des conteneurs. Le nombre de
tentatives et l’intervalle sont configurables avec `SMOKE_ATTEMPTS` et
`SMOKE_RETRY_DELAY` (30 tentatives espacées de 2 secondes par défaut).

Commande :

```bash
MINDRIS_HOME="$HOME/.mindris-ai" ./scripts/smoke_release.sh
```

Avec port frontend alternatif :

```bash
MINDRIS_HOME="$HOME/.mindris-ai" \
WEB_URL=http://localhost:3100 \
./scripts/smoke_release.sh
```

### [`uninstall_self_hosted.sh`](./uninstall_self_hosted.sh)

Arrête une installation self-hosted.

Commande :

```bash
./scripts/uninstall_self_hosted.sh
```

Par défaut, le script garde les données dans `MINDRIS_HOME`.

Pour supprimer aussi le dossier local :

```bash
REMOVE_DATA=true ./scripts/uninstall_self_hosted.sh
```

### [`clean_self_hosted_test.sh`](./clean_self_hosted_test.sh)

Nettoyage plus agressif pour les tests self-hosted.

Actions :

- `docker compose down --volumes --rmi all --remove-orphans` ;
- supprime donc conteneurs, images, volumes et réseau Compose ;
- garde `MINDRIS_HOME` sauf si `REMOVE_DATA=true`.

Commande :

```bash
./scripts/clean_self_hosted_test.sh
```

Avec suppression du dossier local :

```bash
REMOVE_DATA=true ./scripts/clean_self_hosted_test.sh
```

## Contrôles de release

### [`verify_release_promotion.sh`](./verify_release_promotion.sh)

Bloque une promotion stable si l'une des garanties manque :

- le tag suit strictement `vX.Y.Z` ;
- son commit appartient à `origin/main` ;
- un tag `vX.Y.Z-rc.N` est son ancêtre ;
- l'arbre Git du RC et du stable est identique.

Le RC le plus récent qui satisfait toutes les garanties est retourné dans
`GITHUB_OUTPUT` en CI.

```bash
git fetch origin main --tags
./scripts/verify_release_promotion.sh v0.5.0
```

### [`test_release_policy.sh`](./test_release_policy.sh)

Crée un dépôt Git temporaire, valide un cas de promotion conforme et vérifie
qu'une différence d'arbre est refusée. Il ne modifie pas le dépôt courant.

```bash
./scripts/test_release_policy.sh
```

Le détail des workflows et de l'ordre des tags est dans
[`docs/releases.md`](../docs/releases.md).

À utiliser pour repartir d’un test Debian/WSL propre.

## Conventions

- Ne pas imprimer `docker compose config` sans `--quiet` si `.env` contient des
  secrets.
- Préférer les variables d’environnement aux modifications directes des scripts.
- Garder les scripts idempotents quand c’est possible.
- Ne pas ajouter de prompts interactifs aux scripts CI.
- Ne pas supprimer les données utilisateur sans variable explicite comme
  `REMOVE_DATA=true`.
