import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { loadImageMetadata } from "@openrender/harness-visual";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(currentDir, "index.js");
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const transparentBorderPng = "iVBORw0KGgoAAAANSUhEUgAAAAYAAAAECAYAAACtBE5DAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVR4nGNgIAT+MzD8B2HiJdABAI7jB/l+kPXlAAAAAElFTkSuQmCC";
const opaqueWhiteRedPng = "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVR4nGP4jwYYICQDBOMWQNICAGk9N8lGG0z3AAAAAElFTkSuQmCC";
const opaqueWhiteColorStripPng = "iVBORw0KGgoAAAANSUhEUgAAAAgAAAACCAYAAABllJ3tAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVR4nGP4TwAwQEgohcoFiwAAxN84yAPOARcAAAAASUVORK5CYII=";

test("version prints the npm package version", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "--version"
  ]);

  assert.equal(stdout.trim(), "1.0.2");
});

test("help prints the npm package version and supported options", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "--help"
  ]);

  assert.match(stdout, /^openRender 1\.0\.2/m);
  assert.match(stdout, /openrender --version/);
  assert.match(stdout, /openrender context \[--json\] \[--compact\] \[--wire-map\]/);
  assert.match(stdout, /openrender memory status\|context\|consolidate/);
  assert.match(stdout, /openrender clean --memory/);
  assert.match(stdout, /openrender ingest reference --url <url>\|--from <path>/);
  assert.match(stdout, /openrender loop run sprite\|animation\|audio\|atlas\|ui/);
  assert.match(stdout, /openrender loop complete/);
  assert.match(stdout, /openrender detect-motion <path> \[--fps n\]/);
  assert.match(stdout, /openrender smoke .*--build/);
  assert.match(stdout, /openrender service snapshot/);
  assert.match(stdout, /openrender install-agent \[--platform codex\|cursor\|claude\|all\] \[--dry-run\] \[--force\] \[--json\]/);
  assert.match(stdout, /phaser\|godot\|love2d\|pixi\|canvas\|three\|unity/);
  assert.match(stdout, /compile sprite .*--output-size WxH/);
  assert.match(stdout, /compile animation .*--fps n/);
  assert.match(stdout, /compile audio .*--media-type audio\.sound_effect\|audio\.music_loop/);
  assert.match(stdout, /compile atlas .*--media-type visual\.atlas\|visual\.tileset/);
  assert.match(stdout, /compile ui .*--media-type visual\.ui_button\|visual\.ui_panel\|visual\.icon_set/);
  assert.match(stdout, /--background-policy auto\|preserve\|remove/);
  assert.match(stdout, /--remove-background/);
  assert.match(stdout, /--manifest-strategy merge\|replace\|isolated/);
  assert.match(stdout, /--quality prototype\|default\|strict/);
  assert.match(stdout, /compile sprite --from\|--input <path>/);
  assert.match(stdout, /openrender install \[runId\|--run latest\] \[--force\] \[--json\]/);
  assert.match(stdout, /openrender report \[runId\|--run latest\] \[--open\] \[--json\] \[--compact\]/);
  assert.match(stdout, /openrender verify \[runId\|--run latest\].*\[--json\] \[--compact\]/);
});

test("schema command emits official schemas", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "schema",
    "contract"
  ]);
  const schema = JSON.parse(stdout) as { title: string; properties: { schemaVersion: { const: string } } };

  assert.equal(schema.title, "openRender Media Contract");
  assert.equal(schema.properties.schemaVersion.const, "1.0.2");

  const { stdout: mediaStdout } = await execFileAsync(process.execPath, [
    cliPath,
    "schema",
    "media"
  ]);
  const mediaSchema = JSON.parse(mediaStdout) as { title: string; properties: { mediaType: { enum: string[] } } };

  assert.equal(mediaSchema.title, "openRender 1.0.2 Media Contracts");
  assert.equal(mediaSchema.properties.mediaType.enum.includes("audio.sound_effect"), true);
});

test("pack and recipe commands expose built-in local core metadata", async () => {
  const { stdout: packStdout } = await execFileAsync(process.execPath, [
    cliPath,
    "pack",
    "list",
    "--json"
  ]);
  const packResult = JSON.parse(packStdout) as { packs: Array<{ id: string; builtIn: boolean; recipes: string[] }> };

  assert.equal(packResult.packs[0]?.id, "core");
  assert.equal(packResult.packs[0]?.builtIn, true);
  assert.ok(packResult.packs[0]?.recipes.includes("core.sprite-frame-set"));

  const { stdout: recipeStdout } = await execFileAsync(process.execPath, [
    cliPath,
    "recipe",
    "list",
    "--json"
  ]);
  const recipeResult = JSON.parse(recipeStdout) as { recipes: Array<{ id: string; mediaType: string }> };

  assert.ok(recipeResult.recipes.some((recipe) => recipe.id === "core.transparent-sprite"));
  assert.ok(recipeResult.recipes.some((recipe) => recipe.mediaType === "visual.sprite_frame_set"));
  assert.ok(recipeResult.recipes.some((recipe) => recipe.id === "core.audio"));
  assert.ok(recipeResult.recipes.some((recipe) => recipe.id === "core.atlas"));
  assert.ok(recipeResult.recipes.some((recipe) => recipe.id === "core.ui"));
  assert.ok(recipeResult.recipes.some((recipe) => recipe.id === "core.animation"));
});

test("plan sprite emits a compact install plan", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-plan-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "plan",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "plan.hero",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    ok: boolean;
    operation: string;
    filesToWrite: string[];
    agentSummary: string;
  };

  assert.equal(result.ok, true);
  assert.equal(result.operation, "plan");
  assert.ok(result.filesToWrite.includes("public/assets/plan-hero.png"));
  assert.match(result.agentSummary, /Ready to install/);
});

test("detect-frames infers a simple horizontal strip", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-detect-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "detect-frames",
    "sprite.png",
    "--frames",
    "1",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    suggested: { layout: string; frameWidth: number; frameHeight: number; frameCount: number };
  };

  assert.deepEqual(result.suggested, {
    layout: "horizontal_strip",
    frameWidth: 1,
    frameHeight: 1,
    frameCount: 1
  });
});

test("ingest reference records URL provenance without downloading media", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-reference-"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "ingest",
    "reference",
    "--url",
    "https://example.com/sketch.png",
    "--role",
    "layout",
    "--intent",
    "Match the screen composition.",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    ok: boolean;
    path: string;
    source: { kind: string; downloaded: boolean };
  };

  assert.equal(result.ok, true);
  assert.equal(result.source.kind, "url");
  assert.equal(result.source.downloaded, false);
  assert.equal(await fileExists(path.join(root, result.path)), true);

  const context = await execFileAsync(process.execPath, [
    cliPath,
    "context",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const contextResult = JSON.parse(context.stdout) as { references: Array<{ role: string; intent: string }> };
  assert.equal(contextResult.references[0]?.role, "layout");
  assert.equal(contextResult.references[0]?.intent, "Match the screen composition.");
});

test("loop start attach status and task preserve an agent handoff boundary", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-loop-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const started = await execFileAsync(process.execPath, [
    cliPath,
    "loop",
    "start",
    "--goal",
    "Wire an existing sprite into the Canvas game.",
    "--target",
    "canvas",
    "--id",
    "loop.hero",
    "--media",
    "sprite",
    "--from",
    "sprite.png",
    "--json"
  ], {
    cwd: root
  });
  const startResult = JSON.parse(started.stdout) as {
    loop: { loopId: string; boundary: { modelProviderCalls: boolean; assetRegeneration: boolean } };
    taskPath: string;
  };
  assert.equal(startResult.loop.boundary.modelProviderCalls, false);
  assert.equal(startResult.loop.boundary.assetRegeneration, false);
  assert.equal(await fileExists(path.join(root, startResult.taskPath)), true);

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "canvas",
    "--id",
    "loop.hero",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: root
  });

  const attached = await execFileAsync(process.execPath, [
    cliPath,
    "loop",
    "attach",
    "--loop",
    startResult.loop.loopId,
    "--run",
    "latest",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const attachResult = JSON.parse(attached.stdout) as {
    loop: { status: string; latestRunId: string; modelProviderCalls: boolean; assetRegeneration: boolean };
    iteration: { status: string; rollbackCommand: string };
  };
  assert.equal(attachResult.loop.status, "needs_action");
  assert.equal(attachResult.loop.modelProviderCalls, false);
  assert.equal(attachResult.loop.assetRegeneration, false);
  assert.match(attachResult.loop.latestRunId, /^run_/);
  assert.match(attachResult.iteration.rollbackCommand, /openrender rollback --run run_/);

  await execFileAsync(process.execPath, [
    cliPath,
    "memory",
    "ingest",
    "--feedback",
    "Keep this Canvas handoff clean and rollback-safe.",
    "--json"
  ], {
    cwd: root
  });

  const task = await execFileAsync(process.execPath, [cliPath, "loop", "task", "--json"], {
    cwd: root
  });
  const taskResult = JSON.parse(task.stdout) as { content: string };
  assert.match(taskResult.content, /Do not call model provider APIs/);
  assert.match(taskResult.content, /Do not regenerate/);
  assert.match(taskResult.content, /Read-only wire map/);
  assert.match(taskResult.content, /Project memory/);
  assert.match(taskResult.content, /rollback-safe/);

  const context = await execFileAsync(process.execPath, [cliPath, "context", "--json", "--compact"], {
    cwd: root
  });
  const contextResult = JSON.parse(context.stdout) as { latestLoop: { loopId: string; status: string } };
  assert.equal(contextResult.latestLoop.loopId, startResult.loop.loopId);
  assert.equal(contextResult.latestLoop.status, "needs_action");
});

