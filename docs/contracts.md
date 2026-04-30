# Media Contracts

openRender uses media contracts instead of prompts as its core unit.

A contract describes:

- input source
- media type
- target engine and framework
- output shape
- install destination
- generated code requirements
- verification expectations

## POC Media Types

```text
visual.transparent_sprite
visual.sprite_frame_set
```

Future media types are intentionally not implemented in v0.1:

```text
audio.sound_effect
audio.music_loop
video.cutscene_clip
scene.prefab
scene.patch
```

## Sprite Frame Set

```json
{
  "schemaVersion": "0.1",
  "mediaType": "visual.sprite_frame_set",
  "sourcePath": "tmp/slime_raw.png",
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "enemy.slime.idle",
  "visual": {
    "layout": "horizontal_strip",
    "frames": 6,
    "frameWidth": 64,
    "frameHeight": 64,
    "padding": 4,
    "background": "transparent",
    "outputFormat": "png"
  },
  "install": {
    "enabled": true,
    "assetRoot": "public/assets",
    "writeManifest": true,
    "writeCodegen": true,
    "snapshotBeforeInstall": true
  },
  "verify": {
    "preview": true,
    "checkFrameCount": true,
    "checkLoadPath": true
  }
}
```

## Transparent Sprite

```json
{
  "schemaVersion": "0.1",
  "mediaType": "visual.transparent_sprite",
  "sourcePath": "tmp/tree_raw.png",
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "prop.tree.oak",
  "visual": {
    "outputWidth": 128,
    "outputHeight": 128,
    "padding": 8,
    "background": "transparent",
    "outputFormat": "png"
  },
  "install": {
    "enabled": true,
    "assetRoot": "public/assets/props",
    "writeManifest": true,
    "writeCodegen": false,
    "snapshotBeforeInstall": true
  }
}
```
