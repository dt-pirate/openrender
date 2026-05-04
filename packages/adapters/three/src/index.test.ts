import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENRENDER_DEVKIT_VERSION, type SpriteFrameSetContract, type TransparentSpriteContract } from "@openrender/core";
import {
  createThreeAssetDescriptor,
  createThreeInstallPlan,
  generateThreeHelperSource,
  generateThreeManifestSource
} from "./index.js";

const frameSetContract: SpriteFrameSetContract = {
  schemaVersion: OPENRENDER_DEVKIT_VERSION,
  mediaType: "visual.sprite_frame_set",
  sourcePath: "tmp/slime_raw.png",
  target: {
    engine: "three",
    framework: "vite",
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
    assetRoot: "public/assets/openrender",
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
    engine: "three",
    framework: "vite",
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
    assetRoot: "public/assets/openrender",
    writeManifest: true,
    writeCodegen: true,
    snapshotBeforeInstall: true
  }
};

test("createThreeAssetDescriptor resolves Vite public URLs", () => {
  const descriptor = createThreeAssetDescriptor(frameSetContract);

  assert.equal(descriptor.engine, "three");
  assert.equal(descriptor.assetPath, "public/assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.loadPath, "/assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.publicUrl, "/assets/openrender/enemy-slime-idle.png");
  assert.equal(descriptor.codegenPath, "src/openrender/three/enemy-slime-idle.ts");
  assert.equal(descriptor.manifestPath, "src/assets/openrender-manifest.ts");
});

test("generateThreeManifestSource includes texture metadata", () => {
  const source = generateThreeManifestSource([transparentContract, frameSetContract]);

  assert.match(source, /openRenderAssets/);
  assert.match(source, /engine: "three"/);
  assert.match(source, /prop\.tree\.oak/);
  assert.match(source, /enemy\.slime\.idle/);
  assert.match(source, /frameWidth: 64/);
});

test("generateThreeHelperSource creates TextureLoader, Sprite, and Plane helpers", () => {
  const source = generateThreeHelperSource(frameSetContract, [
    { index: 0, x: 0, y: 0, width: 64, height: 64 },
    { index: 1, x: 64, y: 0, width: 64, height: 64 }
  ]);

  assert.match(source, /TextureLoader/);
  assert.match(source, /SpriteMaterial/);
  assert.match(source, /PlaneGeometry/);
  assert.match(source, /MeshBasicMaterial/);
  assert.match(source, /createEnemySlimeIdleFrameTexture/);
  assert.match(source, /frame\.x \/ enemySlimeIdleAsset\.sheetWidth/);
});

test("generateThreeHelperSource supports transparent sprites", () => {
  const source = generateThreeHelperSource(transparentContract);

  assert.match(source, /createPropTreeOakSprite/);
  assert.match(source, /createPropTreeOakPlane/);
  assert.match(source, /width: 128/);
});

test("createThreeInstallPlan includes asset, manifest, and helper writes", () => {
  const plan = createThreeInstallPlan({
    contract: frameSetContract,
    compiledAssetPath: ".openrender/artifacts/run_1/enemy-slime-idle.png"
  });

  assert.equal(plan.id, "enemy.slime.idle");
  assert.equal(plan.enabled, true);
  assert.deepEqual(plan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
});
