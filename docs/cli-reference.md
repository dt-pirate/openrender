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
openrender --help
openrender --version
```

## Planned For The POC

```bash
openrender compile sprite
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

Planned command for converting a local raw image into a visual asset contract and compiled Phaser-ready output.

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
