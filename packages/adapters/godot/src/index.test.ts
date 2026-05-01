import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract, type TransparentSpriteContract } from "@openrender/core";
import {
  createGodotAssetDescriptor,
  createGodotInstallPlan,
  generateGodotAnimationHelperSource,
  generateGodotManifestSource
} from "./index.js";

const frameSetContract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: {
    engine: "godot",
    framework: "godot",
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
    assetRoot: "assets/openrender",
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
    engine: "godot",
    framework: "godot",
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
    assetRoot: "assets/openrender",
    writeManifest: true,
    writeCodegen: false,
    snapshotBeforeInstall: true
  }
};

test("createGodotAssetDescriptor resolves res paths", () => {
  const descriptor = createGodotAssetDescriptor(frameSetContract);

  assert.equal(descriptor.engine, "godot");
  assert.equal(descriptor.assetPath, "assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.loadPath, "res://assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.codegenPath, "scripts/openrender/animations/enemy-slime-idle.gd");
  assert.equal(descriptor.manifestPath, "scripts/openrender/openrender_assets.gd");
});

test("generateGodotManifestSource includes sprite metadata", () => {
  const source = generateGodotManifestSource([transparentContract, frameSetContract]);

  assert.match(source, /OPENRENDER_ASSETS/);
  assert.match(source, /prop\.tree\.oak/);
  assert.match(source, /res:\/\/assets\/openrender\/prop-tree-oak\.png/);
  assert.match(source, /frame_width/);
});

test("generateGodotAnimationHelperSource creates SpriteFrames helper", () => {
  const source = generateGodotAnimationHelperSource(frameSetContract, [
    { index: 0, x: 0, y: 0, width: 64, height: 64 },
    { index: 1, x: 64, y: 0, width: 64, height: 64 }
  ]);

  assert.match(source, /create_sprite_frames/);
  assert.match(source, /AtlasTexture/);
  assert.match(source, /SpriteFrames/);
  assert.match(source, /"x": 64/);
});

test("createGodotInstallPlan includes asset, manifest, and codegen writes", () => {
  const plan = createGodotInstallPlan({
    contract: frameSetContract,
    compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png"
  });

  assert.equal(plan.id, "enemy.slime.idle");
  assert.equal(plan.enabled, true);
  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
});
