# Confidentialité et providers externes

Ce document décrit le contrat du Scope C. Il complète
[ADR 031](./adr/031-outbound-privacy-gateway-and-verifiable-local-first.md).

## Ce que « local-first » signifie

Mindris stocke les CV, révisions, offres, lettres, rapports, secrets et journaux
sur l'instance exécutée par l'utilisateur. Le navigateur reste un client.

Local-first ne signifie pas qu'aucun réseau n'est jamais utilisé :

- le scraping ouvre l'URL publique choisie ;
- un provider cloud est utilisable volontairement ;
- le téléchargement d'un modèle Ollama utilise Internet une fois.

Pour interdire les appels IA externes, utilisez **Local strict**. Pour couper
également tout egress des conteneurs, ajoutez le profil Compose strict.
L'installation one-command lie par défaut tous les ports à `127.0.0.1`.

## Les trois modes

| Mode | IA externe | Traitement | Consentement |
| --- | --- | --- | --- |
| Local strict | bloquée | machine locale/Ollama | non requis |
| Cloud privé | autorisée | minimum + pseudonymisation | provider et tâche |
| Cloud contexte complet | volontaire | contexte étendu, secrets exclus | renforcé |

Le mode est backend-owned. En Local strict, la télémétrie prise en charge est
désactivée et les proxies Scrape.do/ScrapingBee sont ignorés.

## Données et politiques

Le registre `services/intelligence/privacy.py` versionne les identifiants,
contacts, localisations, profils sociaux, employeurs, établissements,
expériences, projets, données sensibles, offres publiques, secrets et textes
libres.

Chaque tâche possède une allowlist, un plafond et les catégories à
pseudonymiser. ATS ne reçoit pas l'identité. Une lettre cloud reçoit des
placeholders. L'analyse d'offre ne reçoit que l'offre publique.

## Pseudonymisation

```text
Ada Lovelace       -> [CANDIDATE_NAME]
ada@example.com    -> [CANDIDATE_EMAIL]
Analytical Engines -> [EMPLOYER_1]
Paris              -> [CITY_1]
```

Le mapping vit uniquement en mémoire pendant l'exécution, expire, n'est jamais
journalisé et est détruit après réponse. Un placeholder inconnu ou un secret
dans la réponse fait échouer la requête.

La pseudonymisation réduit l'exposition mais ne rend pas le compte provider
anonyme. Le provider reçoit les métadonnées nécessaires au transport.

## Consentement

Avant le premier appel cloud, Mindris affiche provider, modèle, tâche,
catégories et raisons, exemples protégés, volume approximatif, rétention connue,
date de vérification et documentation officielle.

Un consentement est limité à la version courante de la politique. Il est
révocable dans **Configuration → Ce qui quitte votre machine**.

## Registre local

Le registre contient uniquement les métadonnées d'envoi. Depuis Configuration :

- **Exporter** télécharge `mindris-external-activity.json` ;
- **Vider** supprime les événements ;
- **Révoquer** interdit les futurs appels pour le scope concerné.

Les prompts, réponses, clés et mappings ne sont jamais exportés.

## Ollama

Installation self-hosted locale avec téléchargement explicite :

```bash
curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh \
  | MINDRIS_PRIVACY_MODE=local_strict \
    MINDRIS_DOWNLOAD_LOCAL_MODEL=true \
    MINDRIS_LOCAL_MODEL=llama3.2:3b \
    sh
```

Sous PowerShell, définissez les mêmes variables avant
`install_self_hosted.ps1`. La clé API Mindris est générée dans `.env`, jamais
passée dans la commande.

## Profil Docker sans egress

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.privacy-strict.yml \
  up -d
```

Le second fichier est téléchargé automatiquement par les installateurs Linux,
macOS et Windows.

Le réseau `internal` empêche aussi d'ouvrir les offres publiques. Revenez au
Compose standard pour scraper une URL, tout en gardant `local_strict` pour
l'inférence.

## Suppression

Le registre peut être vidé dans l'UI. Pour supprimer installation et données :

```bash
REMOVE_DATA=true ./scripts/uninstall_self_hosted.sh
```

Vérifiez le chemin `MINDRIS_HOME` avant une suppression complète.

## Limites

- la détection locale combine schéma, règles et regex sans promettre la
  perfection ;
- le contexte complet augmente volontairement le risque ;
- une fiche provider ancienne est signalée ;
- Mindris ne peut pas vérifier le ZDR réel du compte ;
- une offre ou un CV est une entrée non fiable et peut être rejeté lorsqu'une
  prompt injection est détectée.
