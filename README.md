<div align="center">
  <h1>openRender</h1>
  <h3>Local asset handoff infrastructure for AI game development</h3>
  <p>
    openRender turns existing generated game images into engine-ready project files with plans,
    helper code, reports, verification, and rollback records.
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a>
  </p>
  <p>
    <a href="./AGENT_USAGE.md">Agent Usage</a> •
    <a href="./AGENT_USAGE.md#skill-setup">Agent Skill</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v0.9.2"><img alt="Release" src="https://img.shields.io/badge/release-v0.9.2-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## What Is openRender?

openRender is a local-first Developer Kit for AI coding agents that need to place generated game assets into real projects.

Image generators create pixels. Game projects need stable paths, frame metadata, manifests, helper code, previews, reports, and a way to undo the install. openRender provides that handoff layer so agents can stop guessing and keep the project state reviewable.

The current `0.9.2` core supports sprite image handoff, visual reference records, motion analysis, animation compile/install flows, audio, atlas/tileset, UI asset pipelines, and agent loop task packets for Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Three.js + Vite, plain Canvas + Vite, and Unity projects.

## Quick Start

Packages are prepared for local development. Until they are published, run the CLI from this repository.

```bash
pnpm install
pnpm build
```

For agent-led use, install openRender for the project and then tell your coding agent to use it. The agent can choose the exact openRender commands from the local instructions and references.

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

You can also phrase setup as a skill request:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right local agent instructions, and explain what changed.
```

The skill is local agent guidance. It maps that natural-language request to `install-agent`, compact context, read-only wire maps, dry-runs, verification, reports, and rollback rules.

The CLI sequence below is for local setup, agent verification, and manual reference.

From a target game project:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js loop status --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

For AI coding agents, install local instructions with a dry run first:

```bash
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform all --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform codex --json
```

Plan and dry-run before writing files:

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

Record visual references or inspect motion before installing animation assets:

```bash
node /path/to/openrender/packages/cli/dist/index.js ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "Match this timing and movement style." \
  --json

node /path/to/openrender/packages/cli/dist/index.js detect-motion tmp/slime_idle_frames --json --compact

node /path/to/openrender/packages/cli/dist/index.js compile animation \
  --from tmp/slime_idle_frames \
  --target phaser \
  --id enemy.slime.idle \
  --fps 8 \
  --layout horizontal_strip \
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
  --manifest-strategy merge \
  --install \
  --json

node /path/to/openrender/packages/cli/dist/index.js verify --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js loop attach --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js loop run animation --from tmp/slime_idle_frames --target phaser --id enemy.slime.idle --fps 8 --install --json --compact
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json --compact
```

Use `context --json --wire-map` when an agent needs read-only hints for where generated helpers should be connected in game code.

Rollback the latest openRender install:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

Use `--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, `--target canvas`, `--target three`, or `--target unity`.

## How It Works

```text
local image
-> project scan
-> media contract
-> deterministic artifact
-> install plan
-> engine-shaped files
-> verify and report
-> agent handoff summary
-> rollback remains available
```

openRender keeps run state under `.openrender/`, including artifacts, previews, reports, run records, and rollback snapshots.

## Core Capabilities

- Project scanning and doctor checks.
- Sprite compile plans, dry-runs, installs, verification, reports, diffs, explanations, and rollback.
- Visual reference records for sketches, UI mockups, concept art, local files, or URLs; URLs are recorded as provenance and are not downloaded.
- `detect-motion` for video/GIF/PNG sequence analysis before install, with clear ffmpeg guidance when video tooling is missing.
- `compile animation` for engine-ready animation sheets, runtime helper files, wire-map handoff, verification, reports, diffs, explanations, and rollback.
- Audio, atlas/tileset, and UI compile/install/verify/report/rollback through the same local run-state pipeline.
- Compact agent output for context, verification, reports, explanations, and diffs.
- Read-only wiring maps that include latest asset paths, manifest modules, and example snippets without patching game code.
- Alpha diagnostics, safe default background cutout, edge-flood background removal, frame detection, normalization presets, sprite invariants, and frame preview sheets.
- Quality gates with `--quality prototype|default|strict` and `verify --strict-visual` for likely visual problems.
- Manifest strategies with default `merge`, explicit `replace`, and `isolated` mode for no shared manifest write.
- Runtime smoke checks for Godot and LOVE2D when the local runtime is available.
- Engine adapters for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity.
- JSON schemas, compact agent summaries, recipes, fixture capture, and golden fixtures.
- Local JSON-only MCP metadata helpers for supported targets.

## Engine Outputs

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG assets, TypeScript manifest, animation helpers, preload snippets |
| Godot 4 | PNG assets, GDScript asset helpers, animation helpers, `res://` paths |
| LOVE2D | PNG assets, Lua asset module, animation metadata, draw/load snippets |
| PixiJS + Vite | PNG assets, optional spritesheet JSON, TypeScript Pixi helpers |
| Three.js + Vite | PNG assets, TypeScript manifest, `TextureLoader`, `Sprite`, and `PlaneGeometry` helpers |
| Canvas + Vite | PNG assets, TypeScript manifest, image loading and frame drawing helpers |
| Unity | PNG/audio assets under `Assets/OpenRender`, C# manifests, sprite/media helper classes |

Animation compiles reuse the same target adapters. Tier-1 targets Phaser, Godot, LOVE2D, and Unity get deeper runtime helper scaffolds. PixiJS, Three.js, and Canvas get web render-loop helper paths and snippets. openRender still does not patch game code automatically.

Additional media assets use sibling media manifests and helpers, such as `src/assets/openrender-media-manifest.ts`, `scripts/openrender/openrender_media_assets.gd`, `openrender/openrender_media_assets.lua`, or `Assets/OpenRender/OpenRenderMediaAssets.cs`, depending on the target.

## Agent Rules

- Run `context --json` before reading broadly or assuming the project type.
- Use `context --json --compact` for the shortest project handoff.
- Use `context --json --wire-map` before editing game code that should connect generated helpers.
- Run `doctor --json` before writing into an unfamiliar project.
- Use `plan sprite --json` or `compile sprite --dry-run --json` before `--install`.
- Use `ingest reference --json` when the user gives a sketch, mockup, concept image, video URL, or local reference file that the next agent should remember.
- Use `detect-motion --json --compact` before choosing animation fps, frame count, layout, and loop settings.
- Use `compile animation --dry-run --json` before installing animation assets.
- Inspect `installPlan.files` before installing.
- Do not pass `--force` unless the user accepts overwriting destination files.
- Use default manifest merge for cumulative entries; choose `--manifest-strategy replace` or `--manifest-strategy isolated` when a one-entry or no-shared-manifest workflow is intended.
- Generated sprite handoff uses safe `--background-policy auto` cutout by default.
- Use `--background-policy preserve` to keep the original background, or `--background-policy remove` / `--remove-background` to force cutout.
- Use `--quality strict` or `verify --strict-visual` when visual transparency mistakes should fail the run.
- After install, run `verify --run latest --json`.
- Use `report`, `explain`, and `diff` with `--compact` when the agent only needs status, next actions, and compact tables.
- Use `rollback --run latest --json` only for the openRender install.

## Repository Layout

```text
packages/core              shared config, contracts, paths, and run state
packages/cli               openrender command-line interface
packages/harness-visual    image metadata, normalization, crop, and frame checks
packages/adapters/*        engine-specific project output helpers
packages/reporter          report and preview generation
packages/doctor            environment diagnostics
packages/mcp-server        local JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    local recipe metadata for supported targets
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

## Contact

For project questions, contact `stelify87@gmail.com`.
