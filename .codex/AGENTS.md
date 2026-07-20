# Personal Codex defaults

- Prefer RTK for noisy supported terminal commands.
- Run targeted tests before full test suites.
- Make the smallest safe change.
- Avoid unnecessary repository-wide exploration.
- Do not use subagents for simple or local tasks.
- Keep final responses under 8 lines unless details are requested.
- Never publish Docker images from a branch or pull request.
- Build Docker images once from `v*-rc.*`; promote stable and `latest` by the
  validated RC digest only, after Git ancestry and tree-equality checks.
- Never create extra release tags merely to rerun CI.