test("loop run executes compile verify report explain and diff for animation handoff", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-loop-run-"));
  await fs.mkdir(path.join(root, "frames"));
  await fs.writeFile(path.join(root, "frames", "frame_0001.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(root, "frames", "frame_0002.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "loop",
    "run",
    "animation",
    "--goal",
    "Prepare an existing idle animation for Phaser.",
    "--from",
    "frames",
    "--target",
    "phaser",
    "--id",
    "loop.idle",
    "--fps",
    "6",
    "--install",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    operation: string;
    loop: { status: string; latestRunId: string; modelProviderCalls: boolean; assetRegeneration: boolean };
    iteration: { status: string; rollbackCommand: string };
    lifecycle: {
      compile: { mediaType: string; installed: boolean };
      verify: { status: string };
      report: { rollbackCommand: string };
      explain: { nextActions: string[] };
      diff: { rollbackCommand: string };
    };
    taskPath: string;
  };

  assert.equal(result.operation, "loop.run");
  assert.equal(result.loop.status, "ready_for_wiring");
  assert.equal(result.loop.modelProviderCalls, false);
  assert.equal(result.loop.assetRegeneration, false);
  assert.equal(result.lifecycle.compile.mediaType, "visual.animation_clip");
  assert.equal(result.lifecycle.compile.installed, true);
  assert.equal(result.lifecycle.verify.status, "passed");
  assert.match(result.lifecycle.report.rollbackCommand, /openrender rollback --run run_/);
  assert.match(result.lifecycle.diff.rollbackCommand, /openrender rollback --run run_/);
  assert.equal(result.iteration.status, "ready_for_wiring");

  const task = await fs.readFile(path.join(root, result.taskPath), "utf8");
  assert.match(task, /Engine packet/);
  assert.match(task, /Phaser Scene/);
  assert.match(task, /Do not call model provider APIs/);

  const completed = await execFileAsync(process.execPath, [
    cliPath,
    "loop",
    "complete",
    "--notes",
    "Connected in the Phaser scene.",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const completeResult = JSON.parse(completed.stdout) as {
    loop: { status: string; completedAt: string | null };
  };
  assert.equal(completeResult.loop.status, "completed");
  assert.match(completeResult.loop.completedAt ?? "", /^20/);

  const completedTask = await execFileAsync(process.execPath, [cliPath, "loop", "task", "--json"], {
    cwd: root
  });
  const completedTaskResult = JSON.parse(completedTask.stdout) as { content: string };
  assert.match(completedTaskResult.content, /Completed:/);
  assert.match(completedTaskResult.content, /Connected in the Phaser scene/);
});

test("detect-motion and normalize motion support PNG frame directories without ffmpeg", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-motion-"));
  await fs.mkdir(path.join(root, "frames"));
  await fs.writeFile(path.join(root, "frames", "frame_0001.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(root, "frames", "frame_0002.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "detect-motion",
    "frames",
    "--fps",
    "6",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const detected = JSON.parse(stdout) as {
    ok: boolean;
    recommendation: { fps: number; frames: number; layout: string };
    runtime: { ffmpeg: string };
  };

  assert.equal(detected.ok, true);
  assert.equal(detected.runtime.ffmpeg, "not_required");
  assert.equal(detected.recommendation.fps, 6);
  assert.equal(detected.recommendation.frames, 2);

  const normalized = await execFileAsync(process.execPath, [
    cliPath,
    "normalize",
    "motion",
    "frames",
    "--id",
    "fx.blink",
    "--fps",
    "6",
    "--json"
  ], {
    cwd: root
  });
  const normalizeResult = JSON.parse(normalized.stdout) as { ok: boolean; outputPath: string; frameSlices: unknown[] };
  assert.equal(normalizeResult.ok, true);
  assert.equal(normalizeResult.frameSlices.length, 2);
  assert.equal(await fileExists(path.join(root, normalizeResult.outputPath)), true);
});

test("normalize command writes preset output", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-normalize-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "normalize",
    "sprite.png",
    "--preset",
    "transparent-sprite",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as { ok: boolean; outputPath: string };

  assert.equal(result.ok, true);
  assert.equal(await fileExists(path.join(root, result.outputPath)), true);
});

test("normalize can remove edge-connected solid backgrounds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-normalize-bg-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "normalize",
    "sprite.png",
    "--preset",
    "transparent-sprite",
    "--remove-background",
    "--background-mode",
    "edge-flood",
    "--background-tolerance",
    "48",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    background: { policy: string; action: string };
    outputPath: string;
    output: { metadata: { width: number; height: number }; removedSolidBackground: boolean; backgroundMode: string };
  };

  assert.equal(result.background.policy, "remove");
  assert.equal(result.background.action, "removed");
  assert.equal(result.output.removedSolidBackground, true);
  assert.equal(result.output.backgroundMode, "edge-flood");
  assert.equal(result.output.metadata.width, 2);
  assert.equal(result.output.metadata.height, 2);
  assert.equal(await fileExists(path.join(root, result.outputPath)), true);
});

test("metadata and smoke commands return local deterministic JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-media-"));
  await fs.writeFile(path.join(root, "sound.wav"), Buffer.from("RIFF0000WAVE", "ascii"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const audio = await execFileAsync(process.execPath, [
    cliPath,
    "metadata",
    "audio",
    "sound.wav",
    "--target",
    "canvas",
    "--json"
  ], { cwd: root });
  const audioResult = JSON.parse(audio.stdout) as { kind: string; localOnly: boolean; metadata: { outputFormat: string } };
  assert.equal(audioResult.kind, "audio");
  assert.equal(audioResult.localOnly, true);
  assert.equal(audioResult.metadata.outputFormat, "wav");

  const atlas = await execFileAsync(process.execPath, [
    cliPath,
    "metadata",
    "atlas",
    "sprite.png",
    "--tile-size",
    "1x1",
    "--json"
  ], { cwd: root });
  const atlasResult = JSON.parse(atlas.stdout) as { metadata: { columns: number; rows: number } };
  assert.equal(atlasResult.metadata.columns, 1);
  assert.equal(atlasResult.metadata.rows, 1);

  const smoke = await execFileAsync(process.execPath, [cliPath, "smoke", "--target", "canvas", "--json"], { cwd: root });
  const smokeResult = JSON.parse(smoke.stdout) as { ok: boolean; status: string; mode: string; command: null };
  assert.equal(smokeResult.ok, true);
  assert.equal(smokeResult.status, "skipped");
  assert.equal(smokeResult.mode, "static");
  assert.equal(smokeResult.command, null);

  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
    scripts: {
      build: "node -e \"require('node:fs').writeFileSync('dist-ok.txt','ok')\""
    }
  }, null, 2));
  const buildSmoke = await execFileAsync(process.execPath, [
    cliPath,
    "smoke",
    "--target",
    "phaser",
    "--build",
    "--timeout",
    "10",
    "--json"
  ], { cwd: root });
  const buildSmokeResult = JSON.parse(buildSmoke.stdout) as { ok: boolean; status: string; mode: string; command: string };
  assert.equal(buildSmokeResult.ok, true);
  assert.equal(buildSmokeResult.status, "passed");
  assert.equal(buildSmokeResult.mode, "build");
  assert.equal(buildSmokeResult.command, "npm run build");
  assert.equal(await fileExists(path.join(root, "dist-ok.txt")), true);
});

