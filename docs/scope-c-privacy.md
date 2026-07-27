# Scope C — Confidentialité et providers externes

## État

Implémenté sur `feature/outbound-privacy-gateway`.

## Contrats livrés

| Exigence | Source de vérité | Garantie |
| --- | --- | --- |
| Classification | `services/intelligence/privacy.py` | registre CV et catégories versionnés |
| Politiques | `TASK_PRIVACY_POLICIES` | minimum autorisé par tâche |
| Gateway | `OutboundPrivacyGateway` | filtrage, consentement, réponse et audit |
| Pseudonymisation | `EphemeralPseudonymizer` | mapping mémoire, TTL et destruction |
| Providers | `provider_privacy.py` | informations datées, indicatives et sourcées |
| Consentements | `/api/v1/privacy/consents` | scope exact et révocation |
| Registre externe | `/api/v1/privacy/activity` | métadonnées uniquement |
| Réseau | `network_policy.py` | blocage cloud applicatif en Local strict |
| Docker strict | `docker-compose.privacy-strict.yml` | réseau interne sans egress |
| UX | `PrivacyConsentGate.tsx` | transparence avant le premier appel |
| Guide | `/tools/guide#privacy` | parcours visuel et animation désactivable |
| Décision | ADR 031 | promesse local-first vérifiable |

## Parcours cloud contrôlé

```text
requête produit
  -> politique backend par tâche
  -> minimisation des champs et preuves
  -> pseudonymisation éphémère
  -> détection locale PII/injection/secrets
  -> consentement provider × tâche × mode × version
  -> appel provider
  -> filtrage de la réponse
  -> réhydratation locale
  -> manifeste sans contenu
  -> destruction du mapping
```

Le mode `full_context_cloud` nécessite un acquittement de risque
supplémentaire. `ollama` n'est ni soumis au consentement cloud ni inscrit dans
le registre des activités externes.

## Preuves de contrôle

- Le mode est persisté dans la configuration backend.
- Les ports self-hosted sont liés à `127.0.0.1` par défaut.
- Le téléchargement d'un modèle Ollama est explicite.
- Les clés restent dans les slots backend write-only.
- Les consentements révoqués invalident immédiatement le scope concerné.
- Une politique modifiée rend les anciens consentements inapplicables.
- Une réponse contenant un secret, une donnée sensible nouvelle ou un
  placeholder inconnu est refusée.
- Les erreurs provider propagées sont sans contenu.

## Limites assumées

- La pseudonymisation réduit la ré-identification sans promettre l'anonymat.
- Le provider connaît le compte BYOK et les métadonnées de transport.
- Le contexte complet peut contenir des quasi-identifiants par choix explicite.
- Les fiches provider ne sont pas des conseils juridiques et deviennent
  visiblement anciennes après 180 jours.
- Le profil Docker strict désactive aussi le scraping d'offres publiques.

## Validation ciblée

```bash
uv run pytest \
  tests/test_privacy_core.py \
  tests/test_privacy_api.py \
  tests/test_privacy_llm_gateway.py \
  tests/test_privacy_scraper.py

cd apps/web
bun run typecheck
bun run lint
```
