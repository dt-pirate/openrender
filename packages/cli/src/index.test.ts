import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(currentDir, "index.js");

test("compile sprite dry-run emits a transparent sprite plan as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP7plQAAAABJRU5ErkJggg==",
      "base64"
    )
  );

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--dry-run",
    "--json"
  ], {
    cwd: root
  });

  const result = JSON.parse(stdout) as {
    contract: { mediaType: string; id: string };
    outputPlan: { assetPath: string; manifestPath: string };
  };

  assert.equal(result.contract.mediaType, "visual.transparent_sprite");
  assert.equal(result.contract.id, "prop.dot");
  assert.equal(result.outputPlan.assetPath, "public/assets/prop-dot.png");
  assert.equal(result.outputPlan.manifestPath, "src/assets/openrender-manifest.ts");
});

test("compile sprite dry-run validates a horizontal frame set", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-frame-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP7plQAAAABJRU5ErkJggg==",
      "base64"
    )
  );

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "enemy.dot.idle",
    "--frames",
    "1",
    "--frame-size",
    "1x1",
    "--dry-run",
    "--json"
  ], {
    cwd: root
  });

  const result = JSON.parse(stdout) as {
    contract: { mediaType: string };
    validation: { ok: boolean };
  };

  assert.equal(result.contract.mediaType, "visual.sprite_frame_set");
  assert.equal(result.validation.ok, true);
});
