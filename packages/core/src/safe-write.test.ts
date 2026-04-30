import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  safeCopyProjectFile,
  safeWriteProjectFile,
  snapshotProjectFile
} from "./index.js";

test("safeWriteProjectFile writes inside project root", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-write-"));

  const result = await safeWriteProjectFile({
    projectRoot: root,
    relativePath: "src/generated.txt",
    contents: "ok"
  });

  assert.equal(result.relativePath, "src/generated.txt");
  assert.equal(await fs.readFile(path.join(root, "src/generated.txt"), "utf8"), "ok");
});

test("safeWriteProjectFile refuses overwrites by default", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-overwrite-"));
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(path.join(root, "src/generated.txt"), "old", "utf8");

  await assert.rejects(() => safeWriteProjectFile({
    projectRoot: root,
    relativePath: "src/generated.txt",
    contents: "new"
  }), /Refusing to overwrite/);
});

test("snapshotProjectFile copies existing files into snapshot root", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-snapshot-"));
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(path.join(root, "src/generated.txt"), "old", "utf8");

  const snapshot = await snapshotProjectFile({
    projectRoot: root,
    snapshotRoot: ".openrender/snapshots/run_1",
    relativePath: "src/generated.txt"
  });

  assert.equal(snapshot.existed, true);
  assert.equal(snapshot.snapshotPath, ".openrender/snapshots/run_1/src/generated.txt");
  assert.equal(await fs.readFile(path.join(root, snapshot.snapshotPath), "utf8"), "old");
});

test("safeCopyProjectFile copies files without overwriting", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-copy-"));
  await fs.mkdir(path.join(root, ".openrender/artifacts/run_1"), { recursive: true });
  await fs.writeFile(path.join(root, ".openrender/artifacts/run_1/sprite.png"), "asset", "utf8");

  await safeCopyProjectFile({
    projectRoot: root,
    fromRelativePath: ".openrender/artifacts/run_1/sprite.png",
    toRelativePath: "public/assets/sprite.png"
  });

  assert.equal(await fs.readFile(path.join(root, "public/assets/sprite.png"), "utf8"), "asset");
});