test("compile audio installs, verifies, reports, and rolls back through the media pipeline", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-p4-audio-"));
  await fs.writeFile(path.join(root, "sound.wav"), Buffer.from("RIFF0000WAVE", "ascii"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "audio",
    "--from",
    "sound.wav",
    "--target",
    "canvas",
    "--id",
    "sfx.hit",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    contract: { mediaType: string };
    outputPlan: { assetPath: string; manifestPath: string; codegenPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(result.contract.mediaType, "audio.sound_effect");
  assert.equal(result.outputPlan.assetPath, "public/assets/sfx-hit.wav");
  assert.deepEqual(result.installResult.writes.map((write) => write.relativePath), [
    "public/assets/sfx-hit.wav",
    "src/assets/openrender-media-manifest.ts",
    "src/openrender/media/sfx-hit.ts"
  ]);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string }>;
  };
  assert.equal(verifyResult.status, "passed");
  assert.equal(verifyResult.checks.some((check) => check.name === "audio_format_supported" && check.status === "passed"), true);
  assert.equal(verifyResult.checks.some((check) => check.name === "engine_manifest_path_shape" && check.status === "passed"), true);

  const report = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as { htmlPath: string };
  const reportHtml = await fs.readFile(path.join(root, reportResult.htmlPath), "utf8");
  assert.match(reportHtml, /Media Asset Pipeline/);

  const rollback = await execFileAsync(process.execPath, [cliPath, "rollback", "--run", "latest", "--json"], {
    cwd: root
  });
  const rollbackResult = JSON.parse(rollback.stdout) as { actions: Array<{ path: string }> };
  assert.deepEqual(rollbackResult.actions.map((action) => action.path), [
    "public/assets/sfx-hit.wav",
    "src/assets/openrender-media-manifest.ts",
    "src/openrender/media/sfx-hit.ts"
  ]);
  assert.equal(await fileExists(path.join(root, "public/assets/sfx-hit.wav")), false);
});

test("compile atlas and ui assets promote media metadata into installable verified runs", async () => {
  const atlasRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-p4-atlas-"));
  await fs.writeFile(path.join(atlasRoot, "atlas.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(atlasRoot, "main.lua"), "function love.load() end\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "atlas",
    "--from",
    "atlas.png",
    "--target",
    "love2d",
    "--id",
    "tiles.floor",
    "--media-type",
    "visual.tileset",
    "--tile-size",
    "1x1",
    "--install",
    "--json"
  ], {
    cwd: atlasRoot
  });
  const atlasVerify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: atlasRoot
  });
  const atlasVerifyResult = JSON.parse(atlasVerify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string }>;
  };
  assert.equal(atlasVerifyResult.status, "passed");
  assert.equal(atlasVerifyResult.checks.some((check) => check.name === "atlas_tile_grid_divisible" && check.status === "passed"), true);
  assert.equal(await fileExists(path.join(atlasRoot, "openrender/openrender_media_assets.lua")), true);

  const uiRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-p4-ui-"));
  await fs.writeFile(path.join(uiRoot, "button.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(uiRoot, "project.godot"), "[application]\nconfig/name=\"Sample\"\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "ui",
    "--from",
    "button.png",
    "--target",
    "godot",
    "--id",
    "ui.start",
    "--states",
    "default,hover,pressed",
    "--install",
    "--json"
  ], {
    cwd: uiRoot
  });
  const uiVerify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: uiRoot
  });
  const uiVerifyResult = JSON.parse(uiVerify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string }>;
  };
  assert.equal(uiVerifyResult.status, "passed");
  assert.equal(uiVerifyResult.checks.some((check) => check.name === "ui_states_declared" && check.status === "passed"), true);
  assert.equal(uiVerifyResult.checks.some((check) => check.name === "godot_import_cache_boundary" && check.status === "passed"), true);
  assert.equal(await fileExists(path.join(uiRoot, "scripts/openrender/openrender_media_assets.gd")), true);

  const unityRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-p4-unity-"));
  await fs.writeFile(path.join(unityRoot, "sound.wav"), Buffer.from("RIFF0000WAVE", "ascii"));
  await fs.mkdir(path.join(unityRoot, "Assets"), { recursive: true });
  await fs.mkdir(path.join(unityRoot, "ProjectSettings"), { recursive: true });
  await fs.writeFile(path.join(unityRoot, "ProjectSettings/ProjectVersion.txt"), "m_EditorVersion: 6000.0.0f1\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "audio",
    "--from",
    "sound.wav",
    "--target",
    "unity",
    "--id",
    "sfx.click",
    "--install",
    "--json"
  ], {
    cwd: unityRoot
  });
  const unityVerify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: unityRoot
  });
  const unityVerifyResult = JSON.parse(unityVerify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string }>;
  };
  assert.equal(unityVerifyResult.status, "passed");
  assert.equal(unityVerifyResult.checks.some((check) => check.name === "audio_format_supported" && check.status === "passed"), true);
  assert.equal(unityVerifyResult.checks.some((check) => check.name === "unity_import_cache_boundary" && check.status === "passed"), true);
  assert.equal(await fileExists(path.join(unityRoot, "Assets/OpenRender/OpenRenderMediaAssets.cs")), true);
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

test("init supports LOVE2D defaults", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-init-love2d-"));
  await fs.writeFile(path.join(root, "main.lua"), "function love.draw() end\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "init",
    "--target",
    "love2d",
    "--json"
  ], {
    cwd: root
  });
  const config = JSON.parse(await fs.readFile(path.join(root, "openrender.config.json"), "utf8")) as {
    target: { engine: string; framework: string; assetRoot: string; sourceRoot: string };
  };

  assert.deepEqual(config.target, {
    engine: "love2d",
    framework: "love2d",
    assetRoot: "assets/openrender",
    sourceRoot: "openrender"
  });
});

test("init supports Unity defaults", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-init-unity-"));
  await fs.mkdir(path.join(root, "Assets"), { recursive: true });
  await fs.mkdir(path.join(root, "ProjectSettings"), { recursive: true });
  await fs.writeFile(path.join(root, "ProjectSettings/ProjectVersion.txt"), "m_EditorVersion: 6000.0.0f1\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "init",
    "--target",
    "unity",
    "--json"
  ], {
    cwd: root
  });
  const config = JSON.parse(await fs.readFile(path.join(root, "openrender.config.json"), "utf8")) as {
    target: { engine: string; framework: string; assetRoot: string; sourceRoot: string };
  };

  assert.deepEqual(config.target, {
    engine: "unity",
    framework: "unity",
    assetRoot: "Assets/OpenRender/Generated",
    sourceRoot: "Assets/OpenRender"
  });
});

