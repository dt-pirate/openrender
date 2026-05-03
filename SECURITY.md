# Security

openRender Developer Kit 0.7.1 is local-first and agent-first. It should not upload project files, generated assets, reports, telemetry, crash data, or agent run context.

## Developer Kit Safety Rules

- Write only inside the detected project root.
- Do not overwrite existing files unless `--force`, manifest `merge`, same-id manifest update, or another explicit force policy is implemented and requested.
- Snapshot files before install writes.
- Keep `context --json` compact and free of image payloads, credentials, or private source content.
- Keep `install-agent --dry-run --json` side-effect free.
- Keep reports local.
- Do not add network calls to the Developer Kit path.
- Do not create Godot `.import` files or write into `.godot/`; Godot owns its import metadata.
- Do not create `.love` archives or run the LOVE2D runtime during the default verification path. Runtime smoke is explicit and local-only.

## Agent Safety Rules

AI agents using openRender should:

- Prefer `plan sprite --json` or `compile sprite --dry-run --json` before install.
- Start with `context --json` before broad repository reads.
- Treat `installPlan.files` as the complete file write plan.
- Avoid `--force` unless the human user explicitly accepts overwrite risk.
- Use manifest `merge` for cumulative generated entries; use `replace` or `isolated` only when that write policy is intended.
- Use `verify --strict-visual` when likely transparency mistakes should fail instead of warn.
- Run `verify --run latest --json` after install.
- Use `explain --run latest --json` and `diff --run latest --json` to inspect the installed run without reading unrelated project files.
- Use `rollback --run latest --json` when abandoning the openRender asset install.
- Avoid attaching `.openrender/reports`, `.openrender/runs`, `.openrender/artifacts`, generated assets, or source images to public issues unless they are safe to share.

## Reporting Issues

For now, use repository issues once the public repository is published. Do not include private game source files, generated assets, credentials, or local reports unless they are safe to share.
