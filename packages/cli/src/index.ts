#!/usr/bin/env node
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
  resolveInsideProject,
  safeWriteProjectFile,
  scanProject,
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

interface ParsedFlags {
  flags: Map<string, string | boolean>;
  positionals: string[];
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.positionals;

  if (parsed.flags.get("version") === true || parsed.flags.get("v") === true) {
    console.log(OPENRENDER_POC_VERSION);
    return 0;
  }

  if (!command || parsed.flags.get("help") === true || command === "-h" || command === "help") {
    printHelp();
    return 0;
  }

  if (command === "-v" || command === "version") {
    console.log(OPENRENDER_POC_VERSION);
    return 0;
  }

  if (command === "init") {
    const result = await initializeOpenRenderProject({
      projectRoot: process.cwd(),
      target: readStringFlag(parsed, "target", "phaser") as "phaser",
      framework: readStringFlag(parsed, "framework", "vite") as "vite",
      force: parsed.flags.get("force") === true
    });

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

  if (["install", "verify", "report", "rollback"].includes(command)) {
    printPlannedCommand(command, "This command is planned for the install/verify/report/rollback milestone.");
    return 2;
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
  if (!dryRun && parsed.flags.get("install") === true) {
    throw new Error("--install is not implemented yet. Run compile first, then install once the install command is available.");
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
      if (outputSize) {
        throw new Error("--output-size is only planned in dry-run mode right now.");
      }

      artifact = await cropAlphaBoundsToPng({
        sourcePath,
        outputPath: absoluteArtifactPath,
        padding
      });
    }

    await safeWriteProjectFile({
      projectRoot,
      relativePath: path.posix.join(".openrender", "runs", `${run.runId}.json`),
      contents: `${JSON.stringify(run, null, 2)}\n`
    });
    await safeWriteProjectFile({
      projectRoot,
      relativePath: path.posix.join(".openrender", "runs", "latest.json"),
      contents: `${JSON.stringify(run, null, 2)}\n`,
      allowOverwrite: true
    });
  }

  return {
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

  return {
    width: Number.parseInt(match[1] ?? "0", 10),
    height: Number.parseInt(match[2] ?? "0", 10)
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

  if (result.validation) {
    console.log(`Frame validation: ${result.validation.ok ? "passed" : "failed"}`);
    if (result.frameSlices) console.log(`Frame slices: ${result.frameSlices.length}`);
    if (result.validation.reason) console.log(`Reason: ${result.validation.reason}`);
  }
}

function printPlannedCommand(command: string, detail: string): void {
  console.error(`openrender ${command} is not implemented yet.`);
  console.error(detail);
}

function printHelp(): void {
  console.log(`openRender ${OPENRENDER_POC_VERSION}

Usage:
  openrender init [--target phaser] [--framework vite] [--force]
  openrender scan [--json]
  openrender doctor [--json]
  openrender compile sprite --from <path> --id <asset.id> [--frames n --frame-size WxH] [--dry-run] [--json]

Planned POC commands:
  openrender install
  openrender verify
  openrender report
  openrender rollback
`);
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
