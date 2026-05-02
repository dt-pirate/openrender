# Troubleshooting

Common local workflow issues for Phaser, Godot, and LOVE2D image asset handoff.

## Scan Does Not Detect Phaser

Check that `phaser` and `vite` exist in the target `package.json`.

## Scan Does Not Detect Godot

Check that `project.godot` exists at the project root. Godot editor cache files are not required for openRender detection.

## Scan Does Not Detect LOVE2D

Check that `main.lua` or `conf.lua` exists at the project root.

## Frame Count Mismatch

For a horizontal strip, image width must equal `frames * frameWidth`. Adjust `--frames`, `--frame-size`, or regenerate the source image.

## Godot Import Metadata Is Missing

openRender does not write `.import` or `.godot/` metadata. Open or refresh the Godot project so the editor owns import cache generation.

## LOVE2D Runtime Does Not Launch

openRender does not run LOVE2D or create `.love` archives. Require the generated Lua module from `openrender/`, load images with `love.graphics.newImage`, and run LOVE2D through your normal project command.

## File Overwrite

Install refuses to overwrite destination files unless `--force` is passed. Use dry-run and report output before deciding to force an install.

## Manifest Entries Disappear

Generated manifest files are written from the current compile result. They are not automatically merged with older manifest entries. If you install multiple assets, manage separate runs carefully, regenerate the manifest from the intended asset set, or confirm that overwriting the manifest is acceptable before using `--force`.

Rollback only affects files in the selected openRender install plan. It does not revert game code edits made separately by an agent.
