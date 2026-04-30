# openRender

[![CI](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg)](https://github.com/dt-pirate/openrender/actions/workflows/ci.yml)

openRender is open infrastructure for AI agents turning generated media into engine-ready playable projects.

The v0.1 POC focuses on local image-to-Phaser asset compilation: compile, install, verify, report, and rollback.

## Current Status

This repository is bootstrapped for v0.1 POC development. The first working surface is a local CLI for Vite + Phaser projects. The implementation currently includes the monorepo, package boundaries, schemas, runtime schema validation, project scanner, doctor checks, image processing, Phaser code-generation helpers, install, verify, report, preview, and rollback.

## Scope

v0.1 proves this loop:

```text
raw generated image
-> deterministic visual harness
-> Phaser-ready asset output
-> local project install
-> preview/report
-> verify
-> rollback
```

POC boundaries:

- No account
- No billing
- No cloud API
- No hosted playground
- No model provider calls
- No telemetry
- No MCP server implementation yet
- Vite + Phaser only
- Image assets only

## Workspace

```text
packages/core              shared config, contract, path, run state models
packages/cli               openrender command-line interface
packages/harness-visual    visual pipeline boundary
packages/adapters/phaser   Phaser/Vite output helpers
packages/reporter          report and preview generation boundary
packages/doctor            environment diagnostics
docs/                      POC spec and developer docs
```

## Development

Prerequisites:

- Node.js 22 or newer
- pnpm 10 or newer

Install dependencies:

```bash
pnpm install
```

Build and verify:

```bash
pnpm typecheck
pnpm test
```

Run the CLI from source:

```bash
pnpm dev:cli scan --json
pnpm dev:cli doctor
pnpm dev:cli compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
pnpm dev:cli compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
```

Build the CLI:

```bash
pnpm build
node packages/cli/dist/index.js scan
```

From a Vite + Phaser project directory, the POC CLI supports:

```bash
openrender init
openrender scan
openrender compile sprite --from tmp/slime_raw.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime_raw.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --install --json
openrender install --run latest
openrender verify --run latest
openrender report --run latest
openrender rollback --run latest
```

## Documentation

- [POC spec](docs/openRender_POC_v0.1.md)
- [Phaser quickstart](docs/quickstart-phaser.md)
- [Agent usage](docs/agent-usage.md)
- [CLI reference](docs/cli-reference.md)
- [Media contracts](docs/contracts.md)
- [Release checklist](docs/release-checklist.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Known limitations](docs/known-limitations.md)
- [Developer webpage draft](docs/developer-webpage.html)
- [Developer webpage design guide](docs/developer-webpage-design-guide.md)

## Not This

openRender is not an AI image generator, asset marketplace, prompt playground, hosted game asset API, or credit-based generation service.
