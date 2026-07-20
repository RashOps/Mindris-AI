# Politique de release

Cette procédure garantit que l'image stable est exactement l'image RC testée.
Une branche ou une pull request ne publie jamais d'artefact.

## Les trois workflows

| Workflow | Déclencheur | Effet |
| --- | --- | --- |
| `ci.yml` | pull request ou lancement manuel | tests et builds locaux, aucune publication |
| `release-candidate.yml` | tag `vX.Y.Z-rc.N` | validation, build GHCR, smoke et E2E |
| `release-promote.yml` | tag stable `vX.Y.Z` | contrôle Git, promotion par digest, smoke, GitHub Release |

`main` ne construit et ne publie aucune image Docker. Le tag `latest` change
uniquement pendant une promotion stable réussie.

## Préparer un release candidate

La branche de release doit être validée et son commit destiné à rejoindre
`main`. Créer ensuite un unique RC :

```bash
git tag -a v0.5.0-rc.1 -m "Mindris AI v0.5.0-rc.1"
git push origin v0.5.0-rc.1
```

Le workflow construit les trois images avec ce seul tag, puis exécute le smoke
et le navigateur E2E sur les images publiées. Une correction crée un nouveau
commit et `v0.5.0-rc.2`. Un tag existant n'est jamais déplacé ou réutilisé.

## Promouvoir la version stable

Après validation du RC :

1. merger le commit du RC dans `main` ;
2. vérifier que la copie locale connaît `origin/main` et tous les tags ;
3. créer le tag stable sur un commit dont l'arbre est identique au RC ;
4. pousser uniquement ce tag stable.

```bash
git fetch origin main --tags
git tag -a v0.5.0 -m "Mindris AI v0.5.0"
./scripts/verify_release_promotion.sh v0.5.0
git push origin v0.5.0
```

Le contrôle exige que le stable appartienne à `origin/main`, qu'un RC de la
même version soit son ancêtre et que leurs arbres Git soient égaux. Un commit
de merge est donc accepté seulement s'il ne modifie aucun fichier du RC.

Le workflow lit ensuite le digest de chaque manifest `v0.5.0-rc.N` et crée les
tags GHCR `v0.5.0` et `latest` sur ce digest. Aucun Dockerfile n'est rebâti.
La GitHub Release n'est publiée qu'après le smoke et l'E2E stables.

## En cas d'échec

- Échec du RC avant publication : corriger et créer le RC suivant.
- Échec du smoke RC : conserver le tag pour l'audit, corriger et créer le RC
  suivant.
- Refus du stable : ne pas forcer le workflow ; réaligner `main` ou recréer un
  stable à partir de l'arbre réellement validé selon la procédure d'incident.
- Image GHCR absente : le stable échoue avant promotion ; ne jamais reconstruire
  sous le tag stable.

Les tags de release sont immuables. Leur suppression distante ou le nettoyage
d'un artefact GHCR nécessite une décision explicite d'incident, pas une simple
relance CI.
