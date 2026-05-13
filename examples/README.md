# openRender Examples

These examples are small target projects for testing the installed CLI:

```bash
npm install -g @openrender/cli
openrender --version
```

Use them as local smoke projects, not as production game templates.

## LOVE2D Minimal

```bash
cd examples/love2d-minimal
openrender context --json --compact
openrender smoke --target love2d --json
```

If `love` is installed, the smoke command launches the project briefly. If not, it reports `skipped` and keeps the static checks as the boundary.

## Phaser Vite Minimal

```bash
cd examples/phaser-vite-minimal
npm install
openrender context --json --compact
openrender smoke --target phaser --build --json
```

The web smoke is opt-in: `--build` runs the local build script so agents can verify a generated asset handoff without opening a hosted page.
