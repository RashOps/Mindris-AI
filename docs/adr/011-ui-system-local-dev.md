# ADR 011 - UI system and non-Docker local workflow

Date : 24 juin 2026

## Statut

Accepte

## Contexte

Le MVP1 et la phase 6 ont livre les fonctions principales, mais l'interface etait separee entre dashboard clair, outils sombres et landing marketing. Le projet a aussi besoin d'un chemin local simple pour les utilisateurs qui ne souhaitent pas utiliser Docker.

## Decision

Les pages produit utilisent un shell SaaS commun : `AppShell`.

Le frontend reste un client d'API :

- pas de source de verite metier dans le navigateur ;
- pas de stockage durable produit cote frontend ;
- les exports, CV, drafts, templates, tracker et analyses restent fournis par API.

Les scripts locaux non-Docker deviennent le chemin recommande hors Docker :

- `scripts/setup_local.sh`
- `scripts/reset_local_deps.sh`
- `scripts/dev_local.sh`
- `scripts/smoke_local.sh`

## Consequences

- La navigation produit est unifiee entre dashboard et outils.
- Les outils peuvent garder des zones sombres pour editeurs, previews et logs.
- Les utilisateurs peuvent installer et lancer les trois services avec des commandes racine.
- Docker reste disponible mais n'est plus le seul workflow documente pour le self-hosting local.
