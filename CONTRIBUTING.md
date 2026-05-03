# Contributing

openRender Developer Kit 0.6.1 is local-first and agent-first. Keep changes aligned with the Developer Kit scope:

- Prefer local deterministic behavior over cloud services.
- Optimize CLI behavior for AI agents that need structured output, deterministic paths, and safe rollback.
- Keep the current targets focused on Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and Canvas + Vite.
- Keep the first media scope image-only.
- Keep account, billing, licensing services, telemetry, and hosted APIs out of Developer Kit 0.6.1.
- Add tests for shared contracts, path safety, code generation, and CLI behavior.

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Package Boundaries

- `@openrender/core` owns shared models and safe project filesystem helpers.
- `@openrender/cli` owns command parsing and orchestration.
- `@openrender/harness-visual` owns deterministic visual processing.
- `@openrender/adapter-phaser` owns Phaser/Vite output generation.
- `@openrender/adapter-godot` owns Godot 4 output generation.
- `@openrender/adapter-love2d` owns LOVE2D Lua output generation.
- `@openrender/adapter-pixi` owns PixiJS/Vite output generation.
- `@openrender/adapter-canvas` owns Canvas/Vite output generation.
- `@openrender/reporter` owns local report and preview generation.
- `@openrender/doctor` owns environment diagnostics.
- `@openrender/mcp-server` owns local JSON-only MCP metadata.

Do not add cloud, billing, auth, or provider integration code to these Developer Kit packages.

## Docs Deployment Rules

The canonical public docs URL is the Vercel production alias:

```text
https://docs-gamma-orcin.vercel.app
```

- Use the canonical Vercel alias in GitHub README files, release notes, issues, and user-facing references.
- Do not replace it with a per-deployment Vercel URL such as `https://docs-<hash>-stelify87s-projects.vercel.app`.
- Deploy production docs from the repository root with `vercel deploy docs --prod -y`.
- After deployment, run `vercel inspect <deployment-url>` and confirm `https://docs-gamma-orcin.vercel.app` appears in the alias list.
- Treat GitHub Pages as an optional mirror. It requires repository settings to enable Pages with source `GitHub Actions`, and it should not become the canonical docs URL.

## Agent-Facing CLI Rules

When changing CLI behavior, preserve these agent contracts:

- Every workflow command should remain usable with `--json`.
- JSON fields should be stable, explicit, and safe for an agent to branch on.
- `context --json` should remain compact enough to use before broad repository reads.
- Dry-run output should describe planned files without writing project files.
- `install-agent --dry-run --json` should preview instruction file writes before creating them.
- Install should snapshot destination files before writing.
- Existing destination files should not be overwritten unless the caller explicitly passes `--force`.
- Verification failures should return non-zero and include enough structured detail for an agent to choose the next command.
- Reports should stay local and should include compact agent summaries, recipe metadata, and likely next actions when validation or verification fails.
- Rollback should only operate on files recorded by the openRender install result.

## Expected Agent Workflow

Use this workflow as the baseline when reviewing changes:

```bash
openrender context --json
openrender scan --json
openrender doctor --json
openrender install-agent --platform all --dry-run --json
openrender pack list --json
openrender recipe list --json
openrender plan sprite --from tmp/slime.png --id enemy.slime --output-size 64x64 --json
openrender compile sprite --from tmp/slime.png --id enemy.slime --output-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime.png --id enemy.slime --output-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
```

Godot workflows should use the same dry-run/install/verify/report loop:

```bash
openrender compile sprite --from tmp/slime.png --target godot --id enemy.slime --output-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime.png --target godot --id enemy.slime --output-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json
```

LOVE2D workflows should use the same dry-run/install/verify/report loop:

```bash
openrender compile sprite --from tmp/slime.png --target love2d --id enemy.slime --output-size 64x64 --dry-run --json
openrender compile sprite --from tmp/slime.png --target love2d --id enemy.slime --output-size 64x64 --install --json
openrender verify --run latest --json
openrender report --run latest --json
```

Frame-set workflows should also cover validation failures:

```bash
openrender compile sprite --from tmp/slime_idle.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run --json
```
