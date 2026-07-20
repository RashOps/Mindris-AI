# ADR 025 - Release candidates immuables et promotion GHCR par digest

Date : 20 juillet 2026

## Statut

Accepté

## Contexte

La release v0.4.0 a montré les limites d'un workflow unique déclenché par
`main`, les tags RC et les tags stables. Chaque relance pouvait reconstruire
des images différentes, déplacer `latest` ou encourager la création et la
suppression de tags uniquement pour piloter la CI. Le tag stable ne prouvait
pas que ses octets correspondaient au candidat testé sur Debian.

## Décision

Mindris sépare désormais validation, construction candidate et promotion :

- `ci.yml` valide les pull requests sans droit de publication ;
- `release-candidate.yml` est le seul workflow autorisé à construire et
  publier des images, uniquement pour `v*-rc.*` ;
- `release-promote.yml` répond uniquement aux tags stables et ne contient
  aucune étape de build Docker ;
- le stable doit être contenu dans `main`, descendre d'un RC de la même version
  et partager exactement son arbre Git ;
- les tags GHCR stable et `latest` sont créés depuis le digest du manifest RC ;
- les tags Git de release sont immuables et ne servent pas de bouton de retry.

Le stable peut être un commit de merge différent du RC : l'ascendance préserve
l'histoire et l'égalité des arbres garantit l'identité du contenu livré.

## Conséquences

- Les images sont construites une seule fois et testées avant promotion.
- Un push sur `main` ne consomme plus de build Docker et ne déplace pas
  `latest`.
- Toute correction après un RC exige un nouveau commit et un nouveau numéro RC.
- La promotion échoue si un manifest RC a été supprimé de GHCR.
- La GitHub Release est créée seulement après validation des images promues.

## Vérification

```bash
./scripts/test_release_policy.sh
git fetch origin main --tags
./scripts/verify_release_promotion.sh vX.Y.Z
```

La procédure opérateur complète est définie dans `docs/releases.md`.
