# Recipes

Recipes are data, not hidden behavior. They describe target, media type, and expected handoff intent so agents can choose a repeatable workflow and keep future task packets aligned with project state.

Recipe files live in `recipes/` and can be validated locally:

```bash
openrender context --json
openrender recipe list --json
openrender recipe inspect core.sprite-frame-set --json
openrender recipe validate --json
```

The 1.1.1 baseline includes recipes and pack metadata for the current local project-state surface: Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, and Unity targets; sprite, animation, audio, atlas/tileset, and UI handoff patterns; compact context; creator-taste and visual-evidence memory; read-only wire-map usage; verification; reports; memory ingest/query/review; service snapshots; optional build smoke checks; and rollback boundaries.
