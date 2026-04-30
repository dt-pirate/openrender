#!/usr/bin/env node
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  createPhaserInstallPlan,
  createPhaserAssetDescriptor,
  generateAnimationHelperSource,
  generateManifestSource
} from "@openrender/adapter-phaser";
import {
  createInitialRun,
  initializeOpenRenderProject,
  OPENRENDER_POC_VERSION,
  pathExists,
  resolveInsideProject,
  safeCopyProjectFile,
  safeWriteProjectFile,
  snapshotProjectFile,
  scanProject,
  validateMediaContract,
  validateOpenRenderRun,
  type MediaContract,
  type ProjectScan
} from "@openrender/core";
import { runDoctor, type DoctorResult } from "@openrender/doctor";
import {
  cropAlphaBoundsToPng,
  loadImageMetadata,
  normalizeImageToPng,
  planFrameSlices,
  validateGridFrameSet,
  validateHorizontalFrameSet,
  type FrameSlice,
  type FrameValidationResult,
  type ImageMetadata
} from "@openrender/harness-visual";
import { createPreviewHtml, createReportHtml } from "@openrender/reporter";

const CLI_VERSION = "0.1.0";

interface ParsedFlags {
  flags: Map<string, string | boolean>;
  positionals: string[];
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.positionals;

  if (parsed.flags.get("version") === true || parsed.flags.get("v") === true) {
    console.log(CLI_VERSION);
    return 0;
  }

  if (!command || parsed.flags.get("help") === true || command === "-h" || command === "help") {
    printHelp();
    return 0;
  }

  if (command === "-v" || command === "version") {
    console.log(CLI_VERSION);
    return 0;
  }

  if (command === "init") {
    const result = await initializeOpenRenderProject({
      projectRoot: process.cwd(),
      target: readStringFlag(parsed, "target", "phaser") as "phaser",
      framework: readStringFlag(parsed, "framework", "vite") as "vite",
      force: parsed.flags.get("force") === true
    });

    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    console.log("openRender init");
    console.log(`Config: ${result.configPath}`);
    console.log(`State: ${result.statePath}`);
    console.log(
      result.configOverwritten
        ? "Config overwritten"
        : result.configCreated
          ? "Config created"
          : "Config already exists"
    );
    return 0;
  }

  if (command === "scan") {
    const scan = await scanProject(process.cwd());
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(scan, null, 2));
    } else {
      printScan(scan);
    }
    return 0;
  }

  if (command === "doctor") {
    const result = await runDoctor(process.cwd());
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printDoctor(result);
    }
    return result.checks.some((check) => check.status === "failed") ? 1 : 0;
  }

  if (command === "compile" && subcommand === "sprite") {
    const result = await compileSprite(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCompileSprite(result);
    }
    return result.validation?.ok === false ? 1 : 0;
  }

  if (command === "install") {
    const result = await installRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printInstallResult(result);
    }
    return 0;
  }

  if (command === "verify") {
    const result = await verifyRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printVerifyResult(result);
    }
    return result.status === "passed" ? 0 : 1;
  }

  if (command === "report") {
    const result = await writeReport(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printReportResult(result);
    }
    return 0;
  }

  if (command === "rollback") {
    const result = await rollbackRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printRollbackResult(result);
    }
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Run openrender --help for usage.");
  return 1;
}

function parseArgs(argv: string[]): ParsedFlags {
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      if (!rawKey) continue;

      if (inlineValue !== undefined) {
        flags.set(rawKey, inlineValue);
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        flags.set(rawKey, next);
        index += 1;
      } else {
        flags.set(rawKey, true);
      }
      continue;
    }

    positionals.push(token);
  }

  return { flags, positionals };
}

function readStringFlag(parsed: ParsedFlags, name: string, fallback: string): string {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : fallback;
}

