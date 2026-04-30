# Security

openRender v0.1 is local-first and should not upload project files, generated assets, reports, telemetry, or crash data.

## POC Safety Rules

- Write only inside the detected project root.
- Do not overwrite existing files unless an explicit force policy is implemented and requested.
- Snapshot files before install writes.
- Keep reports local.
- Do not add network calls to the POC path.

## Reporting Issues

For now, use repository issues once the public repository is published. Do not include private game source files, generated assets, credentials, or local reports unless they are safe to share.
