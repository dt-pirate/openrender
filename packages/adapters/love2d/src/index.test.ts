import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract, type TransparentSpriteContract } from "@openrender/core";
import {
  createLove2DAssetDescriptor,
  createLove2DInstallPlan,
  generateLove2DAnimationHelperSource,
  generateLove2DManifestSource
} from "./index.js";

const frameSetContract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime.png",
  target: {
    engine: "love2d",
    framework: "love2d",
    projectRoot: "/tmp/game"
  },
  id: "enemy.slime.idle",
  visual: {
    layout: "horizontal_strip",
    frames: 2,
    frameWidth: 16,
    frameHeight: 16,
    fps: 10,
    padding: 0,
    background: "transparent",
    outputFormat: "png"
  },
  install: {
    enabled: true,
    assetRoot: "assets/openrender",
    writeManifest: true,
    writeCodegen: true,
    snapshotBeforeInstall: true
  }
};

const transparentContract: TransparentSpriteContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.transparent_sprite",
  sourcePath: "tmp/tree.png",
  target: {
    engine: "love2d",
    framework: "love2d",
    projectRoot: "/tmp/game"
  },
  id: "prop.tree",
  visual: {
    outputWidth: 64,
    outputHeight: 64,
    padding: 0,
    background: "transparent",
    outputFormat: "png"
  },
  install: {
    enabled: true,
    assetRoot: "assets/openrender",
    writeManifest: true,
    writeCodegen: false,
    snapshotBeforeInstall: true
  }
};

test("createLove2DAssetDescriptor resolves Lua load paths", () => {
  const descriptor = createLove2DAssetDescriptor(frameSetContract);

  assert.equal(descriptor.engine, "love2d");
  assert.equal(descriptor.assetPath, "assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.loadPath, "assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.manifestPath, "openrender/openrender_assets.lua");
  assert.equal(descriptor.codegenPath, "openrender/animations/enemy-slime-idle.lua");
});

test("generateLove2DManifestSource includes sprite metadata", () => {
  const source = generateLove2DManifestSource([transparentContract, frameSetContract]);

  assert.match(source, /return assets/);
  assert.match(source, /engine = "love2d"/);
  assert.match(source, /assets\/openrender\/enemy-slime-idle\.png/);
});

test("generateLove2DAnimationHelperSource creates quad helper", () => {
  const source = generateLove2DAnimationHelperSource(frameSetContract, [
    { index: 0, x: 0, y: 0, width: 16, height: 16 },
    { index: 1, x: 16, y: 0, width: 16, height: 16 }
  ]);

  assert.match(source, /love\.graphics\.newImage/);
  assert.match(source, /love\.graphics\.newQuad/);
  assert.match(source, /frame_count = 2/);
});

test("createLove2DInstallPlan includes asset, manifest, and codegen writes", () => {
  const plan = createLove2DInstallPlan({
    contract: frameSetContract,
    compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png"
  });

  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
  assert.equal(plan.files[0]?.to, "assets/openrender/enemy-slime-idle.png");
  assert.equal(plan.files[1]?.to, "openrender/openrender_assets.lua");
  assert.equal(plan.files[2]?.to, "openrender/animations/enemy-slime-idle.lua");
});
