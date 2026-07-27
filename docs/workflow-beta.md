# Workflow Beta

Date de vérification : 23 juillet 2026

Workflow relie une opportunité durable à un job, un CV localisé, un rapport
ATS, une lettre de motivation et une entrée Tracker. Le backend reste la source
de vérité de la lignée et de l’intégrité.

## Lecture de l’intégrité

L’état agrégé est `healthy` ou `degraded`. Les détails distinguent :

- un artefact requis pas encore lié dans la checklist ;
- un rapport ATS `stale` qui évalue une ancienne révision du CV ;
- une référence orpheline, croisée avec un autre job/CV ou incohérente avec
  Tracker.

L’interface affiche l’identifiant, la date et, pour le CV, la révision des
artefacts liés. Une opportunité dégradée ne peut pas être marquée prête.

## Réparation bornée

Les actions de réparation sont décidées par le backend :

- détacher une référence supprimée ;
- réinitialiser une locale de CV disparue ;
- synchroniser les liens Tracker ;
- détacher un ATS, une lettre ou une entrée Tracker incohérents afin de les
  remplacer.

Le recalcul d’un artefact reste une action explicite dans sa surface produit.
La réparation ne lance jamais silencieusement un provider IA.

## Critères de sortie Beta

Le badge Beta ne sera retiré que dans un commit produit volontaire après :

- parcours E2E job → CV → ATS → lettre → Tracker vert ;
- références orphelines, croisées et obsolètes couvertes par les tests ;
- versions et dates visibles en desktop et mobile ;
- réparation réalisable sans édition manuelle de SQLite ;
- audit clair/sombre et FR/EN validé ;
- retours d’usage confirmant que la sélection d’artefacts est comprise.
