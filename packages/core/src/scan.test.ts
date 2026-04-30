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
