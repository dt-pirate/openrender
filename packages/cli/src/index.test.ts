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

  assert.equal(stdout.trim(), "0.2.0");
});

test("help prints the npm package version and supported options", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "--help"
  ]);

  assert.match(stdout, /^openRender 0\.2\.0/m);
  assert.match(stdout, /openrender --version/);
  assert.match(stdout, /compile sprite .*--output-size WxH/);
  assert.match(stdout, /openrender install --run latest \[--force\] \[--json\]/);
  assert.match(stdout, /openrender report --run latest \[--open\] \[--json\]/);
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

test("init supports Godot defaults", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-init-godot-"));
  await fs.writeFile(path.join(root, "project.godot"), "[application]\nconfig/name=\"Sample\"\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "init",
    "--target",
    "godot",
    "--json"
  ], {
    cwd: root
  });
  const config = JSON.parse(await fs.readFile(path.join(root, "openrender.config.json"), "utf8")) as {
    target: { engine: string; framework: string; assetRoot: string; sourceRoot: string };
  };

  assert.deepEqual(config.target, {
    engine: "godot",
    framework: "godot",
    assetRoot: "assets/openrender",
    sourceRoot: "scripts/openrender"
  });
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

test("compile sprite dry-run emits a Godot frame set plan as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-godot-frame-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "godot",
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
    contract: { target: { engine: string; framework: string } };
    outputPlan: { engine: string; assetPath: string; loadPath: string; manifestPath: string; codegenPath: string };
    installPlan: { files: Array<{ kind: string; to: string }> };
    generatedSources: { manifest: string; animationHelper?: string };
  };

  assert.equal(result.contract.target.engine, "godot");
  assert.equal(result.contract.target.framework, "godot");
  assert.equal(result.outputPlan.engine, "godot");
  assert.equal(result.outputPlan.assetPath, "assets/openrender/enemy-dot-idle.png");
  assert.equal(result.outputPlan.loadPath, "res://assets/openrender/enemy-dot-idle.png");
  assert.equal(result.outputPlan.manifestPath, "scripts/openrender/openrender_assets.gd");
  assert.equal(result.outputPlan.codegenPath, "scripts/openrender/animations/enemy-dot-idle.gd");
  assert.deepEqual(result.installPlan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
  assert.match(result.generatedSources.manifest, /OPENRENDER_ASSETS/);
  assert.match(result.generatedSources.animationHelper ?? "", /SpriteFrames/);
});

test("compile sprite rejects output-size for frame sets", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-frame-output-size-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await assert.rejects(
    () => execFileAsync(process.execPath, [
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
      "--output-size",
      "8x8",
      "--json"
    ], {
      cwd: root
    }),
    /--output-size is only supported for transparent sprites/
  );
});

test("compile sprite rejects invalid target framework pairs", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-invalid-target-pair-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await assert.rejects(
    () => execFileAsync(process.execPath, [
      cliPath,
      "compile",
      "sprite",
      "--from",
      "sprite.png",
      "--target",
      "godot",
      "--framework",
      "vite",
      "--id",
      "prop.dot",
      "--json"
    ], {
      cwd: root
    }),
    /Godot target requires the godot framework/
  );
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
    "--output-size",
    "8x8",
    "--json"
  ], {
    cwd: root
  });

  const result = JSON.parse(stdout) as {
    dryRun: boolean;
    contract: { visual: { outputWidth: number; outputHeight: number } };
    artifact: { path: string; metadata: { format: string; width: number; height: number } };
    run: { runId: string; status: string; outputs: Array<{ path: string }> };
  };

  assert.equal(result.dryRun, false);
  assert.equal(result.contract.visual.outputWidth, 8);
  assert.equal(result.contract.visual.outputHeight, 8);
  assert.equal(result.artifact.metadata.format, "png");
  assert.equal(result.artifact.metadata.width, 8);
  assert.equal(result.artifact.metadata.height, 8);
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

test("compile sprite can install, verify, report, and rollback a Godot run", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-godot-install-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(root, "project.godot"), "[application]\nconfig/name=\"Sample\"\n", "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "godot",
    "--id",
    "prop.dot",
    "--output-size",
    "8x8",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(stdout) as {
    outputPlan: { loadPath: string; assetPath: string; manifestPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(compileResult.outputPlan.loadPath, "res://assets/openrender/prop-dot.png");
  assert.deepEqual(compileResult.installResult.writes.map((write) => write.relativePath), [
    "assets/openrender/prop-dot.png",
    "scripts/openrender/openrender_assets.gd"
  ]);
  assert.equal(await fileExists(path.join(root, "assets/openrender/prop-dot.png")), true);
  assert.equal(await fileExists(path.join(root, "scripts/openrender/openrender_assets.gd")), true);
  assert.equal(await fileExists(path.join(root, "assets/openrender/prop-dot.png.import")), false);
  assert.equal(await fileExists(path.join(root, ".godot")), false);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string; path?: string }>;
  };
  assert.equal(verifyResult.status, "passed");
  assert.equal(verifyResult.checks.some((check) => check.name === "engine_load_path_shape" && check.status === "passed"), true);

  const report = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as { htmlPath: string };
  const reportHtml = await fs.readFile(path.join(root, reportResult.htmlPath), "utf8");
  assert.match(reportHtml, /Godot Import Note/);

  const rollback = await execFileAsync(process.execPath, [cliPath, "rollback", "--run", "latest", "--json"], {
    cwd: root
  });
  const rollbackResult = JSON.parse(rollback.stdout) as {
    actions: Array<{ action: string; path: string }>;
  };
  assert.deepEqual(rollbackResult.actions.map((action) => action.path), [
    "assets/openrender/prop-dot.png",
    "scripts/openrender/openrender_assets.gd"
  ]);
  assert.equal(await fileExists(path.join(root, "assets/openrender/prop-dot.png")), false);
  assert.equal(await fileExists(path.join(root, "scripts/openrender/openrender_assets.gd")), false);
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
