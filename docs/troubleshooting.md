# Troubleshooting

## `openrender scan` Does Not Detect Phaser

Check that `phaser` exists in `dependencies` or `devDependencies` in the target `package.json`.

## `openrender scan` Does Not Detect Vite

Check that `vite` exists in `dependencies` or `devDependencies`.

## Missing `public/assets`

Create the directory or run:

```bash
openrender init
```

## Frame Count Mismatch

For a horizontal strip, image width must equal:

```text
frames * frameWidth
```

For a grid, the final implementation will validate rows, columns, frame size, and total frame count.

## Background Removal Quality

v0.1 only targets transparent PNGs and simple solid backgrounds. Complex matting and segmentation are outside the POC.

## File Overwrite

The POC default is no destructive overwrite. Install writes should snapshot files before modifying or replacing them.
