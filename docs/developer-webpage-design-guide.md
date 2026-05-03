# Developer Webpage Design Guide

Current design and messaging guidance for the developer-facing openRender webpage.

## Positioning

The webpage should introduce openRender as local infrastructure for AI agents that turn generated media into engine-ready playable project files while reducing repeated token-heavy handoff work. It should explain the local handoff loop, recipe/pack strategy, and long-term media-to-engine vision before listing current engine support.

## Current Truth

- Source of truth: `README.md` and `docs/openRender_v0.6.1.md`.
- Reference direction: `0.3.1`.
- Implemented local compiler core: `0.6.1`.
- Supported engines: Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and Canvas + Vite.
- Supported media: image assets only.
- Current agent surfaces: context, schemas, plan, detect-frames, normalize, install-agent, explain, diff, frame preview sheets, built-in core pack, recipe metadata, and local MCP metadata.
- Monetization principle: local compile remains free; paid value comes from recipe packs, agent packs, update access, support, hosted workers, and OEM/platform licensing.
- Local core boundary: no metered local compile, credit wallet, required hosted playground, model resale, telemetry, cloud orchestration, account, billing, or model provider call in the Developer Kit path.

## Page Style

Keep the page simple, white, spacious, and developer-tool focused. Use a high-quality wordmark, one clear command surface, and concise sections. Mention pack strategy as direction, not as active pricing or enforcement.

## Recommended Content Order

1. What openRender is.
2. Why generated media is hard to use directly in game engines.
3. How the local compiler handoff works.
4. How recipes and packs reduce repeated agent context.
5. What agents get back: files, helpers, JSON, reports, rollback.
6. Current engine support: Phaser, Godot 4, LOVE2D, PixiJS, and Canvas.
7. Vision: a broader media-to-engine infrastructure layer.
