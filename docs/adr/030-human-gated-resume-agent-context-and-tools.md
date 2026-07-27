# ADR 030 - Contexte CV canonique et agents sous validation humaine

Date : 27 juillet 2026

## Statut

Accepté

## Contexte

Les agents ATS, lettre et adaptation construisaient chacun une représentation
textuelle différente du CV. Ils ne partageaient ni révision source, ni registre
de preuves, ni contrat de modification. L'ancien endpoint
`/cv/patch-from-bullets` pouvait demander au modèle un dictionnaire libre sans
garantir la conservation des faits ou une validation humaine.

L'ADR 029 a rendu le renderer observable. Il restait à donner aux agents un
contexte commun et une surface d'action bornée, sans leur donner accès au SQL,
aux secrets ou au CSS brut.

## Décision

### Snapshot canonique

`ResumeContextSnapshot` est construit côté backend à partir d'une révision
persistée. Il contient l'identité séparée, le contenu sémantique, le job, le
template et ses capacités, les réglages normalisés, le manifeste, le registre
de preuves et la politique de confidentialité.

- Le contenu et les réglages sont gelés récursivement pendant un run.
- Chaque fait possède un identifiant déterministe.
- ATS, lettre, strategist, evaluator et composition consomment ce contrat.
- Les vues cloud retirent les champs d'identité et les preuves associées.
- Les résultats conservent `resume_id`, `revision` et `content_hash`.

### Outils autorisés

Les agents opèrent uniquement à travers dix outils backend déclarés dans
`resume_agent_tools.py` :

- lecture du snapshot, d'une section, du job et des preuves ;
- proposition et validation d'un patch ;
- preview et inspection du rendu ;
- comparaison de révisions ;
- commit d'une révision.

Chaque outil possède un schéma Pydantic, une permission, un timeout, une limite
d'entrée/sortie et un événement d'audit. Les clés et secrets sont masqués. Le
commit exige une révision de base et `human_approved=true`.

### Patches métier et boucle bornée

Un `ResumePatchProposal` ne contient que des opérations métier typées :
champs, bullets, sections, visibilité, tokens supportés, template, densité et
sauts de page. Les affirmations factuelles exigent une preuve existante. Les
suppressions significatives exigent une confirmation explicite.

La boucle d'inspection :

1. valide le patch ;
2. rend une preview temporaire ;
3. inspecte le manifeste ;
4. autorise au plus une correction de composition ;
5. remet le diff à l'utilisateur ;
6. ne persiste jamais implicitement.

L'agent de composition raisonne sur les pages, débordements, colonnes et
capacités du template. Il ne génère pas de CSS.

### Confidentialité, lignée et UI

- ATS reçoit toujours une vue sans identité.
- Une lettre cloud utilise des marqueurs pseudonymisés, réhydratés localement.
- Les rapports ATS et lettres conservent la révision du CV et deviennent
  explicitement obsolètes après une nouvelle révision.
- Workflow reste Beta et signale les artefacts manquants ou obsolètes.
- Une proposition conserve agent, provider, modèle, preuves, manifests,
  opérations, décision humaine et politique de confidentialité.
- Le CV Builder permet preview, acceptation partielle ou refus.
- Les statuts backend utilisent des `message_id` traduits en FR/EN par l'UI.

## Conséquences

- Aucun agent ne peut écraser silencieusement un CV.
- Une hallucination de diplôme, compétence, expérience, date ou métrique est
  rejetée lorsqu'elle ne cite pas une preuve du snapshot.
- Les modifications sont réversibles par les révisions existantes.
- Deux rendus peuvent coûter plus cher lorsqu'une preview avant/après est
  demandée ; le timeout et la correction unique bornent ce coût.
- L'ancien patch libre reste uniquement pour compatibilité et ne fait plus
  partie du parcours agent du CV Builder.

## Vérification

```bash
uv run pytest \
  tests/test_resume_agent_contracts.py \
  tests/test_resume_agent_tools.py \
  tests/test_resume_agent_loop.py \
  tests/test_resume_agent_artifact_lineage.py \
  tests/test_intelligence_eval_dataset.py

cd apps/web
bun run typecheck
bun run lint
bun test src/i18n/agent-i18n.test.ts \
  src/components/help/guide-content.test.ts
```

Le dataset `tests/fixtures/resume_agent_scope_b_eval.json` couvre les profils et
risques du Scope B. Les métriques sont définies dans
`services/intelligence/resume_agent_evaluation.py`.

## Relations

- ADR 014 pour Workflow Beta et la lignée des artefacts.
- ADR 023 pour l'adaptation fondée sur les preuves.
- ADR 024 pour l'i18n et le Guide.
- ADR 029 pour les manifests et contrats du renderer.

