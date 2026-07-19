# UI system Mindris AI

Date : 17 juillet 2026

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
- `/tools/history`
- `/tools/workflow`
- `/tools/guide`

Le shell fournit :

- navigation principale ;
- contexte de page ;
- zone d'actions ;
- navigation mobile ;
- rappel des ports locaux.

Le shell et le guide produit doivent decrire le runtime reel :

- local-first ;
- frontend client-only ;
- etat et secrets backend-owned ;
- acces navigateur local via loopback ;
- appels externes via `X-API-Key`.

`RuntimeGate` fait partie du produit. Il doit attendre :

- `GET /api/v1/system/ready` cote API Gateway ;
- `GET /ready` cote renderer.

L'AppShell ne doit s'ouvrir que lorsque ces endpoints sont prets.

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
- Toutes les icones d'interface utilisent `lucide-react`, y compris les CTA,
  fermetures, statuts, imports et controles de formulaire.
- Les emojis et glyphes Unicode decoratifs ne sont pas des icones produit. Les
  symboles qui appartiennent reellement au contenu, comme `Markdown → PDF` ou
  une comparaison de versions, restent du texte semantique.
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

Les classes hardcodees de type `bg-white`, `text-slate-*` et
`border-slate-*` doivent etre evitees sur les surfaces produit. Preferer :

- `bg-card`
- `bg-background`
- `bg-muted/40`
- `text-foreground`
- `text-muted-foreground`
- `border-border`

Les accents couleur restent autorises pour des badges/stats si une variante
dark explicite existe.

## CV Builder

Le CV Builder expose trois modes :

- `Simple` : controles essentiels pour utilisateurs non techniques ;
- `Normal` : usage courant ;
- `Avance` : diagnostics, IA, offre et actions avancees regroupees.

Regles :

- la section Style est une tab voisine de Structure, pas un overlay bloquant ;
- sur desktop, les commandes sont réparties dans un ruban réductible avec les
  tabs Principal, Adapter et Document ;
- sur mobile, les actions essentielles restent dans une barre compacte et les
  outils secondaires utilisent une bottom sheet scrollable ;
- les modes Simple, Normal et Avancé contrôlent la disponibilité, pas
  l'affichage simultané de tous les réglages ;
- aucun choix metier ne doit etre resolu dans le frontend ;
- les dropdowns toolbar utilisent les primitives centralisees ;
- les zones avancees doivent occuper l'espace sans creer de vide structurel ;
- les overlays restants doivent etre justifies par une interaction ponctuelle.

## Langue produit

La langue produit prioritaire est le francais.

Etat actuel :

- Dashboard, CV Builder, Guide et History sont francais-first ;
- ATS Score, Markdown PDF, Tracker et Workflow peuvent encore contenir des
  libelles anglais ;
- la centralisation i18n reste a faire avant une traduction utilisateur propre.

## Configuration

La surface `Configuration` doit rester backend-owned et etre organisee par intentions distinctes :

- `Task model defaults` pour les modeles/task routing
- `Ingestion and local runtime` pour les toggles runtime non sensibles
- `Runtime diagnostics` pour l'etat local et les chemins d'operation
- `Secret slots` pour les cles write-only

Les secrets, diagnostics et defaults ne doivent plus etre presentes comme un seul bloc uniforme.

Le catalogue des modèles est également backend-owned. La configuration peut
le rafraîchir explicitement ; l'UI affiche le dernier snapshot valide et ses
diagnostics de fraîcheur sans appeler directement les providers.

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

Pour les changements visuels, verifier au minimum la route modifiee en :

- `1600x900`
- `390x844`

Les captures temporaires vont dans `.screenshots/` et ne doivent pas etre
committees.
