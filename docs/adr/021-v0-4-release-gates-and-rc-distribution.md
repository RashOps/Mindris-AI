# ADR 021 - Gates de release v0.4 et distribution RC

Date : 18 juillet 2026

## Statut

Remplacé par l'ADR 025

Cette décision décrit le processus utilisé pour v0.4.0. La politique courante
interdit désormais les builds sur `main` et les rebuilds au tag stable.

## Contexte

La différence entre `v0.3.0` et le candidat `v0.4.0` couvre le runtime, le
lineage des artefacts, le CV Builder avancé, le thème, le guide, les outils
secondaires et la distribution Docker. Les workflows historiques validaient
les builds frontend et renderer, mais pas leurs tests Bun. Le job navigateur
restait manuel et le workflow Docker pouvait publier un tag sans réexécuter
tous les gates applicatifs.

Une release de cette ampleur ne doit pas reposer uniquement sur la réussite des
builds ou sur le tag `latest` déjà disponible.

## Décision

### 1. Versionner en v0.4.0

Mindris reste en phase pré-1.0. Les contrats importants sont stabilisés, mais
Workflow reste Beta et l'i18n ainsi que Desktop/Tauri ne sont pas terminés. La
version suivante est donc `0.4.0`, pas `1.0.0`.

### 2. Publier un candidat avant le tag stable

Le tag `v0.4.0-rc.1` publie trois images GHCR portant exactement ce tag. Elles
sont installées et testées depuis une distribution Debian propre avant la
création de `v0.4.0`.

### 3. Bloquer la publication sur les validations applicatives

Le workflow Docker exécute avant le build :

- Ruff check et format check ;
- toute la suite Pytest ;
- tests, lint, typecheck et build frontend ;
- tests, typecheck et build renderer ;
- validation Compose et syntaxe des scripts self-hosted.

Après publication, le workflow installe les images produites, vérifie les
readiness endpoints, puis exécute le navigateur E2E sur cette stack.

### 4. Ne créer le tag stable qu'après validation externe

`v0.4.0` et la GitHub Release restent bloqués jusqu'au fresh install Debian du
RC. Le tag stable pointe vers un commit dont les différences avec le RC sont
limitées aux notes de release finales.

## Conséquences

- Une image RC peut être publiée sans être annoncée comme stable.
- Un échec Bun, Python, renderer, Compose ou navigateur bloque le workflow de
  release.
- Les notes `Unreleased` du changelog sont finalisées uniquement après le test
  externe du RC.
- `latest` continue d'être publié depuis `main`, tandis que les installations
  reproductibles utilisent un tag explicite.

## Vérification

Avant `v0.4.0` :

```bash
./scripts/check_all.sh
RUN_LOCAL_SMOKE=1 RUN_BROWSER_E2E=1 ./scripts/check_all.sh
docker compose -f docker-compose.release.yml config --quiet
```

Puis, depuis Debian propre, installer `v0.4.0-rc.1`, vérifier les trois
conteneurs, RuntimeGate, le CV Builder et les exports avant approbation du tag
stable.
