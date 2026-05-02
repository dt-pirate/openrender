import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract } from "@openrender/core";
import { createPixiAssetDescriptor, createPixiInstallPlan, generatePixiAnimationHelperSource } from "./index.js";

const contract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: { engine: "pixi", framework: "vite", projectRoot: "." },
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
    assetRoot: "public/assets/enemies",
    writeManifest: true,
    writeCodegen: true,
    snapshotBeforeInstall: true
  }
};

test("createPixiAssetDescriptor resolves Vite public URLs", () => {
  const descriptor = createPixiAssetDescriptor(contract);

  assert.equal(descriptor.assetPath, "public/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.publicUrl, "/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.spritesheetJsonPath, "public/assets/enemies/enemy-slime-idle.spritesheet.json");
});

test("generatePixiAnimationHelperSource uses Pixi Assets and AnimatedSprite", () => {
  const source = generatePixiAnimationHelperSource(contract);

  assert.match(source, /Assets\.load/);
  assert.match(source, /AnimatedSprite/);
});

test("createPixiInstallPlan includes asset, manifest, spritesheet json, and helper", () => {
  const plan = createPixiInstallPlan({ contract, compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png" });

  assert.equal(plan.files.length, 4);
  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "manifest", "codegen"]);
});
