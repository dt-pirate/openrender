# openRender Roadmap

## 0.7.1 Agent Asset Readiness

- Documentation baseline and package version: openRender `0.7.1 Agent Asset Readiness`.
- Local sprite compile/install/verify/report/rollback for Phaser, Godot, LOVE2D, PixiJS, and Canvas.
- Adapter registry surface through shared target types, adapter packages, and CLI dispatch for describe, install-plan, helper generation, and load-path verification.
- Built-in recipe metadata under `recipes/`.
- Compact `context --json` handoff for target/path/latest-run/overwrite-risk summaries.
- Compact agent views for context, verify, report, explain, and diff.
- Read-only `context --json --wire-map` wiring candidates plus latest asset path, manifest module, and example snippets for supported targets.
- Visual quality warnings, `verify --strict-visual`, and `--quality prototype|default|strict`.
- Edge-flood background removal via `--remove-background --background-mode edge-flood`.
- Manifest strategies: default `merge`, explicit `replace`, and `isolated`.
- Runtime smoke semantics for explicit local Godot/LOVE2D launch checks.
- Safe `install-agent --platform codex|cursor|claude|all --dry-run --json` planning for local agent instruction files.
- Local MCP metadata package for JSON-only agent tool/resource/prompt surfaces.
- LLM reference documentation for dry-run, install plan, manifest, verification, and rollback behavior.
- Contributor support through adapter scaffolding and fixture capture.
- Local report export and local report gallery metadata.
- P4 media metadata surfaces for audio, atlas/tileset, UI assets, and runtime smoke availability checks.

## Maintained Boundaries

- Local compile/install does not require accounts, billing, telemetry, cloud APIs, model calls, or remote sync.
- Runtime smoke execution remains explicit and local-only.
- openRender reports wiring candidates but does not auto-edit gameplay code.
