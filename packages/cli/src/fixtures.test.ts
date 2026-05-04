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
const repoRoot = path.resolve(currentDir, "../../..");
const fixturesRoot = path.join(repoRoot, "fixtures");

interface FixtureSpec {
  name: string;
  target: string;
  inputPngBase64: string;
  args: string[];
  expected: {
    mediaType: string;
    assetPath: string;
    installKinds: string[];
  };
}

test("golden fixtures match compile output shape", async () => {
  const fixtureDirs = await fs.readdir(fixturesRoot);
  const fixtureCountByTarget = new Map<string, number>();

  for (const fixtureDir of fixtureDirs) {
    const fixturePath = path.join(fixturesRoot, fixtureDir, "fixture.json");
    try {
      await fs.access(fixturePath);
    } catch {
      continue;
    }

    const spec = JSON.parse(await fs.readFile(fixturePath, "utf8")) as FixtureSpec;
    fixtureCountByTarget.set(spec.target, (fixtureCountByTarget.get(spec.target) ?? 0) + 1);
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), `openrender-fixture-${spec.name}-`));
    await fs.writeFile(path.join(projectRoot, "input.png"), Buffer.from(spec.inputPngBase64, "base64"));

    const { stdout } = await execFileAsync(process.execPath, [cliPath, ...spec.args], {
      cwd: projectRoot
    });
    const result = JSON.parse(stdout) as {
      contract: { mediaType: string };
      outputPlan: { assetPath: string };
      installPlan: { files: Array<{ kind: string }> };
    };

    assert.equal(result.contract.mediaType, spec.expected.mediaType, spec.name);
    assert.equal(result.outputPlan.assetPath, spec.expected.assetPath, spec.name);
    assert.deepEqual(result.installPlan.files.map((file) => file.kind), spec.expected.installKinds, spec.name);
  }

  for (const target of ["phaser", "godot", "love2d", "pixi", "canvas", "unity"]) {
    assert.equal((fixtureCountByTarget.get(target) ?? 0) >= 2, true, `${target} should have at least two golden fixtures`);
  }
});
