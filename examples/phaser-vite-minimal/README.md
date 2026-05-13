# Phaser Vite Minimal

Minimal Phaser + Vite project for openRender build smoke checks.

```bash
npm install
openrender context --json --compact
openrender smoke --target phaser --build --json
```

Generated assets should be installed under `public/assets/`; generated manifests and helpers should be installed under `src/`.
