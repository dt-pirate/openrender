# openRender LLM Reference

This is the compact reference for AI coding agents using openRender in a local game project.

## First Commands

```bash
openrender context --json
openrender context --json --compact
openrender context --json --wire-map
openrender doctor --json
openrender compile sprite --from tmp/asset.png --target phaser --id asset.id --dry-run --json
```

Use `context --json` as the first handoff. It reports the detected target, local paths, latest run summary, overwrite risks, and recommended next actions without reading the whole repository.

Use `context --json --compact` when the agent only needs the shortest useful handoff. Use `context --json --wire-map` to find read-only asset wiring candidates before editing game code.

## Safe Install Rule

Before installing, run:

```bash
openrender compile sprite --dry-run --json
```

Inspect `installPlan.files` before writing files. By default, install refuses to overwrite existing destination files. Use `--force` only after the user confirms that overwriting generated manifests or helper files is acceptable.

Generated manifest files are written from the current compile result. They are not automatically merged with older manifest entries. If installing multiple assets, either regenerate the manifest from the intended asset set, manage separate runs carefully, or confirm the overwrite before using `--force`.

## Agent Setup

Install local agent instructions with a dry run first:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

Supported platforms are `codex`, `cursor`, `claude`, and `all`. Existing files are protected unless `--force` is passed.

## MCP Tool Set

The local MCP metadata package exposes a deliberately small JSON-only surface:

- `context`
- `scan`
- `plan`
- `compile`
- `install`
- `verify`
- `rollback`
- `report`
- `explain`
- `install-agent`

Agents should use MCP prompts as workflow hints, not as permission to skip dry-run, verification, or overwrite checks.

## Verification And Rollback

After install:

```bash
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
```

For short agent output, add `--compact` to `verify`, `report`, `explain`, and `diff`. Compact output keeps status, next actions, rollback information, and compact `{ columns, rows }` tables.

Use rollback only for files in a recorded openRender install plan:

```bash
openrender rollback --run latest --json
```

Rollback does not revert game code edits made separately by an agent.

## Local Core Boundary

The Developer Kit is local-first. It works with image assets for Phaser, Godot, LOVE2D, PixiJS, and Canvas projects. The local core does not require accounts, billing, telemetry, cloud APIs, hosted playgrounds, model provider calls, or remote artifact sync.
