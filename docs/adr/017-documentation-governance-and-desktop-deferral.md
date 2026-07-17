# ADR 017 - Gouvernance documentaire et report Desktop/Tauri

Date : 17 juillet 2026

## Statut

Accepte

## Contexte

Apres plusieurs runs de consolidation, la documentation ne refletait plus
exactement l'etat du produit. Certaines docs parlaient encore de phases
anciennes, d'autres references pointaient vers des fichiers absents, et le plan
Desktop/Tauri risquait de concurrencer le travail plus urgent sur Docker,
Workflow Beta, Guide et i18n.

## Decision

### 1. Documenter les runs de consolidation dans les docs existantes

Les docs de statut et roadmap doivent separer les runs recents :

- Runtime/CV Builder ;
- UI/theme/francais-first ;
- Workflow/History ;
- Docker release one-command ;
- Guide/README/docs publiques.

Consequence :

- l'historique reste lisible ;
- les prochaines actions ne sont pas melangees avec les phases deja terminees ;
- les docs restent proches du format existant.

### 2. Ajouter la checklist QA MVP1 manquante

`docs/mvp1-qa-checklist.md` devient la checklist canonique pour les controles
manuels MVP1.

Consequence :

- les references existantes ne pointent plus vers un fichier absent ;
- les controles Runtime, CV Builder, ATS, Markdown, Workflow, Tracker, History,
  UI et self-hosting sont centralises.

### 3. Reporter Desktop/Tauri

Tauri reste le choix recommande pour Desktop, mais la phase est reportee.

Priorites avant Desktop :

1. Docker self-hosted stable.
2. Markdown PDF + lettres persistantes.
3. Simplification ATS/Tracker.
4. Workflow Beta mature.
5. i18n francais-first centralise.
6. Guide utilisateur plus contextualise.

Consequence :

- le projet ne multiplie pas les surfaces de distribution trop tot ;
- Docker reste le chemin technique/developpeur prioritaire ;
- Desktop pourra rester un shell fin au lieu de devenir un deuxieme backend.

## Verification

Docs mises a jour :

- `docs/mvp1-status.md`
- `docs/roadmap.md`
- `docs/self-hosting.md`
- `docs/local-development.md`
- `docs/ui-system.md`
- `docs/architecture.md`
- `docs/desktop.md`
- `docs/adr/009-self-hosting-docker.md`
- `docs/mvp1-qa-checklist.md`

Check effectue :

```bash
git diff --check
```

## Consequences

- Les prochaines phases sont explicites : Secondary Tools Simplification,
  Workflow Beta Maturity, I18n & Guide Experience, puis Desktop/Tauri.
- Les docs internes restent en francais.
- Le README public reste francais-first, avec le self-hosted one-command comme
  chemin d'installation principal.
