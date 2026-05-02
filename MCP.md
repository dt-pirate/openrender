# MCP

`@openrender/mcp-server` exposes local JSON-only metadata for agent integrations.

Tools:

- `scan`
- `plan`
- `compile`
- `install`
- `verify`
- `rollback`
- `report`
- `explain`

Resources:

- `openrender://schema/contract`
- `openrender://schema/report`
- `openrender://schema/run-output`
- `openrender://runs/latest`
- `openrender://reports/{runId}`

Prompts are available for Phaser, Godot, LOVE2D, PixiJS, and Canvas handoff workflows.

The MCP package does not implement upload, telemetry, sync, account, billing, or hosted report flows.
