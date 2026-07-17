# ADR 009 : Self-hosting Docker open-source

**Etat :** ACCEPTE  
**Date :** 24 Juin 2026  
**Auteur :** Codex  
**Projet :** Mindris AI

---

## 1. Contexte

Le MVP1 est testable localement avec l'API FastAPI, le renderer Bun/Elysia et le frontend Next.js. Pour rendre le projet plus credible en open-source, le lancement self-hosted doit etre documente, verifiable et reproductible depuis un fresh clone.

---

## 2. Decisions

### 2.1 Utiliser Docker Compose comme chemin self-hosting principal

**Decision :** Conserver `docker-compose.yml` comme orchestration locale des trois services :

- `api-gateway`
- `renderer`
- `web`

**Consequence :**
- Les ports publics restent `3000`, `8000`, `4000`.
- Les utilisateurs peuvent lancer le MVP1 avec `docker compose up --build`.

### 2.2 Ajouter des healthchecks de service

**Decision :** Ajouter des healthchecks Compose sur :

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:4000/`
- `http://127.0.0.1:3000/`

**Consequence :**
- `web` attend que `api-gateway` et `renderer` soient healthy.
- `api-gateway` attend que `renderer` soit healthy.

### 2.3 Baked public env pour Next.js

**Decision :** Passer uniquement `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_RENDERER_URL` comme build args et variables runtime du container web.

**Justification :**
- Next.js incorpore les variables `NEXT_PUBLIC_*` au build.
- En self-hosting local, ces URLs doivent rester en `localhost` parce que le navigateur s'execute sur la machine hote.
- La frontière d'authentification reste backend-owned: le navigateur local repose sur le loopback, pas sur une clé publique embarquée.

### 2.4 Proteger le build context

**Decision :** Ajouter des `.dockerignore` pour la racine, le frontend et le renderer.

**Consequence :**
- Les builds Docker n'envoient pas `.env`, `storage`, `logs`, `node_modules`, `.next` ou caches locaux.

### 2.5 Ajouter une documentation et un smoke script self-hosting

**Decision :** Ajouter :

- `docs/self-hosting.md`
- `scripts/smoke_self_hosting.sh`

**Consequence :**
- Le chemin fresh clone -> `.env` -> `docker compose up --build` -> smoke check est documente.
- Les checks post-lancement sont repetables.

---

## 3. Verification

Verifications effectuees :

| Verification | Resultat |
| :--- | :--- |
| `./scripts/docker_local.sh doctor` | OK |
| `docker compose config --quiet` | OK |
| `sh -n scripts/smoke_self_hosting.sh` | OK |
| Backend smoke MVP1 | OK |
| `cd apps/web && bun run lint` | OK |
| `cd apps/web && bun run typecheck` | OK |
| `cd apps/web && bun run build` | OK |
| `cd services/renderer && bun run typecheck` | OK |
| `cd services/renderer && bun run build` | OK |

Note : `docker compose up --build` peut necessiter le reseau pour telecharger les images de base et les dependances. Cette verification n'a pas ete forcee dans l'environnement courant.

---

## 4. Consequences

- Le projet dispose d'un chemin self-hosting documente.
- Les utilisateurs open-source ont un smoke script apres lancement.
- Les secrets locaux restent exclus des contexts Docker et de Git.
- Les prochaines phases peuvent traiter les exports ouverts et l'ATS avance sans melanger ces sujets avec l'infra.
