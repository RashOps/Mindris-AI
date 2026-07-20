# ADR 024 - UI produit progressive, i18n backend-owned et guide contextualisé

Date : 20 juillet 2026

## Statut

Accepté

## Contexte

ATS Score, Markdown PDF, Tracker et Workflow exposaient toutes leurs surfaces
dans une même page. Les parcours restaient fonctionnels mais produisaient des
pages de plusieurs milliers de pixels, particulièrement difficiles sur mobile.
Les textes français et anglais étaient dispersés et le Guide restait une longue
suite de cartes statiques.

## Décision

### Architecture d’information

- Markdown utilise un split desktop et des tabs Éditeur/Aperçu sur mobile.
- ATS sépare Résumé, Mots-clés et Détails après l’analyse.
- Tracker conserve le Kanban desktop et affiche une seule liste d’état sur
  mobile ; le formulaire de création est replié.
- Workflow Beta utilise un master/detail, une liste filtrable et trois tabs :
  Préparation, Documents et Diagnostic.
- History reçoit du backend une clé et un libellé de groupe candidature ; le
  frontend ne déduit pas la lignée métier à partir de champs bruts.

### Internationalisation

- Le français est la locale produit par défaut.
- Les dictionnaires FR/EN sont typés et doivent conserver la même structure.
- `ui_locale` est persisté dans la configuration runtime backend.
- Le document et l’AppShell suivent la locale résolue par le backend.
- Les composants clients migrent progressivement depuis les strings dispersées
  vers les dictionnaires ; les labels métier dynamiques continuent de venir du
  backend avec des identifiants stables.

### Guide

- Le Guide propose trois objectifs : premier CV, adaptation à une offre et
  candidature complète.
- Une seule étape détaillée est affichée à la fois.
- Les checklists sont interactives et leur progression est enregistrée dans le
  draft backend `guide-progress`.
- Dashboard et CV Builder exposent un lien vers le parcours correspondant.

## Conséquences

- Les pages longues deviennent progressives sans déplacer de logique métier
  dans le navigateur.
- Workflow reste explicitement Beta ; les diagnostics sont séparés des actions
  quotidiennes.
- La traduction anglaise peut être étendue sans introduire une seconde source
  de configuration côté navigateur.
- Les préférences de thème restent une préférence UI locale, tandis que la
  locale produit et la progression du guide sont backend-owned.

## Vérification

- Playwright Python à 1600×900 et 390×844, en light/dark.
- Aucun overflow horizontal, aucune erreur console et aucune réponse HTTP en
  échec sur les routes modifiées.
- Captures dans `.screenshots/product-simplification-2026-07-20/`.
- `bun test`, `bun run lint` et `bun run typecheck` dans `apps/web`.
- Tests API History et System pour les groupes et la locale.
