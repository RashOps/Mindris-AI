# UI system Mindris AI

Date : 24 juin 2026

## Direction

Mindris AI utilise une interface SaaS operationnelle : claire, dense, lisible et orientee travail.

Le frontend reste un client d'API. Les donnees produit et documents durables restent dans l'API Gateway ou le renderer.

## Shell applicatif

Les pages produit utilisent `AppShell` :

- `/dashboard`
- `/tools/cv-creator`
- `/tools/ats-score`
- `/tools/tracker`
- `/tools/markdown`

Le shell fournit :

- navigation principale ;
- contexte de page ;
- zone d'actions ;
- navigation mobile ;
- rappel des ports locaux.

## Primitives

Primitives ajoutees :

- `AppShell`
- `PageBody`
- `SectionPanel`
- `StatusBanner`
- `MetricTile`

Ces composants doivent etre preferes aux headers, sidebars et panneaux crees localement dans chaque page.

## Regles visuelles

- Le theme est determine a l'ouverture par `mindris-theme`, sinon par la preference systeme.
- Le bootstrap theme doit s'appliquer avant hydratation via le root layout.
- Le shell, les formulaires et les panneaux produit utilisent des tokens semantiques, pas des couleurs locales.
- UI produit claire ou sombre selon le theme actif.
- Surfaces sombres reservees aux previews, logs, editeurs et consoles specifiques si elles ne suivent pas encore les tokens de base.
- Rayon standard : `rounded-lg`.
- Navigation avec icones `lucide-react`, pas d'emojis.
- Actions compactes avec boutons standards.
- Pas de page tool avec logo/header produit duplique : le shell est responsable du chrome.

## Classes de base

Les surfaces et champs frequents doivent preferer :

- `.app-page`
- `.app-surface`
- `.app-surface-muted`
- `.app-header-surface`
- `.app-input`
- `.app-select`
- `.app-textarea`
- `.app-toolbar-button`
- `.app-toolbar-button-active`

Ces classes definissent le contrat minimum entre light/dark mode, lisibilite, focus et hover.

## Verification

Avant de declarer un changement UI termine :

```bash
cd apps/web
bun run lint
bun run typecheck
bun run build
```

Verifier aussi que le scan stockage frontend ne montre pas de nouvelle persistance produit :

```bash
rg -n "localStorage|sessionStorage|indexedDB|document\\.cookie" apps/web/src
```
