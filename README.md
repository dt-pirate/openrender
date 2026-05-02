# openRender

[![CI](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg)](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml)

openRender turns existing generated images into engine-ready game project assets.

It is built for AI coding agents working inside local game projects. The CLI scans the project, compiles a PNG asset, creates engine-specific helper files, installs with snapshots, verifies the result, writes a local report, and keeps rollback available.

## Status

Developer Kit `0.3.0` supports image asset handoff for:

- Vite + Phaser
- Godot 4
- LOVE2D

The current implementation includes project scanning, doctor checks, image normalization, transparent crop/background cleanup, sprite frame validation, install plans, JSON output, local previews, reports, snapshots, verification, and rollback.

Packages are prepared for local development. Until they are published, run the CLI from this repository.

## Quickstart

Install and build the repo:

```bash
pnpm install
pnpm build
```

From a target game project, run the built CLI:

```bash
cd /path/to/game-project
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

Dry-run before writing files:

```bash
node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Install only after the plan is correct:

```bash
node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json

node /path/to/openrender/packages/cli/dist/index.js verify --run latest --json
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json
```

Use `--target phaser`, `--target godot`, or `--target love2d`.

Rollback the latest openRender install:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

## Engine Outputs

Phaser:

- `public/assets/{asset}.png`
- `src/assets/openrender-manifest.ts`
- `src/openrender/animations/{asset}.ts`

Godot:

- `assets/openrender/{asset}.png`
- `scripts/openrender/openrender_assets.gd`
- `scripts/openrender/animations/{asset}.gd`

LOVE2D:

- `assets/openrender/{asset}.png`
- `openrender/openrender_assets.lua`
- `openrender/animations/{asset}.lua`

Each run also writes local state under `.openrender/`, including artifacts, previews, reports, run records, and rollback snapshots.

## Install And Manifest Behavior

openRender writes generated assets and helper files through an install plan. Before installing, run `compile sprite --dry-run --json` and inspect `installPlan.files`.

By default, install refuses to overwrite existing destination files. If a manifest or helper file already exists, openRender stops unless `--force` is provided.

In the current Developer Kit, generated manifest files are written from the current compile result. They are not automatically merged with older manifest entries. If you install multiple assets, manage separate runs carefully, regenerate the manifest from the intended asset set, or confirm that overwriting the manifest is acceptable before using `--force`.

Use `rollback --run latest --json` to undo files written by a specific openRender install. Rollback only affects files in that install plan; it does not revert game code edits made separately by an agent.

## Agent Rules

- Run `scan --json` before assuming the project type.
- Run `doctor --json` before writing into an unfamiliar project.
- Prefer `compile sprite --dry-run --json` before `--install`.
- Do not pass `--force` unless the user accepts overwriting destination files.
- After install, run `verify --run latest --json`.
- Use the generated `outputPlan` paths when editing game code.
- Use `rollback --run latest --json` only for the openRender install. It does not revert separate game code edits.

## Workspace

```text
packages/core              shared config, contract, path, and run state models
packages/cli               openrender command-line interface
packages/harness-visual    image metadata, normalization, crop, and frame checks
packages/adapters/phaser   Phaser/Vite output helpers
packages/adapters/godot    Godot 4 output helpers
packages/adapters/love2d   LOVE2D output helpers
packages/reporter          report and preview generation
packages/doctor            environment diagnostics
```

## Development

Prerequisites:

- Node.js 22 or newer
- pnpm 10 or newer

Run checks:

```bash
pnpm typecheck
pnpm test
```

Run the CLI from source:

```bash
pnpm build
node packages/cli/dist/index.js --version
```
