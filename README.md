# openRender

[![CI](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg)](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml)

openRender is local infrastructure for AI agents turning generated media into engine-ready playable projects.

Developer Kit 0.3.0 targets agent-safe image asset handoff for Phaser, Godot 4, and LOVE2D projects. It helps an AI agent take an existing generated image, inspect a local game project, compile the image into an engine-ready asset, install generated files with snapshots, verify the result, produce a local report, and roll back the install if needed.

## Current Status

The tracked implementation contains the 0.3.0 local CLI surface for Phaser, Godot 4, and LOVE2D image asset workflows. It includes the monorepo, package boundaries, schemas, runtime schema validation, project scanner, doctor checks, image processing, Phaser TypeScript helpers, Godot GDScript helpers, LOVE2D Lua helpers, install, verify, report, preview, and rollback.

The npm packages are prepared for local development but are not assumed to be published yet. Until the package set is published, run the CLI from this repository.

## Scope

Developer Kit 0.3.0 is intended to prove this agent loop:

```text
agent receives or creates an image file
-> agent scans the game project
-> openRender builds a contract and install plan
-> openRender compiles an engine-ready PNG artifact
-> agent reviews JSON output
-> openRender installs generated files with snapshots
-> openRender verifies and reports
-> agent edits game code using generated paths/helpers
-> rollback remains available for the asset install
```

Developer Kit 0.3.0 is intentionally narrow:

- Local-first CLI workflow with no required account or hosted service.
- Deterministic file operations that stay inside the target project.
- JSON-first command output for AI agents.
- Vite + Phaser asset installation.
- Godot 4 image asset installation.
- LOVE2D image asset installation.
- Image asset compilation to engine-loadable PNG files.
- Local run records, reports, previews, snapshots, verification, and rollback.
- Model generation, billing, telemetry, and cloud orchestration stay outside this package.

## Agent Quickstart

Use JSON output whenever an AI agent calls openRender. Treat each command result as structured state for the next decision.

### Current Phaser Workflow

From a Vite + Phaser project directory:

```bash
openrender init --json
openrender scan --json
openrender doctor --json
```

For a single transparent sprite:

```bash
openrender compile sprite \
  --from tmp/slime_raw.png \
  --id enemy.slime \
  --output-size 64x64 \
  --dry-run \
  --json
```

For a sprite sheet or animation strip:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Only install after the dry-run result is acceptable:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json

openrender verify --run latest --json
openrender report --run latest --json
```

If the installed asset is wrong or the agent needs to abandon the asset change:

```bash
openrender rollback --run latest --json
```

### Godot 4 Workflow

From a Godot 4 project directory:

```bash
openrender init --target godot --json
openrender scan --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target godot \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Godot installs PNG assets under `assets/openrender/`, generates GDScript helpers under `scripts/openrender/`, uses `res://` load paths, and does not write `.import` or `.godot/` files. Godot owns its own import metadata when the project is opened or refreshed.

### LOVE2D Workflow

From a LOVE2D project directory with `main.lua` or `conf.lua`:

```bash
openrender init --target love2d --json
openrender scan --json
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target love2d \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

LOVE2D installs PNG assets under `assets/openrender/`, generates Lua helper modules under `openrender/`, and uses project-relative load paths such as `assets/openrender/enemy-slime-idle.png`. It does not create `.love` archives or run the LOVE2D runtime.

## Agent Decision Rules

An AI agent should follow these rules:

- Run `scan --json` before assuming the project type.
- Run `doctor --json` before writing project files when starting from an unfamiliar project.
- Prefer `compile sprite --dry-run --json` before `--install`.
- Do not pass `--force` unless the user explicitly accepts overwriting generated destination files.
- If frame validation fails, read the `validation.reason` and generate a new compile command with corrected `--frames`, `--frame-size`, or source image dimensions.
- After install, run `verify --run latest --json`.
- Use `outputPlan.assetPath`, `outputPlan.publicUrl` or `outputPlan.loadPath`, `outputPlan.manifestPath`, and `outputPlan.codegenPath` to decide what game code to edit.
- If verification fails, run `report --run latest --json` and inspect the generated local report before changing unrelated game code.
- Use `rollback --run latest --json` for the openRender install only. It does not revert the agent's separate game code edits.

## Agent Output Contract

The CLI is intended to be machine-readable. Important fields in `compile sprite --json` include:

- `contract`: the media contract openRender created for the input.
- `input`: source image metadata, including dimensions, format, hash, alpha, and color space.
- `outputPlan.assetPath`: where the compiled asset will be installed.
- `outputPlan.publicUrl`: the URL Phaser can load from a Vite public asset.
- `outputPlan.loadPath`: engine load path for Godot, LOVE2D, and future adapters.
- `outputPlan.manifestPath`: generated asset manifest path.
- `outputPlan.codegenPath`: generated engine helper path for frame sets.
- `installPlan.files`: exact files that install will copy or write.
- `validation`: frame validation result for sprite frame sets.
- `frameSlices`: computed frame rectangles for valid frame sets.
- `run.runId`: stable run identifier for verify, report, and rollback.
- `installResult`: files written and snapshots captured when `--install` is used.

## Phaser Handoff Example

After installing an animation frame set, the agent can wire generated helpers into a Phaser scene:

```ts
import {
  preloadEnemySlimeIdle,
  registerEnemySlimeIdle,
  enemySlimeIdleAsset
} from "./openrender/animations/enemy-slime-idle";

