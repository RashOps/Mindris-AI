# ADR 028 — Archives de sauvegarde portables et versionnées

- Statut : accepté
- Date : 2026-07-23

## Contexte

Une copie manuelle de `storage/` est simple, mais elle ne permet pas de vérifier
la compatibilité, d’exclure systématiquement les secrets ni de sécuriser une
restauration.

## Décision

La CLI contributeur fournit `mindris backup create`, `inspect` et `restore`.
Le format est une archive ZIP contenant :

- un manifeste `mindris-backup.json` ;
- un numéro de format strict ;
- les fichiers sous une unique racine `storage/`.

`runtime-secrets.json` et `.env` sont exclus. L’inspection valide tous les
chemins avant extraction. La restauration utilise un dossier intermédiaire et
conserve l’ancien stockage comme rollback jusqu’au remplacement réussi.

La stack doit être arrêtée par l’opérateur avant de sauvegarder ou restaurer
afin de garantir un instantané SQLite cohérent.

## Conséquences

- les sauvegardes sont transportables entre Linux et Windows ;
- les secrets doivent être reconfigurés après restauration ;
- toute évolution incompatible impose une nouvelle version de format et une
  migration explicite ;
- le même mécanisme pourra être exposé plus tard par l’application desktop.

