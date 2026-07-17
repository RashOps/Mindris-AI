# Desktop packaging plan

Date : 17 juillet 2026

Statut : reporte apres stabilisation Docker self-hosted, Workflow Beta, i18n et
guide utilisateur.

Mindris Desktop should be a thin local shell around the same product contracts as
the web app. It must not become a second backend or a second source of truth.

## Recommended stack

Use Tauri for the desktop package.

Reasons:

- small runtime footprint compared with Electron;
- native filesystem/process integration when needed;
- the existing Next.js UI can stay the only product interface;
- backend state, secrets and provider orchestration remain in Python/Bun services.

## Runtime model

```text
Tauri shell
  └─ loads Mindris Web UI
       └─ calls FastAPI through loopback
            ├─ owns product state and secrets
            ├─ calls intelligence/scraper services
            └─ calls Bun renderer for HTML/PDF
```

The desktop shell may:

- start and stop local services;
- open the UI;
- show runtime health;
- manage app window state;
- expose safe local file pickers.

The desktop shell must not:

- store raw provider secrets;
- implement ATS, cover-letter, scraping or export logic;
- bypass backend authorization boundaries;
- duplicate persistence rules from the API.

## Packaging phases

1. Ship Docker self-hosting as the stable deployment target. **Done** via GHCR
   and one-command install.
2. Stabilize secondary tools, Workflow Beta and i18n before adding another
   packaging surface.
3. Add a desktop development shell that points to `http://127.0.0.1:3000`.
4. Add service supervision for API and renderer.
5. Bundle the frontend as static/standalone assets if the Next.js runtime allows it.
6. Add signed installers after the local runtime is stable.

## Open decisions

- Whether Desktop starts Docker containers or native binaries.
- Whether the frontend is bundled or served by an embedded local web process.
- How backups/restores are exposed to non-technical users.
- Which OS targets are first-class: Linux and Windows first, macOS later.
- Whether the Windows path should supervise services natively or rely on Docker Desktop.