export class GameScene extends Phaser.Scene {
  preload() {
    preloadEnemySlimeIdle(this);
  }

  create() {
    registerEnemySlimeIdle(this);
    this.add.sprite(160, 120, enemySlimeIdleAsset.key).play(enemySlimeIdleAsset.key);
  }
}
```

For transparent sprites, use `openRenderAssets` from the generated manifest:

```ts
import { openRenderAssets } from "./assets/openrender-manifest";

const slime = openRenderAssets["enemy.slime"];
scene.load.image("enemy.slime", slime.url);
```

## Workspace

```text
packages/core              shared config, contract, path, run state models
packages/cli               openrender command-line interface
packages/harness-visual    visual pipeline boundary
packages/adapters/phaser   Phaser/Vite output helpers
packages/adapters/godot    Godot 4 output helpers
packages/adapters/love2d   LOVE2D output helpers
packages/reporter          report and preview generation boundary
packages/doctor            environment diagnostics
```

## Development

Prerequisites:

- Node.js 22 or newer
- pnpm 10 or newer

Install dependencies:

```bash
pnpm install
```

Build and verify:

```bash
pnpm typecheck
pnpm test
```

Run the CLI from source:

```bash
pnpm build
node packages/cli/dist/index.js --version
```

When testing against a separate game project before packages are published, run the built CLI from that project's root:

```bash
cd /path/to/game-project
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
node /path/to/openrender/packages/cli/dist/index.js compile sprite --from tmp/slime_raw.png --id prop.slime --output-size 64x64 --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
```

## Current CLI Workflow

For human operators, the same CLI can be used directly after the package is installed or published. From a Vite + Phaser project directory, initialize local openRender state:

```bash
openrender init
openrender scan
```

Compile a sprite without writing project files:

```bash
openrender compile sprite --from tmp/slime_raw.png --target phaser --id prop.slime --output-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime_raw.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
```

Compile and install the sprite into the project:

```bash
openrender compile sprite --from tmp/slime_raw.png --target phaser --id prop.slime --output-size 64x64 --install --json
openrender compile sprite --from tmp/slime_raw.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
```

Review, verify, and roll back the latest run:

```bash
openrender install --run latest
openrender verify --run latest
openrender report --run latest
openrender rollback --run latest
```

The current CLI writes local state under `.openrender/`, generated assets under `public/assets/`, and generated Phaser helpers under `src/`.

Generated local paths:

- `.openrender/artifacts/`: compiled PNG artifacts by run.
- `.openrender/runs/`: run records and latest pointers.
- `.openrender/reports/`: JSON and HTML reports.
- `.openrender/previews/`: local preview HTML files.
- `.openrender/snapshots/`: pre-install snapshots for rollback.
- `public/assets/`: installed Phaser-loadable assets.
- `src/assets/openrender-manifest.ts`: generated asset manifest.
- `src/openrender/animations/`: generated Phaser animation helpers.
- `assets/openrender/`: Godot asset install root.
- `scripts/openrender/`: Godot GDScript helper root.
- `assets/openrender/`: LOVE2D asset install root.
- `openrender/`: LOVE2D Lua manifest and animation helper root.

## Packages

The current package set is:

- `@openrender/core`
- `@openrender/adapter-phaser`
- `@openrender/adapter-godot`
- `@openrender/adapter-love2d`
- `@openrender/harness-visual`
- `@openrender/reporter`
- `@openrender/doctor`
- `@openrender/cli`

## Not This

openRender is not an AI image generator, asset marketplace, prompt playground, hosted game asset API, or credit-based generation service.
