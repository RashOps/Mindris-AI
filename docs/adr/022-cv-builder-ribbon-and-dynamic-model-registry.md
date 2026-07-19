# ADR 022 - Ruban du CV Builder et registre dynamique des modèles IA

Date : 19 juillet 2026

## Statut

Accepté

## Contexte

Le header du CV Builder affichait simultanément les contrôles du document, de
l’offre, de l’IA et des exports. En mode Avancé, il occupait 279 px sur une vue
desktop de 900 px et 606 px sur une vue mobile de 844 px. L’éditeur devenait
difficile à lire, particulièrement pour un utilisateur non technique.

La liste des modèles IA était par ailleurs recopiée dans le service
Intelligence, les schémas API et un composant frontend. Une dépréciation chez
OpenAI, Groq, Gemini, Mistral ou Ollama nécessitait donc une livraison de code.

## Décision

### Ruban CV Builder

Le CV Builder adopte un ruban réductible sur desktop :

- une barre permanente conserve le CV actif, les modes et le statut de
  sauvegarde ;
- les outils sont séparés en tabs `Principal`, `Adapter` et `Document` ;
- `Simple`, `Normal` et `Avancé` définissent la disponibilité des contrôles,
  mais ne provoquent plus leur affichage simultané ;
- le ruban peut être réduit sans masquer Structure, Style ou la preview.

Sur mobile, une barre de commandes compacte conserve le CV, l’offre et
l’action principale. Les outils secondaires sont placés dans une bottom sheet
scrollable. Cet état est uniquement de présentation : aucune règle métier ne
quitte le backend.

### Registre des modèles

Le backend Intelligence devient la source de vérité des modèles :

- un adaptateur découvre les modèles de chaque provider via son API officielle ;
- seuls les modèles compatibles avec la génération conversationnelle sont
  publiés ;
- un cache persistant conserve le dernier catalogue valide ;
- les entrées sont dédupliquées par `provider/id`, y compris lors de la lecture
  d'un cache créé par une version antérieure ;
- un échec réseau marque les données comme obsolètes sans vider les sélecteurs ;
- un petit catalogue bootstrap permet le démarrage hors ligne ;
- seuls les providers configurés sont contactés ;
- les secrets ne sont ni retournés ni inclus dans les erreurs ;
- les fallbacks sont résolus et journalisés côté backend sans modifier la
  préférence enregistrée par l’utilisateur.

`GET /api/v1/llm/catalogue` lit le snapshot sans réseau.
`POST /api/v1/llm/catalogue/refresh` déclenche une synchronisation explicite.
L’écran Configuration expose cette action et la lance après l’enregistrement
de nouvelles clés.

## Conséquences

- Le CV Builder conserve une hauteur stable de 153 px en desktop et 105 px en
  mobile ; le ruban desktop réduit mesure 49 px.
- Le frontend consomme un seul contrat de catalogue et ne contient plus de
  liste propre à Job Insights.
- Une dépréciation est absorbée au prochain rafraîchissement, avec conservation
  du dernier état exploitable en cas de panne du provider.
- Le filtrage heuristique reste volontairement prudent : les métadonnées de
  capacités diffèrent selon les providers et devront évoluer avec leurs API.

## Vérification

- tests unitaires des cinq parseurs providers ;
- tests du cache, des erreurs, des providers non configurés et des fallbacks ;
- tests API du snapshot et du rafraîchissement filtré ;
- lint et typecheck frontend ;
- audit Playwright en `1600x900` et `390x844` couvrant tabs, modes, réduction,
  bottom sheet, débordement et erreurs console.