test("init supports Three.js defaults", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-init-three-"));

  await execFileAsync(process.execPath, [
    cliPath,
    "init",
    "--target",
    "three",
    "--json"
  ], {
    cwd: root
  });
  const config = JSON.parse(await fs.readFile(path.join(root, "openrender.config.json"), "utf8")) as {
    target: { engine: string; framework: string; assetRoot: string; sourceRoot: string };
  };

  assert.deepEqual(config.target, {
    engine: "three",
    framework: "vite",
    assetRoot: "public/assets",
    sourceRoot: "src"
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
    recipe: { packId: string; recipeId: string };
    agentSummary: string;
  };

  assert.equal(result.contract.mediaType, "visual.transparent_sprite");
  assert.equal(result.contract.id, "prop.dot");
  assert.equal(result.outputPlan.assetPath, "public/assets/prop-dot.png");
  assert.equal(result.outputPlan.manifestPath, "src/assets/openrender-manifest.ts");
  assert.deepEqual(result.installPlan.files.map((file) => file.kind), ["compiled_asset", "manifest"]);
  assert.equal(result.recipe.packId, "core");
  assert.equal(result.recipe.recipeId, "core.transparent-sprite");
  assert.match(result.agentSummary, /Planned prop\.dot/);
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

test("compile sprite dry-run emits a LOVE2D frame set plan as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-love2d-frame-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--input",
    "sprite.png",
    "--target",
    "love2d",
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

  assert.equal(result.contract.target.engine, "love2d");
  assert.equal(result.contract.target.framework, "love2d");
  assert.equal(result.outputPlan.engine, "love2d");
  assert.equal(result.outputPlan.assetPath, "assets/openrender/enemy-dot-idle.png");
  assert.equal(result.outputPlan.loadPath, "assets/openrender/enemy-dot-idle.png");
  assert.equal(result.outputPlan.manifestPath, "openrender/openrender_assets.lua");
  assert.equal(result.outputPlan.codegenPath, "openrender/animations/enemy-dot-idle.lua");
  assert.deepEqual(result.installPlan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
  assert.match(result.generatedSources.manifest, /return assets/);
  assert.match(result.generatedSources.animationHelper ?? "", /love\.graphics\.newQuad/);
});

test("compile sprite dry-run emits a Unity frame set plan as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-unity-frame-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "unity",
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

  assert.equal(result.contract.target.engine, "unity");
  assert.equal(result.contract.target.framework, "unity");
  assert.equal(result.outputPlan.engine, "unity");
  assert.equal(result.outputPlan.assetPath, "Assets/OpenRender/Generated/enemy-dot-idle.png");
  assert.equal(result.outputPlan.loadPath, "Assets/OpenRender/Generated/enemy-dot-idle.png");
  assert.equal(result.outputPlan.manifestPath, "Assets/OpenRender/OpenRenderAssets.cs");
  assert.equal(result.outputPlan.codegenPath, "Assets/OpenRender/Sprites/EnemyDotIdleSprites.cs");
  assert.deepEqual(result.installPlan.files.map((file) => file.kind), ["compiled_asset", "manifest", "codegen"]);
  assert.match(result.generatedSources.manifest, /OpenRenderAssets/);
  assert.match(result.generatedSources.animationHelper ?? "", /Sprite\.Create/);
});

test("compile sprite dry-run emits Vite web engine frame set plans as JSON", async () => {
  for (const target of ["pixi", "canvas", "three"]) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `openrender-cli-${target}-frame-`));
    await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      "compile",
      "sprite",
      "--from",
      "sprite.png",
      "--target",
      target,
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
      outputPlan: { engine: string; publicUrl: string; manifestPath: string; codegenPath: string };
      installPlan: { files: Array<{ kind: string; to: string }> };
      generatedSources: { manifest: string; animationHelper?: string };
    };

    assert.equal(result.contract.target.engine, target);
    assert.equal(result.contract.target.framework, "vite");
    assert.equal(result.outputPlan.engine, target);
    assert.equal(result.outputPlan.publicUrl, "/assets/enemy-dot-idle.png");
    assert.equal(result.outputPlan.manifestPath, "src/assets/openrender-manifest.ts");
    assert.equal(result.outputPlan.codegenPath, `src/openrender/${target}/enemy-dot-idle.ts`);
    assert.equal(result.installPlan.files.some((file) => file.to === "public/assets/enemy-dot-idle.png"), true);
    assert.match(result.generatedSources.manifest, /openRenderAssets/);
    const helperPattern = target === "pixi" ? /AnimatedSprite/ : target === "three" ? /TextureLoader/ : /drawFrame/;
    assert.match(result.generatedSources.animationHelper ?? "", helperPattern);
  }
});

test("agent init writes only the requested config and refuses overwrites by default", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-agent-init-"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "agent",
    "init",
    "--cursor",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as { agent: string; path: string };

  assert.equal(result.agent, "cursor");
  assert.equal(result.path, ".cursor/rules/openrender.md");
  assert.equal(await fileExists(path.join(root, ".cursor/rules/openrender.md")), true);
  assert.equal(await fileExists(path.join(root, "AGENTS.md")), false);
  const instructions = await fs.readFile(path.join(root, ".cursor/rules/openrender.md"), "utf8");
  assert.match(instructions, /# openRender Skill/);
  assert.match(instructions, /local openRender skill/);
  assert.match(instructions, /openrender context --json --compact/);
  assert.match(instructions, /openrender context --json --wire-map/);
  assert.match(instructions, /openrender verify --run latest --json --compact/);

  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "agent", "init", "--cursor", "--json"], { cwd: root }),
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const errorJson = JSON.parse(stdout) as { message: string };
      assert.match(errorJson.message, /Refusing to overwrite/);
      return true;
    }
  );
});

test("install-agent dry-run previews all instruction files without writing", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-install-agent-"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "install-agent",
    "--platform",
    "all",
    "--dry-run",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    agent: string;
    dryRun: boolean;
    files: Array<{ agent: string; path: string; action: string }>;
  };

  assert.equal(result.agent, "all");
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.files.map((file) => file.agent), ["codex", "cursor", "claude"]);
  assert.equal(result.files.every((file) => file.action === "would_create"), true);
  assert.equal(await fileExists(path.join(root, "AGENTS.md")), false);
  assert.equal(await fileExists(path.join(root, ".cursor/rules/openrender.md")), false);
  assert.equal(await fileExists(path.join(root, ".claude/openrender.md")), false);
});

test("context command emits compact project handoff", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-context-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "context-game",
    dependencies: {
      vite: "^7.0.0",
      phaser: "^3.90.0"
    }
  }, null, 2));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "context",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    ok: boolean;
    version: string;
    target: { engine: string; framework: string };
    capabilities: { account: boolean; telemetry: boolean; cloudApi: boolean };
    recommendedNextActions: string[];
  };

  assert.equal(result.ok, true);
  assert.equal(result.version, "1.0.2");
  assert.equal(result.target.engine, "phaser");
  assert.equal(result.target.framework, "vite");
  assert.equal(result.capabilities.account, false);
  assert.equal(result.capabilities.telemetry, false);
  assert.equal(result.capabilities.cloudApi, false);
  assert.equal(result.recommendedNextActions.some((action) => action.includes("--dry-run")), true);
});

test("context compact output keeps agent essentials and drops broad state", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-context-compact-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "context-game",
    dependencies: {
      vite: "^7.0.0",
      phaser: "^3.90.0"
    }
  }, null, 2));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "context",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    ok: boolean;
    target: { engine: string };
    exists?: unknown;
    tables: { overwriteRisks: { columns: string[]; rows: unknown[][] } };
    nextActions: string[];
  };

  assert.equal(result.ok, true);
  assert.equal(result.target.engine, "phaser");
  assert.equal(result.exists, undefined);
  assert.deepEqual(result.tables.overwriteRisks.columns, ["code", "path", "note"]);
  assert.equal(Array.isArray(result.tables.overwriteRisks.rows), true);
  assert.equal(result.nextActions.some((action) => action.includes("--dry-run")), true);
});

