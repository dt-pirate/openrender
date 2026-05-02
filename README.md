# openRender

[![CI](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg)](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml)

openRender turns existing generated images into engine-ready game project assets and helps AI coding agents avoid repeated token-heavy asset handoff work.

It is built for AI coding agents working inside local game projects. The CLI scans the project, compiles a PNG asset, creates engine-specific helper files, installs with snapshots, verifies the result, writes a local report, and keeps rollback available.

The 0.3.1 reference direction keeps local compile/install as the free core. Future paid value should come from recipe packs, agent packs, update access, support bundles, optional hosted workers, and OEM/platform licensing.

## Status

The implemented Developer Kit core currently supports image asset handoff for:

- Vite + Phaser
- Godot 4
- LOVE2D

The current implementation includes project scanning, doctor checks, official JSON schemas, built-in core pack and recipe metadata, explicit plan/explain/diff commands, compact agent summaries, image normalization presets, alpha diagnostics, frame detection, sprite frame invariants, frame preview sheets, install plans, JSON output, local previews, reports, snapshots, verification, rollback, and golden fixtures.

Packages are prepared for local development. Until they are published, run the CLI from this repository.

## 0.3.1 Reference Direction

The active local reference document is `docs/openRender_v0.3.1.md`. The `docs/` folder is intentionally kept out of Git.

0.3.1 adds product direction around agent token savings and pack boundaries without turning local compile into a hosted metered service:

- Local compile and install remain free, local-first core behavior.
- Agent and engine recipe packs can reduce repeated prompt, schema, helper, and repair work.
- Future update access can distribute newer framework conventions and helper templates.
- Support, studio bundles, hosted workers, and OEM/platform licensing are separate paid surfaces.
- The server, if introduced later, should be license, pack, update, and OEM infrastructure, not a required compile server.

This means openRender should be described as a local-first media-to-engine compiler plus a recipe/pack strategy for reducing agent waste, not as an image generator, credit wallet, marketplace, or hosted asset API.

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
node /path/to/openrender/packages/cli/dist/index.js plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

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
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json
```

Use `--target phaser`, `--target godot`, or `--target love2d`.

Rollback the latest openRender install:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

## Image Handoff Tools

Inspect image and frame structure before committing to an install:

```bash
node /path/to/openrender/packages/cli/dist/index.js detect-frames tmp/slime_idle_strip.png --frames 6 --json

node /path/to/openrender/packages/cli/dist/index.js normalize tmp/slime_raw.png \
  --preset transparent-sprite \
  --json
```

Available normalize presets:

- `transparent-sprite`
- `ui-icon`
- `sprite-strip`
- `sprite-grid`

Compiled sprite output includes `alpha` diagnostics, compact `agentSummary`, built-in core recipe metadata, `invariants` for sprite frame sets, and `.openrender/runs/{runId}/preview_frames.png` when frame slices are available.

## Schemas And Fixtures

Print official JSON schemas:

```bash
node /path/to/openrender/packages/cli/dist/index.js schema contract
node /path/to/openrender/packages/cli/dist/index.js schema output
node /path/to/openrender/packages/cli/dist/index.js schema report
node /path/to/openrender/packages/cli/dist/index.js schema install-plan
node /path/to/openrender/packages/cli/dist/index.js schema pack-manifest
```

Tracked schema files live in `schemas/`. Golden fixtures live in `fixtures/` and are exercised by the test suite.

Inspect the built-in local core pack and recipes:

```bash
node /path/to/openrender/packages/cli/dist/index.js pack list --json
node /path/to/openrender/packages/cli/dist/index.js pack inspect core --json
node /path/to/openrender/packages/cli/dist/index.js recipe list --json
```

## Engine Outputs

Phaser:

- `public/assets/{asset}.png`
- `src/assets/openrender-manifest.ts`
- `src/openrender/animations/{asset}.ts`
- helper exports for preload, animation registration, scene creation, and Arcade Physics body sizing

Godot:

- `assets/openrender/{asset}.png`
- `scripts/openrender/openrender_assets.gd`
- `scripts/openrender/animations/{asset}.gd`
- helper exports for `SpriteFrames`, `res://` path validation, and `AnimatedSprite2D` usage snippets

LOVE2D:

- `assets/openrender/{asset}.png`
- `openrender/openrender_assets.lua`
- `openrender/animations/{asset}.lua`
- helper exports for `love.graphics.newQuad`, module loading, anim8-compatible metadata, and `love.load` / `love.draw` snippets

Each run also writes local state under `.openrender/`, including artifacts, previews, reports, run records, and rollback snapshots.

## Compatibility Matrix

| Target | Transparent Sprite | Sprite Frame Set | Helper Code | Runtime Smoke |
|---|---:|---:|---:|---:|
| Vite + Phaser | Supported | Supported | Supported | Static verification |
| Godot 4 | Supported | Supported | Supported | Static verification |
| LOVE2D | Supported | Supported | Supported | Static verification |
| PixiJS | Planned | Planned | Planned | Not included |
| Plain Canvas | Planned | Planned | Planned | Not included |
| Unity | Future | Future | Future | Not included |

## Install And Manifest Behavior

openRender writes generated assets and helper files through an install plan. Before installing, run `compile sprite --dry-run --json` and inspect `installPlan.files`.

By default, install refuses to overwrite existing destination files. If a manifest or helper file already exists, openRender stops unless `--force` is provided.

In the current Developer Kit, generated manifest files are written from the current compile result. They are not automatically merged with older manifest entries. If you install multiple assets, manage separate runs carefully, regenerate the manifest from the intended asset set, or confirm that overwriting the manifest is acceptable before using `--force`.

Use `rollback --run latest --json` to undo files written by a specific openRender install. Rollback only affects files in that install plan; it does not revert game code edits made separately by an agent.

## Agent Rules

- Run `scan --json` before assuming the project type.
- Run `doctor --json` before writing into an unfamiliar project.
- Use `plan sprite --json` or `compile sprite --dry-run --json` before `--install`.
- Use `detect-frames --json` when frame dimensions are unclear.
- Do not pass `--force` unless the user accepts overwriting destination files.
- After install, run `verify --run latest --json`.
- Use `explain --run latest --json` for compact agent-facing next actions.
- Use `diff --run latest --json` before deciding which files to inspect.
- Use the generated `outputPlan` paths when editing game code.
- Use `rollback --run latest --json` only for the openRender install. It does not revert separate game code edits.
- Treat any future pack or recipe output as a way to reduce repeated agent context, not as a reason to skip dry-run, verification, or rollback boundaries.

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
schemas                    JSON schemas for contracts, run output, reports, install plans, pack manifests
fixtures                   golden fixture corpus for adapter regression checks
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
