# ADR 029 - Renderer CV observable et contrats versionnés

Date : 27 juillet 2026

## Statut

Accepté

## Contexte

Le CV Builder, la preview et le PDF partageaient le même moteur HTML, mais le
résultat restait opaque pour le backend et les futurs agents. Les classes CSS
internes formaient un contrat implicite, un template inconnu retombait
silencieusement sur Atlas et les déplacements de sections persistaient un
tableau complet sans contrôle de révision.

Les agents doivent pouvoir raisonner sur la place réellement occupée sans
connaître le CSS. Les CSS experts et communautaires ont parallèlement besoin
d'une frontière publique stable.

## Décision

- Le renderer publie quatre versions indépendantes :
  `renderer_engine_version`, `template_contract_version`,
  `selector_contract_version` et `render_manifest_version`.
- Chaque template déclare ses capacités. Un template inconnu ou incompatible
  est refusé avec une erreur exploitable ; aucun fallback silencieux n'est
  autorisé.
- Les sélecteurs publics reposent sur `data-cv-role`, `data-section-id`,
  `data-section-type`, `data-placement`, `data-order`, `data-page-break`,
  `data-display-mode` et `data-detail-level`.
- Le renderer mesure le DOM après les polices et deux frames de stabilisation,
  puis produit un `RenderManifest` non persisté lié au hash du payload.
- Preview, inspection et PDF passent par le même `renderDocument`.
- L'API Gateway résout un état déterministe selon la précédence système,
  template, CV persisté, overrides explicites et validation finale.
- Un déplacement de section est une intention backend révisionnée :
  insertion à un index ou permutation. Aucun contenu n'est écrasé.
- Les packages communautaires V1 restent importables comme formats legacy. Un
  package V2 doit déclarer les contrats V2 exacts.

## Conséquences

- Les agents pourront consommer une géométrie sémantique sans dépendre du DOM.
- Les changements de classes internes ne cassent plus les CSS utilisant le
  contrat public.
- Les opérations concurrentes reçoivent un conflit `409`.
- Une inspection nécessite Chromium et coûte plus cher qu'une génération HTML
  pure ; elle est donc exposée explicitement.
- Les coordonnées ne doivent jamais être réutilisées si le hash a changé.

## Vérification

```bash
uv run pytest tests/test_templates_api.py tests/test_resumes_api.py -q
cd services/renderer
bun run typecheck
bun test src/templates/contracts.test.ts src/templates/engine.test.ts \
  src/templates/manifest.test.ts src/pdf/template-export.test.ts
cd ../../apps/web
bun run lint
bun run typecheck
```

Voir aussi :

- [`docs/cv-renderer-contract.md`](../cv-renderer-contract.md)
- [`docs/custom-cv-css.md`](../custom-cv-css.md)
- ADR 020 pour le placement accessible des sections.
