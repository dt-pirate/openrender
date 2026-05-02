# Adapter Authoring

Adapters convert a validated openRender contract into engine-specific descriptors, install plans, helper code, verification rules, and fixture expectations.

Current built-in adapters:

- `@openrender/adapter-phaser`
- `@openrender/adapter-godot`
- `@openrender/adapter-love2d`
- `@openrender/adapter-pixi`
- `@openrender/adapter-canvas`

Create a scaffold:

```bash
openrender adapter create --name my-engine --json
```

The scaffold is intentionally static. Runtime plugin loading is not enabled yet. Before proposing a new adapter, include descriptor tests, install-plan tests, helper generation tests, compile dry-run tests, install/verify/report/rollback tests, and at least two golden fixtures.
