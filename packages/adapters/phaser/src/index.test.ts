import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_POC_VERSION, type SpriteFrameSetContract } from "@openrender/core";
import {
  createPhaserAssetDescriptor,
  generateAnimationHelperSource,
  generateManifestSource
} from "./index.js";

const contract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_POC_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: {
    engine: "phaser",
    framework: "vite",
    projectRoot: "."
  },
  id: "enemy.slime.idle",
  visual: {
    layout: "horizontal",
    frames: 6,
    frameWidth: 64,
    frameHeight: 64,
    fps: 8,
    padding: 0,
    background: "transparent",
    outputFormat: "png"
  },
  install: {
    enabled: true,
    assetRoot: "public/assets/enemies",
    writeManifest: true,
    writeCodegen: true,
    snapshotBeforeInstall: true
  }
};

test("createPhaserAssetDescriptor resolves public URLs", () => {
  const descriptor = createPhaserAssetDescriptor(contract);

  assert.equal(descriptor.assetPath, "public/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.publicUrl, "/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.codegenPath, "src/openrender/animations/enemy-slime-idle.ts");
});

test("generateManifestSource includes sprite metadata", () => {
  const source = generateManifestSource([contract]);

  assert.match(source, /enemy\.slime\.idle/);
  assert.match(source, /frameWidth: 64/);
  assert.match(source, /frames: 6/);
});

test("generateAnimationHelperSource creates preload and register helpers", () => {
  const source = generateAnimationHelperSource(contract);

  assert.match(source, /preloadEnemySlimeIdle/);
  assert.match(source, /registerEnemySlimeIdle/);
  assert.match(source, /scene\.load\.spritesheet/);
});
