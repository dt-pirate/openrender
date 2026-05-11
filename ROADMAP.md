# openRender Roadmap

## Current Baseline: 1.0.1 Memory Infrastructure Foundation

- Documentation baseline and package version: openRender `1.0.1 Memory Infrastructure Foundation`.
- Local sprite compile/install/verify/report/rollback for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity.
- Visual reference records for sketches, UI mockups, concept art, video URLs, and local reference files. Remote URLs are provenance only and are not downloaded.
- `detect-motion` analysis for video, GIF, PNG sequence directories, and sprite sheets before install.
- `compile animation` for engine-ready animation sheets, target helper files, wire-map handoff, verification, reports, diffs, explanations, and rollback.
- Tiered runtime integration helpers across all supported engines: Phaser, Godot, LOVE2D, Unity, PixiJS, Three.js, and Canvas.
- Agent loop runner, task packets, and completion records that track runId, report, verification status, next actions, rollback command, engine packet guidance, completion notes, and no-regeneration boundaries.
- Memory infrastructure that turns runs, loops, and user feedback into derived project events, conclusions, project cards, agent cards, and compact context for follow-up agent tasks.
- `memory status`, `memory ingest`, `memory context`, `memory consolidate`, and `clean --memory` for agent continuity without raw chat-log accumulation.
- Local audio, atlas/tileset, and UI compile/install/verify/report/rollback through the same run-state pipeline.
- Compact agent views for context, verify, report, explain, diff, and motion recommendations.
- Read-only `context --json --wire-map` wiring candidates plus latest asset path, helper path, manifest module, suggested use, and example snippets.
- Safe automatic generated-sprite cutout through default `--background-policy auto`.
- Manifest strategies: default `merge`, explicit `replace`, and `isolated`.
- Engine readiness verification checks for Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity, plus explicit local runtime smoke semantics for Godot/LOVE2D.
- Safe `install-agent --platform codex|cursor|claude|all --dry-run --json` planning for local agent instruction files.
- Local MCP metadata package for JSON-only agent tool/resource/prompt surfaces.
- Contributor support through adapter scaffolding and fixture capture.
- Local report export and local report gallery metadata.

## Maintained Boundaries

- Local compile/install does not require accounts, billing, telemetry, cloud APIs, model calls, or remote sync.
- Remote reference URLs are never downloaded automatically.
- Runtime smoke execution remains explicit and local-only.
- Video/GIF frame extraction requires local ffmpeg tooling; PNG sequence analysis does not.
- Godot `.import`, Unity `.meta`, Unity `Library/`, scenes, prefabs, and component wiring remain owned by the engine/editor.
- openRender reports wiring candidates and generates helper files, but does not auto-edit gameplay code.
- Agent loops do not call model providers, regenerate assets, scrape URLs, download references, or patch game code.
- openRender memory does not call external memory services, model provider APIs, or asset generators.
- Memory records are derived project state, not a raw note-taking layer or conversation archive.

## Next Product Direction

- Deepen engine-specific helper quality with fixture-backed examples from real production patterns.
- Expand visual verification for animation loops, contact sheets, and target-specific helper readiness.
- Expand memory-derived task packets into richer project-state continuity while keeping storage compact and pruneable.
- Keep documentation focused on what users can run today, while keeping longer product planning outside public-facing docs.