test("memory commands derive project state and feed compact agent context", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-memory-"));
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "memory-game",
    dependencies: {
      vite: "^7.0.0",
      phaser: "^3.90.0"
    }
  }, null, 2));

  const ingestFeedback = await execFileAsync(process.execPath, [
    cliPath,
    "memory",
    "ingest",
    "--feedback",
    "Keep project folders clean and do not accumulate screenshots.",
    "--json"
  ], {
    cwd: root
  });
  const ingestResult = JSON.parse(ingestFeedback.stdout) as {
    eventsWritten: number;
    conclusionsWritten: number;
    contextPath: string;
  };
  assert.equal(ingestResult.eventsWritten, 1);
  assert.equal(ingestResult.conclusionsWritten > 0, true);
  assert.equal(await fileExists(path.join(root, ingestResult.contextPath)), true);

  const context = await execFileAsync(process.execPath, [
    cliPath,
    "memory",
    "context",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const memoryContext = JSON.parse(context.stdout) as {
    projectFacts: string[];
    agentFacts: string[];
    userDirectionFacts: string[];
    engineFacts: string[];
    conclusions: Array<{ category: string; text: string }>;
  };
  assert.equal(memoryContext.projectFacts.some((fact) => fact.includes("Keep project folders clean")), true);
  assert.equal(memoryContext.agentFacts.some((fact) => fact.includes("Do not call model provider APIs")), true);
  assert.equal(memoryContext.userDirectionFacts.some((fact) => fact.includes("Keep project folders clean")), true);
  assert.equal(Array.isArray(memoryContext.engineFacts), true);
  assert.equal(memoryContext.conclusions.some((conclusion) => conclusion.category === "workflow"), true);

  const status = await execFileAsync(process.execPath, [
    cliPath,
    "memory",
    "status",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const statusResult = JSON.parse(status.stdout) as { storage: { bytes: number } };
  assert.equal(statusResult.storage.bytes > 0, true);

  const serviceSnapshot = await execFileAsync(process.execPath, [
    cliPath,
    "service",
    "snapshot",
    "--json"
  ], {
    cwd: root
  });
  const serviceSnapshotResult = JSON.parse(serviceSnapshot.stdout) as {
    operation: string;
    localOnly: boolean;
    capabilities: { hostedApi: boolean; telemetry: boolean };
    memory: { counts: { userDirectionFacts: number }; cards: { userDirection: { facts: unknown[] } } };
  };
  assert.equal(serviceSnapshotResult.operation, "service.snapshot");
  assert.equal(serviceSnapshotResult.localOnly, true);
  assert.equal(serviceSnapshotResult.capabilities.hostedApi, false);
  assert.equal(serviceSnapshotResult.capabilities.telemetry, false);
  assert.equal(serviceSnapshotResult.memory.counts.userDirectionFacts > 0, true);
  assert.equal(serviceSnapshotResult.memory.cards.userDirection.facts.length > 0, true);

  const projectContext = await execFileAsync(process.execPath, [
    cliPath,
    "context",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const projectContextResult = JSON.parse(projectContext.stdout) as { memory: { summary: string } | null };
  assert.match(projectContextResult.memory?.summary ?? "", /model provider APIs|project folders clean/);

  const clean = await execFileAsync(process.execPath, [
    cliPath,
    "clean",
    "--memory",
    "--keep-latest",
    "--dry-run",
    "--json"
  ], {
    cwd: root
  });
  const cleanResult = JSON.parse(clean.stdout) as {
    operation: string;
    dryRun: boolean;
    actions: string[];
  };
  assert.equal(cleanResult.operation, "clean.memory");
  assert.equal(cleanResult.dryRun, true);
  assert.equal(cleanResult.actions.some((action) => action.includes("memory events")), true);
});

test("context wire-map finds read-only wiring candidates for supported targets", async () => {
  const cases = [
    {
      name: "phaser",
      files: {
        "package.json": JSON.stringify({ dependencies: { vite: "^7.0.0", phaser: "^3.90.0" } }),
        "src/scenes/GameScene.ts": "export class GameScene extends Phaser.Scene { preload() {} create() {} }\n"
      },
      expectedFile: "src/scenes/GameScene.ts",
      expectedSignal: "preload"
    },
    {
      name: "godot",
      files: {
        "project.godot": "[application]\nconfig/name=\"Sample\"\n",
        "scripts/player.gd": "extends Node2D\nfunc _ready():\n  pass\n"
      },
      expectedFile: "project.godot",
      expectedSignal: "godot_project"
    },
    {
      name: "love2d",
      files: {
        "main.lua": "function love.load() end\nfunction love.draw() end\n"
      },
      expectedFile: "main.lua",
      expectedSignal: "love_load"
    },
    {
      name: "pixi",
      files: {
        "package.json": JSON.stringify({ dependencies: { vite: "^7.0.0", "pixi.js": "^8.0.0" } }),
        "src/main.ts": "import { Application, Assets } from 'pixi.js';\nnew Application();\nAssets.load('/asset.png');\n"
      },
      expectedFile: "src/main.ts",
      expectedSignal: "pixi_application"
    },
    {
      name: "three",
      files: {
        "package.json": JSON.stringify({ dependencies: { vite: "^7.0.0", three: "^0.176.0" } }),
        "src/main.ts": "import { Scene, WebGLRenderer, TextureLoader, SpriteMaterial } from 'three';\nnew Scene();\nnew WebGLRenderer();\nnew TextureLoader();\nnew SpriteMaterial();\n"
      },
      expectedFile: "src/main.ts",
      expectedSignal: "three_scene"
    },
    {
      name: "canvas",
      files: {
        "package.json": JSON.stringify({ dependencies: { vite: "^7.0.0" } }),
        "src/main.ts": "const canvas = document.querySelector('canvas') as HTMLCanvasElement;\ncanvas.getContext('2d');\nfunction draw() {}\n"
      },
      expectedFile: "src/main.ts",
      expectedSignal: "canvas_context"
    },
    {
      name: "unity",
      files: {
        "Assets/Scripts/Player.cs": "using UnityEngine;\npublic class Player : MonoBehaviour { public SpriteRenderer spriteRenderer; }\n",
        "ProjectSettings/ProjectVersion.txt": "m_EditorVersion: 6000.0.0f1\n"
      },
      expectedFile: "ProjectSettings/ProjectVersion.txt",
      expectedSignal: "unity_project"
    }
  ];

  for (const testCase of cases) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `openrender-cli-wire-${testCase.name}-`));
    for (const [relativePath, contents] of Object.entries(testCase.files)) {
      await fs.mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
      await fs.writeFile(path.join(root, relativePath), contents, "utf8");
    }

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      "context",
      "--json",
      "--wire-map"
    ], {
      cwd: root
    });
    const result = JSON.parse(stdout) as {
      wireMap: {
        readOnly: boolean;
        candidates: Array<{ file: string; signals: string[] }>;
        tables: { candidates: { columns: string[]; rows: unknown[][] } };
      };
    };

    assert.equal(result.wireMap.readOnly, true, testCase.name);
    assert.equal(result.wireMap.candidates.some((candidate) => candidate.file === testCase.expectedFile), true, testCase.name);
    assert.equal(result.wireMap.candidates.some((candidate) => candidate.signals.includes(testCase.expectedSignal)), true, testCase.name);
    assert.deepEqual(result.wireMap.tables.candidates.columns, ["kind", "file", "signals", "suggestedAction"]);
  }
});

test("context wire-map includes latest asset handoff snippets", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-wire-latest-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));
  await fs.writeFile(path.join(root, "main.lua"), "function love.load() end\nfunction love.draw() end\n", "utf8");

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "ui.start.button",
    "--remove-background",
    "--install",
    "--json"
  ], { cwd: root });

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "context",
    "--json",
    "--wire-map",
    "--compact"
  ], { cwd: root });
  const result = JSON.parse(stdout) as {
    wireMap: {
      latestAsset: {
        assetId: string;
        loadPath: string;
        manifestModule: string;
        snippets: Array<{ language: string; code: string }>;
      };
    };
  };

  assert.equal(result.wireMap.latestAsset.assetId, "ui.start.button");
  assert.equal(result.wireMap.latestAsset.loadPath, "assets/openrender/ui-start-button.png");
  assert.equal(result.wireMap.latestAsset.manifestModule, "openrender.openrender_assets");
  assert.equal(result.wireMap.latestAsset.snippets.some((snippet) => snippet.language === "lua" && snippet.code.includes("love.graphics.newImage")), true);
});

test("adapter create writes a bounded adapter scaffold", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-adapter-create-"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "adapter",
    "create",
    "--name",
    "arcade2d",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as { adapter: string; files: string[] };

  assert.equal(result.adapter, "arcade2d");
  assert.equal(result.files.includes("packages/adapters/arcade2d/package.json"), true);
  assert.equal(result.files.includes("fixtures/arcade2d-template/fixture.json"), true);
  assert.equal(await fileExists(path.join(root, "packages/adapters/arcade2d/src/index.ts")), true);
});

test("fixture capture writes sanitized fixture metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-fixture-capture-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "fixture",
    "capture",
    "--name",
    "sample-dot",
    "--from",
    "sprite.png",
    "--target",
    "canvas",
    "--id",
    "fixture.dot",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as { fixturePath: string };
  const fixture = JSON.parse(await fs.readFile(path.join(root, result.fixturePath), "utf8")) as {
    target: string;
    capture: { sanitized: boolean; source: string };
  };

  assert.equal(fixture.target, "canvas");
  assert.equal(fixture.capture.sanitized, true);
  assert.equal(fixture.capture.source, "sprite.png");
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
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as { message: string };
      assert.match(result.message, /--output-size is only supported for transparent sprites/);
      return true;
    }
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
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as { message: string };
      assert.match(result.message, /Godot target requires the godot framework/);
      return true;
    }
  );
});

test("compile sprite returns structured JSON errors", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-json-error-"));

  await assert.rejects(
    async () => {
      await execFileAsync(process.execPath, [
        cliPath,
        "compile",
        "sprite",
        "--id",
        "prop.dot",
        "--json"
      ], {
        cwd: root
      });
    },
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as {
        ok: boolean;
        code: string;
        message: string;
        nextActions: string[];
      };
      assert.equal(result.ok, false);
      assert.equal(result.code, "OPENRENDER_ERROR");
      assert.match(result.message, /Missing required option: --from/);
      assert.equal(result.nextActions.length > 0, true);
      return true;
    }
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

test("compile sprite auto removes safe opaque transparent sprite backgrounds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-auto-bg-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.auto",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    background: { policy: string; action: string; inputTransparentPixelRatio: number };
    processing: { removeBackground: boolean; backgroundPolicy: string; backgroundAction: string };
    visualQuality: { status: string };
    artifact: { path: string; metadata: { width: number; height: number } };
  };

  assert.equal(result.background.policy, "auto");
  assert.equal(result.background.action, "removed");
  assert.equal(result.processing.removeBackground, true);
  assert.equal(result.processing.backgroundPolicy, "auto");
  assert.equal(result.processing.backgroundAction, "removed");
  assert.equal(result.background.inputTransparentPixelRatio, 0);
  assert.equal(result.artifact.metadata.width, 2);
  assert.equal(result.artifact.metadata.height, 2);
  assert.equal(result.visualQuality.status, "passed");
});

