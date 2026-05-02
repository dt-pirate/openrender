# Quickstart

Use one workflow for every supported engine: initialize the project, inspect the plan, install the generated asset, verify the result, generate a report, and keep rollback available.

## Run From Source

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --version
```

Before packages are published, run the built CLI from the target game project root:

```bash
cd /path/to/game-project
node /path/to/openrender/packages/cli/dist/index.js scan --json
```

## Common Flow

Every engine follows the same safety loop:

```bash
openrender init --target <engine> --json
openrender scan --json
openrender doctor --json
openrender compile sprite --from tmp/slime_idle_strip.png --target <engine> --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime_idle_strip.png --target <engine> --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json
openrender rollback --run latest --json
```

Use `phaser`, `godot`, or `love2d` as the target engine.

## Install And Manifest Behavior

openRender writes generated assets and helper files through an install plan. Before installing, run `compile sprite --dry-run --json` and inspect `installPlan.files`.

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

## Reports And Rollback

Each install writes local run state under `.openrender/`.

- `.openrender/reports/latest.html`: latest local HTML report.
- `.openrender/reports/latest.json`: latest machine-readable report.
- `.openrender/snapshots/`: rollback snapshots for files touched by the install.

Rollback only reverts files managed by the openRender install. It does not revert separate game code edits made by an agent.
