# ADR 018 - Polish produit des outils secondaires

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Apres la stabilisation RuntimeGate, CV Builder, History et Workflow Beta, les
outils secondaires restaient utilisables mais encore trop heterogenes :

- Markdown PDF ne rendait pas assez clairement le lien entre lettre persistante,
  version et export PDF ;
- ATS Score et Tracker etaient encore charges visuellement, avec des libelles
  techniques ou anglais ;
- Workflow Beta exposait les liens backend mais ne montrait pas assez clairement
  ce qui manquait pour candidater ;
- la landing page restait trop marketing par rapport a l'esprit local-first et
  backend-owned du produit ;
- les textes globaux etaient disperses dans les composants.

Le projet doit rester accessible a des utilisateurs non techniques sans
deplacer la logique metier dans le frontend.

## Decision

### 1. Finaliser le parcours lettres persistantes -> Markdown PDF

Markdown PDF devient capable d'ouvrir une lettre existante depuis History ou
Workflow, de conserver son `cover_letter_id`, son `job_id`, et d'enregistrer une
nouvelle version.

Consequence :

- le parcours job -> lettre -> PDF est explicite ;
- History et Workflow deviennent des points d'entree vers l'edition PDF ;
- la persistance reste backend-owned.

### 2. Simplifier ATS Score et Tracker

ATS Score et Tracker sont nettoyes en priorite :

- libelles francais-first ;
- etats vides et erreurs plus lisibles ;
- composants theme-aware ;
- suppression des surfaces mortes non utilisees ;
- verification mobile pour eviter les debordements.

Consequence :

- l'utilisateur comprend mieux les CTA ;
- l'interface reste plus calme ;
- le frontend ne gagne pas de logique metier durable.

### 3. Maturer Workflow Beta sans le rendre stable artificiellement

Workflow reste marque Beta, mais l'interface expose maintenant :

- les opportunites actives ;
- le filtrage job-aware des artefacts ;
- une checklist `CV / ATS / Lettre / Tracker` ;
- l'etat d'integrite backend ;
- les actions de liaison et de reparation encadrees.

Consequence :

- Workflow devient utile pour controler une candidature ;
- le badge Beta reste honnete ;
- les liens restent valides par les contrats backend.

### 4. Centraliser un socle de copy produit

Un dictionnaire `PRODUCT_COPY` est ajoute pour les textes globaux :

- nom/tagline ;
- workspace ;
- navigation ;
- descriptions d'outils ;
- configuration et services locaux.

Consequence :

- la future i18n EN est plus simple ;
- les textes visibles les plus transverses ne sont plus disperses ;
- le produit reste francais-first.

### 5. Repositionner la landing

La landing est alignee avec le produit reel :

- local-first ;
- backend-owned ;
- workspace de candidature ;
- lignee offre -> CV -> ATS -> lettre -> tracker ;
- promesses moins marketing.

Consequence :

- la page publique explique mieux ce que fait Mindris ;
- le discours est coherent avec les docs internes et l'architecture.

## Verification

Validations effectuees pendant le run :

```bash
cd apps/web && bun run typecheck
cd apps/web && bun run lint
cd services/renderer && bun run typecheck
cd services/renderer && bun run build
uv run pytest tests/test_drafts_api.py tests/test_history_api.py tests/test_workflows_api.py tests/test_workflow_events.py -q
```

Verifications navigateur Playwright Python :

- `/`
- `/dashboard`
- `/tools/markdown`
- `/tools/ats-score`
- `/tools/tracker`
- `/tools/workflow`
- `/tools/guide`

Viewports verifies selon les lots :

- `1600 x 900`
- `390 x 844`

Resultat :

- pas d'erreurs console bloquantes ;
- pas de debordement horizontal detecte ;
- captures temporaires stockees dans `.screenshots/`.

## Consequences

- Les outils secondaires sont mieux alignes avec le CV Builder.
- Workflow Beta peut rester visible comme surface de controle, pas comme feature
  stable finale.
- Le frontend reste une surface d'operation : les contrats durables restent
  backend-owned.
- Le prochain refactor utile pourra decouper les composants trop longs sans
  changer le comportement produit.
