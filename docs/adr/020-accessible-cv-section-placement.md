# ADR 020 - Répartition accessible des sections du CV

Date : 18 juillet 2026

## Statut

Accepté

## Contexte

Le contrat de personnalisation sait déjà placer une section dans `main` ou
`sidebar`, et le renderer applique ces valeurs à l'aperçu et à l'export. Dans
le Studio de design, ce réglage restait néanmoins caché dans les options
avancées de chaque section, avec des libellés techniques. Le glisser-déposer ne
modifiait que l'ordre global et ne permettait pas de comprendre la répartition
entre colonnes.

FlowCV rend cette opération visuelle, mais une interaction uniquement fondée
sur le glisser-déposer serait fragile au clavier, sur mobile et pour les
utilisateurs non techniques.

## Décision

L'onglet Sections présente un tableau de répartition :

- « Colonne principale » et « Colonne secondaire » pour les dispositions à
  deux colonnes ;
- une liste « Ordre des sections » pour les dispositions à une colonne ;
- une flèche explicite sur chaque carte pour changer de colonne ;
- le glisser-déposer pour ordonner une colonne ou déplacer une carte entre les
  deux zones ;
- les actions Monter et Descendre dans les réglages pour une alternative
  clavier et tactile.

La transformation ne crée pas de règle métier dans le navigateur. Les
placements autorisés restent fournis par le catalogue backend, les données
sont persistées dans `global_settings.sections`, et le renderer demeure seul
responsable de leur interprétation dans le document.

Le renderer regroupe les sections dans deux conteneurs de flux indépendants
pour une disposition à deux colonnes. Une section déplacée ne crée donc pas de
ligne implicite ni de cellule vide dans la colonne opposée. En disposition à
une colonne, le renderer conserve au contraire la séquence globale configurée,
sans conteneurs intermédiaires.

Les onglets du Studio utilisent par ailleurs des icônes Lucide centralisées.
Les glyphes Unicode incomplets de Document et Modèles sont supprimés.

## Conséquences

- La répartition du CV est visible avant d'ouvrir les réglages avancés.
- Le changement de colonne reste possible sans glisser-déposer.
- Les modèles à une colonne n'exposent plus une action sans effet.
- L'ordre global sérialisé reste déterministe et compatible avec les contrats
  existants.
- Chaque colonne se compacte verticalement indépendamment de la hauteur et du
  nombre de sections de l'autre colonne.
- Le frontend conserve uniquement de la logique d'interaction.

## Vérification

Les validations couvrent :

- le transfert entre colonnes et la conservation de l'ordre ;
- la réorganisation limitée à la colonne courante ;
- le rendu effectif de `data-section-placement` ;
- les icônes SVG Document et Modèles ;
- les vues desktop/mobile et les thèmes clair/sombre avec Playwright.
