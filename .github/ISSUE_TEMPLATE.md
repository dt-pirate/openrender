# Issue

## What happened?

Describe the bug, question, or proposal.

If this came from an AI agent workflow, include the exact openRender command sequence the agent ran. Do not include private source files, generated assets, credentials, or local reports unless they are safe to share.

## Expected behavior

What did you expect openRender to do?

## Reproduction

```bash
openrender --version
openrender scan --json
openrender doctor --json
openrender compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
```

If the issue happened after install:

```bash
openrender compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json
```

## Environment

- OS:
- Node.js:
- pnpm:
- openRender command:

## Agent context

- Was this run by an AI agent? yes/no
- Target project type: Vite + Phaser / Godot 4 / other
- Asset mode: transparent sprite / sprite frame set
- Did the command use `--dry-run` before install? yes/no
- Did the command use `--force`? yes/no

## Scope check

openRender Developer Kit 0.2.0 is local-first, image-only, and focused on Vite + Phaser plus Godot 4 asset workflows. Do not attach private game source files, credentials, generated assets, or local reports unless they are safe to share publicly.