test("compile sprite auto cutout preserves sprite strip dimensions", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-auto-strip-bg-"));
  await fs.writeFile(path.join(root, "strip.png"), Buffer.from(opaqueWhiteColorStripPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "strip.png",
    "--id",
    "actor.runner",
    "--frames",
    "4",
    "--frame-size",
    "2x2",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    background: { policy: string; action: string };
    artifact: { metadata: { width: number; height: number } };
    framePreview: { path: string };
    invariants: { ok: boolean };
  };

  assert.equal(result.background.policy, "auto");
  assert.equal(result.background.action, "removed");
  assert.equal(result.artifact.metadata.width, 8);
  assert.equal(result.artifact.metadata.height, 2);
  assert.equal(result.invariants.ok, true);
  assert.equal(await fileExists(result.framePreview.path), true);
});

test("compile sprite background-policy preserve opts out of auto cutout", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-preserve-bg-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.preserved",
    "--background-policy",
    "preserve",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    background: { policy: string; action: string; reason: string };
    processing: { removeBackground: boolean };
    visualQuality: { status: string };
  };

  assert.equal(result.background.policy, "preserve");
  assert.equal(result.background.action, "preserved");
  assert.match(result.background.reason, /preservation was requested/);
  assert.equal(result.processing.removeBackground, false);
  assert.equal(result.visualQuality.status, "passed");
});

test("--remove-background maps to background-policy remove", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-force-bg-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.force",
    "--remove-background",
    "--json"
  ], {
    cwd: root
  });
  const result = JSON.parse(stdout) as { background: { policy: string; action: string }; processing: { backgroundPolicy: string } };

  assert.equal(result.background.policy, "remove");
  assert.equal(result.background.action, "removed");
  assert.equal(result.processing.backgroundPolicy, "remove");
});

test("conflicting background flags fail clearly", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-conflict-bg-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  await assert.rejects(
    () => execFileAsync(process.execPath, [
      cliPath,
      "compile",
      "sprite",
      "--from",
      "sprite.png",
      "--id",
      "prop.conflict",
      "--remove-background",
      "--background-policy",
      "preserve",
      "--json"
    ], {
      cwd: root
    }),
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as { message: string };
      assert.match(result.message, /Conflicting background options/);
      return true;
    }
  );
});

test("strict visual quality fails likely opaque transparent sprites", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-strict-visual-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  await assert.rejects(
    () => execFileAsync(process.execPath, [
      cliPath,
      "compile",
      "sprite",
      "--from",
      "sprite.png",
      "--id",
      "prop.opaque",
      "--background-policy",
      "preserve",
      "--quality",
      "strict",
      "--json"
    ], {
      cwd: root
    }),
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as {
        qualityGate: { status: string; failedReasons: string[] };
        visualQuality: { status: string; checks: Array<{ name: string; status: string }> };
      };
      assert.equal(result.qualityGate.status, "failed");
      assert.equal(result.visualQuality.status, "failed");
      assert.equal(result.visualQuality.checks.some((check) => check.name === "post_cutout_alpha_presence" && check.status === "failed"), true);
      return true;
    }
  );
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

