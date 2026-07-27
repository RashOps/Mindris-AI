# Scope B - Agents capables d'interagir avec le CV

## État

Implémenté sur `feature/cv-agent-context-tools`.

## Contrats livrés

| Bloc | Source de vérité | Garantie |
| --- | --- | --- |
| Snapshot | `services/intelligence/resume_context.py` | contexte versionné, immuable, filtrable et prouvé |
| Patches | `services/intelligence/resume_patches.py` | opérations typées, conflits, preuves et suppressions contrôlées |
| Outils | `services/api-gateway/resume_agent_tools.py` | dix outils permissionnés, bornés et audités |
| Boucle | `services/intelligence/resume_agent_loop.py` | preview sans commit et une correction renderer maximum |
| Composition | `services/intelligence/composition_agent.py` | décisions de layout sans génération CSS |
| Persistance | migration SQLite 9 | propositions, audits et révisions des artefacts |
| UI | `JobInsightsPanel.tsx` | preview, diff, pages, sélection partielle et refus |
| Guide | `/tools/guide` | parcours visuel agents et confidentialité |
| Évaluation | `tests/fixtures/resume_agent_scope_b_eval.json` | cas FR/EN et risques d'hallucination/overflow |

## Parcours nominal

```text
CV persisté rN
  -> snapshot canonique + registre de preuves
  -> analyse de l'offre
  -> patch métier typé
  -> validation des preuves et références
  -> preview temporaire + manifeste
  -> diff présenté
  -> validation humaine totale ou partielle
  -> nouvelle révision rN+1
```

Un refus laisse le CV inchangé. Un conflit `base_revision`/révision courante
retourne une erreur 409. Les opérations non sélectionnées ne sont pas
appliquées.

## API opérable

- `GET /api/v1/resume-agents/tools`
- `POST /api/v1/resume-agents/tools/{tool_name}`
- `GET /api/v1/resume-agents/resumes/{resume_id}/proposals`
- `POST /api/v1/resume-agents/proposals/{proposal_id}/reject`

Les appels navigateur local suivent la frontière d'authentification existante.
Les orchestrateurs backend doivent fournir uniquement les permissions utiles à
leur tâche.

## Confidentialité

- `ollama` est considéré comme une exécution locale.
- `groq`, `gemini`, `openai` et `mistral` reçoivent une vue pseudonymisée.
- ATS ne reçoit jamais les champs d'identité.
- La lettre cloud utilise des placeholders d'identité et les remplace après le
  retour provider, avant persistance.
- Les prompts, secrets bruts et clés API ne sont pas conservés dans les audits.

Cette pseudonymisation réduit l'exposition mais ne rend pas le texte totalement
anonyme : les expériences, entreprises ou projets peuvent rester
ré-identifiants. L'utilisateur doit choisir le mode local pour la confidentialité
maximale.

## Limites connues

- Workflow reste Beta.
- La qualité des propositions dépend du provider, mais leur validité factuelle
  et structurelle reste contrôlée localement.
- La correction de composition est volontairement limitée à une itération.
- Les composants non liés au parcours agent poursuivent leur migration i18n
  progressive selon l'ADR 024.

