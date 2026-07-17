# ADR 015 - Simplification UI, theme system et francais-first

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Les audits visuels ont montre plusieurs problemes recurrentiels :

- pages secondaires trop chargees ;
- hardcodes `bg-white`, `text-slate-*` et `border-slate-*` incompatibles dark mode ;
- dropdowns incoherents dans le CV Builder ;
- overflow mobile sur Markdown, Tracker et Workflow ;
- copy produit melangeant francais et anglais sur les surfaces prioritaires.

Le run UI devait corriger ces problemes sans introduire une couche metier dans
le frontend.

## Decision

### 1. Les surfaces produit utilisent les tokens semantiques

Les classes couleur locales doivent etre remplacees par les primitives du
design system :

- `bg-card`
- `bg-background`
- `bg-muted/40`
- `text-foreground`
- `text-muted-foreground`
- `border-border`

Les accents couleur restent possibles pour des badges ou statuts si une variante
dark explicite existe.

Consequence :

- dark/light mode devient plus coherent ;
- les futurs composants heritent mieux du theme ;
- les regressions visuelles sont plus faciles a reperer.

### 2. Les dropdowns toolbar sont centralises

Les menus et selects du CV Builder doivent utiliser une primitive commune afin
d'avoir le meme comportement visuel que les boutons Importer/Exporter.

Consequence :

- moins de variations UI locales ;
- moins de casse quand la sidebar est ouverte/fermee ;
- meilleure predictibilite responsive.

### 3. Le francais devient la langue produit prioritaire

Les surfaces prioritaires doivent etre francais-first :

- Dashboard ;
- CV Builder ;
- Guide ;
- History.

La centralisation i18n complete reste a faire, mais les nouvelles copies produit
doivent privilegier le francais.

Consequence :

- coherence SaaS/dev pour l'utilisateur cible initial ;
- base plus claire avant traduction EN ;
- les docs internes restent en francais.

### 4. Playwright Python devient le fallback d'audit visuel

Quand `js_repl` n'est pas disponible, l'audit UI utilise Playwright via Python.
Les captures temporaires vont dans `.screenshots/` et ne sont pas committees.

Consequence :

- les controles visuels restent possibles dans WSL/Codex ;
- chaque route modifiee doit etre verifiee au moins en `1600x900` et `390x844`.

## Verification

Checks :

```bash
cd apps/web && bun run lint
cd apps/web && bun run typecheck
```

Audits Playwright Python effectues sur :

- `/dashboard`
- `/tools/cv-creator`
- `/tools/markdown`
- `/tools/tracker`
- `/tools/workflow`
- `/tools/history`
- `/tools/guide`

Resultat : pas d'overflow horizontal sur les routes verifiees.

## Consequences

- Les prochaines simplifications doivent cibler ATS Score, Markdown PDF,
  Tracker et Workflow Beta.
- Le vrai systeme i18n reste une phase separee.
- Les composants UI doivent continuer a privilegier les primitives existantes
  plutot que des styles locaux.
