# CLI Reference

The CLI command is:

```bash
openrender
```

## Implemented In The Bootstrap

```bash
openrender init
openrender scan
openrender doctor
openrender compile sprite
openrender --help
openrender --version
```

## Planned For The POC

```bash
openrender install
openrender verify
openrender report
openrender rollback
```

## Commands

### `openrender init`

Creates `openrender.config.json` and `.openrender` state directories.

Options:

- `--target phaser`
- `--framework vite`
- `--force`

### `openrender scan`

Detects local project shape.

Options:

- `--json`

### `openrender doctor`

Runs environment and project diagnostics.

Options:

- `--json`

### `openrender compile sprite`

Converts a local raw image into a compiled artifact under `.openrender/artifacts/{run_id}/`, creates a media contract, validates frame dimensions, builds a Phaser output plan, and writes `.openrender/runs/{run_id}.json` plus `.openrender/runs/latest.json`.

Dry-run mode prints the same contract and install plan without writing files:

```bash
openrender compile sprite \
  --from tmp/slime.png \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Options currently supported:

- `--from`
- `--id`
- `--target phaser`
- `--framework vite`
- `--frames`
- `--frame-size`
- `--layout horizontal`
- `--padding`
- `--output-size`
- `--asset-root`
- `--dry-run`
- `--json`

`--install` is not implemented yet.

### `openrender install`

Planned command for applying an install plan with snapshots and safe writes.

### `openrender verify`

Planned command for checking output files, image dimensions, manifest/codegen, preview generation, and rollback availability.

### `openrender report`

Planned command for opening or printing local report paths.

### `openrender rollback`

Planned command for restoring files from a run snapshot.

## Commands Excluded From v0.1

```bash
openrender login
openrender license
openrender billing
openrender sync
openrender worker
openrender generate
```
