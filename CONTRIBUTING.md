# Contributing to Mindris

Thanks for contributing.

## Scope

Mindris is an open source project for candidate workflow tooling. Contributions should preserve the existing product constraints:

- the frontend is client-only
- product state and secrets are backend-owned
- browser code communicates through API calls only

See [AGENTS.md](AGENTS.md) for the contributor operating rules used in this repository.

## Before opening a change

- keep edits scoped
- prefer existing contracts and patterns
- avoid unrelated refactors
- add or update tests when product behavior changes

## Local validation

Le workspace Python Mindris est géré exclusivement avec `uv`. Les
environnements installés via `pip`, Poetry ou Conda ne sont pas supportés pour
valider une contribution. Cette règle évite les résolutions divergentes du
workspace et garantit la parité avec la CI.

Diagnostic multiplateforme :

```bash
./mindris doctor
```

Initialisation puis validation :

```bash
./mindris setup
./mindris check
```

Sous Windows, utiliser `.\mindris.ps1` dans PowerShell ou `mindris.cmd` dans
CMD. La CLI démarre avec
Python standard, mais `setup`, `reset-deps`, `dev`, `lint`, `test`, `check` et
`e2e` refusent de continuer si `uv` est absent.

Les scripts historiques ci-dessous sont des wrappers de compatibilité vers la
CLI. La logique d’orchestration ne doit pas y être dupliquée.

Validation repo-first :

```bash
./scripts/lint_all.sh
./scripts/test_all.sh
```

Checks manuels equivalents ou complementaires :

Backend :

```bash
uv run pytest
uv run ruff check .
```

Frontend :

```bash
cd apps/web
bun run lint
bun run typecheck
```

Renderer :

```bash
cd services/renderer
bun run typecheck
bun run build
```

Checks dependants de la stack locale :

```bash
./scripts/dev_local.sh
./scripts/smoke_local.sh
./scripts/e2e_browser.sh
```

## Brand and trademark note

By contributing code, documentation, or assets, you agree that the contribution may be distributed under the repository license for the relevant content.

The source code remains under the MIT License, but the `Mindris` name, logos, and brand assets are governed separately by [TRADEMARKS.md](TRADEMARKS.md).

If you contribute brand-related material, assume it is intended for official project use unless the maintainers state otherwise.

Public forks and derivative services should not use the official Mindris identity in a way that creates confusion about authorship, endorsement, or official status.

## Pull request hygiene

- explain the user-facing or operational impact
- note tests run
- mention follow-up work if the change is intentionally partial

## Politique de release

Une pull request ne publie aucun artefact. Après merge dans `main`, la release
se fait en deux étapes immuables :

1. créer `vX.Y.Z-rc.N` depuis le commit à livrer ; ce tag construit et teste les
   trois images GHCR ;
2. après validation du RC et intégration de son commit dans `main`, créer
   `vX.Y.Z` sur un arbre Git strictement identique.

Le tag stable ne reconstruit rien : il promeut par digest les manifests du RC
vers `vX.Y.Z` et `latest`. Le contrôle local est :

```bash
git fetch origin main --tags
./scripts/verify_release_promotion.sh vX.Y.Z
```

Ne déplacez et ne supprimez jamais un tag pour relancer la CI. Une correction
produit un nouveau commit et le RC suivant. La procédure complète est décrite
dans [docs/releases.md](docs/releases.md).

## Checks requis avant merge

La protection de `main` doit exiger la réussite des checks de pull request
suivants :

- `backend` ;
- `frontend` ;
- `docker-self-hosted-dry-run` ;
- `cli-cross-platform (ubuntu-latest)` ;
- `cli-cross-platform (windows-latest)`.

Le job navigateur complet reste manuel sur les pull requests ordinaires, mais
devient un gate obligatoire des release candidates. Aucun workflow déclenché
par une pull request ne possède le droit `packages: write`.