test("compile animation dry-run covers every target and install lifecycle works", async () => {
  for (const target of ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"]) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `openrender-cli-animation-${target}-`));
    await fs.mkdir(path.join(root, "frames"));
    await fs.writeFile(path.join(root, "frames", "frame_0001.png"), Buffer.from(onePixelPng, "base64"));
    await fs.writeFile(path.join(root, "frames", "frame_0002.png"), Buffer.from(onePixelPng, "base64"));

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      "compile",
      "animation",
      "--from",
      "frames",
      "--id",
      "fx.blink",
      "--target",
      target,
      "--fps",
      "6",
      "--dry-run",
      "--json",
      "--compact"
    ], {
      cwd: root
    });
    const result = JSON.parse(stdout) as {
      ok: boolean;
      target: string;
      mediaType: string;
      motion: { frames: number; fps: number };
      tables: { installPlan: { rows: unknown[] } };
    };

    assert.equal(result.ok, true);
    assert.equal(result.target, target);
    assert.equal(result.mediaType, "visual.animation_clip");
    assert.equal(result.motion.frames, 2);
    assert.equal(result.motion.fps, 6);
    assert.equal(result.tables.installPlan.rows.length >= 2, true);
  }

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-animation-lifecycle-"));
  await fs.mkdir(path.join(root, "frames"));
  await fs.writeFile(path.join(root, "frames", "frame_0001.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(root, "frames", "frame_0002.png"), Buffer.from(onePixelPng, "base64"));
  const compile = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "animation",
    "--from",
    "frames",
    "--id",
    "fx.blink",
    "--target",
    "canvas",
    "--fps",
    "6",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(compile.stdout) as {
    run: { runId: string };
    outputPlan: { assetPath: string; codegenPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(await fileExists(path.join(root, compileResult.outputPlan.assetPath)), true);
  assert.equal(await fileExists(path.join(root, compileResult.outputPlan.codegenPath)), true);
  assert.equal(compileResult.installResult.writes.some((write) => write.relativePath.endsWith("fx-blink.ts")), true);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json", "--compact"], { cwd: root });
  const verifyResult = JSON.parse(verify.stdout) as { ok: boolean; status: string };
  assert.equal(verifyResult.ok, true);
  assert.equal(verifyResult.status, "passed");

  const report = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json", "--compact"], { cwd: root });
  const reportResult = JSON.parse(report.stdout) as { rollbackCommand: string | null; reportPath: string };
  assert.match(reportResult.rollbackCommand ?? "", /openrender rollback --run/);
  assert.equal(await fileExists(path.join(root, reportResult.reportPath)), true);

  const diff = await execFileAsync(process.execPath, [cliPath, "diff", "--run", "latest", "--json", "--compact"], { cwd: root });
  const diffResult = JSON.parse(diff.stdout) as { summary: { helperCodeGenerated: number; rollbackAvailable: boolean } };
  assert.equal(diffResult.summary.helperCodeGenerated > 0, true);
  assert.equal(diffResult.summary.rollbackAvailable, true);

  const explain = await execFileAsync(process.execPath, [cliPath, "explain", "--run", "latest", "--json", "--compact"], { cwd: root });
  const explainResult = JSON.parse(explain.stdout) as { ok: boolean; agentSummary: string };
  assert.equal(explainResult.ok, true);
  assert.match(explainResult.agentSummary, /animation/);

  await execFileAsync(process.execPath, [cliPath, "rollback", "--run", "latest", "--json"], { cwd: root });
  assert.equal(await fileExists(path.join(root, compileResult.outputPlan.assetPath)), false);
  assert.equal(await fileExists(path.join(root, compileResult.outputPlan.codegenPath)), false);
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
    "--background-policy",
    "preserve",
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
  assert.equal(verifyResult.checks.some((check) => check.name === "godot_import_cache_boundary" && check.status === "passed"), true);

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

test("compile sprite can install, verify, report, and rollback a LOVE2D run", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-love2d-install-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(path.join(root, "main.lua"), "function love.draw() end\n", "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "prop.dot",
    "--output-size",
    "8x8",
    "--background-policy",
    "preserve",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(stdout) as {
    run: { runId: string };
    outputPlan: { loadPath: string; assetPath: string; manifestPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(compileResult.outputPlan.loadPath, "assets/openrender/prop-dot.png");
  assert.deepEqual(compileResult.installResult.writes.map((write) => write.relativePath), [
    "assets/openrender/prop-dot.png",
    "openrender/openrender_assets.lua"
  ]);
  assert.equal(await fileExists(path.join(root, "assets/openrender/prop-dot.png")), true);
  assert.equal(await fileExists(path.join(root, "openrender/openrender_assets.lua")), true);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string; path?: string }>;
  };
  assert.equal(verifyResult.status, "passed");
  assert.equal(verifyResult.checks.some((check) => check.name === "engine_load_path_shape" && check.status === "passed"), true);
  assert.equal(verifyResult.checks.some((check) => check.name === "love2d_entry_file_detected" && check.status === "passed"), true);

  const report = await execFileAsync(process.execPath, [cliPath, "report", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as { htmlPath: string };
  const reportHtml = await fs.readFile(path.join(root, reportResult.htmlPath), "utf8");
  assert.match(reportHtml, /LOVE2D Load Note/);

  const rollback = await execFileAsync(process.execPath, [cliPath, "rollback", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const rollbackResult = JSON.parse(rollback.stdout) as {
    actions: Array<{ action: string; path: string }>;
  };
  assert.deepEqual(rollbackResult.actions.map((action) => action.path), [
    "assets/openrender/prop-dot.png",
    "openrender/openrender_assets.lua"
  ]);
  assert.equal(await fileExists(path.join(root, "assets/openrender/prop-dot.png")), false);
  assert.equal(await fileExists(path.join(root, "openrender/openrender_assets.lua")), false);
});

test("compile sprite can install, verify, report, and rollback a Unity run", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-unity-install-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));
  await fs.mkdir(path.join(root, "Assets"), { recursive: true });
  await fs.mkdir(path.join(root, "ProjectSettings"), { recursive: true });
  await fs.writeFile(path.join(root, "ProjectSettings/ProjectVersion.txt"), "m_EditorVersion: 6000.0.0f1\n", "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "unity",
    "--id",
    "prop.dot",
    "--output-size",
    "8x8",
    "--background-policy",
    "preserve",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(stdout) as {
    run: { runId: string };
    outputPlan: { loadPath: string; assetPath: string; manifestPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(compileResult.outputPlan.loadPath, "Assets/OpenRender/Generated/prop-dot.png");
  assert.deepEqual(compileResult.installResult.writes.map((write) => write.relativePath), [
    "Assets/OpenRender/Generated/prop-dot.png",
    "Assets/OpenRender/OpenRenderAssets.cs"
  ]);
  assert.equal(await fileExists(path.join(root, "Assets/OpenRender/Generated/prop-dot.png")), true);
  assert.equal(await fileExists(path.join(root, "Assets/OpenRender/OpenRenderAssets.cs")), true);
  assert.equal(await fileExists(path.join(root, "Assets/OpenRender/Generated/prop-dot.png.meta")), false);
  assert.equal(await fileExists(path.join(root, "Library")), false);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string; path?: string }>;
  };
  assert.equal(verifyResult.status, "passed");
  assert.equal(verifyResult.checks.some((check) => check.name === "engine_load_path_shape" && check.status === "passed"), true);
  assert.equal(verifyResult.checks.some((check) => check.name === "unity_project_layout_detected" && check.status === "passed"), true);
  assert.equal(verifyResult.checks.some((check) => check.name === "unity_import_cache_boundary" && check.status === "passed"), true);

  const report = await execFileAsync(process.execPath, [cliPath, "report", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as { htmlPath: string };
  const reportHtml = await fs.readFile(path.join(root, reportResult.htmlPath), "utf8");
  assert.match(reportHtml, /Unity Import Note/);

  const rollback = await execFileAsync(process.execPath, [cliPath, "rollback", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const rollbackResult = JSON.parse(rollback.stdout) as {
    actions: Array<{ action: string; path: string }>;
  };
  assert.deepEqual(rollbackResult.actions.map((action) => action.path), [
    "Assets/OpenRender/Generated/prop-dot.png",
    "Assets/OpenRender/OpenRenderAssets.cs"
  ]);
  assert.equal(await fileExists(path.join(root, "Assets/OpenRender/Generated/prop-dot.png")), false);
  assert.equal(await fileExists(path.join(root, "Assets/OpenRender/OpenRenderAssets.cs")), false);
});

test("compile sprite can install, verify, report, and rollback a Three.js run", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-three-install-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { three: "^0.176.0" }, devDependencies: { vite: "^7.0.0" } }),
    "utf8"
  );

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "three",
    "--id",
    "prop.dot",
    "--output-size",
    "8x8",
    "--background-policy",
    "preserve",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(stdout) as {
    run: { runId: string };
    outputPlan: { loadPath: string; assetPath: string; manifestPath: string; codegenPath: string };
    installResult: { writes: Array<{ relativePath: string }> };
  };

  assert.equal(compileResult.outputPlan.loadPath, "/assets/prop-dot.png");
  assert.equal(compileResult.outputPlan.codegenPath, "src/openrender/three/prop-dot.ts");
  assert.deepEqual(compileResult.installResult.writes.map((write) => write.relativePath), [
    "public/assets/prop-dot.png",
    "src/assets/openrender-manifest.ts",
    "src/openrender/three/prop-dot.ts"
  ]);
  assert.equal(await fileExists(path.join(root, "public/assets/prop-dot.png")), true);
  assert.equal(await fileExists(path.join(root, "src/assets/openrender-manifest.ts")), true);
  assert.equal(await fileExists(path.join(root, "src/openrender/three/prop-dot.ts")), true);

  const helperSource = await fs.readFile(path.join(root, "src/openrender/three/prop-dot.ts"), "utf8");
  assert.match(helperSource, /TextureLoader/);
  assert.match(helperSource, /createPropDotSprite/);
  assert.match(helperSource, /createPropDotPlane/);

  const verify = await execFileAsync(process.execPath, [cliPath, "verify", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string; path?: string }>;
  };
  assert.equal(verifyResult.status, "passed");
  assert.equal(verifyResult.checks.some((check) => check.name === "engine_load_path_shape" && check.status === "passed"), true);
  assert.equal(verifyResult.checks.some((check) => check.name === "three_texture_load_path_ready" && check.status === "passed"), true);

  const report = await execFileAsync(process.execPath, [cliPath, "report", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as { htmlPath: string };
  const reportHtml = await fs.readFile(path.join(root, reportResult.htmlPath), "utf8");
  assert.match(reportHtml, /Three\.js Load Note/);

  const rollback = await execFileAsync(process.execPath, [cliPath, "rollback", compileResult.run.runId, "--json"], {
    cwd: root
  });
  const rollbackResult = JSON.parse(rollback.stdout) as {
    actions: Array<{ action: string; path: string }>;
  };
  assert.deepEqual(rollbackResult.actions.map((action) => action.path), [
    "public/assets/prop-dot.png",
    "src/assets/openrender-manifest.ts",
    "src/openrender/three/prop-dot.ts"
  ]);
  assert.equal(await fileExists(path.join(root, "public/assets/prop-dot.png")), false);
  assert.equal(await fileExists(path.join(root, "src/assets/openrender-manifest.ts")), false);
  assert.equal(await fileExists(path.join(root, "src/openrender/three/prop-dot.ts")), false);
});

test("manifest merge keeps multiple entries and updates same asset id without force", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-manifest-merge-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));
  await fs.writeFile(path.join(root, "main.lua"), "function love.load() end\nfunction love.draw() end\n", "utf8");

  const first = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "ui.ladder.marker",
    "--remove-background",
    "--manifest-strategy",
    "merge",
    "--install",
    "--json"
  ], { cwd: root });
  const firstResult = JSON.parse(first.stdout) as { manifest: { entryChange: string; previousCount: number; nextCount: number } };
  assert.equal(firstResult.manifest.entryChange, "added");
  assert.equal(firstResult.manifest.previousCount, 0);
  assert.equal(firstResult.manifest.nextCount, 1);

  const second = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "ui.start.button",
    "--remove-background",
    "--manifest-strategy",
    "merge",
    "--install",
    "--json"
  ], { cwd: root });
  const secondResult = JSON.parse(second.stdout) as { manifest: { entryChange: string; previousCount: number; nextCount: number } };
  assert.equal(secondResult.manifest.entryChange, "added");
  assert.equal(secondResult.manifest.previousCount, 1);
  assert.equal(secondResult.manifest.nextCount, 2);

  let manifest = await fs.readFile(path.join(root, "openrender/openrender_assets.lua"), "utf8");
  assert.match(manifest, /ui\.ladder\.marker/);
  assert.match(manifest, /ui\.start\.button/);

  const update = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "ui.start.button",
    "--remove-background",
    "--manifest-strategy",
    "merge",
    "--install",
    "--json"
  ], { cwd: root });
  const updateResult = JSON.parse(update.stdout) as { manifest: { entryChange: string; previousCount: number; nextCount: number } };
  assert.equal(updateResult.manifest.entryChange, "updated");
  assert.equal(updateResult.manifest.previousCount, 2);
  assert.equal(updateResult.manifest.nextCount, 2);

  manifest = await fs.readFile(path.join(root, "openrender/openrender_assets.lua"), "utf8");
  assert.equal((manifest.match(/ui\.start\.button/g) ?? []).length, 1);
  assert.match(manifest, /ui\.ladder\.marker/);
});

