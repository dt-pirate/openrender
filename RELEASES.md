# Version History

Last updated: 2026-05-03

This page tracks the implemented openRender Developer Kit surface and the documented version milestones.

Release dates are intentionally omitted until the repository starts publishing tagged GitHub releases. The current source-of-truth version is the package metadata in `package.json` and the CLI version returned by `openrender --version`.

## Current Version

| Field | Value |
|---|---|
| Current Developer Kit | `0.6.1` |
| CLI | `openrender` |
| Runtime | Node.js `>=22` |
| Package manager | pnpm `10.x` |
| License | Apache-2.0 |
| Release channel | Local source build |

## 0.6.1 Developer Kit

`0.6.1` is the current local-first Developer Kit version.

### Added

- `context --json` for compact agent handoff: detected target, local paths, latest run, overwrite risks, and next actions.
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

Expected CLI version:

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

## Strategy Baseline

The current Developer Kit keeps local compile/install usage as the free core. Optional hosted workers, remote pack distribution, license/update infrastructure, support bundles, and OEM/platform licensing are future surfaces, not local core requirements.

## Release Checklist

Before publishing a tagged release:

- `package.json` version is aligned with package versions under `packages/`.
- `openrender --version` returns the intended version.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- README language links resolve.
- Agent-facing JSON workflows remain local-first and do not require account, billing, telemetry, cloud sync, or hosted execution.
- Release notes describe implemented behavior only.

## Related Documents

- [README](./README.md)
- [Roadmap](./ROADMAP.md)
- [Agent Usage](./AGENT_USAGE.md)
- [Adapter Authoring](./ADAPTER_AUTHORING.md)
- [Recipes](./RECIPES.md)
- [MCP Notes](./MCP.md)
