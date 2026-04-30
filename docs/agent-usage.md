# Agent Usage

This guide is for coding agents using openRender inside a local Vite + Phaser project.

## Scope

openRender v0.1 is intentionally narrow:

- local CLI only
- Vite + Phaser only
- image assets only
- no account, billing, cloud API, telemetry, MCP server, or model provider call

The agent should treat openRender as a deterministic local compiler, not as an image generator.

## Command Names

Use `openrender` after the CLI package is installed or published.

When developing this repository from source, use the same arguments through `pnpm dev:cli`:

```bash
pnpm dev:cli scan --json
pnpm dev:cli compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
```

## Default Agent Workflow

1. Confirm the project root.
2. Run `openrender scan --json`.
3. If `.openrender` or `openrender.config.json` is missing, run `openrender init --target phaser --framework vite`.
4. Run a dry-run compile first.
5. If the dry run succeeds, run `openrender compile sprite ... --install`.
6. Run `openrender verify --run latest --json`.
7. Run `openrender report --run latest --json`.
8. If the user needs to inspect the report, run `openrender report --run latest --open`.
9. If the install should be undone, run `openrender rollback --run latest`.

## Sprite Frame Set Example

```bash
openrender scan --json
openrender compile sprite \
  --from tmp/slime_raw.png \
  --target phaser \
  --framework vite \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal \
  --dry-run \
  --json
openrender compile sprite \
  --from tmp/slime_raw.png \
  --target phaser \
  --framework vite \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal \
  --install \
  --json
openrender verify --run latest --json
openrender report --run latest --json
```

## Transparent Sprite Example

For a single transparent sprite, omit `--frames` and `--frame-size`:

```bash
openrender compile sprite \
  --from tmp/tree_raw.png \
  --target phaser \
  --framework vite \
  --id props.tree.oak \
  --padding 2 \
  --install \
  --json
openrender verify --run latest --json
openrender report --run latest --open
```

## Failure Handling

If a command fails, do not guess silently. Inspect the run and report:

```bash
openrender report --run latest --json
openrender report --run latest --open
```

The HTML report includes validation and verification results plus next-action suggestions for known failures.

Common next steps:

- frame validation failed: adjust `--frames`, `--frame-size`, or regenerate the source image at the expected dimensions
- installed file missing: run `openrender install --run latest`
- overwrite refused: ask before using `--force`
- generated files should be reverted: run `openrender rollback --run latest`

## Safety Rules For Agents

- Do not upload source images, reports, or project files.
- Do not use network services in the v0.1 workflow.
- Do not run `--force` unless the user explicitly agrees.
- Do not edit Phaser scenes automatically; openRender writes asset and helper files only.
- Do not claim runtime gameplay verification. `openrender verify` checks files and image invariants only.
- Keep report JSON/HTML paths in the final answer so the user can inspect them.

## Prompt Template

```text
Use openRender to convert tmp/slime_raw.png into a Phaser-ready 6-frame idle spritesheet.
Install it into the current Vite + Phaser project, verify the generated files, and open the local report.
Do not overwrite existing files unless you ask first.
```

## Expected Final Answer Shape

When reporting back to the user, include:

- asset id
- installed file paths
- verify status
- report path
- rollback command if the change should be undone
