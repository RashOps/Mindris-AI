# Installation self-hosted one-command

Ce guide décrit l'installation publique de Mindris AI sans cloner le dépôt.

Le mode one-command utilise des images Docker publiées sur GitHub Container
Registry :

- `ghcr.io/rashops/mindris-ai-api-gateway`
- `ghcr.io/rashops/mindris-ai-renderer`
- `ghcr.io/rashops/mindris-ai-web`

## Prérequis

- Docker Engine
- Docker Compose v2
- `curl` ou `wget`

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh | sh
```

Par défaut, l'installation crée :

```text
~/.mindris-ai/
├── docker-compose.yml
├── .env
├── storage/
└── logs/
```

URLs locales :

```text
Frontend  http://localhost:3000
API       http://localhost:8000
Renderer  http://localhost:4000
```

## Port 3000 déjà utilisé

Si l'installation échoue avec une erreur du type
`failed to bind host port 0.0.0.0:3000`, un autre service utilise déjà le port
frontend.

Change le port web dans `~/.mindris-ai/.env`, puis relance Compose :

```bash
cd "$HOME/.mindris-ai"

if grep -q '^MINDRIS_WEB_PORT=' .env; then
  sed -i 's/^MINDRIS_WEB_PORT=.*/MINDRIS_WEB_PORT=3100/' .env
else
  printf '\nMINDRIS_WEB_PORT=3100\n' >> .env
fi

docker compose up -d
```

L'application sera alors disponible sur :

```text
http://localhost:3100
```

Smoke test avec le port personnalisé :

```bash
MINDRIS_WEB_PORT=3100 "$HOME/.mindris-ai/smoke.sh"
```

## Installation dans un autre dossier

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh \
  | MINDRIS_HOME="$HOME/apps/mindris" sh
```

## Version spécifique

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh \
  | MINDRIS_RELEASE_REF="v0.3.0" MINDRIS_HOME="$HOME/.mindris-ai" sh
```

Le tag Docker utilisé est contrôlé par `MINDRIS_VERSION` dans le fichier `.env`.

## Vérification

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/smoke_release.sh \
  | MINDRIS_HOME="$HOME/.mindris-ai" sh
```

Le smoke vérifie :

- la validité du Compose release avec `docker compose config --quiet` ;
- `/` côté frontend ;
- `/api/v1/system/ready` côté API ;
- `/ready` côté renderer.

Pour tester l'installeur sans télécharger ni lancer les images :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh \
  | MINDRIS_HOME="/tmp/mindris-install-check" MINDRIS_INSTALL_DRY_RUN=true sh
```

## Mise à jour

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/update_self_hosted.sh \
  | MINDRIS_HOME="$HOME/.mindris-ai" sh
```

## Arrêt

```bash
cd "$HOME/.mindris-ai"
docker compose down
```

## Désinstallation

Arrêter les conteneurs en conservant les données :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/uninstall_self_hosted.sh \
  | MINDRIS_HOME="$HOME/.mindris-ai" sh
```

Supprimer aussi les données locales :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/uninstall_self_hosted.sh \
  | MINDRIS_HOME="$HOME/.mindris-ai" REMOVE_DATA=true sh
```

Depuis un clone du dépôt, tu peux aussi nettoyer un test self-hosted complet :

```bash
./scripts/clean_self_hosted_test.sh
```

Ce script arrête le stack, supprime les conteneurs, réseaux, volumes Compose et
images GHCR utilisées par Mindris. Pour supprimer aussi `~/.mindris-ai` :

```bash
REMOVE_DATA=true ./scripts/clean_self_hosted_test.sh
```

## Configuration

Modifier `~/.mindris-ai/.env` pour :

- changer les ports ;
- définir une version d'image ;
- ajouter des clés de providers IA ;
- configurer Ollama ou les providers de scraping.

Ne partage pas la sortie de `docker compose config` si ton `.env` contient de
vraies clés. Compose développe les secrets en clair dans cette sortie.

## Publication des images

Les images sont publiées par `.github/workflows/docker-release.yml` :

- `latest` sur la branche `main` ;
- `sha-<commit>` pour chaque build ;
- `v*` pour les tags de release.
