# Personnaliser un CV avec CSS

## Choisir le bon niveau

Commence par les contrôles visuels du CV Builder. Si un réglage manque :

1. utilise le mode `tokens` pour modifier les variables prévues ;
2. utilise `css_patch` pour cibler un rôle sémantique ;
3. crée un package communautaire seulement pour un style réutilisable.

Le CSS s'exécute dans le Shadow DOM du CV. Il ne peut pas modifier Mindris.

## Mode tokens

Le mode tokens accepte uniquement `:host`.

```css
:host {
  --primary-color: #0f766e;
  --heading-scale: 1.08;
  --entry-spacing: 14px;
}
```

Ce mode résiste le mieux aux évolutions des templates.

## Mode CSS patch

Utilise les sélecteurs publics, jamais la position d'un enfant ni une classe
interne.

Le contrat v1 accepte les attributs suivants, seuls ou combinés :

- `data-cv-role`
- `data-section-id`
- `data-section-type`
- `data-placement`
- `data-order`
- `data-page-break`
- `data-display-mode`
- `data-detail-level`

Les rôles `data-cv-role` publiés sont : `document`, `header`,
`profile-name`, `profile-photo`, `contact-list`, `contact-item`, `content`, `column`,
`section`, `section-heading`, `entry`, `entry-title`, `entry-subtitle`,
`entry-link`, `entry-date`, `entry-description`, `tag-list` et `tag`. `GET /contracts`
reste la source de vérité machine-readable.

```css
[data-cv-role="section-heading"] {
  letter-spacing: 0.08em;
}

[data-section-type="experience"] [data-cv-role="entry-title"] {
  font-weight: 700;
}

[data-section-id="skills"][data-placement="sidebar"] {
  opacity: 0.96;
}
```

Évite :

```css
.main-grid > section:nth-child(2) {}
.section-title {}
```

Ces classes restent internes et peuvent changer.

## Protections

Le renderer filtre notamment :

- `@import` ;
- `url(...)` ;
- `expression(...)` ;
- `javascript:` ;
- sélecteurs `html`, `body`, `:root`, `script` et `iframe` ;
- règles hors du Shadow DOM du CV.

Les warnings sont des identifiants stables :

| Message ID | Signification |
|---|---|
| `renderer.css.malformed_rule` | règle incomplète |
| `renderer.css.unsupported_selector` | sélecteur hors contrat |
| `renderer.css.unsafe_declaration` | déclaration filtrée |
| `renderer.css.tokens_host_only` | sélecteur différent de `:host` en mode tokens |

## Parcours recommandé

1. Ouvre CV Builder → Style → Expert.
2. Vérifie la version du contrat affichée.
3. Modifie d'abord un token.
4. Observe la preview.
5. Vérifie les warnings.
6. Exporte un PDF de test.
7. Contrôle A4 et Letter, textes longs et sauts de page.
8. Garde la révision créée par la sauvegarde avant une modification majeure.

## Accessibilité et impression

- garde un contraste minimum de `4.5:1` pour le texte courant ;
- évite une taille inférieure à `10px` ;
- ne masque pas un heading uniquement visuellement ;
- évite les hauteurs fixes et `overflow: hidden` ;
- teste les liens longs ;
- vérifie les quatre locales si le template est partagé ;
- compare systématiquement preview et PDF.

## Restaurer

Le bouton Restaurer désactive le CSS et vide le patch. Les sauvegardes du CV
créent des révisions backend ; History permet de comparer ou restaurer un état
antérieur.

## Template communautaire

Un package `.mindris-template` V2 contient :

```text
manifest.json
template.json
styles.css
preview.png
```

Le manifeste déclare :

```json
{
  "engine_version": "2",
  "template_contract_version": "2",
  "selector_contract_version": "1"
}
```

Le package est refusé si ces contrats sont incompatibles ou si `styles.css`
contient une construction interdite. Consulte également
[`docs/community-templates-marketplace.md`](./community-templates-marketplace.md).
