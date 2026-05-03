# CLI Reference

Current local CLI command surface for Phaser, Godot, LOVE2D, PixiJS, and Canvas image asset workflows.

## Implemented Commands

```text
openrender init [--target phaser|godot|love2d|pixi|canvas] [--framework vite|godot|love2d] [--force] [--json]
openrender agent init --codex|--cursor|--claude [--force] [--json]
openrender install-agent [--platform codex|cursor|claude|all] [--dry-run] [--force] [--json]
openrender scan [--json]
openrender context [--json]
openrender doctor [--json]
openrender schema contract|output|report|install-plan|pack-manifest|media-p4
openrender pack list|inspect [packId] [--json]
openrender recipe list|inspect|validate [recipeId] [--json]
openrender plan sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas] [--frames n --frame-size WxH] [--json]
openrender detect-frames <path> [--frames n] [--json]
openrender normalize <path> [--preset transparent-sprite|ui-icon|sprite-strip|sprite-grid] [--out <path>] [--json]
openrender metadata audio|atlas|ui <path> [--target engine] [--id asset.id] [--json]
openrender smoke [--target phaser|godot|love2d|pixi|canvas] [--json]
openrender compile sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas] [--frames n --frame-size WxH] [--output-size WxH] [--install] [--force] [--dry-run] [--json]
openrender install [runId|--run latest] [--force] [--json]
openrender verify [runId|--run latest] [--json]
openrender report [runId|--run latest] [--open] [--json]
openrender report export [runId|--run latest] --format html|json [--out <path>] [--force] [--json]
openrender reports serve [--port 3579] [--once] [--json]
openrender explain [runId|--run latest] [--json]
openrender diff [runId|--run latest] [--json]
openrender rollback [runId|--run latest] [--json]
openrender --help
openrender --version
```

## Targets

| Target | Framework | Status |
|---|---|---|
| `phaser` | `vite` | Supported |
| `godot` | `godot` | Supported |
| `love2d` | `love2d` | Supported |
| `pixi` | `vite` | Supported |
| `canvas` | `vite` | Supported |
| `phaser` | `godot` | Rejected |
| `godot` | `vite` | Rejected |
| `love2d` | `vite` | Rejected |
| `love2d` | `godot` | Rejected |

## JSON-first Contract

Agent-facing commands should expose stable fields such as `ok`, `version`, `runId`, `target`, `engine`, `artifact`, `installPlan`, `agentSummary`, `recipe`, `verification`, `reportPath`, and `rollbackHint`.

`context --json` is the minimal handoff command for agents. It reports the detected target, local paths, latest run summary, overwrite risks, and recommended next actions.

## Image Handoff Commands

`detect-frames` infers frame layout and dimensions before compile. `normalize` applies deterministic local presets: `transparent-sprite`, `ui-icon`, `sprite-strip`, and `sprite-grid`.

Sprite frame set reports include `.openrender/runs/{runId}/preview_frames.png` when frame slices are available.

## Pack And Recipe Commands

`pack list`, `pack inspect core`, and `recipe list` expose built-in local core metadata only. Use these as compact local context for agents.

## Agent Instruction Commands

`install-agent --platform codex|cursor|claude|all --dry-run --json` previews local instruction files. Without `--dry-run`, it writes `AGENTS.md`, `.cursor/rules/openrender.md`, or `.claude/openrender.md` and refuses to overwrite existing files unless `--force` is passed.

## Command Boundary

The CLI surface is local-first asset handoff: context, scan, plan, compile, install, verify, report, explain, diff, rollback, recipes, fixtures, schemas, and agent instructions. Account, billing, cloud deployment, and model generation remain outside the local command surface.
