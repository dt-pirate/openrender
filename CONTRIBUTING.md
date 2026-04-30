# Contributing

openRender Developer Kit v0.0.1 is local-first. Keep changes aligned with the Developer Kit scope:

- Prefer local deterministic behavior over cloud services.
- Keep the first target Vite + Phaser.
- Keep the first media scope image-only.
- Keep account, billing, licensing services, telemetry, and hosted APIs out of Developer Kit v0.0.1.
- Add tests for shared contracts, path safety, code generation, and CLI behavior.

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Package Boundaries

- `@openrender/core` owns shared models and safe project filesystem helpers.
- `@openrender/cli` owns command parsing and orchestration.
- `@openrender/harness-visual` owns deterministic visual processing.
- `@openrender/adapter-phaser` owns Phaser/Vite output generation.
- `@openrender/reporter` owns local report and preview generation.
- `@openrender/doctor` owns environment diagnostics.

Do not add cloud, billing, auth, or provider integration code to these Developer Kit packages.