function requireStringFlag(parsed: ParsedFlags, name: string): string {
  const value = parsed.flags.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option: --${name}`);
  }

  return value;
}

async function compileSprite(parsed: ParsedFlags): Promise<CompileSpriteResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requireStringFlag(parsed, "from"));
  const id = requireStringFlag(parsed, "id");
  const target = readStringFlag(parsed, "target", "phaser");
  const framework = readStringFlag(parsed, "framework", "vite");
  const assetRoot = readStringFlag(parsed, "asset-root", "public/assets");
  const layout = readStringFlag(parsed, "layout", "horizontal");
  const padding = readIntegerFlag(parsed, "padding", 0);
  const dryRun = parsed.flags.get("dry-run") === true;

  if (target !== "phaser") throw new Error(`Unsupported target for POC: ${target}`);
  if (framework !== "vite") throw new Error(`Unsupported framework for POC: ${framework}`);
  if (!["horizontal", "horizontal_strip", "grid"].includes(layout)) {
    throw new Error(`Unsupported sprite layout: ${layout}`);
  }
  const metadata = await loadImageMetadata(sourcePath);
  const frameSize = readOptionalSizeFlag(parsed, "frame-size");
  const frames = readOptionalIntegerFlag(parsed, "frames");
  const outputSize = readOptionalSizeFlag(parsed, "output-size");

  let contract: MediaContract;
  let frameSlices: FrameSlice[] | undefined;
  let validation: FrameValidationResult | undefined;

  if (frames !== undefined || frameSize !== undefined) {
    if (frames === undefined) throw new Error("--frames is required when --frame-size is provided.");
    if (frameSize === undefined) throw new Error("--frame-size is required when --frames is provided.");
    if (outputSize !== undefined) throw new Error("--output-size is only supported for transparent sprites.");

    contract = {
      schemaVersion: OPENRENDER_POC_VERSION,
      mediaType: "visual.sprite_frame_set",
      sourcePath: path.relative(projectRoot, sourcePath),
      target: {
        engine: "phaser",
        framework: "vite",
        projectRoot
      },
      id,
      visual: {
        layout: layout === "horizontal" ? "horizontal_strip" : (layout as "grid" | "horizontal_strip"),
        frames,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
        fps: readIntegerFlag(parsed, "fps", 8),
        padding,
        background: metadata.hasAlpha ? "transparent" : "solid",
        outputFormat: "png"
      },
      install: {
        enabled: parsed.flags.get("install") === true,
        assetRoot,
        writeManifest: true,
        writeCodegen: true,
        snapshotBeforeInstall: true
      },
      verify: {
        preview: true,
        checkFrameCount: true,
        checkLoadPath: true
      }
    };

    if (contract.visual.layout === "horizontal_strip") {
      validation = validateHorizontalFrameSet({
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        frames: contract.visual.frames,
        frameWidth: contract.visual.frameWidth,
        frameHeight: contract.visual.frameHeight
      });
    } else {
      validation = validateGridFrameSet({
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        frames: contract.visual.frames,
        frameWidth: contract.visual.frameWidth,
        frameHeight: contract.visual.frameHeight
      });
    }
    frameSlices = validation.ok
      ? planFrameSlices({
          layout: contract.visual.layout,
          imageWidth: metadata.width,
          frames: contract.visual.frames,
          frameWidth: contract.visual.frameWidth,
          frameHeight: contract.visual.frameHeight
        })
      : undefined;
  } else {
    const size = outputSize ?? { width: metadata.width, height: metadata.height };
    contract = {
      schemaVersion: OPENRENDER_POC_VERSION,
      mediaType: "visual.transparent_sprite",
      sourcePath: path.relative(projectRoot, sourcePath),
      target: {
        engine: "phaser",
        framework: "vite",
        projectRoot
      },
      id,
      visual: {
        outputWidth: size.width,
        outputHeight: size.height,
        padding,
        background: metadata.hasAlpha ? "transparent" : "solid",
        outputFormat: "png"
      },
      install: {
        enabled: parsed.flags.get("install") === true,
        assetRoot,
        writeManifest: true,
        writeCodegen: false,
        snapshotBeforeInstall: true
      },
      verify: {
        preview: true,
        checkFrameCount: false,
        checkLoadPath: true
      }
    };
  }

  const descriptor = createPhaserAssetDescriptor(contract);
  const run = createInitialRun({ id, mediaType: contract.mediaType });
  const artifactPath = path.posix.join(".openrender", "artifacts", run.runId, path.posix.basename(descriptor.assetPath));
  const installPlan = createPhaserInstallPlan({
    contract,
    compiledAssetPath: artifactPath
  });
  let artifact: CompileSpriteResult["artifact"];
  run.status = dryRun ? "harness_ready" : "completed";
  run.outputs = [
    { kind: "compiled_asset", path: artifactPath },
    { kind: "manifest", path: descriptor.manifestPath },
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : [])
  ];
  run.verification = validation
    ? {
        status: validation.ok ? "passed" : "failed",
        checks: [
          {
            name: "frame_count_match",
            status: validation.ok ? "passed" : "failed",
            message: validation.reason
          }
        ]
      }
    : undefined;

  if (!dryRun && validation?.ok === false) {
    run.status = "failed_harness";
  } else if (!dryRun) {
    const absoluteArtifactPath = resolveInsideProject(projectRoot, artifactPath);
    if (contract.mediaType === "visual.sprite_frame_set") {
      artifact = await normalizeImageToPng({
        sourcePath,
        outputPath: absoluteArtifactPath
      });
    } else {
      artifact = await cropAlphaBoundsToPng({
        sourcePath,
        outputPath: absoluteArtifactPath,
        padding,
        outputSize
      });
    }

  }

  const result: CompileSpriteResult = {
    dryRun,
    projectRoot,
    input: metadata,
    contract,
    outputPlan: descriptor,
    installPlan,
    artifact,
    generatedSources:
      contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateManifestSource([contract]),
            animationHelper: generateAnimationHelperSource(contract)
          }
        : {
            manifest: generateManifestSource([contract])
          },
    validation,
    frameSlices,
    run
  };

  if (!dryRun) {
    await writeCompileRecord(projectRoot, result);
  }

  if (!dryRun && parsed.flags.get("install") === true && result.validation?.ok !== false) {
    result.installResult = await installCompiledRecord({
      projectRoot,
      record: result,
      force: parsed.flags.get("force") === true
    });
    await writeCompileRecord(projectRoot, result, true);
  }

  return result;
}

async function writeCompileRecord(projectRoot: string, result: CompileSpriteResult, allowOverwrite = false): Promise<void> {
  await safeWriteProjectFile({
    projectRoot,
    relativePath: path.posix.join(".openrender", "runs", `${result.run.runId}.json`),
    contents: `${JSON.stringify(result, null, 2)}\n`,
    allowOverwrite
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: path.posix.join(".openrender", "runs", "latest.json"),
    contents: `${JSON.stringify(result, null, 2)}\n`,
    allowOverwrite: true
  });
}

function readOptionalIntegerFlag(parsed: ParsedFlags, name: string): number | undefined {
  const value = parsed.flags.get(name);
  if (value === undefined || value === false) return undefined;
  if (typeof value !== "string") throw new Error(`--${name} requires a number.`);
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) throw new Error(`--${name} must be a positive integer.`);
  return parsedValue;
}

function readIntegerFlag(parsed: ParsedFlags, name: string, fallback: number): number {
  return readOptionalIntegerFlag(parsed, name) ?? fallback;
}

function readOptionalSizeFlag(parsed: ParsedFlags, name: string): { width: number; height: number } | undefined {
  const value = parsed.flags.get(name);
  if (value === undefined || value === false) return undefined;
  if (typeof value !== "string") throw new Error(`--${name} requires WIDTHxHEIGHT.`);

  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`--${name} must use WIDTHxHEIGHT format.`);

  const size = {
    width: Number.parseInt(match[1] ?? "0", 10),
    height: Number.parseInt(match[2] ?? "0", 10)
  };
  if (size.width <= 0 || size.height <= 0) throw new Error(`--${name} must use positive dimensions.`);
  return size;
}

async function installRun(parsed: ParsedFlags): Promise<InstallCommandResult> {
  const projectRoot = process.cwd();
  const runId = readStringFlag(parsed, "run", "latest");
  const force = parsed.flags.get("force") === true;
  const record = await readCompileRecord(projectRoot, runId);
  return installCompiledRecord({ projectRoot, record, force });
}

async function installCompiledRecord(input: {
  projectRoot: string;
  record: CompileSpriteResult;
  force: boolean;
}): Promise<InstallCommandResult> {
  const { projectRoot, record, force } = input;
  const snapshotRoot = path.posix.join(".openrender", "snapshots", record.run.runId);
  const destinationPaths = record.installPlan.files.map((file) => file.to);

  if (!force) {
    for (const destinationPath of destinationPaths) {
      if (await pathExists(resolveInsideProject(projectRoot, destinationPath))) {
        throw new Error(`Refusing to overwrite existing file without --force: ${destinationPath}`);
      }
    }
  }

  const snapshots = [];
  for (const destinationPath of destinationPaths) {
    snapshots.push(await snapshotProjectFile({
      projectRoot,
      snapshotRoot,
      relativePath: destinationPath
    }));
  }

  const writes = [];
  for (const file of record.installPlan.files) {
    if (file.action === "copy") {
      writes.push(await safeCopyProjectFile({
        projectRoot,
        fromRelativePath: file.from,
        toRelativePath: file.to,
        allowOverwrite: force
      }));
    } else {
      writes.push(await safeWriteProjectFile({
        projectRoot,
        relativePath: file.to,
        contents: file.contents,
        allowOverwrite: force
      }));
    }
  }

  const result = {
    runId: record.run.runId,
    snapshotRoot,
    snapshots,
    writes
  };

  await safeWriteProjectFile({
    projectRoot,
    relativePath: path.posix.join(".openrender", "runs", `${record.run.runId}.install.json`),
    contents: `${JSON.stringify(result, null, 2)}\n`,
    allowOverwrite: true
  });

  return result;
}

async function readCompileRecord(projectRoot: string, runId: string): Promise<CompileSpriteResult> {
  const recordPath = runId === "latest"
    ? ".openrender/runs/latest.json"
    : path.posix.join(".openrender", "runs", `${runId}.json`);
  const record = JSON.parse(
    await fs.readFile(resolveInsideProject(projectRoot, recordPath), "utf8")
  ) as CompileSpriteResult;
  const contractValidation = validateMediaContract(record.contract);
  const runValidation = validateOpenRenderRun(record.run);
  const issues = [
    ...(contractValidation.ok
      ? []
      : contractValidation.issues.map((issue) => `contract${issue.path.slice(1)}: ${issue.message}`)),
    ...(runValidation.ok
      ? []
      : runValidation.issues.map((issue) => `run${issue.path.slice(1)}: ${issue.message}`))
  ];

  if (issues.length > 0) {
    throw new Error(`Invalid openRender run record at ${recordPath}: ${issues.join("; ")}`);
  }

  return record;
}

async function verifyRun(parsed: ParsedFlags): Promise<VerifyCommandResult> {
  const projectRoot = process.cwd();
  const runId = readStringFlag(parsed, "run", "latest");
  const record = await readCompileRecord(projectRoot, runId);
  const checks: VerifyCommandResult["checks"] = [];
  const artifactPath = record.run.outputs.find((output) => output.kind === "compiled_asset")?.path;
  const artifactExists = artifactPath
    ? await pathExists(resolveInsideProject(projectRoot, artifactPath))
    : false;

  checks.push({
    name: "compiled_artifact_exists",
    status: artifactExists ? "passed" : "failed",
    path: artifactPath
  });

  for (const file of record.installPlan.files) {
    checks.push({
      name: `${file.kind}_installed`,
      status: await pathExists(resolveInsideProject(projectRoot, file.to)) ? "passed" : "failed",
      path: file.to
    });
  }

  const installedAsset = record.installPlan.files.find((file) => file.kind === "compiled_asset");
  if (installedAsset && await pathExists(resolveInsideProject(projectRoot, installedAsset.to))) {
    const metadata = await loadImageMetadata(resolveInsideProject(projectRoot, installedAsset.to));
    checks.push({
      name: "installed_asset_dimensions",
      status:
        metadata.width === record.artifact?.metadata.width &&
        metadata.height === record.artifact?.metadata.height
          ? "passed"
          : "failed",
      path: installedAsset.to,
      message: `${metadata.width}x${metadata.height}`
    });
  }

  const result: VerifyCommandResult = {
    runId: record.run.runId,
    status: checks.every((check) => check.status === "passed") ? "passed" : "failed",
    checks
  };
  record.run.status = result.status === "passed" ? "verified" : "failed_verify";
  record.run.verification = result;
  await writeCompileRecord(projectRoot, record, true);

  return result;
}

async function writeReport(parsed: ParsedFlags): Promise<ReportCommandResult> {
  const projectRoot = process.cwd();
  const runId = readStringFlag(parsed, "run", "latest");
  const record = await readCompileRecord(projectRoot, runId);
  const reportJsonPath = path.posix.join(".openrender", "reports", `${record.run.runId}.json`);
  const reportHtmlPath = path.posix.join(".openrender", "reports", `${record.run.runId}.html`);
  const previewHtmlPath = path.posix.join(".openrender", "previews", `${record.run.runId}.html`);
  const json = `${JSON.stringify(record, null, 2)}\n`;
  const visualOverlayHtml = createVisualOverlayHtml(record);
  const nextAction = createNextActionText(record);
  const html = createReportHtml({
    title: `openRender report ${record.run.runId}`,
    run: record.run,
    sections: [
      { heading: "Contract", body: JSON.stringify(record.contract, null, 2) },
      { heading: "Input", body: JSON.stringify(record.input, null, 2) },
      { heading: "Artifact", body: JSON.stringify(record.artifact ?? null, null, 2) },
      ...(visualOverlayHtml ? [{ heading: "Visual Overlay", trustedHtml: visualOverlayHtml }] : []),
      { heading: "Install Plan", body: JSON.stringify(record.installPlan, null, 2) },
      { heading: "Validation", body: JSON.stringify(record.validation ?? null, null, 2) },
      { heading: "Run Verification", body: JSON.stringify(record.run.verification ?? null, null, 2) },
      ...(nextAction ? [{ heading: "Next Action", body: nextAction }] : [])
    ]
  });
  const previewHtml = createPreviewHtml({
    title: `openRender preview ${record.run.runId}`,
    assetUrl: record.outputPlan.publicUrl
  });

  await safeWriteProjectFile({
    projectRoot,
    relativePath: reportJsonPath,
    contents: json,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: reportHtmlPath,
    contents: html,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: ".openrender/reports/latest.json",
    contents: json,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: ".openrender/reports/latest.html",
    contents: html,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: previewHtmlPath,
    contents: previewHtml,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: ".openrender/previews/latest.html",
    contents: previewHtml,
    allowOverwrite: true
  });

  const result: ReportCommandResult = {
    runId: record.run.runId,
    jsonPath: reportJsonPath,
    htmlPath: reportHtmlPath,
    previewHtmlPath,
    latestJsonPath: ".openrender/reports/latest.json",
    latestHtmlPath: ".openrender/reports/latest.html",
    latestPreviewHtmlPath: ".openrender/previews/latest.html",
    opened: false
  };

  if (parsed.flags.get("open") === true) {
    await openLocalFile(resolveInsideProject(projectRoot, reportHtmlPath));
    result.opened = true;
  }

  return result;
}

async function openLocalFile(filePath: string): Promise<void> {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["/c", "start", "", filePath]
    : [filePath];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore"
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function createVisualOverlayHtml(record: CompileSpriteResult): string | null {
  const artifactPath = record.run.outputs.find((output) => output.kind === "compiled_asset")?.path;
  const artifact = record.artifact;
  if (!artifactPath || !artifact) return null;

  const relativeArtifactPath = path.posix.relative(".openrender/reports", artifactPath);
  const width = artifact.metadata.width;
  const height = artifact.metadata.height;
  const rects = record.frameSlices?.length
    ? record.frameSlices
    : [{ index: 0, x: 0, y: 0, width, height }];

  return `<figure class="visual-overlay">
  <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Asset visual overlay">
    <image href="${escapeHtmlAttribute(relativeArtifactPath)}" x="0" y="0" width="${width}" height="${height}"></image>
    ${rects.map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="none" stroke="#00d1ff" stroke-width="1"></rect>`).join("\n    ")}
  </svg>
  <figcaption>${escapeHtmlText(rects.length === 1 ? "asset bounds" : `${rects.length} frame slices`)}</figcaption>
</figure>`;
}

function createNextActionText(record: CompileSpriteResult): string | null {
  if (record.validation?.ok === false) {
    return [
      `Failure: ${record.validation.reason ?? "frame validation failed"}`,
      "",
      "Suggested next action:",
      ...createFrameValidationSuggestions(record).map((suggestion) => `- ${suggestion}`)
    ].join("\n");
  }

  if (record.run.verification?.status === "failed") {
    const failedChecks = record.run.verification.checks.filter((check) => check.status === "failed");
    return [
      "Failure: verify checks failed",
      "",
      "Failed checks:",
      ...failedChecks.map((check) => `- ${check.name}${check.path ? `: ${check.path}` : ""}`),
      "",
      "Suggested next action:",
      ...createVerifySuggestions(record, failedChecks).map((suggestion) => `- ${suggestion}`)
    ].join("\n");
  }

  return null;
}

function createFrameValidationSuggestions(record: CompileSpriteResult): string[] {
  const validation = record.validation;
  if (!validation || record.contract.mediaType !== "visual.sprite_frame_set") {
    return ["Check the source image dimensions and re-run compile."];
  }

  const visual = record.contract.visual;
  const suggestions = new Set<string>();
  if (visual.layout === "horizontal" || visual.layout === "horizontal_strip") {
    if (validation.actualHeight === visual.frameHeight && validation.actualWidth % visual.frameWidth === 0) {
      suggestions.add(`try --frames ${validation.actualWidth / visual.frameWidth}`);
    }
    if (validation.actualWidth % visual.frames === 0) {
      suggestions.add(`try --frame-size ${validation.actualWidth / visual.frames}x${validation.actualHeight}`);
    }
    suggestions.add(`resize or regenerate the source image to ${validation.expectedWidth}x${validation.expectedHeight}`);
  } else {
    const columns = Math.floor(validation.actualWidth / visual.frameWidth);
    const rows = Math.floor(validation.actualHeight / visual.frameHeight);
    const capacity = columns * rows;
    if (capacity > 0 && capacity < visual.frames) suggestions.add(`try --frames ${capacity}`);
    suggestions.add(`use image dimensions divisible by ${visual.frameWidth}x${visual.frameHeight}`);
  }

  return [...suggestions];
}

function createVerifySuggestions(
  record: CompileSpriteResult,
  failedChecks: NonNullable<CompileSpriteResult["run"]["verification"]>["checks"]
): string[] {
  const suggestions = new Set<string>();
  for (const check of failedChecks) {
    if (check.name === "compiled_artifact_exists") {
      suggestions.add("re-run openrender compile sprite for the source image");
    } else if (check.name.endsWith("_installed")) {
      suggestions.add(`run openrender install --run ${record.run.runId}`);
    } else if (check.name === "installed_asset_dimensions") {
      suggestions.add(`re-run openrender install --run ${record.run.runId} --force after recompiling`);
    }
  }

  if (suggestions.size === 0) {
    suggestions.add("inspect the failed check paths, then re-run openrender verify --run latest");
  }

  return [...suggestions];
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function rollbackRun(parsed: ParsedFlags): Promise<RollbackCommandResult> {
  const projectRoot = process.cwd();
  const runIdFlag = readStringFlag(parsed, "run", "latest");
  const record = await readCompileRecord(projectRoot, runIdFlag);
  const installResultPath = path.posix.join(".openrender", "runs", `${record.run.runId}.install.json`);
  const installResult = JSON.parse(
    await fs.readFile(resolveInsideProject(projectRoot, installResultPath), "utf8")
  ) as InstallCommandResult;
  const actions: RollbackCommandResult["actions"] = [];

  for (const snapshot of installResult.snapshots) {
    if (snapshot.existed && snapshot.snapshotPath) {
      await safeCopyProjectFile({
        projectRoot,
        fromRelativePath: snapshot.snapshotPath,
        toRelativePath: snapshot.relativePath,
        allowOverwrite: true
      });
      actions.push({
        action: "restored",
        path: snapshot.relativePath
      });
    } else {
      await fs.rm(resolveInsideProject(projectRoot, snapshot.relativePath), { force: true });
      actions.push({
        action: "deleted",
        path: snapshot.relativePath
      });
    }
  }

  return {
    runId: record.run.runId,
    actions
  };
}


function printScan(scan: ProjectScan): void {
  console.log("openRender scan");
  console.log("");
  console.log(`Project root: ${scan.projectRoot}`);
  console.log(`Package manager: ${scan.packageManager}`);
  console.log(`Framework: ${scan.framework}`);
  console.log(`Engine: ${scan.engine}`);
  console.log(`Asset root: ${scan.assetRoot}${scan.assetRootExists ? "" : " (missing)"}`);
  console.log(`Source root: ${scan.sourceRoot}${scan.sourceRootExists ? "" : " (missing)"}`);
  console.log(`Manifest: ${scan.manifestExists ? scan.manifestPath : "missing"}`);
  console.log(`openRender state: ${scan.stateExists ? "initialized" : "missing"}`);
}

function printDoctor(result: DoctorResult): void {
  console.log("openRender doctor");
  console.log("");
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Node.js: ${result.nodeVersion}`);
  console.log("");

  for (const check of result.checks) {
    const marker = check.status === "passed" ? "ok" : check.status === "warning" ? "warn" : "fail";
    console.log(`${marker.padEnd(5)} ${check.name}: ${check.message}`);
  }
}

function printCompileSprite(result: CompileSpriteResult): void {
  console.log(`openRender compile sprite${result.dryRun ? " --dry-run" : ""}`);
  console.log("");
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Input: ${result.contract.sourcePath}`);
  console.log(`Image: ${result.input.width}x${result.input.height} ${result.input.format}`);
  console.log(`Asset id: ${result.contract.id}`);
  console.log(`Media type: ${result.contract.mediaType}`);
  console.log(`Output asset: ${result.outputPlan.assetPath}`);
  if (result.artifact) console.log(`Compiled artifact: ${result.run.outputs[0]?.path ?? result.artifact.path}`);
  console.log(`Manifest: ${result.outputPlan.manifestPath}`);
  if (result.outputPlan.codegenPath) console.log(`Codegen: ${result.outputPlan.codegenPath}`);
  console.log(`Install plan files: ${result.installPlan.files.length}`);
  if (result.installResult) {
    console.log(`Installed files: ${result.installResult.writes.length}`);
    console.log(`Snapshot: ${result.installResult.snapshotRoot}`);
  }

  if (result.validation) {
    console.log(`Frame validation: ${result.validation.ok ? "passed" : "failed"}`);
    if (result.frameSlices) console.log(`Frame slices: ${result.frameSlices.length}`);
    if (result.validation.reason) console.log(`Reason: ${result.validation.reason}`);
  }
}

function printInstallResult(result: InstallCommandResult): void {
  console.log("openRender install");
  console.log("");
  console.log(`Run: ${result.runId}`);
  console.log(`Snapshot: ${result.snapshotRoot}`);
  for (const write of result.writes) {
    console.log(`Wrote: ${write.relativePath}`);
  }
}

function printVerifyResult(result: VerifyCommandResult): void {
  console.log("openRender verify");
  console.log("");
  console.log(`Run: ${result.runId}`);
  for (const check of result.checks) {
    console.log(`${check.status === "passed" ? "ok" : "fail"} ${check.name}${check.path ? `: ${check.path}` : ""}`);
  }
  console.log(`Status: ${result.status}`);
}

function printReportResult(result: ReportCommandResult): void {
  console.log("openRender report");
  console.log("");
  console.log(`Run: ${result.runId}`);
  console.log(`HTML: ${result.htmlPath}`);
  console.log(`JSON: ${result.jsonPath}`);
  console.log(`Preview: ${result.previewHtmlPath}`);
}

function printRollbackResult(result: RollbackCommandResult): void {
  console.log("openRender rollback");
  console.log("");
  console.log(`Run: ${result.runId}`);
  for (const action of result.actions) {
    console.log(`${action.action}: ${action.path}`);
  }
}

function printHelp(): void {
  console.log(`openRender ${CLI_VERSION}

Usage:
  openrender --version
  openrender init [--target phaser] [--framework vite] [--force] [--json]
  openrender scan [--json]
  openrender doctor [--json]
  openrender compile sprite --from <path> --id <asset.id> [--frames n --frame-size WxH] [--output-size WxH] [--install] [--force] [--dry-run] [--json]
  openrender install --run latest [--force] [--json]
  openrender verify --run latest [--json]
  openrender report --run latest [--open] [--json]
  openrender rollback --run latest [--json]
`);
}

interface InstallCommandResult {
  runId: string;
  snapshotRoot: string;
  snapshots: Awaited<ReturnType<typeof snapshotProjectFile>>[];
  writes: Awaited<ReturnType<typeof safeWriteProjectFile>>[];
}

interface VerifyCommandResult {
  runId: string;
  status: "passed" | "failed";
  checks: Array<{
    name: string;
    status: "passed" | "failed";
    path?: string;
    message?: string;
  }>;
}

interface ReportCommandResult {
  runId: string;
  jsonPath: string;
  htmlPath: string;
  previewHtmlPath: string;
  latestJsonPath: string;
  latestHtmlPath: string;
  latestPreviewHtmlPath: string;
  opened: boolean;
}

interface RollbackCommandResult {
  runId: string;
  actions: Array<{
    action: "restored" | "deleted";
    path: string;
  }>;
}

interface CompileSpriteResult {
  dryRun: boolean;
  projectRoot: string;
  input: ImageMetadata;
  contract: MediaContract;
  outputPlan: ReturnType<typeof createPhaserAssetDescriptor>;
  installPlan: ReturnType<typeof createPhaserInstallPlan>;
  artifact?: {
    path: string;
    metadata: ImageMetadata;
  };
  generatedSources: {
    manifest: string;
    animationHelper?: string;
  };
  validation?: FrameValidationResult;
  frameSlices?: FrameSlice[];
  run: ReturnType<typeof createInitialRun>;
  installResult?: InstallCommandResult;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
