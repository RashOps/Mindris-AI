# ADR 013 - RuntimeGate officiel et stabilisation CV Builder

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Les docs produit indiquaient que le frontend devait attendre l'API Gateway et le
renderer avant d'ouvrir le workspace, mais le comportement observe pouvait
laisser l'utilisateur bloque ou ouvrir une surface incoherente. En parallele,
le CV Builder etait devenu trop charge : la section Style s'ouvrait en overlay,
les controles avances etaient disperses, et certains defaults frontend
risquaient de contredire le contrat backend.

Le run de stabilisation devait corriger ces incoherences sans deplacer de
logique metier dans le navigateur.

## Decision

### 1. RuntimeGate devient une piece officielle du produit

Le frontend doit attendre explicitement :

- `GET /api/v1/system/ready` cote API Gateway ;
- `GET /ready` cote renderer.

L'AppShell ne doit s'ouvrir que lorsque les deux services sont prets.

Consequence :

- un systeme non pret n'expose pas une UI faussement operationnelle ;
- les erreurs de runtime sont plus faciles a diagnostiquer ;
- le contrat documente correspond au comportement attendu.

### 2. Les defaults metier restent resolus cote backend

Les previews, exports et controles de rendu doivent utiliser le contrat
backend-resolu. Le frontend peut exposer les controles et afficher l'etat, mais
il ne doit pas inventer ou figer des defaults metier durables.

Consequence :

- renderer, backend et frontend restent alignes ;
- les exports PDF et previews consomment les memes donnees normalisees ;
- les futures migrations de schema restent backend-owned.

### 3. La section Style est integree comme tab du CV Builder

Le Style Studio quitte l'overlay et devient une tab voisine de Structure.

Consequence :

- l'utilisateur voit mieux l'impact des changements ;
- la preview reste inspectable ;
- l'interface reste utilisable sur desktop et mobile ;
- les overlays restants doivent etre ponctuels et justifies.

### 4. Les modes CV Builder structurent la complexite

Le CV Builder expose trois modes :

- `Simple` : controles essentiels ;
- `Normal` : usage quotidien ;
- `Avance` : IA, offre, actions sensibles et diagnostics.

Consequence :

- les utilisateurs non techniques ont un chemin plus clair ;
- le mode avance reste disponible sans surcharger le mode standard ;
- les sections avancees sont regroupees au lieu d'etre exposees partout.

## Verification

Verifications effectuees :

```bash
cd apps/web && bun run lint
cd apps/web && bun run typecheck
```

Audit Playwright Python :

- `/tools/cv-creator` en `1600x900` ;
- `/tools/cv-creator` en `390x844` ;
- validation des tabs Structure/Style ;
- validation preview, panels et absence d'overflow horizontal.

## Consequences

- RuntimeGate est une frontiere produit, pas un detail technique.
- Le CV Builder devient le centre prioritaire du produit.
- La simplification UI ne change pas la regle fondamentale : le frontend reste
  client-only et les decisions produit restent backend-owned.
