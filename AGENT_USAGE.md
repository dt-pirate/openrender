# Agent Usage

Use openRender as a local-first handoff layer for generated media.

When a human is working through an AI coding agent, the user-facing request can stay simple:

```text
Install openRender for this project, then use it to add the generated game art to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

The command sequence and rules below are the agent reference for carrying out that request safely.

Recommended sequence:

```bash
openrender context --json
openrender context --json --compact
openrender context --json --wire-map
openrender scan --json
openrender doctor --json
openrender install-agent --platform all --dry-run --json
openrender plan sprite --from tmp/asset.png --target phaser --id asset.id --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --dry-run --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --install --json
openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
```

Rules:

- Prefer JSON output for agent workflows.
- Start with `context --json` to collect the minimal handoff before reading broadly.
- Use `context --json --compact` for the shortest project handoff.
- Use `context --json --wire-map` to find read-only asset wiring candidates before editing game code.
- Use `install-agent --platform codex|cursor|claude|all --dry-run --json` before writing local agent instructions.
- Run a dry run before install and inspect `installPlan.files`.
- Use `verify`, `report`, `explain`, and `diff` with `--compact` when you only need status, next actions, rollback information, and compact tables.
- Avoid `--force` unless the user accepts overwriting generated destinations.
- Treat generated manifests as current-result files; they are not automatically merged with older manifest entries.
- Use `rollback --run latest --json` only for openRender install outputs.
- Do not enable upload, telemetry, sync, login, billing, or cloud report assumptions.

See `docs/LLM-OPTIMIZED-REFERENCE.md` for the compact LLM handoff reference.
