# Agent Runtime And Sandbox Guide

Date : 7 juillet 2026

Ce document decrit comment configurer une sandbox utile pour permettre a un agent de code d'iterer de facon autonome sur Mindris sans ouvrir inutilement le perimetre de risque.

## Objectif

Donner a l'agent assez de surface pour :

- lire le repository ;
- modifier le code et la documentation ;
- lancer les verifications locales ;
- executer les scripts de smoke et d'E2E quand la stack locale est disponible ;
- eviter les modifications destructives ou les fuites de secrets.

## Niveaux d'autonomie

### Niveau 1 — Edition

Autoriser :

- lecture du repository ;
- ecriture dans le repository ;
- ecriture dans `/tmp`.

Ce niveau suffit pour :

- patcher du code ;
- ecrire des tests ;
- mettre a jour la documentation ;
- generer des fichiers temporaires.

### Niveau 2 — Validation

Autoriser les commandes de verification recurrentes.

Prefixes d'approbation persistants recommandes :

```text
["uv", "run", "pytest"]
["uv", "run", "ruff"]
["bun", "run", "lint"]
["bun", "run", "typecheck"]
["bun", "run", "build"]
["./scripts/lint_all.sh"]
["./scripts/test_all.sh"]
```

Ce niveau suffit pour :

- tests Python ;
- lint Python ;
- lint frontend ;
- typecheck frontend et renderer ;
- tests renderer ;
- validations groupees via scripts du repo.

Liste copyable recommandée :

```text
["uv", "run", "pytest"]
["uv", "run", "ruff"]
["bun", "run", "lint"]
["bun", "run", "typecheck"]
["bun", "run", "build"]
["./scripts/lint_all.sh"]
["./scripts/test_all.sh"]
["./scripts/check_all.sh"]
```

### Niveau 3 — Execution locale

Autoriser la mise en route et l'arret du stack local.

Prefixes d'approbation persistants recommandes :

```text
["./scripts/dev_local.sh"]
["./scripts/smoke_local.sh"]
["./scripts/e2e_browser.sh"]
["docker", "compose", "up"]
["docker", "compose", "down"]
```

Ce niveau suffit pour :

- lancer API Gateway, renderer et frontend ;
- valider un smoke local ;
- executer les parcours navigateur ;
- lancer le compose self-hosting si besoin.

Liste copyable recommandée :

```text
["./scripts/dev_local.sh"]
["./scripts/smoke_local.sh"]
["./scripts/e2e_browser.sh"]
["docker", "compose", "up"]
["docker", "compose", "down"]
```

## Frontieres de securite

Chemins protegés a ne pas ouvrir en ecriture libre sauf besoin explicite :

- `.env`
- `storage/`
- `.logs/*`
- `logs/*`
- `.venv/*`
- lockfiles

Motifs :

- `.env` contient des secrets ;
- `storage/` contient de la persistance locale metier ;
- `.logs/` contient des traces runtime et ne doit pas devenir une surface d'edition manuelle ;
- les lockfiles ne doivent changer que lors d'une decision dependance explicite.

## Reseau

Conserver le reseau restreint par defaut.

Autoriser une escalade ciblee seulement pour :

- installation de dependances ;
- `docker compose up --build` ;
- verification de documentation officielle si necessaire ;
- tests d'integration qui requierent un acces externe legitime.

Le mode normal doit rester repo-first et local-first.

## Surface de commande recommandee

Preferer toujours les scripts versionnes du repository aux commandes longues ecrites ad hoc.

Surface standard :

```bash
./scripts/setup_local.sh
./scripts/reset_local_deps.sh
./scripts/dev_local.sh
./scripts/smoke_local.sh
./scripts/e2e_browser.sh
./scripts/lint_all.sh
./scripts/test_all.sh
./scripts/check_all.sh
```

## Workflow recommande

## Validation profiles

### Profil 1 — Quick repo checks

Pour verifier rapidement le repo sans stack locale :

```bash
./scripts/check_all.sh
```

Ce profil lance :

- `./scripts/lint_all.sh`
- `./scripts/test_all.sh`

### Profil 2 — Local stack validation

Pour une verification locale complete avec services en cours d'execution :

Terminal 1 :

```bash
./scripts/dev_local.sh
```

Terminal 2 :

```bash
RUN_LOCAL_SMOKE=1 RUN_BROWSER_E2E=1 ./scripts/check_all.sh
```

Ce profil ajoute :

- `./scripts/smoke_local.sh`
- `./scripts/e2e_browser.sh`

### Profil 3 — Smoke only

Quand le code n'a pas change mais qu'un controle runtime est utile :

```bash
./scripts/smoke_local.sh
```

### Iteration sans stack locale

```bash
./scripts/check_all.sh
```

### Iteration avec stack locale

Terminal 1 :

```bash
./scripts/dev_local.sh
```

Terminal 2 :

```bash
./scripts/smoke_local.sh
./scripts/e2e_browser.sh
```

## Ce qu'il faut eviter

- `rm` destructif hors demande explicite ;
- `git reset --hard` ;
- edition libre de `.env` ;
- ecriture manuelle dans `storage/` ;
- acces reseau illimite ;
- commandes shell ad hoc qui contournent les scripts du repo sans bonne raison.

## Notes Mindris

- Le frontend reste client-only.
- Les secrets et l'etat produit restent backend-owned.
- Les nouvelles validations locales doivent idealement etre exposees via `scripts/`.
