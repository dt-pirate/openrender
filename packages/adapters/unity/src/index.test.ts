import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract, type TransparentSpriteContract } from "@openrender/core";
import {
  createUnityAssetDescriptor,
  createUnityInstallPlan,
  generateUnityAnimationHelperSource,
  generateUnityManifestSource
} from "./index.js";

const frameSetContract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: {
    engine: "unity",
    framework: "unity",
    projectRoot: "."
  },
  id: "enemy.slime.idle",
  visual: {
    layout: "horizontal_strip",
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
    assetRoot: "Assets/OpenRender/Generated",
    writeManifest: true,
    writeCodegen: true,
    snapshotBeforeInstall: true
  }
};

const transparentContract: TransparentSpriteContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.transparent_sprite",
  sourcePath: "tmp/tree_raw.png",
  target: {
    engine: "unity",
    framework: "unity",
    projectRoot: "."
  },
  id: "prop.tree.oak",
  visual: {
    outputWidth: 128,
    outputHeight: 128,
    padding: 4,
    background: "transparent",
    outputFormat: "png"
  },
  install: {
    enabled: true,
    assetRoot: "Assets/OpenRender/Generated",
    writeManifest: true,
    writeCodegen: false,
    snapshotBeforeInstall: true
  }
};

test("createUnityAssetDescriptor resolves Unity project asset paths", () => {
  const descriptor = createUnityAssetDescriptor(frameSetContract);

  assert.equal(descriptor.engine, "unity");
  assert.equal(descriptor.assetPath, "Assets/OpenRender/Generated/enemy-slime-idle.png");
  assert.equal(descriptor.loadPath, "Assets/OpenRender/Generated/enemy-slime-idle.png");
  assert.equal(descriptor.codegenPath, "Assets/OpenRender/Sprites/EnemySlimeIdleSprites.cs");
  assert.equal(descriptor.manifestPath, "Assets/OpenRender/OpenRenderAssets.cs");
});

test("generateUnityManifestSource includes Unity C# asset metadata", () => {
  const source = generateUnityManifestSource([transparentContract, frameSetContract]);

  assert.match(source, /namespace OpenRender/);
  assert.match(source, /OpenRenderAssets/);
  assert.match(source, /prop\.tree\.oak/);
  assert.match(source, /Assets\/OpenRender\/Generated\/prop-tree-oak\.png/);
  assert.match(source, /FrameWidth = 64/);
});

test("generateUnityAnimationHelperSource creates Sprite helper code", () => {
  const source = generateUnityAnimationHelperSource(frameSetContract, [
    { index: 0, x: 0, y: 0, width: 64, height: 64 },
    { index: 1, x: 64, y: 0, width: 64, height: 64 }
  ]);

  assert.match(source, /using UnityEngine/);
  assert.match(source, /Sprite\.Create/);
  assert.match(source, /new Rect\(64f, 0f, 64f, 64f\)/);
});

test("createUnityInstallPlan includes asset, manifest, and codegen writes", () => {
  const plan = createUnityInstallPlan({
    contract: frameSetContract,
    compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png"
  });

  assert.equal(plan.id, "enemy.slime.idle");
  assert.equal(plan.enabled, true);
  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
});
