# Contrat du renderer CV

## Objectif

Le renderer est la frontière d'exécution du document. Le gateway résout les
defaults, le renderer produit le HTML/PDF et le manifeste décrit le résultat
réel. Le frontend ne déduit aucune règle métier depuis le CSS.

## Versions courantes

| Contrat | Version |
|---|---:|
| Renderer engine | `2` |
| Template contract | `2` |
| Selector contract | `1` |
| Render manifest | `1` |

`GET /contracts` retourne ces versions, les sélecteurs publics et les
capacités des dix templates.

## Résolution déterministe

`POST /api/v1/templates/resolve-render-payload` applique :

1. defaults système ;
2. defaults du template ;
3. données persistées du CV ;
4. overrides de l'opération ;
5. locale explicite ;
6. validation Pydantic finale.

La réponse contient `cv_data`, `template_id`, `requested_template_id` et
`content_hash`. Preview, inspection et export doivent transmettre ces trois
premiers champs et le hash au renderer.

## Matrice options → HTML → CSS → preview → PDF

| Option backend | Contrat HTML | Effet renderer | Preview/PDF |
|---|---|---|---|
| `template_id` | `data-template-id` | CSS de famille + override | même résolution |
| `layout.columns` | colonnes `data-cv-role` | une ou deux colonnes selon capacités | identique |
| `section.id` | `data-section-id` | identité stable et manifeste | identique |
| `section.placement` | `data-placement` | flux main/sidebar | identique |
| `section.order` | `data-order` | ordre normalisé backend | identique |
| `display_mode` | `data-display-mode` | liste, timeline, cartes, compact | identique |
| `detail_level` | `data-detail-level` | détail court/normal/détaillé | identique |
| `page_break_before` | `data-page-break` | saut avant section | identique |
| photo | `data-cv-role="profile-photo"` | position, taille, forme, gris | identique |
| locale | attributs de contenu | labels et dates FR/EN/DE/ES | identique |
| tokens CSS | `:host` | variables autorisées | identique |
| CSS patch | sélecteurs publics | règles sanitizées dans Shadow DOM | identique |

## Sélecteurs publics

Les CSS et outils externes utilisent seulement les rôles publiés par
`GET /contracts`. Les classes `.section`, `.item`, `.header` et autres classes
internes ne sont pas une API.

Attributs structurants :

- `data-cv-role`
- `data-section-id`
- `data-section-type`
- `data-placement`
- `data-order`
- `data-page-break`
- `data-display-mode`
- `data-detail-level`

## RenderManifest

`POST /render/manifest` mesure un rendu sans persister la géométrie.

Le manifeste contient :

- identité du CV, révision et hash ;
- template et versions ;
- format, dimensions, pages et overflow global ;
- page, colonne, index, bounds, densité et taille minimale par section ;
- warnings avec `messageId` stable.

Détections :

- clipping et overflow ;
- section traversant une page ;
- chevauchement ;
- texte trop petit ;
- section vide ;
- lien anormalement long ;
- dernière page presque vide ;
- colonnes fortement déséquilibrées.

Une coordonnée n'est valide que pour son `contentHash`.

## Fixtures versionnées

`services/renderer/src/templates/fixtures.ts` fournit :

- CV court ;
- CV long ;
- deux colonnes ;
- photo ;
- multilingue ;
- CSS personnalisé ;
- overflow volontaire.

Elles alimentent les tests de contrats, manifeste, templates et PDF.

## Placement des sections

`POST /api/v1/resumes/{resume_id}/sections/move` accepte :

- `move_section` avec colonne et index ;
- `swap_sections` avec section cible ;
- `base_revision` obligatoire.

Une révision périmée reçoit `409`. Une sidebar non supportée reçoit `422`.
La réponse contient le CV et sa nouvelle révision.
