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
