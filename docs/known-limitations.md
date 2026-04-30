# Known Limitations

This document tracks intentional v0.1 POC limits. These are not bugs unless the behavior contradicts the POC scope.

## Media Scope

- Image assets only.
- No audio compiler.
- No video compiler.
- No 3D asset pipeline.
- No model provider or generation call.

## Visual Harness

- Alpha-based crop/padding is implemented.
- Basic low-alpha edge cleanup is implemented.
- PNG/WebP/JPEG metadata loading is implemented.
- PNG normalization is implemented.
- Solid-background cleanup is not implemented yet.
- Advanced segmentation, matting, and high-quality background removal are out of scope.
- Pivot alignment, jitter detection, and atlas packing are out of scope.

## Engine Scope

- Phaser + Vite is the only v0.1 target.
- Pixi, Canvas, Godot, Unity, and other engines are out of scope.
- Scene auto-patching is out of scope. openRender writes helper files and reports how to import them.

## CLI Scope

- `compile sprite`, `install`, `verify`, `report`, and `rollback` have local implementations.
- `--json` is implemented for the main machine-readable commands, but not every command output has a stable public schema.
- Overwrite requires `--force` for install.

## Product Scope

- No account.
- No billing.
- No license or entitlement checks.
- No cloud API.
- No hosted playground.
- No telemetry.
- No MCP server implementation in v0.1.
