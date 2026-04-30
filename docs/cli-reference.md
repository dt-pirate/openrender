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
openrender install
openrender verify
openrender report
openrender rollback
openrender --help
openrender --version
```

## Planned For The POC

All required POC commands now have an initial local implementation. Preview generation and `--open` behavior are still planned.

## Commands

### `openrender init`

Creates `openrender.config.json` and `.openrender` state directories.

Options:

- `--target phaser`
- `--framework vite`
- `--force`
- `--json`

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

Applies the install plan from a compiled run.

```bash
openrender install --run latest
openrender install --run run_20260430T120000Z --json
```

Default behavior:

- reads `.openrender/runs/latest.json` unless `--run` is provided
- snapshots destination files into `.openrender/snapshots/{run_id}/`
- refuses to overwrite existing files unless `--force` is provided
- copies the compiled artifact into `public/assets`
- writes the generated manifest/codegen files from the install plan

### `openrender verify`

Checks the compiled artifact, installed files, and installed asset dimensions for a run.

```bash
openrender verify --run latest
openrender verify --run latest --json
```

Preview generation and rollback availability checks are planned but not implemented yet.

### `openrender report`

Writes local report files for a run.

```bash
openrender report --run latest
openrender report --run latest --json
openrender report --run latest --open
```

Current outputs:

- `.openrender/reports/{run_id}.html`
- `.openrender/reports/{run_id}.json`
- `.openrender/reports/latest.html`
- `.openrender/reports/latest.json`
- `.openrender/previews/{run_id}.html`
- `.openrender/previews/latest.html`

`--open` opens the generated HTML report with the local OS file opener.

### `openrender rollback`

Restores or deletes files changed by `openrender install`.

```bash
openrender rollback --run latest
openrender rollback --run latest --json
```

If a destination file existed before install, rollback restores the snapshot. If install created a new file, rollback deletes it.

## Commands Excluded From v0.1

```bash
openrender login
openrender license
openrender billing
openrender sync
openrender worker
openrender generate
```
