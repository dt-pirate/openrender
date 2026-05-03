# Contracts

Media and engine handoff contracts used by the local compiler workflow.

Official JSON schemas live in `schemas/` and can be printed with `openrender schema contract|output|report|install-plan|pack-manifest`.

## Media Contract Types

```text
visual.transparent_sprite
visual.sprite_frame_set
```

Audio, atlas/tileset, and UI metadata are covered by P4 schemas. Video, scene, and 3D contracts are not part of the current local workflow.

## Engine Asset Descriptor

```ts
interface EngineAssetDescriptor {
  id: string;
  engine: "phaser" | "godot" | "love2d" | "pixi" | "canvas";
  type: "transparent_sprite" | "sprite_frame_set";
  assetPath: string;
  loadPath: string;
  manifestPath: string | null;
  codegenPath: string | null;
}
```

## Compile Output Fields

Compile JSON includes deterministic handoff fields for agents:

```text
alpha
agentSummary
recipe
installPlan
validation
invariants
frameSlices
framePreview
run
```

For sprite frame sets, `framePreview` points to `.openrender/runs/{runId}/preview_frames.png` when the source geometry is valid.

## Built-in Pack Manifest

The local Developer Kit exposes a built-in `core` pack. It is local metadata for agent context and does not require login, billing, sync, telemetry, or cloud execution.

## Phaser Output Shape

```text
assetRoot: public/assets
sourceRoot: src
assetPath: public/assets/{asset}.png
loadPath: /assets/{asset}.png
manifestPath: src/assets/openrender-manifest.ts
codegenPath: src/openrender/animations/{asset}.ts
```

## Godot Output Shape

```text
assetRoot: assets/openrender
sourceRoot: scripts/openrender
assetPath: assets/openrender/{asset}.png
loadPath: res://assets/openrender/{asset}.png
manifestPath: scripts/openrender/openrender_assets.gd
codegenPath: scripts/openrender/animations/{asset}.gd
```

## LOVE2D Output Shape

```text
assetRoot: assets/openrender
sourceRoot: openrender
assetPath: assets/openrender/{asset}.png
loadPath: assets/openrender/{asset}.png
manifestPath: openrender/openrender_assets.lua
codegenPath: openrender/animations/{asset}.lua
```