test("compile sprite writes cropped transparent sprite dimensions into LOVE2D manifest", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-love2d-cropped-manifest-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(transparentBorderPng, "base64"));
  await fs.writeFile(path.join(root, "main.lua"), "function love.draw() end\n", "utf8");

  const { stdout } = await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--target",
    "love2d",
    "--id",
    "prop.trimmed",
    "--install",
    "--json"
  ], {
    cwd: root
  });
  const compileResult = JSON.parse(stdout) as {
    contract: { visual: { outputWidth: number; outputHeight: number } };
    artifact: { metadata: { width: number; height: number } };
    outputPlan: { assetPath: string };
  };
  const manifest = await fs.readFile(path.join(root, "openrender/openrender_assets.lua"), "utf8");
  const latestRun = JSON.parse(await fs.readFile(path.join(root, ".openrender/runs/latest.json"), "utf8")) as {
    contract: { visual: { outputWidth: number; outputHeight: number } };
  };
  const installedMetadata = await loadImageMetadata(path.join(root, compileResult.outputPlan.assetPath));
  const verify = await execFileAsync(process.execPath, [cliPath, "verify", "--run", "latest", "--json"], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    status: string;
    checks: Array<{ name: string; status: string; message?: string }>;
  };
  const dimensionCheck = verifyResult.checks.find((check) => check.name === "installed_asset_dimensions");

  assert.equal(compileResult.artifact.metadata.width, 2);
  assert.equal(compileResult.artifact.metadata.height, 2);
  assert.equal(compileResult.contract.visual.outputWidth, 2);
  assert.equal(compileResult.contract.visual.outputHeight, 2);
  assert.equal(latestRun.contract.visual.outputWidth, 2);
  assert.equal(latestRun.contract.visual.outputHeight, 2);
  assert.equal(installedMetadata.width, 2);
  assert.equal(installedMetadata.height, 2);
  assert.match(manifest, /width = 2/);
  assert.match(manifest, /height = 2/);
  assert.equal(verifyResult.status, "passed");
  assert.equal(dimensionCheck?.status, "passed");
  assert.equal(dimensionCheck?.message, "2x2");
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
    "--background-policy",
    "preserve",
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

test("verify --strict-visual fails opaque transparent sprite warnings", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-verify-strict-visual-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(opaqueWhiteRedPng, "base64"));

  await execFileAsync(process.execPath, [
    cliPath,
    "compile",
    "sprite",
    "--from",
    "sprite.png",
    "--id",
    "prop.opaque",
    "--background-policy",
    "preserve",
    "--install",
    "--json"
  ], {
    cwd: root
  });

  await assert.rejects(
    () => execFileAsync(process.execPath, [
      cliPath,
      "verify",
      "--run",
      "latest",
      "--strict-visual",
      "--json",
      "--compact"
    ], {
      cwd: root
    }),
    (error: unknown) => {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      const result = JSON.parse(stdout) as {
        ok: boolean;
        status: string;
        summary: { failed: number; warnings: number };
        tables: { checks: { rows: unknown[][] } };
      };
      assert.equal(result.ok, false);
      assert.equal(result.status, "failed");
      assert.equal(result.summary.failed > 0, true);
      assert.equal(result.tables.checks.rows.some((row) => row[0] === "post_cutout_alpha_presence" && row[1] === "failed"), true);
      return true;
    }
  );
});

test("compact verify report explain and diff return table-shaped agent output", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-compact-agent-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
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

  const verify = await execFileAsync(process.execPath, [
    cliPath,
    "verify",
    "--run",
    "latest",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const verifyResult = JSON.parse(verify.stdout) as {
    ok: boolean;
    checks?: unknown;
    summary: { failed: number };
    tables: { checks: { columns: string[]; rows: unknown[][] } };
  };
  assert.equal(verifyResult.ok, true);
  assert.equal(verifyResult.checks, undefined);
  assert.equal(verifyResult.summary.failed, 0);
  assert.deepEqual(verifyResult.tables.checks.columns, ["name", "status", "path", "message"]);
  assert.equal(verifyResult.tables.checks.rows.length > 0, true);

  const report = await execFileAsync(process.execPath, [
    cliPath,
    "report",
    "--run",
    "latest",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const reportResult = JSON.parse(report.stdout) as {
    agentSummary: string;
    reportPath: string;
    tables: { outputs: { rows: unknown[][] } };
    nextActions: string[];
  };
  assert.match(reportResult.agentSummary, /Installed prop\.dot/);
  assert.match(reportResult.reportPath, /\.openrender\/reports\/run_/);
  assert.equal(reportResult.tables.outputs.rows.some((row) => row[0] === "html"), true);
  assert.equal(reportResult.nextActions.length > 0, true);

  const explain = await execFileAsync(process.execPath, [
    cliPath,
    "explain",
    "--run",
    "latest",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const explainResult = JSON.parse(explain.stdout) as {
    tables: { nextActions: { columns: string[]; rows: unknown[][] } };
  };
  assert.deepEqual(explainResult.tables.nextActions.columns, ["index", "action"]);
  assert.equal(explainResult.tables.nextActions.rows.length > 0, true);

  const diff = await execFileAsync(process.execPath, [
    cliPath,
    "diff",
    "--run",
    "latest",
    "--json",
    "--compact"
  ], {
    cwd: root
  });
  const diffResult = JSON.parse(diff.stdout) as {
    summary: { planned: number; created: number; rollbackAvailable: boolean; manifestChange: string | null };
    tables: { files: { columns: string[]; rows: unknown[][] } };
  };
  assert.equal(diffResult.summary.planned, 2);
  assert.equal(diffResult.summary.created, 2);
  assert.equal(diffResult.summary.manifestChange, "added");
  assert.equal(diffResult.summary.rollbackAvailable, true);
  assert.deepEqual(diffResult.tables.files.columns, ["category", "path"]);
  assert.equal(diffResult.tables.files.rows.some((row) => row[0] === "created"), true);
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

test("report export and reports serve expose local-only report output", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-report-export-"));
  await fs.writeFile(path.join(root, "sprite.png"), Buffer.from(onePixelPng, "base64"));

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
  await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], { cwd: root });

  const { stdout: exportStdout } = await execFileAsync(process.execPath, [
    cliPath,
    "report",
    "export",
    "latest",
    "--format",
    "json",
    "--out",
    "exported-report.json",
    "--json"
  ], {
    cwd: root
  });
  const exportResult = JSON.parse(exportStdout) as { outputPath: string; localOnly: boolean };

  assert.equal(exportResult.outputPath, "exported-report.json");
  assert.equal(exportResult.localOnly, true);
  assert.equal(await fileExists(path.join(root, "exported-report.json")), true);

  const { stdout: serveStdout } = await execFileAsync(process.execPath, [
    cliPath,
    "reports",
    "serve",
    "--once",
    "--json"
  ], {
    cwd: root
  });
  const serveResult = JSON.parse(serveStdout) as { url: string; htmlBytes: number; once: boolean };

  assert.equal(serveResult.url, "http://localhost:3579");
  assert.equal(serveResult.once, true);
  assert.equal(serveResult.htmlBytes > 0, true);
});

test("report includes frame preview sheet for sprite frame sets", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-cli-frame-preview-report-"));
  const imagePath = path.join(root, "sprite.png");
  await fs.writeFile(imagePath, Buffer.from(onePixelPng, "base64"));

  await execFileAsync(process.execPath, [
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
    "--json"
  ], {
    cwd: root
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "report", "--run", "latest", "--json"], {
    cwd: root
  });
  const result = JSON.parse(stdout) as {
    htmlPath: string;
    framePreviewPath?: string;
  };

  assert.equal(typeof result.framePreviewPath, "string");
  assert.equal(await fileExists(path.join(root, result.framePreviewPath ?? "")), true);
  const html = await fs.readFile(path.join(root, result.htmlPath), "utf8");
  assert.match(html, /Frame Preview Sheet/);
  assert.match(html, /Agent Summary/);
  assert.match(html, /Core Recipe/);
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
