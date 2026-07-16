# Mindris Desktop

This directory is reserved for the future desktop package.

The desktop app should be a thin Tauri shell over the existing Mindris runtime:

- UI: `apps/web`
- API/state/secrets: `services/api-gateway`
- PDF/HTML rendering: `services/renderer`

No product logic should be implemented in the desktop shell. If a feature affects
resume data, jobs, ATS reports, cover letters, workflow state, exports or secrets,
it belongs in backend contracts first.

## Development target

Initial desktop development should point to the local web runtime:

```bash
./scripts/dev_local.sh
```

Then open:

```text
http://127.0.0.1:3000
```

## Packaging target

The first production-grade package should decide between:

1. launching native local services; or
2. supervising the Docker Compose stack.

The Docker path is simpler for power users. Native service supervision is better
for non-technical desktop users, but requires more installer work.
