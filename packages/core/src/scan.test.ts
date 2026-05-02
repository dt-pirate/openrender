import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scanProject } from "./index.js";

test("scanProject detects Vite and Phaser dependencies", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-scan-"));
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.mkdir(path.join(root, "public/assets"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "sample-game",
      dependencies: {
        phaser: "^3.90.0"
      },
      devDependencies: {
        vite: "^6.0.0"
      }
    }),
    "utf8"
  );

  const scan = await scanProject(root);

  assert.equal(scan.packageName, "sample-game");
  assert.equal(scan.framework, "vite");
  assert.equal(scan.engine, "phaser");
  assert.equal(scan.assetRootExists, true);
  assert.equal(scan.sourceRootExists, true);
});

test("scanProject detects Godot projects", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-scan-godot-"));
  await fs.mkdir(path.join(root, "assets/openrender"), { recursive: true });
  await fs.mkdir(path.join(root, "scripts/openrender"), { recursive: true });
  await fs.writeFile(path.join(root, "project.godot"), "[application]\nconfig/name=\"Sample\"\n", "utf8");

  const scan = await scanProject(root);

  assert.equal(scan.framework, "godot");
  assert.equal(scan.engine, "godot");
  assert.equal(scan.assetRoot, "assets/openrender");
  assert.equal(scan.assetRootExists, true);
  assert.equal(scan.sourceRoot, "scripts/openrender");
  assert.equal(scan.sourceRootExists, true);
  assert.equal(path.basename(scan.manifestPath), "openrender_assets.gd");
});

test("scanProject detects LOVE2D projects", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-scan-love2d-"));
  await fs.mkdir(path.join(root, "assets/openrender"), { recursive: true });
  await fs.mkdir(path.join(root, "openrender"), { recursive: true });
  await fs.writeFile(path.join(root, "main.lua"), "function love.draw() end\n", "utf8");

  const scan = await scanProject(root);

  assert.equal(scan.framework, "love2d");
  assert.equal(scan.engine, "love2d");
  assert.equal(scan.assetRoot, "assets/openrender");
  assert.equal(scan.assetRootExists, true);
  assert.equal(scan.sourceRoot, "openrender");
  assert.equal(scan.sourceRootExists, true);
  assert.equal(path.basename(scan.manifestPath), "openrender_assets.lua");
});

test("scanProject detects PixiJS Vite projects", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-scan-pixi-"));
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.mkdir(path.join(root, "public/assets"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "sample-pixi",
      dependencies: { "pixi.js": "^8.0.0" },
      devDependencies: { vite: "^6.0.0" }
    }),
    "utf8"
  );

  const scan = await scanProject(root);

  assert.equal(scan.framework, "vite");
  assert.equal(scan.engine, "pixi");
  assert.equal(scan.assetRoot, "public/assets");
  assert.equal(scan.sourceRoot, "src");
});

test("scanProject treats plain Vite as Canvas", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-scan-canvas-"));
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.mkdir(path.join(root, "public/assets"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "sample-canvas",
      devDependencies: { vite: "^6.0.0" }
    }),
    "utf8"
  );

  const scan = await scanProject(root);

  assert.equal(scan.framework, "vite");
  assert.equal(scan.engine, "canvas");
});
