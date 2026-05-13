# Version History

Last updated: 2026-05-13

This page tracks the implemented openRender agent-native state infrastructure surface, tagged GitHub releases, and documented version milestones.

## Current Version

| Field | Value |
|---|---|
| Current implementation baseline | `1.0.2 Registry Smoke and Service Snapshot` |
| Package/CLI version | `1.0.2` |
| npm install package | `@openrender/cli` |
| CLI | `openrender` |
| Runtime | Node.js `>=22` |
| Package manager | pnpm `10.x` |
| License | Apache-2.0 |
| Release channel | GitHub release [`v1.0.2`](https://github.com/dt-pirate/openrender/releases/tag/v1.0.2) |
| npm package | [`@openrender/cli`](https://www.npmjs.com/package/@openrender/cli) |
| Release timestamp | 2026-05-13 KST |
| GitHub release | `https://github.com/dt-pirate/openrender/releases/tag/v1.0.2` |

## 1.0.2 Registry Smoke and Service Snapshot

`1.0.2` completes the npm-installed Developer Kit surface after `1.0.1`: the package has its own npm README, the release pipeline has a publish workflow and registry install smoke, web targets can run an opt-in build smoke, memory now separates user direction and engine state cards, and local service snapshots provide a clean boundary for future dashboards or supervisors.

Released: 2026-05-13 KST.

### npm Package Path

- The npm package name is `@openrender/cli`.
- The installed command is `openrender`.
- `1.0.2` uses the existing `@openrender/cli` package path; live registry verification is completed with `pnpm smoke:registry-install` after npm publish succeeds.
- The unscoped `openrender` package name is not the release path unless that npm name is transferred later.
- `pnpm smoke:npm-install` packs all workspace packages, installs the packed CLI into an isolated npm global prefix, and verifies `openrender --version`, `scan --json`, and `context --json --compact`.
- `pnpm smoke:registry-install` installs the published `@openrender/cli` from npm into an isolated prefix and verifies `openrender --version`, `scan --json`, `context --json --compact`, and `service snapshot --json`.

### Added

- `packages/cli/README.md` so the npm package page explains `npm install -g @openrender/cli` and the installed `openrender` command.
- `.github/workflows/npm-publish.yml` for release-backed npm publishing with provenance plus packed and registry install smoke checks.
- `scripts/registry-install-smoke.mjs` for post-publish verification against the live npm registry.
- `openrender smoke --target phaser|pixi|canvas|three --build --json` for opt-in web build smoke using the local package build script.
- `.openrender/memory/user-direction-card.json` and `.openrender/memory/engine-card.json` as derived phase-2 memory cards alongside project and agent cards.
- `openrender service snapshot --json` for a local-only service boundary that exports compact context, memory cards, counts, and capability flags without hosting or remote sync.
- `examples/love2d-minimal` and `examples/phaser-vite-minimal` as small installable CLI smoke targets.

### Boundaries

- The service snapshot is local JSON, not a hosted API.
- Web runtime smoke only runs a local build when `--build` or `--build-command` is provided.
- No external memory service, model provider API, asset regeneration, telemetry, or remote sync is required.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm smoke:npm-install
pnpm -r publish --dry-run --access public --no-git-checks
npm view @openrender/cli version --json
pnpm smoke:registry-install
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
1.0.2
```

## 1.0.1 Memory Infrastructure Foundation

`1.0.1` added openRender memory as project state infrastructure for agent continuity. It is not a note-taking layer: it derives compact project state from runs, loops, and user feedback so agents can continue game development without losing project intent, engine constraints, visual direction, or recovery context.

Released: 2026-05-11 22:00 KST (2026-05-11 13:00 UTC).

### Added

- `.openrender/memory/` state with events, conclusions, project cards, agent cards, and `latest-context.json`.
- `memory status --json` for inspecting memory state paths, counts, and storage size.
- `memory ingest --feedback <text> --json`, `memory ingest --run latest --json`, and `memory ingest --loop latest --json` for deriving durable state from user direction and openRender work.
- `memory context --json --compact` for short agent-facing context before the next task.
- `memory consolidate --json` for refreshing project and agent cards from derived conclusions.
- `clean --memory --keep-latest --dry-run --json` for pruning memory without creating loose scratch files.
- Compact `context --json --compact` and `loop task --json` now include project memory when available.

## 1.0.0 Agent-Native Game Dev Infrastructure

`1.0.0` closes the first full agent-native game development loop: existing media becomes engine-ready assets, verification and reports stay attached, the next agent task stays compact, and rollback remains available.

Released: 2026-05-06 21:00 KST (2026-05-06 12:00 UTC).

### Added

- `loop complete [--notes <text>]` to mark a handoff loop complete after a developer or agent wires and validates the generated helper in game code.
- Completed loop state records `completedAt`, optional completion notes, latest runId, latest task path, rollback boundary, and no-regeneration guarantees.
- Agent task packets now preserve completion state while still keeping openRender's boundary: no model provider calls, no asset regeneration, no remote download, and no automatic gameplay code patching.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
1.0.0
```

## 0.9.2 Loop Runner and Engine Packets

`0.9.2` added the loop runner that executes the existing compile, verify, report, explain, and diff lifecycle as one agent-facing iteration.

Released: 2026-05-06 21:00 KST (2026-05-06 12:00 UTC).

### Added

- `loop run sprite|animation|audio|atlas|ui` for existing source media.
- Automatic compile, verify, report, explain, and diff lifecycle capture in loop iteration records.
- Compact loop lifecycle output with compile media type, install state, verification summary, report path, next actions, diff table, and rollback command.
- Engine packet guidance in `latest-agent-task.md` for Phaser, Godot, LOVE2D, Unity, PixiJS, Three.js, and Canvas.
- Guardrails that reject generation-shaped options such as `--prompt`, `--model`, `--provider`, `--api-key`, `--regenerate`, `--redraw`, `--reprompt`, and `--download`.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.9.2
```

## 0.9.1 Agent Loop MVP

`0.9.1` introduced the first agent iteration loop layer without model-provider regeneration.

Released: 2026-05-06 21:00 KST (2026-05-06 12:00 UTC).

### Added

- `loop start` creates a local `.openrender/loops/{loopId}/` task state for agent-led game asset handoff.
- `loop attach` links an existing runId, report, verification status, next actions, and rollback command into the latest loop iteration.
- `loop status` and `loop task` expose compact loop state and a short next-agent task packet.
- `context --json` and `context --json --compact` include latest loop summary when a loop exists.
- Loop task packets include explicit boundaries: no model provider calls, no asset regeneration, no remote download, and no automatic game-code patching.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.9.1
```

## 0.9.0 Animation Runtime Integration

`0.9.0` introduced the animation runtime integration package and CLI version.

Released: 2026-05-05 18:00 KST (2026-05-05 09:00 UTC).

### Added

- New motion media contracts for `visual.animation_clip`, `visual.sprite_sequence`, `visual.effect_loop`, `visual.ui_motion`, and `visual.reference_video`.
- `compile animation` for local PNG frame directories, sprite sheets, video, and GIF inputs, producing engine-ready animation sheets plus manifest/helper output.
- Tiered runtime integration helpers for Phaser, Godot, LOVE2D, Unity, PixiJS, Three.js, and Canvas without automatic game-code patching.
- `normalize motion` for converting motion inputs into deterministic local animation sheets.
- Wire-map latest asset summaries now include helper path and suggested usage for animation runs.
- HTML and compact JSON reports now surface motion diagnostics, frame slices, helper paths, next actions, and rollback commands.
- Regression coverage for every target's `compile animation --dry-run`, plus install/verify/report/diff/explain/rollback lifecycle coverage.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
node --check docs/openrender-i18n.js
```

Expected CLI version:

```text
0.9.0
```

## 0.8.4 Detect Motion

`0.8.4` introduced motion analysis without installing extracted frames.

Released: 2026-05-05 17:00 KST (2026-05-05 08:00 UTC).

### Added

- `detect-motion <path> --json [--compact]` for video, GIF, sprite sheet, and PNG frame directory analysis.
- PNG frame directory analysis without ffmpeg.
- ffprobe-based video/GIF metadata when available, with `MOTION_RUNTIME_MISSING` guidance when local video tooling is missing.
- Motion diagnostics for duration, dimensions, fps, frame count, alpha, suggested layout, loop hint, duplicate frame ratio, empty frame risk, bounds jitter, and next actions.

## 0.8.3 Visual Reference Foundation

`0.8.3` introduced safe visual reference records for agent context.

Released: 2026-05-05 16:00 KST (2026-05-05 07:00 UTC).

### Added

- `ingest reference --url <url> --role <role> --intent <text> [--notes <text>] --json`.
- `ingest reference --from <path> --role <role> --intent <text> [--notes <text>] --json`.
- Local `.openrender/references/` records for mechanic, style, layout, logic, motion, mood, character, and environment references.
- Remote URL references are stored as provenance only; openRender does not download remote media.
- `context --json` and `context --json --compact` include reference summaries for short agent handoff.

## 0.8.2 Three.js Support

`0.8.2` was the Three.js Support package and CLI version.

Released: 2026-05-05 10:00 KST (2026-05-05 01:00 UTC).

### Added

- Three.js target support across shared target types, config defaults, project scanning, validation, CLI flags, schemas, MCP prompts, fixtures, and CI package verification.
- `@openrender/adapter-three` for Vite + Three.js sprite handoff: public PNG URLs, TypeScript manifest output, and generated `TextureLoader`, `Sprite`, and `PlaneGeometry` helpers.
- Three.js read-only wire maps that detect scene, renderer, texture loader, sprite, and mesh setup candidates without editing game code.
- Three.js readiness verification for static Vite texture load paths and generated manifest/helper path shape.
- Three.js install/verify/report/rollback regression coverage and golden fixtures.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.8.2
```

## 0.8.0 Unity Support

`0.8.0` was the Unity Support package and CLI version.

Released: 2026-05-04 22:00 KST (2026-05-04 13:00 UTC).

### Added

- Unity target/framework support across shared contracts, config defaults, project scanning, validation, CLI flags, schemas, MCP prompts, and doctor checks.
- `@openrender/adapter-unity` for sprite handoff into Unity projects: assets under `Assets/OpenRender/Generated`, C# manifest output, C# sprite helper classes, fixture coverage, and load-path verification.
- Unity support in `compile audio`, `compile atlas`, and `compile ui` through `Assets/OpenRender/OpenRenderMediaAssets.cs` and target-shaped helper classes.
- Read-only Unity wire maps that detect `ProjectSettings`, `MonoBehaviour` scripts, SpriteRenderer/UI/Image usage, AudioSource usage, scenes, and prefabs without editing Unity code.
- Unity readiness verification checks for project layout, `Assets/` load-path shape, manifest/helper path shape, and the `.meta`/`Library` import boundary.
- Unity golden fixtures and install/verify/report/rollback regression coverage.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.8.0
```

## 0.7.3 Additional Media Pipeline

`0.7.3` was the additional media pipeline package and CLI version.

Released: 2026-05-04 20:00 KST (2026-05-04 11:00 UTC).

### Added

- Stabilization coverage for the current `0.7.x` surface: `pnpm typecheck`, `pnpm test`, golden fixtures, compact output, wire-map, rollback, report, and local run records.
- Engine readiness checks in `verify`: Phaser loader path shape, Pixi asset path shape, Canvas media path shape, Godot project/import-cache boundary, LOVE2D entry/load-path boundary, manifest path shape, and helper path shape.
- Additional media compile pipeline for `compile audio`, `compile atlas`, and `compile ui`, promoting audio, atlas/tileset, and UI metadata contracts into installable local runs.
- Additional media manifests and helper files for Phaser, Godot, LOVE2D, PixiJS, and Canvas, with the same install, verify, report, diff, explain, and rollback workflow used by sprite assets.
- Regression tests covering audio install/verify/report/rollback plus atlas and UI verified install runs.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.7.3
```

## 0.7.2 Default Cutout

`0.7.2` was the Default Cutout package and CLI version.

Released: 2026-05-04 16:42:00 KST (2026-05-04 07:42:00 UTC).

### Added

- Safe automatic generated-sprite background cutout through default `--background-policy auto`.
- Explicit `--background-policy preserve|auto|remove` control, while keeping `--remove-background` as a compatibility shortcut for forced cutout.
- Edge-connected cutout for opaque generated sprites that preserves sprite-sheet dimensions instead of cropping or repacking frames.
- Background decision reporting in compile/normalize JSON, reports, explanations, verification checks, and compact agent summaries.
- Post-cutout alpha and frame-invariant checks so skipped or unsafe cutout decisions remain visible to agents.

## 0.7.1 Agent Asset Readiness

`0.7.1` was the Agent Asset Readiness package and CLI version.

Released: 2026-05-03 20:05:45 KST (2026-05-03 11:05:45 UTC).

### Added

- Visual quality warnings for likely opaque transparent sprites, surfaced in verify/report compact JSON.
- `verify --strict-visual` and `--quality prototype|default|strict` quality gates.
- `--remove-background`, `--background-mode edge-flood|top-left`, `--background-tolerance`, and `--feather` on normalize/compile sprite flows.
- `--manifest-strategy merge|replace|isolated`, with merge as the default cumulative manifest behavior and same-id updates protected by snapshots.
- Asset-aware `context --json --wire-map` snippets with latest asset path, load path, manifest module, and read-only example code.
- Runtime smoke command semantics: missing runtime is `skipped`, crash is `failed`, launch is `passed`, and optional screenshots are local-only.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.7.1
```

## 0.7.0 Agent Token Saver

`0.7.0` documented the first agent token-saving command surface.

### Added

- `context --json --compact` for shorter agent handoff output.
- `context --json --wire-map` for read-only game-code wiring candidates across supported targets.
- `verify`, `report`, `explain`, and `diff` support `--compact` JSON views with compact table output.
- Documentation updates across README, CLI reference, quickstart, agent usage, LLM reference, troubleshooting, boundaries, web pages, release history, and i18n strings.

### Core Surface

- Compact agent views keep status, next actions, rollback information, and `{ columns, rows }` tables without replacing full JSON or HTML reports.
- Wire-map output reports read-only connection candidates for Phaser, Godot, LOVE2D, PixiJS, and Canvas without editing game code.

## 0.6.1 Developer Kit

`0.6.1` is the first Developer Kit base for the later agent-facing layers.

### Added

- `context --json` for agent handoff: detected target, local paths, latest run, overwrite risks, and next actions.
- `install-agent --platform codex|cursor|claude|all --dry-run --json` for safe agent instruction file planning.
- LLM-optimized reference documentation for dry-run, install plan, manifest, MCP, verification, and rollback behavior.
- Additional media metadata contracts for audio, atlas/tileset, and UI asset metadata.
- Runtime smoke availability checks that report whether supported runtimes are present without requiring runtime execution by default.
- Expanded QA coverage across CLI, adapters, schemas, reports, fixtures, and metadata helpers.

### Core Surface

- Local sprite compile, install, verify, report, diff, explain, and rollback.
- Supported image handoff targets: Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and Canvas + Vite.
- JSON-first agent output for context, scan, doctor, plan, compile, install-agent, verify, report, explain, and diff workflows.
- Local `.openrender/` run state with artifacts, reports, previews, snapshots, and rollback records.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version for that milestone:

```text
0.6.1
```

## 0.5.0 Developer Kit Milestone

`0.5.0` is documented as the milestone that expanded contributor and report surfaces.

### Added

- Adapter scaffolding for bounded custom adapter creation.
- Fixture capture for reproducible adapter and CLI regression cases.
- Report export and report gallery metadata.
- Stronger failure guidance for agent-facing repair loops.

## 0.4.0 Developer Kit Milestone

`0.4.0` is documented as the milestone that broadened the adapter and agent metadata substrate.

### Added

- Shared adapter registry surface.
- PixiJS adapter.
- Canvas adapter.
- Local JSON-only MCP metadata package.
- `agent init` support.
- Built-in recipe substrate for core workflows.

## Release Checklist

Before publishing a tagged release:

- `package.json` version is aligned with package versions under `packages/`.
- `openrender --version` returns the intended version.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm smoke:npm-install` packs the workspace packages, installs them with npm into an isolated global prefix, and verifies the `openrender` binary.
- Packed package manifests replace `workspace:*` dependencies with concrete versions.
- `pnpm -r publish --dry-run --access public --no-git-checks` passes before the real npm publish.
- After publish, `pnpm smoke:registry-install` verifies the live npm package from an isolated global prefix.
- `packages/cli/README.md` is present so the npm package page documents the installed command.
- README language links resolve.
- Agent-facing JSON workflows remain project-contained and do not require account, billing, telemetry, cloud sync, or hosted execution.
- Release notes describe implemented behavior only.

## Related Documents

- [README](./README.md)
- [Roadmap](./ROADMAP.md)
- [Agent Usage](./AGENT_USAGE.md)
- [Adapter Authoring](./ADAPTER_AUTHORING.md)
- [Recipes](./RECIPES.md)
- [MCP Notes](./MCP.md)
