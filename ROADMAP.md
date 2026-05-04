# openRender Roadmap

## 0.8.2 Three.js Support

- Documentation baseline and package version: openRender `0.8.2 Three.js Support`.
- Local sprite compile/install/verify/report/rollback for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity.
- Local audio, atlas/tileset, and UI compile/install/verify/report/rollback through the same run-state pipeline.
- Adapter registry surface through shared target types, adapter packages, and CLI dispatch for describe, install-plan, helper generation, and load-path verification.
- Built-in recipe metadata under `recipes/`.
- Compact `context --json` handoff for target/path/latest-run/overwrite-risk summaries.
- Compact agent views for context, verify, report, explain, and diff.
- Read-only `context --json --wire-map` wiring candidates plus latest asset path, manifest module, and example snippets for supported targets.
- Safe automatic generated-sprite cutout through default `--background-policy auto`.
- Edge-flood background removal with explicit `--background-policy preserve|auto|remove` control and legacy `--remove-background` compatibility.
- Sprite-frame-set cutout that preserves sheet dimensions and validates processed frame invariants.
- Visual quality warnings, background decision reporting, `verify --strict-visual`, and `--quality prototype|default|strict`.
- Manifest strategies: default `merge`, explicit `replace`, and `isolated`.
- Engine readiness verification checks for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity, plus runtime smoke semantics for explicit local Godot/LOVE2D launch checks.
- Safe `install-agent --platform codex|cursor|claude|all --dry-run --json` planning for local agent instruction files.
- Local MCP metadata package for JSON-only agent tool/resource/prompt surfaces.
- LLM reference documentation for dry-run, install plan, manifest, verification, and rollback behavior.
- Contributor support through adapter scaffolding and fixture capture.
- Local report export and local report gallery metadata.
- Additional media pipeline surfaces for audio, atlas/tileset, UI assets, local manifests, helper files, verification, reports, and rollback.
- Unity C# manifests, sprite helpers, media helpers, read-only wire maps, import-boundary verification, and golden fixtures.
- Three.js TypeScript manifests, `TextureLoader`, `Sprite`, and `PlaneGeometry` helpers, read-only wire maps, load-path verification, and golden fixtures.

## Maintained Boundaries

- Local compile/install does not require accounts, billing, telemetry, cloud APIs, model calls, or remote sync.
- Runtime smoke execution remains explicit and local-only.
- openRender reports wiring candidates but does not auto-edit gameplay code.
