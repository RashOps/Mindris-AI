# ADR 026 - CLI contributeur multiplateforme et workspace uv strict

Date : 22 juillet 2026

## Statut

Accepté

## Contexte

Les scripts opérateur historiques sont écrits en shell. Ils couvrent Linux,
macOS, WSL et la CI, mais ne constituent pas une interface native pour Windows.
Un Makefile ne résout pas ce problème : GNU Make n'est pas fourni par Windows
et ses recettes continueraient souvent à dépendre d'un shell Unix.

Accepter plusieurs gestionnaires Python introduirait en parallèle des
résolutions différentes de celles du workspace et de la CI.

## Décision

Mindris fournit une CLI contributeur écrite avec la bibliothèque standard
Python et des lanceurs Unix, PowerShell et CMD.

- `doctor`, l'aide et les contrôles opérateur simples démarrent avec Python
  standard ;
- `uv` est obligatoire pour toute commande qui touche au workspace Python ;
- aucun fallback `pip`, Poetry ou Conda n'est fourni ;
- Bun reste le gestionnaire unique du frontend et du renderer ;
- Docker reste indépendant du workspace Python ;
- les scripts shell sont conservés pendant une migration progressive ;
- la CI teste la CLI sur Linux et Windows.

La CLI orchestre les services et les outils. Elle ne contient aucune logique
métier et ne devient pas une couche backend cachée.

## Conséquences

- Les contributeurs Windows disposent des mêmes intentions de commande que les
  contributeurs Unix.
- `pyproject.toml` et `uv.lock` restent les seules sources de vérité Python.
- Python doit être installé pour utiliser la CLI contributeur, mais pas pour
  installer la distribution Docker self-hosted.
- Un Makefile pourra être ajouté comme raccourci facultatif, sans logique.

## Vérification

```bash
./mindris doctor
uv run pytest tests/test_mindris_cli.py -q
```

Le workflow CI exécute ces tests sur `ubuntu-latest` et `windows-latest`.
