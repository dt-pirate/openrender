import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract } from "@openrender/core";
import { createCanvasAssetDescriptor, createCanvasInstallPlan, generateCanvasAnimationHelperSource } from "./index.js";

const contract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: { engine: "canvas", framework: "vite", projectRoot: "." },
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

test("createCanvasAssetDescriptor resolves Vite public URLs", () => {
  const descriptor = createCanvasAssetDescriptor(contract);

  assert.equal(descriptor.assetPath, "public/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.publicUrl, "/assets/enemies/enemy-slime-idle.png");
  assert.equal(descriptor.codegenPath, "src/openrender/canvas/enemy-slime-idle.ts");
});

test("generateCanvasAnimationHelperSource creates load and draw helpers", () => {
  const source = generateCanvasAnimationHelperSource(contract);

  assert.match(source, /loadImageAsset/);
  assert.match(source, /drawFrame/);
});

test("createCanvasInstallPlan includes asset, manifest, and helper", () => {
  const plan = createCanvasInstallPlan({ contract, compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png" });

  assert.equal(plan.files.length, 3);
  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
});
