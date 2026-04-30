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
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test("version prints the npm package version", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "--version"
  ]);

  assert.equal(stdout.trim(), "0.1.0");
});

test("init emits JSON when requested", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-init-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "sample-game" }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "init",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    configPath: string;
    statePath: string;
    configCreated: boolean;
    stateDirectoriesCreated: string[];
  };

  assert.equal(result.configCreated, true);
  assert.equal(path.basename(result.configPath), "openrender.config.json");
  assert.equal(path.basename(result.statePath), ".openrender");
  assert.ok(result.stateDirectoriesCreated.includes(".openrender/runs"));
  assert.equal(await fileExists(path.join(root, "openrender.config.json")), true);
});

test("compile sprite dry-run emits a transparent sprite plan as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(onePixelPng, "base64")
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
    installPlan: { files: Array<{ kind: string }> };
  };

  assert.equal(result.contract.mediaType, "visual.transparent_sprite");
  assert.equal(result.contract.id, "prop.dot");
  assert.equal(result.outputPlan.assetPath, "public/assets/prop-dot.png");
  assert.equal(result.outputPlan.manifestPath, "src/assets/openrender-manifest.ts");
  assert.deepEqual(result.installPlan.files.map((file) => file.kind), ["compiled_asset", "manifest"]);
});

test("compile sprite dry-run validates a horizontal frame set", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-frame-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(onePixelPng, "base64")
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
    frameSlices: Array<{ index: number; x: number; y: number; width: number; height: number }>;
  };

  assert.equal(result.contract.mediaType, "visual.sprite_frame_set");
  assert.equal(result.validation.ok, true);
  assert.deepEqual(result.frameSlices, [{ index: 0, x: 0, y: 0, width: 1, height: 1 }]);
});

test("compile sprite writes artifact and run JSON without install", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-compile-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(onePixelPng, "base64")
  );

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--json"
  ], {
    cwd: root
  });

  const result = JSON.parse(stdout) as {
    dryRun: boolean;
    artifact: { path: string; metadata: { format: string } };
    run: { runId: string; status: string; outputs: Array<{ path: string }> };
  };

  assert.equal(result.dryRun, false);
  assert.equal(result.artifact.metadata.format, "png");
  assert.equal(result.run.status, "completed");
  assert.match(result.run.outputs[0]?.path ?? "", /^\.openrender\/artifacts\/run_/);
  assert.equal(await fileExists(path.join(root, result.run.outputs[0]?.path ?? "")), true);
  assert.equal(await fileExists(path.join(root, ".openrender/runs/latest.json")), true);
});

test("install latest run writes planned files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-install-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--json"
  ], {
    cwd: root
  });

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "install",
    "--run",
    "latest",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    writes: Array<{ relativePath: string }>;
  };

  assert.deepEqual(result.writes.map((write) => write.relativePath), [
    "public/assets/prop-dot.png",
    "src/assets/openrender-manifest.ts"
  ]);
  assert.equal(await fileExists(path.join(root, "public/assets/prop-dot.png")), true);
  assert.match(await fs.readFile(path.join(root, "src/assets/openrender-manifest.ts"), "utf8"), /prop\.dot/);
});

test("compile sprite can install the compiled run", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-compile-install-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    installResult: { writes: Array<{ relativePath: string }> };
    run: { runId: string };
  };

  assert.deepEqual(result.installResult.writes.map((write) => write.relativePath), [
    "public/assets/prop-dot.png",
    "src/assets/openrender-manifest.ts"
  ]);
  assert.equal(await fileExists(path.join(root, "public/assets/prop-dot.png")), true);
  assert.equal(await fileExists(path.join(root, ".openrender/runs", `${result.run.runId}.install.json`)), true);
});

test("install rejects malformed run records", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-invalid-run-"));
  await fs.mkdir(path.join(root, ".openrender/runs"), { recursive: true });
  await fs.writeFile(path.join(root, ".openrender/runs/latest.json"), JSON.stringify({
    contract: { mediaType: "visual.unknown" },
    run: { runId: "run_bad", outputs: [], privacy: {} },
    installPlan: { files: [] }
  }), "utf8");

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "install", "--run", "latest"], { cwd: root }),
    (error: unknown) => {
      const stderr = error instanceof Error && "stderr" in error
        ? String(error.stderr)
        : "";
      assert.match(stderr, /Invalid openRender run record/);
      return true;
    }
  );
});

test("verify latest run passes after install", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-verify-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--json"
  ], {
    cwd: root
  });
  await execFileAsync(process.execPath, [cliPath, "install", "--run", "latest"], {
    cwd: root
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    status: string;
    checks: Array<{ status: string }>;
  };

  assert.equal(result.status, "passed");
  assert.equal(result.checks.every((check) => check.status === "passed"), true);
  const record = JSON.parse(await fs.readFile(path.join(root, ".openrender/runs/latest.json"), "utf8")) as {
    run: { status: string; verification?: { status: string } };
  };
  assert.equal(record.run.status, "verified");
  assert.equal(record.run.verification?.status, "passed");
});

test("report latest run writes html and json reports", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-report-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--json"
  ], {
    cwd: root
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    htmlPath: string;
    jsonPath: string;
    previewHtmlPath: string;
    latestHtmlPath: string;
    latestJsonPath: string;
    latestPreviewHtmlPath: string;
    opened: boolean;
  };

  assert.equal(await fileExists(path.join(root, result.htmlPath)), true);
  assert.equal(await fileExists(path.join(root, result.jsonPath)), true);
  assert.equal(await fileExists(path.join(root, result.previewHtmlPath)), true);
  assert.equal(await fileExists(path.join(root, result.latestHtmlPath)), true);
  assert.equal(await fileExists(path.join(root, result.latestJsonPath)), true);
  assert.equal(await fileExists(path.join(root, result.latestPreviewHtmlPath)), true);
  assert.equal(result.opened, false);
  const html = await fs.readFile(path.join(root, result.htmlPath), "utf8");
  assert.match(html, /openRender report/);
  assert.match(html, /visual-overlay/);
});

test("report explains failed frame validation next actions", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-report-failure-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await assert.rejects(execFileAsync(process.execPath, [
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
    "2x1"
  ], {
    cwd: root
  }));

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    htmlPath: string;
  };
  const html = await fs.readFile(path.join(root, result.htmlPath), "utf8");

  assert.match(html, /Next Action/);
  assert.match(html, /horizontal strip requires 2x1, got 1x1/);
  assert.match(html, /try --frame-size/);
});

test("rollback latest run deletes files created by install", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-rollback-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.dot",
    "--json"
  ], {
    cwd: root
  });
  await execFileAsync(process.execPath, [cliPath, "install", "--run", "latest"], {
    cwd: root
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "rollback", "--run", "latest", "--json"], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    actions: Array<{ action: string; path: string }>;
  };

  assert.deepEqual(result.actions.map((action) => action.action), ["deleted", "deleted"]);
  assert.equal(await fileExists(path.join(root, "public/assets/prop-dot.png")), false);
  assert.equal(await fileExists(path.join(root, "src/assets/openrender-manifest.ts")), false);
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
