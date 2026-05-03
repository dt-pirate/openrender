# MCP

`@openrender/mcp-server` exposes local JSON-only metadata for agent integrations.

Tools:

- `context`
- `scan`
- `plan`
- `compile`
- `install`
- `verify`
- `rollback`
- `report`
- `explain`
- `install-agent`

Resources:

- `openrender://schema/contract`
- `openrender://schema/report`
- `openrender://schema/run-output`
- `openrender://context`
- `openrender://docs/llm-reference`
- `openrender://runs/latest`
- `openrender://reports/{runId}`

Prompts are available for Phaser, Godot, LOVE2D, PixiJS, and Canvas handoff workflows.

Recommended MCP sequence is `context`, `compile --dry-run`, install only after reviewing `installPlan.files`, then `verify`, `report`, `explain`, and `rollback` when needed.

The MCP package stays within the local Developer Kit boundary: JSON-only metadata, local command execution, no upload, no telemetry, no sync, and no hosted account or billing requirement.
