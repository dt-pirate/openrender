<div align="center">
  <h1>openRender</h1>
  <h3>State infrastructure for AI-agent-native game development</h3>
  <p>
    openRender turns existing generated game media into engine-ready project files with plans,
    helper code, compact memory, reports, verification, and rollback records.
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
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v1.0.1"><img alt="Release" src="https://img.shields.io/badge/release-v1.0.1-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## What Is openRender?

openRender is state infrastructure for AI coding agents that need to continue game development without losing project intent, engine constraints, visual direction, or recovery context.

Image generators create pixels. Game projects need stable paths, frame metadata, manifests, helper code, previews, reports, and a way to undo the install. openRender provides that handoff layer so agents can stop guessing and keep the project state reviewable.

openRender memory is not a note-taking layer. It stores derived project events, conclusions, project cards, and agent cards so the next agent task can carry the right context without replaying raw logs or asking a model provider to regenerate assets.

The current `1.0.1` core supports sprite image handoff, visual reference records, motion analysis, animation compile/install flows, audio, atlas/tileset, UI asset pipelines, loop runner lifecycle capture, engine task packets, loop completion records, and project memory infrastructure for Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Three.js + Vite, plain Canvas + Vite, and Unity projects.

## Quick Start

Install the CLI package from npm, then use the `openrender` command from a target game project:

```bash
npm install -g @openrender/cli
openrender --version
```

The npm package name is `@openrender/cli`; the installed command is `openrender`. The unscoped npm name `openrender` is already owned by another maintainer, so `npm install -g openrender` is not the release path unless that package name is transferred later.

For repository-based development, build the CLI from source:

```bash
pnpm install
pnpm build
```

For agent-led use, install openRender for the project and then tell your coding agent to use it. The agent can choose the exact openRender commands from the project instructions and references.

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

You can also phrase setup as a skill request:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right agent instructions, and explain what changed.
```

The skill is project agent guidance. It maps that natural-language request to `install-agent`, compact context, read-only wire maps, dry-runs, verification, reports, and rollback rules.

The CLI sequence below is for setup, agent verification, and manual reference.

From a target game project:

```bash
cd /path/to/game-project

openrender context --json
openrender context --json --compact
openrender memory status --json
openrender memory context --json --compact
openrender loop status --json --compact
openrender scan --json
openrender doctor --json
```

For AI coding agents, preview instruction writes with a dry run first:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

Plan and dry-run before writing files:

```bash
openrender plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

openrender compile sprite \
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
openrender ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "Match this timing and movement style." \
  --json

openrender detect-motion tmp/slime_idle_frames --json --compact

openrender compile animation \
  --from tmp/slime_idle_frames \
  --target phaser \
  --id enemy.slime.idle \
  --fps 8 \
  --layout horizontal_strip \
  --dry-run \
  --json
```

Preserve project intent and visual direction for the next agent task:

```bash
openrender memory ingest \
  --feedback "Keep the UI readable and preserve the neon arcade direction." \
  --json

openrender memory context --json --compact
openrender clean --memory --keep-latest --dry-run --json
```

Install only after the plan is correct:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --manifest-strategy merge \
  --install \
  --json

openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender loop attach --run latest --json --compact
openrender loop run animation --from tmp/slime_idle_frames --target phaser --id enemy.slime.idle --fps 8 --install --json --compact
openrender loop complete --notes "Helper wired and checked in game scene." --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
```

Use `context --json --wire-map` when an agent needs read-only hints for where generated helpers should be connected in game code.

Rollback the latest openRender install:

```bash
openrender rollback --run latest --json
```

Use `--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, `--target canvas`, `--target three`, or `--target unity`.

## How It Works

```text
source media
-> project scan
-> media contract
-> deterministic artifact
-> install plan
-> engine-shaped files
-> verify and report
-> derived project memory
-> agent handoff summary
-> rollback remains available
```

openRender keeps run state under `.openrender/`, including artifacts, previews, reports, run records, rollback snapshots, and compact memory records under `.openrender/memory/`.

## Core Capabilities

- Project scanning and doctor checks.
- Sprite compile plans, dry-runs, installs, verification, reports, diffs, explanations, and rollback.
- Visual reference records for sketches, UI mockups, concept art, project files, or URLs; URLs are recorded as provenance and are not downloaded.
- `detect-motion` for video/GIF/PNG sequence analysis before install, with clear ffmpeg guidance when video tooling is missing.
- `compile animation` for engine-ready animation sheets, runtime helper files, wire-map handoff, verification, reports, diffs, explanations, and rollback.
- Audio, atlas/tileset, and UI compile/install/verify/report/rollback through the same run-state pipeline.
- Memory infrastructure that derives project events, conclusions, project cards, agent cards, and compact context from runs, loops, and user feedback.
- `memory status`, `memory ingest`, `memory context`, `memory consolidate`, and `clean --memory` for keeping agent continuity useful without accumulating raw chat logs.
- Compact agent output for context, verification, reports, explanations, and diffs.
- Read-only wiring maps that include latest asset paths, manifest modules, and example snippets without patching game code.
- Alpha diagnostics, safe default background cutout, edge-flood background removal, frame detection, normalization presets, sprite invariants, and frame preview sheets.
- Quality gates with `--quality prototype|default|strict` and `verify --strict-visual` for likely visual problems.
- Manifest strategies with default `merge`, explicit `replace`, and `isolated` mode for no shared manifest write.
- Runtime smoke checks for Godot and LOVE2D when the target runtime is available.
- Engine adapters for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity.
- JSON schemas, compact agent summaries, recipes, fixture capture, and golden fixtures.
- JSON-only MCP metadata helpers for supported targets.

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
- Use `memory context --json --compact` before a follow-up agent task that depends on prior project intent, visual direction, or recovery context.
- Use `memory ingest --feedback <text> --json`, `memory ingest --run latest --json`, or `memory ingest --loop latest --json` to preserve durable project state after meaningful work.
- Use `clean --memory --keep-latest --dry-run --json` before pruning memory state.
- Use `context --json --wire-map` before editing game code that should connect generated helpers.
- Run `doctor --json` before writing into an unfamiliar project.
- Use `plan sprite --json` or `compile sprite --dry-run --json` before `--install`.
- Use `ingest reference --json` when the user gives a sketch, mockup, concept image, video URL, or project reference file that the next agent should remember.
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
packages/mcp-server        JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    recipe metadata for supported targets
```

## Development

Prerequisites:

- Node.js 22 or newer
- pnpm 10 or newer

Run checks:

```bash
pnpm typecheck
pnpm test
pnpm smoke:npm-install
```

Run the CLI from source:

```bash
pnpm build
node packages/cli/dist/index.js --version
```

## Contact

For project questions, contact `stelify87@gmail.com`.
