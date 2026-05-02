# Agent Usage

Use openRender as a local-first handoff layer for generated media.

Recommended sequence:

```bash
openrender scan --json
openrender doctor --json
openrender plan sprite --from tmp/asset.png --target phaser --id asset.id --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --dry-run --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --install --json
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
```

Rules:

- Keep `docs/` local-only and out of Git.
- Prefer JSON output for agent workflows.
- Run a dry run before install.
- Avoid `--force` unless the user accepts overwriting generated destinations.
- Use `rollback --run latest --json` only for openRender install outputs.
- Do not enable upload, telemetry, sync, login, billing, or cloud report assumptions.
