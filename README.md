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
    <a href="./docs/LLM-OPTIMIZED-REFERENCE.md">LLM Reference</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## What Is openRender?

openRender is a local-first Developer Kit for AI coding agents that need to place generated game art into real projects.

Image generators create pixels. Game projects need stable paths, frame metadata, manifests, helper code, previews, reports, and a way to undo the install. openRender provides that handoff layer so agents can stop guessing and keep the project state reviewable.

The current `0.6.1` core supports image asset handoff for Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and plain Canvas + Vite.

## Quick Start

Packages are prepared for local development. Until they are published, run the CLI from this repository.

```bash
pnpm install
pnpm build
```

From a target game project:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
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

Rollback the latest openRender install:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

Use `--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, or `--target canvas`.

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
- Alpha diagnostics, frame detection, normalization presets, sprite invariants, and frame preview sheets.
- Engine adapters for Phaser, Godot, LOVE2D, PixiJS, and Canvas.
- JSON schemas, compact agent summaries, recipes, fixture capture, and golden fixtures.
- Local JSON-only MCP metadata helpers for supported targets.

## Engine Outputs

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG assets, TypeScript manifest, animation helpers, preload snippets |
| Godot 4 | PNG assets, GDScript asset helpers, animation helpers, `res://` paths |
| LOVE2D | PNG assets, Lua asset module, animation metadata, draw/load snippets |
| PixiJS + Vite | PNG assets, optional spritesheet JSON, TypeScript Pixi helpers |
| Canvas + Vite | PNG assets, TypeScript manifest, image loading and frame drawing helpers |

## Agent Rules

- Run `context --json` before reading broadly or assuming the project type.
- Run `doctor --json` before writing into an unfamiliar project.
- Use `plan sprite --json` or `compile sprite --dry-run --json` before `--install`.
- Inspect `installPlan.files` before installing.
- Do not pass `--force` unless the user accepts overwriting destination files.
- Treat generated manifests as current-result files, not automatic merges with previous manifest entries.
- After install, run `verify --run latest --json`.
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
