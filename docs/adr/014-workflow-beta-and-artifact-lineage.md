# ADR 014 - Workflow Beta et lineage des artefacts

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Le Workflow reliait deja plusieurs objets produit, mais son niveau de maturite
UX ne justifiait pas de le presenter comme une surface stable. Les audits ont
montre que l'utilite principale du Workflow etait la coherence des liens entre
offre, CV, rapport ATS, lettre de motivation et tracker.

Il fallait donc renforcer le modele job-aware et assumer un statut Beta visible.

## Decision

### 1. Workflow reste visible mais marque Beta

Workflow reste accessible et present dans la navigation, mais son badge Beta
doit etre explicite, y compris visuellement comme exposant dans les surfaces
produit.

Consequence :

- l'utilisateur comprend que le flow est utile mais encore en maturation ;
- le produit ne promet pas une automatisation finale trop tot ;
- les futurs changements UX restent compatibles avec ce statut.

### 2. Les artefacts deviennent job-aware

Les requetes et reponses critiques doivent transporter les identifiants utiles :

- `job_id`
- `resume_id`
- `opportunity_id`

Le scoring ATS et la generation de lettre doivent persister le `job_id` lorsque
disponible et retourner l'ID durable de l'artefact cree.

Consequence :

- History peut relier job ↔ ATS ↔ lettre ↔ workflow ↔ tracker ;
- Workflow peut filtrer et valider les artefacts coherents ;
- les incoherences deviennent detectables et reparables.

### 3. History devient la surface d'audit transversale

Le ledger d'activite unifie doit exposer :

- jobs scrapes ;
- revisions de CV ;
- rapports ATS ;
- lettres de motivation ;
- opportunites Workflow ;
- evenements Tracker ;
- runs LLM.

Consequence :

- l'utilisateur peut reconstruire la lignée d'une candidature ;
- les actions IA restent auditables ;
- Workflow n'a pas besoin de devenir une surface d'historique complete.

## Verification

Tests backend cibles :

```bash
uv run pytest tests/test_history_api.py tests/test_workflows_api.py tests/test_ats_score.py -q
```

Resultat :

```text
12 passed
```

## Consequences

- Workflow reste en Beta tant que le filtrage job-aware, les recovery paths et
  la checklist "pret a candidater" ne sont pas stabilises.
- Les artefacts persistants deviennent le socle des parcours Markdown PDF,
  History et Tracker.
- La promotion hors Beta devra etre une decision explicite ulterieure.
