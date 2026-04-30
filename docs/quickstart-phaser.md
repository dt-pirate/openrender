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

## 4. Compile And Install A Sprite

Planned command:

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

Expected outputs:

```text
public/assets/enemies/slime_idle.png
src/assets/openrender-manifest.ts
src/openrender/animations/enemy-slime-idle.ts
.openrender/reports/latest.html
.openrender/reports/latest.json
.openrender/previews/latest.html
```

## 5. Verify, Report, Roll Back

```bash
openrender verify --run latest --open
openrender report --open
openrender rollback --run latest
```

The v0.1 implementation should never require login, billing, cloud sync, telemetry, or a model provider key.
