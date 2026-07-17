# ADR 019 - CI dry-run et smoke Docker self-hosted

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Le chemin Docker self-hosted one-command fonctionne avec les images GHCR et a
ete valide depuis une distribution Debian WSL. Il restait toutefois un risque :
les scripts install/update/uninstall/smoke et le compose release pouvaient
regresser sans etre verifies automatiquement par CI.

Le plan produit demande de privilegier Docker self-hosted pour les utilisateurs
techniques avant de reprendre Desktop/Tauri.

## Decision

### 1. Ajouter un dry-run self-hosted dans la CI principale

La CI execute maintenant :

```bash
docker compose -f docker-compose.release.yml config --quiet
sh -n scripts/install_self_hosted.sh scripts/update_self_hosted.sh scripts/uninstall_self_hosted.sh scripts/smoke_release.sh scripts/clean_self_hosted_test.sh
MINDRIS_HOME=/tmp/mindris-ai-ci-dry-run \
MINDRIS_INSTALL_DRY_RUN=true \
MINDRIS_RAW_BASE="https://raw.githubusercontent.com/${{ github.repository }}/${{ github.sha }}" \
scripts/install_self_hosted.sh
```

Consequence :

- le compose release est valide ;
- les scripts shell restent syntaxiquement valides ;
- l'installation one-command peut etre simulee sur le commit courant ;
- aucun conteneur release n'est lance dans ce job.

### 2. Ajouter un smoke post-publication dans le workflow Docker release

Apres publication des images GHCR, le workflow Docker release installe la stack
dans `/tmp/mindris-ai-release-smoke`, expose le frontend sur `3100`, puis lance
`scripts/smoke_release.sh`.

Consequence :

- le workflow ne se contente plus de builder/push les images ;
- les trois services doivent demarrer ensemble ;
- les endpoints web, API ready et renderer ready sont verifies.

### 3. Tester le bon tag d'image

Le smoke utilise :

- `latest` sur la branche `main` ;
- le nom du tag GitHub quand le workflow est declenche par un tag `v*`.

Consequence :

- les releases taggees testent l'image taggee ;
- le push main continue de tester `latest`.

## Verification

Checks locaux effectues :

```bash
docker compose -f docker-compose.release.yml config --quiet
sh -n scripts/install_self_hosted.sh scripts/update_self_hosted.sh scripts/uninstall_self_hosted.sh scripts/smoke_release.sh scripts/clean_self_hosted_test.sh
MINDRIS_HOME=/tmp/mindris-ai-ci-dry-run MINDRIS_INSTALL_DRY_RUN=true scripts/install_self_hosted.sh
```

Resultat :

```text
mindris-install-dry-run-ok
Install dir: /tmp/mindris-ai-ci-dry-run
```

## Consequences

- Docker self-hosted devient plus defendable comme chemin de distribution
  principal avant Desktop/Tauri.
- Les regressions de packaging seront detectees plus tot.
- Le smoke release peut etre plus lent que le build seul, mais il valide le
  comportement utile pour l'utilisateur final.
