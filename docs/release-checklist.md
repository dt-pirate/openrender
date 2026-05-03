# Release Checklist

Checks for the current local Developer Kit surface.

## Preflight

- [ ] README describes openRender as a local-first media-to-engine compiler and agent token saver.
- [ ] Docs point to `docs/openRender_v0.7.0.md` as the active local reference.
- [ ] Local compile/install is described as local Developer Kit behavior, not a metered cloud service.
- [ ] Phaser, Godot, LOVE2D, PixiJS, and Canvas adapter packages build.
- [ ] Schemas, plan, explain, diff, compact output, wire-map, detect-frames, normalize, frame preview sheets, and built-in core pack/recipe metadata are documented.
- [ ] README, scope, CLI, and limitation docs mention Phaser, Godot, LOVE2D, PixiJS, and Canvas support.
- [ ] No docs imply required accounts, billing, telemetry, model calls, or cloud orchestration for local core use.
- [ ] GitHub-facing docs link to the canonical Vercel production docs URL: `https://docs-gamma-orcin.vercel.app`.
- [ ] GitHub-facing docs do not use per-deployment Vercel URLs as stable links.

## Docs Deployment

- [ ] Run `vercel deploy docs --prod -y` from the repository root.
- [ ] Run `vercel inspect <deployment-url>` and confirm the aliases include `https://docs-gamma-orcin.vercel.app`.
- [ ] Treat `https://docs-<hash>-stelify87s-projects.vercel.app` URLs as inspection artifacts only.
- [ ] Treat GitHub Pages as an optional mirror. If needed, enable Pages with source `GitHub Actions` in repository settings.

## Local Verification

```bash
pnpm typecheck
pnpm test
pnpm dev:cli -- --version
pnpm dev:cli -- scan --json
```

## Smoke Coverage

- [ ] Phaser compile/install/verify/report/rollback workflow.
- [ ] Godot compile/install/verify/report/rollback workflow.
- [ ] LOVE2D compile/install/verify/report/rollback workflow.
- [ ] PixiJS compile/install/verify/report/rollback workflow.
- [ ] Canvas compile/install/verify/report/rollback workflow.
- [ ] `context --json --compact` returns a short project handoff.
- [ ] `context --json --wire-map` returns read-only wiring candidates without editing game code.
- [ ] `verify/report/explain/diff --compact` return compact JSON tables.
- [ ] Godot workflow does not write `.import` or `.godot/`.
- [ ] LOVE2D workflow does not create `.love` archives or launch the runtime.
- [ ] Package tarball install smoke check passes before publishing.
- [ ] Built-in pack/recipe commands return local metadata.
- [ ] Remote pack sync, login, and license refresh return honest JSON and do not imply remote sync is already implemented.

## Do Not Release If

- Any command requires credentials, telemetry, billing, cloud sync, or account setup.
- Local compile/install is presented as usage-metered or credit-wallet driven.
- Local metadata commands are presented as implemented billing, license enforcement, or cloud compile.
- Godot support is described as editor/runtime smoke-tested beyond local file handoff.
- LOVE2D support is described as runtime-launched or archive-packaged beyond local file handoff.
- Docs omit Godot 4, LOVE2D, PixiJS, or Canvas support.
