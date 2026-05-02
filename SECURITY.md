# Security

openRender Developer Kit 0.2.0 is local-first and agent-first. It should not upload project files, generated assets, reports, telemetry, crash data, or agent run context.

## Developer Kit Safety Rules

- Write only inside the detected project root.
- Do not overwrite existing files unless `--force` or another explicit force policy is implemented and requested.
- Snapshot files before install writes.
- Keep reports local.
- Do not add network calls to the Developer Kit path.
- Do not create Godot `.import` files or write into `.godot/`; Godot owns its import metadata.

## Agent Safety Rules

AI agents using openRender should:

- Prefer `--dry-run --json` before install.
- Treat `installPlan.files` as the complete file write plan.
- Avoid `--force` unless the human user explicitly accepts overwrite risk.
- Run `verify --run latest --json` after install.
- Use `rollback --run latest --json` when abandoning the openRender asset install.
- Avoid attaching `.openrender/reports`, `.openrender/runs`, `.openrender/artifacts`, generated assets, or source images to public issues unless they are safe to share.

## Reporting Issues

For now, use repository issues once the public repository is published. Do not include private game source files, generated assets, credentials, or local reports unless they are safe to share.
