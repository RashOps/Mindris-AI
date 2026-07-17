# Desktop packaging plan

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

1. Ship Docker self-hosting as the stable deployment target.
2. Add a desktop development shell that points to `http://127.0.0.1:3000`.
3. Add service supervision for API and renderer.
4. Bundle the frontend as static/standalone assets if the Next.js runtime allows it.
5. Add signed installers after the local runtime is stable.

## Open decisions

- Whether Desktop starts Docker containers or native binaries.
- Whether the frontend is bundled or served by an embedded local web process.
- How backups/restores are exposed to non-technical users.
- Which OS targets are first-class: Linux first, then macOS/Windows.
