# Boundaries

What the local workflow supports, and where it intentionally stops.

## Supported

- Image asset compilation to PNG artifacts.
- Transparent sprite and sprite frame set contracts.
- Official JSON schemas, plan output, explain output, and diff output.
- Alpha diagnostics, frame detection, sprite invariants, normalize presets, and frame preview sheets.
- Built-in local core pack and recipe metadata.
- Vite + Phaser asset installation.
- Godot 4 image asset installation.
- LOVE2D image asset installation.
- PixiJS + Vite image asset installation.
- Plain Canvas + Vite image asset installation.
- Local JSON-only MCP metadata for tools, resources, and prompts.
- Local reports, previews, snapshots, verification, and rollback.
- Compact agent output for context, verify, report, explain, and diff.
- Read-only wiring candidates through `context --json --wire-map`.

## Local Core Boundary

The Developer Kit stays local-first: it does not require remote accounts, billing, license services, cloud APIs, hosted workers, report sync, remote artifact caches, model provider calls, BYOK generation, or telemetry.

Scene and runtime edits remain explicit agent work. openRender writes generated assets, manifests, helpers, local reports, compact views, and rollback records; it reports wiring candidates but does not auto-patch Phaser, Godot, LOVE2D, PixiJS, or Canvas gameplay code.

Godot `.import`/`.godot` files, LOVE2D `.love` archives, runtime launch, video, 3D, advanced matting, and segmentation remain outside the local image handoff scope. P4 audio, atlas, and UI metadata are schema-backed surfaces rather than full runtime asset pipelines.

## Runtime Boundary

Verification checks local handoff invariants. It does not prove Phaser canvas runtime behavior, Godot editor/headless runtime behavior, or LOVE2D runtime behavior.
