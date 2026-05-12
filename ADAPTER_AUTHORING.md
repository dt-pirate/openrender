# Adapter Authoring

Adapters convert a validated openRender contract into engine-specific descriptors, install plans, helper code, verification rules, and fixture expectations. The CLI routes built-in sprite contracts through an internal adapter registry so each target owns describe, plan, source generation, and load-path verification behavior.

Built-in adapters in the current state surface:

- `@openrender/adapter-phaser`
- `@openrender/adapter-godot`
- `@openrender/adapter-love2d`
- `@openrender/adapter-pixi`
- `@openrender/adapter-canvas`
- `@openrender/adapter-three`
- `@openrender/adapter-unity`

Create a scaffold:

```bash
openrender adapter create --name my-engine --json
```

The scaffold is intentionally static. Runtime plugin loading is not enabled yet. Before proposing a new adapter, include descriptor tests, install-plan tests, helper generation tests, compile dry-run tests, install/verify/report/rollback tests, and golden fixtures. New adapters should also describe memory/task-packet handoff behavior: helper paths, read-only wire-map hints, verification boundaries, and rollback-safe output shape.
