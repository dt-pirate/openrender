import assert from "node:assert/strict";
import { test } from "node:test";
import { createDefaultConfig } from "./config.js";
import { createInitialRun } from "./run-state.js";
import {
  validateMediaContract,
  validateOpenRenderConfig,
  validateOpenRenderRun
} from "./validation.js";
import { OPENRENDER_DEVKIT_VERSION, type MediaContract } from "./types.js";

test("validateOpenRenderConfig accepts the default config", () => {
  const result = validateOpenRenderConfig(createDefaultConfig("sample-game"));

  assert.equal(result.ok, true);
});

test("validateOpenRenderConfig rejects cloud-enabled privacy flags", () => {
  const config = createDefaultConfig("sample-game") as unknown as Record<string, unknown>;
  config.privacy = {
    cloudSync: true,
    telemetry: false,
    uploadArtifacts: false
  };

  const result = validateOpenRenderConfig(config);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.issues.map((issue) => issue.path), ["$.privacy.cloudSync"]);
  }
});

test("validateMediaContract accepts a transparent sprite contract", () => {
  const contract: MediaContract = {
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    mediaType: "visual.transparent_sprite",
    sourcePath: "tmp/slime.png",
    target: {
      engine: "phaser",
      framework: "vite",
      projectRoot: "/tmp/game"
    },
    id: "enemy.slime.idle",
    visual: {
      outputWidth: 64,
      outputHeight: 64,
      padding: 2,
      background: "transparent",
      outputFormat: "png"
    },
    install: {
      enabled: false,
      assetRoot: "public/assets",
      writeManifest: true,
      writeCodegen: false,
      snapshotBeforeInstall: true
    }
  };

  const result = validateMediaContract(contract);

  assert.equal(result.ok, true);
});

test("validateMediaContract rejects invalid sprite frame dimensions", () => {
  const result = validateMediaContract({
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    mediaType: "visual.sprite_frame_set",
    sourcePath: "tmp/slime.png",
    target: {
      engine: "phaser",
      framework: "vite",
      projectRoot: "/tmp/game"
    },
    id: "enemy.slime.idle",
    visual: {
      layout: "horizontal",
      frames: 0,
      frameWidth: 64,
      frameHeight: 64,
      padding: 0,
      background: "transparent",
      outputFormat: "png"
    },
    install: {
      enabled: false,
      assetRoot: "public/assets",
      writeManifest: true,
      writeCodegen: true,
      snapshotBeforeInstall: true
    }
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issues.some((issue) => issue.path === "$.visual.frames"), true);
  }
});

test("validateMediaContract accepts a Godot transparent sprite contract", () => {
  const contract: MediaContract = {
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    mediaType: "visual.transparent_sprite",
    sourcePath: "tmp/tree.png",
    target: {
      engine: "godot",
      framework: "godot",
      projectRoot: "/tmp/game"
    },
    id: "prop.tree",
    visual: {
      outputWidth: 128,
      outputHeight: 128,
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

  const result = validateMediaContract(contract);

  assert.equal(result.ok, true);
});

test("validateMediaContract accepts a LOVE2D transparent sprite contract", () => {
  const contract: MediaContract = {
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
      outputWidth: 128,
      outputHeight: 128,
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

  const result = validateMediaContract(contract);

  assert.equal(result.ok, true);
});

test("validateMediaContract rejects invalid target framework pairs", () => {
  const result = validateMediaContract({
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    mediaType: "visual.transparent_sprite",
    sourcePath: "tmp/tree.png",
    target: {
      engine: "godot",
      framework: "vite",
      projectRoot: "/tmp/game"
    },
    id: "prop.tree",
    visual: {
      outputWidth: 128,
      outputHeight: 128,
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
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issues.some((issue) => issue.path === "$.target.framework"), true);
  }
});

test("validateOpenRenderRun accepts an initialized run", () => {
  const run = createInitialRun({ id: "enemy.slime.idle", mediaType: "visual.sprite_frame_set" });
  const result = validateOpenRenderRun(run);

  assert.equal(result.ok, true);
});

test("validateOpenRenderRun rejects unknown output kinds", () => {
  const run = createInitialRun({ id: "enemy.slime.idle", mediaType: "visual.sprite_frame_set" });
  const result = validateOpenRenderRun({
    ...run,
    outputs: [{ kind: "unexpected_output", path: ".openrender/out.png" }]
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issues.some((issue) => issue.path === "$.outputs[0].kind"), true);
  }
});
