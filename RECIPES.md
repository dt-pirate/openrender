# Recipes

Recipes are data, not hidden behavior. They describe target, media type, and expected handoff intent so agents can choose a repeatable local workflow.

Recipe files live in `recipes/` and can be validated locally:

```bash
openrender recipe list --json
openrender recipe inspect core.sprite-frame-set --json
openrender recipe validate --json
```

The 0.6.0 repo includes target recipes for Phaser, Godot, LOVE2D, PixiJS, and Canvas sprite frame sets.
