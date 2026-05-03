# Release Checklist

Checks for the current 0.3.1 reference direction and the existing local compiler surface.

## Preflight

- [ ] README describes openRender as a local-first media-to-engine compiler and agent token saver.
- [ ] Docs point to `docs/openRender_v0.6.1.md` as the active local reference.
- [ ] Local compile/install is described as free core behavior, not a metered hosted service.
- [ ] Recipe packs, agent packs, updates, support, hosted workers, and OEM/platform licensing are framed as future value surfaces.
- [ ] Phaser, Godot, and LOVE2D adapter packages build.
- [ ] Schemas, plan, explain, diff, detect-frames, normalize, frame preview sheets, and built-in core pack/recipe metadata are documented.
- [ ] README, scope, CLI, and limitation docs mention Phaser, Godot, and LOVE2D support.
- [ ] No docs imply required hosted accounts, billing, telemetry, model calls, or cloud orchestration for local core use.

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
- [ ] Godot workflow does not write `.import` or `.godot/`.
- [ ] LOVE2D workflow does not create `.love` archives or launch the runtime.
- [ ] Package tarball install smoke check passes before publishing.
- [ ] Built-in pack/recipe commands return local metadata.
- [ ] Remote pack sync, login, and license refresh return honest JSON and do not imply remote sync is already implemented.

## Do Not Release If

- Any command requires credentials, telemetry, billing, cloud sync, or account setup.
- Local compile/install is presented as usage-metered or credit-wallet driven.
- Pack strategy is presented as implemented billing, license enforcement, or hosted compile.
- Godot support is described as editor/runtime smoke-tested beyond local file handoff.
- LOVE2D support is described as runtime-launched or archive-packaged beyond local file handoff.
- Docs omit Godot 4 or LOVE2D support.
