# @openrender/cli

Install the openRender CLI from npm, then run the `openrender` command inside a game project.

```bash
npm install -g @openrender/cli
openrender --version
```

openRender is a local Developer Kit for AI-agent-native game development. It turns existing generated game media into engine-ready project files, helper code, reports, verification records, rollback state, and compact project memory.

## Common Commands

```bash
openrender context --json --compact
openrender scan --json
openrender doctor --json
openrender install-agent --platform codex --dry-run --json
```

Compile and inspect before writing files:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Install, verify, and summarize:

```bash
openrender compile sprite --from tmp/slime_idle_strip.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender diff --run latest --json --compact
```

For local continuity between agent runs:

```bash
openrender memory ingest --run latest --json
openrender memory context --json --compact
openrender service snapshot --json
```

The package name is `@openrender/cli`; the installed binary is `openrender`.
