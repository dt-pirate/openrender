# Agent Usage

Use openRender as a local-first handoff layer for generated media.

When a human is working through an AI coding agent, the user-facing request can stay simple:

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

## Skill Setup

Use an openRender skill when a coding agent needs repeatable local instructions for the CLI workflow. The skill is not a hosted marketplace feature. It is a local instruction layer that teaches the agent to use compact JSON, read-only wire maps, dry-runs, verification, reports, and rollback before editing game code.

Ask the agent in natural language:

```text
Install the openRender skill for this repository.
Preview the instruction files first. If the plan is safe, install it for my current agent and explain what changed.
```

The agent should translate that request into:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

Use `codex`, `cursor`, `claude`, or `all` for `--platform`. Existing instruction files are protected unless `--force` is passed.

`install-agent` can write `AGENTS.md`, `.cursor/rules/openrender.md`, or `.claude/openrender.md`. Review dry-run output before writing files.

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
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --manifest-strategy merge --install --json
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
- Generated sprite handoff uses safe `--background-policy auto` cutout by default.
- Use `--background-policy preserve` to keep the original background, or `--background-policy remove` / `--remove-background` to force cutout.
- Use default `--manifest-strategy merge` for cumulative manifests; use `replace` for one-entry manifests and `isolated` when no shared manifest should be written.
- Use `--quality strict` or `verify --strict-visual` when likely visual transparency problems should fail the run.
- Use `verify`, `report`, `explain`, and `diff` with `--compact` when you only need status, next actions, rollback information, and compact tables.
- Avoid `--force` unless the user accepts overwriting generated destinations.
- Use `rollback --run latest --json` only for openRender install outputs.
- Do not enable upload, telemetry, sync, login, billing, or cloud report assumptions.

See the public LLM reference: https://docs-gamma-orcin.vercel.app/llm-reference.html
