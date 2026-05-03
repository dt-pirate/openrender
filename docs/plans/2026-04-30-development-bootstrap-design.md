# openRender Development Bootstrap Design

Date: 2026-04-30

## Context

The approved v0.1 spec defines openRender v0.1 as a local-first media-to-engine compiler for AI agents. The first wedge is a Vite + Phaser Web 2D project. The first media scope is image-only, specifically transparent sprites and sprite frame sets.

## Decision

Bootstrap the repository as a TypeScript pnpm monorepo with package boundaries matching the v0.1 architecture:

- `@openrender/core`
- `@openrender/cli`
- `@openrender/harness-visual`
- `@openrender/adapter-phaser`
- `@openrender/reporter`
- `@openrender/doctor`

The bootstrap should make `init`, `scan`, and `doctor` usable immediately. Image processing, install execution, verification execution, and rollback execution remain next milestones.

## Trade-Offs

This approach does not implement the full compiler in the first step. It instead creates tested seams for core contracts, safe path handling, Phaser code generation, CLI orchestration, and diagnostics. That keeps the first commit small enough to verify while avoiding a throwaway prototype structure.

## Success Criteria

- The repository is a git repository on `main`.
- `pnpm install` succeeds.
- `pnpm typecheck` succeeds.
- `pnpm test` succeeds.
- `pnpm dev:cli scan --json` runs.
- v0.1 docs and contributor docs exist at expected paths.
