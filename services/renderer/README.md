# Mindris Renderer

## Install

```bash
bun install
```

## Run

```bash
bun run start
```

The service listens on:

```text
http://localhost:4000
```

## Health and Readiness

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/openapi.json
```

Interactive docs:

```text
http://localhost:4000/docs
```

Expected readiness response:

```json
{
  "status": "ready",
  "service": "renderer"
}
```

## Checks

```bash
bun run typecheck
bun run build
```

## Logs

Le renderer ecrit des evenements structures JSONL dans :

```text
.logs/renderer.log
```
