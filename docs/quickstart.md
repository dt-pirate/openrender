# Quickstart

Use one workflow for every supported engine: collect compact context, inspect the plan, install the generated asset, verify the result, generate a report, and keep rollback available.

The current Developer Kit keeps this local loop as the core and uses recipes, MCP metadata, and agent instructions to reduce repeated context, helper drift, and repair work.

## Run From Source

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --version
```

Before packages are published, run the built CLI from the target game project root:

```bash
cd /path/to/game-project
node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
```

## Common Flow

Every engine follows the same safety loop:

```bash
openrender init --target <engine> --json
openrender context --json
openrender context --json --compact
openrender context --json --wire-map
openrender scan --json
openrender doctor --json
openrender install-agent --platform all --dry-run --json
openrender pack list --json
openrender recipe list --json
openrender plan sprite --from tmp/slime_idle_strip.png --target <engine> --id enemy.slime.idle --frames 6 --frame-size 64x64 --json
openrender detect-frames tmp/slime_idle_strip.png --frames 6 --json
openrender compile sprite --from tmp/slime_idle_strip.png --target <engine> --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime_idle_strip.png --target <engine> --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
openrender rollback --run latest --json
```

Use `phaser`, `godot`, `love2d`, `pixi`, or `canvas` as the target engine.

Use `--compact` when an agent needs a short status and next-action view. Use `context --json --wire-map` to find likely game-code connection points without editing files.

## Recipe Direction

The built-in `core` pack and recipes are available locally with `pack list`, `pack inspect core`, and `recipe list`. They summarize known-good commands, helper conventions, compact repair guidance, and agent instructions. They do not make local compile require login, credits, telemetry, sync, or hosted execution.

## Install And Manifest Behavior

openRender writes generated assets and helper files through an install plan. Before installing, run `compile sprite --dry-run --json` and inspect `installPlan.files`.

For sprite frame sets, reports include `.openrender/runs/{runId}/preview_frames.png` so a developer can inspect frame indexes and boundaries without reopening the source sheet manually.

By default, install refuses to overwrite existing destination files. If a manifest or helper file already exists, openRender stops unless `--force` is provided.

In the current Developer Kit, generated manifest files are written from the current compile result. They are not automatically merged with older manifest entries. If you install multiple assets, manage separate runs carefully, regenerate the manifest from the intended asset set, or confirm that overwriting the manifest is acceptable before using `--force`.

Use `rollback --run latest --json` to undo files written by a specific openRender install. Rollback only affects files in that install plan; it does not revert game code edits made separately by an agent.

## Phaser

Use Phaser when the project is a Vite + Phaser web game.

```bash
openrender init --target phaser --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

After the dry-run plan looks correct, rerun with `--install`.

Phaser output:

- `public/assets/`: installed PNG assets.
- `src/assets/openrender-manifest.ts`: generated asset manifest.
- `src/openrender/animations/`: generated animation helpers for frame sets.

openRender prepares load paths and helper code. Scene wiring remains an explicit agent or developer step.

## Godot

Use Godot when the project has `project.godot` at the project root.

```bash
openrender init --target godot --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target godot \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

After the dry-run plan looks correct, rerun with `--install`.

Godot output:

- `assets/openrender/`: installed PNG assets.
- `scripts/openrender/openrender_assets.gd`: generated asset manifest.
- `scripts/openrender/animations/`: generated animation helpers for frame sets.

openRender does not write `.import` or `.godot/` files. Open or refresh the project in Godot so the editor owns import cache generation.

## LOVE2D

Use LOVE2D when the project has `main.lua` or `conf.lua` at the project root.

```bash
openrender init --target love2d --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target love2d \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

After the dry-run plan looks correct, rerun with `--install`.

LOVE2D output:

- `assets/openrender/`: installed PNG assets.
- `openrender/openrender_assets.lua`: generated asset manifest.
- `openrender/animations/`: generated animation helpers for frame sets.

openRender does not create `.love` archives and does not run the LOVE2D runtime during verification. It verifies local file and path invariants only.

## PixiJS

Use PixiJS when the project is a Vite + PixiJS web game.

```bash
openrender init --target pixi --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target pixi \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

PixiJS output:

- `public/assets/`: installed PNG assets.
- `src/assets/openrender-manifest.ts`: generated asset manifest.
- `src/openrender/pixi/`: generated Pixi helpers for frame sets.

## Canvas

Use Canvas when the project is a Vite web game without Phaser or PixiJS dependencies.

```bash
openrender init --target canvas --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target canvas \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Canvas output:

- `public/assets/`: installed PNG assets.
- `src/assets/openrender-manifest.ts`: generated asset manifest.
- `src/openrender/canvas/`: generated image loading and frame drawing helpers.

## Reports And Rollback

Each install writes local run state under `.openrender/`.

- `.openrender/reports/latest.html`: latest local HTML report.
- `.openrender/reports/latest.json`: latest machine-readable report.
- `.openrender/snapshots/`: rollback snapshots for files touched by the install.

Rollback only reverts files managed by the openRender install. It does not revert separate game code edits made by an agent.
