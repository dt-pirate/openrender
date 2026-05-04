import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runDoctor } from "./index.js";

test("runDoctor returns checks for an empty project", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-doctor-"));
  const result = await runDoctor(root);

  assert.equal(result.projectRoot, root);
  assert.ok(result.checks.some((check) => check.name === "node_version"));
  assert.ok(result.checks.some((check) => check.name === "openrender_state"));
});

test("runDoctor reports Three.js Vite projects", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-doctor-three-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { three: "^0.176.0" }, devDependencies: { vite: "^7.0.0" } }),
    "utf8"
  );

  const result = await runDoctor(root);

  assert.equal(result.scan.engine, "three");
  assert.ok(result.checks.some((check) => check.name === "three" && check.status === "passed"));
});
