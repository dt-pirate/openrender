# Agent Usage

Use openRender as a local-first handoff layer for generated media.

Recommended sequence:

```bash
openrender context --json
openrender scan --json
openrender doctor --json
openrender install-agent --platform all --dry-run --json
openrender plan sprite --from tmp/asset.png --target phaser --id asset.id --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --dry-run --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --install --json
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
```

Rules:

- Prefer JSON output for agent workflows.
- Start with `context --json` to collect the minimal handoff before reading broadly.
- Use `install-agent --platform codex|cursor|claude|all --dry-run --json` before writing local agent instructions.
- Run a dry run before install and inspect `installPlan.files`.
- Avoid `--force` unless the user accepts overwriting generated destinations.
- Treat generated manifests as current-result files; they are not automatically merged with older manifest entries.
- Use `rollback --run latest --json` only for openRender install outputs.
- Do not enable upload, telemetry, sync, login, billing, or cloud report assumptions.

See `docs/LLM-OPTIMIZED-REFERENCE.md` for the compact LLM handoff reference.
