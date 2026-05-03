# Developer Webpage Design Guide

Current design and messaging guidance for the developer-facing openRender webpage.

## Positioning

The webpage should introduce openRender as local infrastructure for AI agents that turn generated media into engine-ready project files while reducing repeated token-heavy handoff work. It should explain the local handoff loop, compact JSON output, read-only wire maps, reports, rollback, and current engine support.

## Current Truth

- Source of truth: `README.md` and `docs/openRender_v0.7.0.md`.
- Active reference: `docs/openRender_v0.7.0.md`.
- Implemented local compiler core: `0.6.1`; current documentation baseline: `0.7.0 Agent Token Saver`.
- Supported engines: Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and Canvas + Vite.
- Supported media: sprite image handoff, plus P4 metadata contracts for audio, atlas/tileset, and UI assets.
- Current agent surfaces: context, context --compact, context --wire-map, schemas, plan, detect-frames, normalize, install-agent, verify --compact, report --compact, explain --compact, diff --compact, frame preview sheets, built-in core pack, recipe metadata, and local MCP metadata.
- Local core boundary: no metered local compile, credit wallet, required hosted playground, model resale, telemetry, cloud orchestration, account, billing, or model provider call in the Developer Kit path.

## Page Style

Keep the page simple, white, spacious, and developer-tool focused. Use a high-quality wordmark, one clear command surface, and concise sections. Keep the copy focused on implemented local workflow behavior.

## Recommended Content Order

1. What openRender is.
2. Why generated media is hard to use directly in game engines.
3. How the local compiler handoff works.
4. How compact JSON and wire maps reduce repeated agent context.
5. What agents get back: files, helpers, JSON, reports, rollback.
6. Current engine support: Phaser, Godot 4, LOVE2D, PixiJS, and Canvas.
7. Current local core boundaries.
