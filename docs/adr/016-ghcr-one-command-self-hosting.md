# ADR 016 - Distribution self-hosted one-command via GHCR

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Le self-hosting depuis un clone etait documente, mais l'objectif open-source
requiert une installation disponible sans cloner le depot. Le chemin cible est
un package Docker heberge sur GitHub/GHCR et installable en une commande.

Le run Docker devait produire une distribution verifiable, nettoyable et
compatible avec un test dans une distro WSL propre.

## Decision

### 1. Ajouter un compose release separe du compose local

`docker-compose.release.yml` utilise des images GHCR au lieu de builder depuis
les sources locales.

Images :

- `ghcr.io/rashops/mindris-ai-api-gateway`
- `ghcr.io/rashops/mindris-ai-renderer`
- `ghcr.io/rashops/mindris-ai-web`

Consequence :

- le build local et la distribution publique ne se melangent pas ;
- les tags peuvent etre versionnes avec `MINDRIS_VERSION` ;
- les ports restent configurables.

### 2. Fournir des scripts d'operation release

Scripts adoptes :

- `scripts/install_self_hosted.sh`
- `scripts/update_self_hosted.sh`
- `scripts/uninstall_self_hosted.sh`
- `scripts/smoke_release.sh`
- `scripts/clean_self_hosted_test.sh`

Consequence :

- installation, update, smoke et nettoyage deviennent repetables ;
- les tests fresh install peuvent etre faits sans manipulations manuelles ;
- la suppression des donnees reste explicite via `REMOVE_DATA=true`.

### 3. Publier les images via GitHub Actions

`.github/workflows/docker-release.yml` construit et publie les trois images.

Consequence :

- `latest`, `sha-*` et tags `v*` peuvent etre publies ;
- le test utilisateur final consomme les memes images que la release publique.

### 4. Documenter les ports occupes

Si `3000` est deja utilise, l'utilisateur doit pouvoir definir :

```bash
MINDRIS_WEB_PORT=3100
```

Consequence :

- le test dans WSL ou sur une machine dev ne bloque pas a cause d'une app locale ;
- le smoke release peut etre lance avec un port custom.

## Verification

Verifications locales :

```bash
docker compose -f docker-compose.release.yml config --quiet
sh -n scripts/install_self_hosted.sh scripts/update_self_hosted.sh scripts/uninstall_self_hosted.sh scripts/smoke_release.sh scripts/clean_self_hosted_test.sh
MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh
```

Verification externe Debian WSL :

- pull des trois images GHCR ;
- `api-gateway`, `renderer`, `web` healthy ;
- web expose sur `3100` ;
- `/api/v1/system/ready` retourne `ready` ;
- `/ready` renderer retourne `ready`.

## Consequences

- Docker self-hosted devient le chemin de distribution prioritaire avant Tauri.
- Le README et `docs/install.md` deviennent les docs publiques d'installation.
- Les prochaines ameliorations doivent ajouter un dry-run CI et un smoke
  post-publish, mais le chemin manuel est deja valide.
