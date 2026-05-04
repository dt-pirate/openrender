# Version History

Last updated: 2026-05-04

This page tracks the implemented openRender Developer Kit surface, tagged GitHub releases, and documented version milestones.

## Current Version

| Field | Value |
|---|---|
| Current docs baseline | `0.7.2 Default Cutout` |
| Package/CLI version | `0.7.2` |
| CLI | `openrender` |
| Runtime | Node.js `>=22` |
| Package manager | pnpm `10.x` |
| License | Apache-2.0 |
| Release channel | GitHub release `v0.7.2` |
| Release timestamp | 2026-05-04 16:41:29 KST (2026-05-04 07:41:29 UTC) |
| GitHub release | `https://github.com/dt-pirate/openrender/releases/tag/v0.7.2` |
| Public docs | `https://docs-gamma-orcin.vercel.app` |

## 0.7.2 Default Cutout

`0.7.2` is the current implemented package and CLI version.

Released: 2026-05-04 16:41:29 KST (2026-05-04 07:41:29 UTC).

### Added

- Safe automatic generated-sprite background cutout through default `--background-policy auto`.
- Explicit `--background-policy preserve|auto|remove` control, while keeping `--remove-background` as a compatibility shortcut for forced cutout.
- Edge-connected cutout for opaque generated sprites that preserves sprite-sheet dimensions instead of cropping or repacking frames.
- Background decision reporting in compile/normalize JSON, reports, explanations, verification checks, and compact agent summaries.
- Post-cutout alpha and frame-invariant checks so skipped or unsafe cutout decisions remain visible to agents.

### Verification

Run:

```bash
pnpm typecheck
pnpm test
node packages/cli/dist/index.js --version
```

Expected CLI version:

```text
0.7.2
```

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

`0.6.1` is the local-first Developer Kit base.

### Added

- `context --json` for agent handoff: detected target, local paths, latest run, overwrite risks, and next actions.
- `install-agent --platform codex|cursor|claude|all --dry-run --json` for safe agent instruction file planning.
- LLM-optimized reference documentation for dry-run, install plan, manifest, MCP, verification, and rollback behavior.
- P4 media metadata contracts for audio, atlas/tileset, and UI asset metadata.
- Runtime smoke availability checks that report whether supported runtimes are present without requiring runtime execution by default.
- Expanded QA coverage across CLI, adapters, schemas, reports, fixtures, and local metadata helpers.

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
- Report export and local report gallery metadata.
- Stronger failure guidance for agent-facing repair loops.

## 0.4.0 Developer Kit Milestone

`0.4.0` is documented as the milestone that broadened the adapter and agent metadata substrate.

### Added

- Shared adapter registry surface.
- PixiJS adapter.
- Canvas adapter.
- Local JSON-only MCP metadata package.
- `agent init` support.
- Built-in recipe substrate for local core workflows.

## Release Checklist

Before publishing a tagged release:

- `package.json` version is aligned with package versions under `packages/`.
- `openrender --version` returns the intended version.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- README language links resolve.
- GitHub-facing docs use `https://docs-gamma-orcin.vercel.app` as the canonical public docs URL.
- Per-deployment Vercel URLs are not used as stable links in README, release notes, or issue templates.
- Agent-facing JSON workflows remain local-first and do not require account, billing, telemetry, cloud sync, or hosted execution.
- Release notes describe implemented behavior only.

## Related Documents

- [README](./README.md)
- [Public Docs](https://docs-gamma-orcin.vercel.app)
- [Roadmap](./ROADMAP.md)
- [Agent Usage](./AGENT_USAGE.md)
- [Adapter Authoring](./ADAPTER_AUTHORING.md)
- [Recipes](./RECIPES.md)
- [MCP Notes](./MCP.md)
