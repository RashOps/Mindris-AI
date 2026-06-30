# ADR 012 - Resume customization contract and open-source runtime hardening

Date : 30 June 2026

## Statut

Accepte

## Contexte

Apres l'ADR 011, le projet avait un shell UI unifie et un workflow local non-Docker propre, mais il manquait encore quatre blocs structurants :

- un vrai contrat de personnalisation de CV pilote par le backend ;
- des fonctions open-source differentiantes sans deplacer la logique metier dans le frontend ;
- un durcissement runtime local des microservices et de leurs operations ;
- une extension de theming avance qui reste compatible avec le principe "frontend client-only".

Les runs suivants ont introduit ces capacites a travers les phases 8, 9, 10 et 11.

## Decision

### 1. Le contrat de personnalisation du CV devient backend-owned

`cvData.global_settings` devient le point d'entree unique pour la personnalisation :

- `page`
- `layout`
- `typography`
- `colors`
- `sections`
- `locale`
- puis `advanced_css`

Le backend valide, migre et normalise ce contrat. Le frontend n'invente pas de defaults metier durables ; il charge le catalogue de personnalisation depuis l'API et ne fait qu'editer/persister ce contrat.

Consequence :

- le renderer, les exports et le builder partagent la meme source de verite ;
- les anciens champs plats restent migres pour compatibilite ;
- l'ATS strict et le one-page challenge sont imposes au niveau du contrat, pas du navigateur.

### 2. Le frontend reste un client d'API, y compris pour les fonctions avancees

Cette regle est maintenue explicitement pour tout ce qui a ete ajoute depuis :

- bibliotheque de CV et drafts ;
- templates et personnalisation ;
- exports ouverts ;
- versioning et comparaison de revisions ;
- selection des providers IA ;
- import PDF et scoring ATS ;
- CSS avance.

Le navigateur conserve de l'etat UI local, mais ne devient pas un service de transformation, de rendu ou de validation metier.

Consequence :

- les analyses, exports et rendus restent backend-driven ;
- le front peut etre remplace sans reecrire les regles metier ;
- le projet reste coherent avec un futur self-hosting open-source.

### 3. Les exports ouverts et semantiques restent generes par le backend

Le systeme expose maintenant des exports reutilisables depuis l'API Gateway :

- JSON
- Markdown
- HTML
- DOCX
- LaTeX
- Typst

Le renderer reste responsable du PDF haute fidelite et des previews visuelles.

Consequence :

- les formats semantiques ignorent le styling avance non essentiel ;
- les pipelines Git, curl, versioning et self-hosting sont facilites ;
- le PDF garde son chemin dedie sans contaminer les exports texte.

### 4. La differenciation open-source v1 est construite autour du modele de resume persiste

Les fonctions suivantes sont adoptees comme prolongement direct du modele `ResumeRecord.data_json` :

- versioning simple par snapshots ;
- comparaison semantique de revisions ;
- mode `one_page_challenge` ;
- support LaTeX/Typst ;
- local-first / BYOK / Ollama durci.

Ces fonctions reutilisent le meme contrat de resume, au lieu d'introduire de nouveaux stores ou services lateraux.

Consequence :

- pas de divergence entre edition, preview et export ;
- les futures features multilingues ou templates communautaires peuvent s'appuyer sur la meme base ;
- l'etat produit reste auditable dans SQLite et exportable.

### 5. Le runtime local est durci par operations legeres, pas par complexite infra

Les services adoptent un niveau de robustesse intermediaire :

- health/readiness explicites ;
- OpenAPI publique pour API Gateway et renderer ;
- logging structure Python et Bun ;
- monitoring runtime leger en memoire ;
- startup gate frontend ;
- dual ingestion PDF : `llama-parse` ou mode local.

Consequence :

- le dev local et le self-hosting sont plus predicibles ;
- les erreurs de demarrage sont visibles avant exposition de l'UI ;
- l'operation reste legere, sans stack d'observabilite lourde ni nouveau service d'infrastructure.

### 6. Le CSS avance est autorise, mais uniquement a travers une frontiere de securite renderer-side

Le theming avance est ajoute sous la forme d'un bloc `advanced_css` dans `global_settings`.

Regles retenues :

- l'API Gateway persiste et rejette les patterns grossierement dangereux ;
- le renderer est la frontiere d'execution finale ;
- le CSS est sanitize puis applique uniquement dans le Shadow DOM du CV ;
- les regles hors scope, imports distants, `url(...)`, `expression(...)` et constructions equivalentes sont rejetees ou retirees ;
- des warnings non bloquants sont exposes au lieu de casser preview/export.

Consequence :

- le theming expert devient possible sans transformer le frontend en moteur de rendu ;
- les previews et PDFs utilisent le meme chemin de sanitation ;
- les exports semantiques restent independants du CSS custom.

## Consequences globales

- Mindris AI est maintenant structure comme un studio de CV backend-driven, extensible et self-hostable.
- Le contrat de personnalisation est assez riche pour porter les prochaines evolutions produit.
- Le principe architectural cle reste intact : le frontend orchestre, le backend decide, le renderer applique.
- Les prochaines phases peuvent viser proprement :
  - systeme multilingue complet ;
  - templates communautaires plus profonds ;
  - extensions open-source power-user autour des variantes de CV.
