# ADR 031 — Gateway de confidentialité et contrat local-first vérifiable

- Statut : accepté
- Date : 2026-07-27
- Scope : C — confidentialité et providers externes

## Contexte

Mindris conserve les données et les décisions métier localement, mais le BYOK
permet d'utiliser des providers externes. Une clé privée ne rend pas un appel
anonyme : le provider connaît le compte, l'adresse réseau et ses propres
métadonnées techniques. La promesse produit doit donc porter sur un contrôle
vérifiable, pas sur un anonymat absolu.

Plusieurs chemins pouvaient construire directement un client CrewAI, LiteLLM,
LlamaCloud ou un proxy de scraping. Les filtres appliqués par les routes
n'étaient pas une frontière suffisante.

## Décision

Tout appel externe lié à l'intelligence ou au scraping cloud traverse
`OutboundPrivacyGateway`.

Le gateway :

1. identifie provider, modèle et tâche ;
2. charge une politique versionnée ;
3. minimise le payload depuis un registre de classification backend ;
4. supprime les secrets et catégories interdites ;
5. pseudonymise dans une table éphémère à durée de vie limitée ;
6. détecte localement PII, données sensibles et prompt injections ;
7. exige un consentement exact `provider × tâche × mode × version` ;
8. appelle l'adapter seulement après autorisation ;
9. contrôle la réponse et refuse les placeholders inconnus ;
10. réhydrate localement puis détruit le mapping ;
11. écrit un manifeste sans contenu dans le registre local.

La factory LLM retourne un client CrewAI enveloppé. Les appels LiteLLM,
LlamaCloud, Scrape.do et ScrapingBee possèdent la même frontière explicite.
Un test de garde inventorie les sites d'appel SDK autorisés.

## Modes

- `local_strict` : mode par défaut, providers IA locaux seulement, proxy cloud
  désactivé, télémétrie connue désactivée ;
- `private_cloud` : minimisation et pseudonymisation obligatoires ;
- `full_context_cloud` : contexte étendu volontaire, consentement renforcé.

Le mode est persisté par le backend dans `runtime-config.json`. Le frontend ne
peut ni déduire ni contourner la politique.

## Consentement et transparence

Une absence ou révocation de consentement produit HTTP `428` avec un manifeste
safe. Le client présente alors « Ce qui quitte votre machine » et peut
continuer, réduire vers Cloud privé, revenir au local ou annuler.

Les déclarations de rétention sont indicatives, datées et liées à une source
provider. Mindris ne prétend jamais activer le ZDR : l'éligibilité du compte
doit être vérifiée chez le provider.

## Persistance

Le registre externe conserve uniquement provider, modèle, tâche, catégories,
volumes approximatifs, versions de politique, consentement, résultat, date et
hash. Il exclut prompt, réponse, mapping et clé API. L'utilisateur peut
l'exporter ou le vider indépendamment des consentements.

## Réseau

Le contrôle applicatif bloque les destinations providers en mode strict.
`docker-compose.privacy-strict.yml` ajoute une isolation réseau `internal`
optionnelle. Elle bloque également le scraping d'offres publiques : ce profil
est destiné aux sessions totalement hors ligne.

L'installation locale peut activer le profil Ollama. Le téléchargement d'un
modèle reste une action explicite ; aucun secret n'est accepté dans la ligne de
commande.

## Conséquences

- le premier appel cloud exige une interaction supplémentaire ;
- une politique modifiée invalide les anciens consentements ;
- LlamaParse exige `full_context_cloud`, car un PDF brut ne peut pas être
  pseudonymisé de manière fiable avant son upload ;
- le modèle local reste l'option adaptée aux données hautement sensibles ;
- le registre fournit une preuve sans devenir une copie des données.

## Alternatives rejetées

- promettre l'anonymat grâce au BYOK ;
- filtrer uniquement dans le frontend ;
- journaliser prompts et réponses pour faciliter le debug ;
- faire décider la redaction par un LLM externe ;
- activer implicitement un provider ou télécharger un modèle à l'installation.
