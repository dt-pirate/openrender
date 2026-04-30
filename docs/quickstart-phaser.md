# Phaser Quickstart

This guide describes the intended v0.1 workflow for a Vite + Phaser project.

## 1. Install

During local development, run the CLI through the workspace:

```bash
pnpm dev:cli --help
```

After packaging, the command will be:

```bash
openrender --help
```

## 2. Initialize A Target Project

From a Vite + Phaser project root:

```bash
openrender init --target phaser --framework vite
```

Expected files:

```text
openrender.config.json
.openrender/
  artifacts/
  cache/
  previews/
  reports/
  runs/
  snapshots/
```

## 3. Scan

```bash
openrender scan
openrender scan --json
```

The scanner checks:

- package manager
- Vite dependency
- Phaser dependency
- `public/assets`
- `src`
- openRender config
- local state directory

## 4. Dry-Run A Sprite Compile

Implemented now:

```bash
openrender compile sprite \
  --from ./tmp/slime_raw.png \
  --target phaser \
  --framework vite \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal \
  --dry-run \
  --json
```

This reads image metadata, builds a media contract, validates horizontal frame dimensions, and prints the Phaser output plan without writing files.

## 5. Compile And Install A Sprite

Compile and install in one command:

```bash
openrender compile sprite \
  --from ./tmp/slime_raw.png \
  --target phaser \
  --framework vite \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal \
  --install
```

Compile output:

```text
.openrender/artifacts/{run_id}/{asset_file}.png
.openrender/runs/{run_id}.json
.openrender/runs/latest.json
```

Or install the latest compiled run separately:

```bash
openrender install --run latest
```

Expected install outputs:

```text
public/assets/{asset_file}.png
src/assets/openrender-manifest.ts
src/openrender/animations/{asset_file}.ts
```

## 6. Verify, Report, Roll Back

```bash
openrender verify --run latest
openrender report --run latest --open
openrender rollback --run latest
```

`verify` is implemented for artifact, installed file, and image dimension checks. `report` writes local HTML/JSON reports. `rollback` restores snapshots or deletes files created by install.

The v0.1 implementation should never require login, billing, cloud sync, telemetry, or a model provider key.
