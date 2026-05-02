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
  createGodotAssetDescriptor,
  createGodotInstallPlan,
  generateGodotAnimationHelperSource,
  generateGodotManifestSource
} from "@openrender/adapter-godot";
import {
  createLove2DAssetDescriptor,
  createLove2DInstallPlan,
  generateLove2DAnimationHelperSource,
  generateLove2DManifestSource
} from "@openrender/adapter-love2d";
import {
  createInitialRun,
  initializeOpenRenderProject,
  OPENRENDER_DEVKIT_VERSION,
  pathExists,
  resolveInsideProject,
  safeCopyProjectFile,
  safeWriteProjectFile,
  snapshotProjectFile,
  scanProject,
  validateMediaContract,
  validateOpenRenderRun,
  type MediaContract,
  type ProjectScan,
  type TargetEngine,
  type TargetFramework
} from "@openrender/core";
import { runDoctor, type DoctorResult } from "@openrender/doctor";
import {
  analyzeAlphaDiagnostics,
  analyzeSpriteInvariants,
  createFramePreviewSheet,
  cropAlphaBoundsToPng,
  detectFrameGrid,
  loadImageMetadata,
  normalizeImageToPng,
  normalizeWithPreset,
  planFrameSlices,
  validateGridFrameSet,
  validateHorizontalFrameSet,
  type AlphaDiagnostics,
  type FramePreviewSheetOutput,
  type FrameSlice,
  type FrameValidationResult,
  type ImageMetadata,
  type NormalizePreset,
  type SpriteInvariantDiagnostics
} from "@openrender/harness-visual";
import { createPreviewHtml, createReportHtml } from "@openrender/reporter";

const CLI_VERSION = "0.3.1";

type EngineAssetDescriptor =
  | ReturnType<typeof createPhaserAssetDescriptor>
  | ReturnType<typeof createGodotAssetDescriptor>
  | ReturnType<typeof createLove2DAssetDescriptor>;

type EngineInstallPlan =
  | ReturnType<typeof createPhaserInstallPlan>
  | ReturnType<typeof createGodotInstallPlan>
  | ReturnType<typeof createLove2DInstallPlan>;

const CORE_PACK_ID = "core";
const CORE_RECIPES = [
  {
    id: "core.transparent-sprite",
    packId: CORE_PACK_ID,
    mediaType: "visual.transparent_sprite",
    targets: ["phaser", "godot", "love2d"],
    summary: "Normalize one local PNG into an engine-ready transparent sprite asset."
  },
  {
    id: "core.sprite-frame-set",
    packId: CORE_PACK_ID,
    mediaType: "visual.sprite_frame_set",
    targets: ["phaser", "godot", "love2d"],
    summary: "Compile a local sprite sheet into frame metadata, helper code, reports, and rollback-safe install plans."
  }
] as const;
const CORE_PACKS = [
  {
    id: CORE_PACK_ID,
    name: "openRender Core",
    version: CLI_VERSION,
    license: "free",
    builtIn: true,
    localOnly: true,
    recipes: CORE_RECIPES.map((recipe) => recipe.id),
    summary: "Built-in local compile, install, verify, report, explain, diff, and rollback recipes."
  }
] as const;

const OPENRENDER_SCHEMAS: Record<string, Record<string, unknown>> = {
  contract: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/contract.schema.json",
    title: "openRender Media Contract",
    type: "object",
    required: ["schemaVersion", "mediaType", "sourcePath", "target", "id", "visual", "install"],
    properties: {
      schemaVersion: { const: OPENRENDER_DEVKIT_VERSION },
      mediaType: { enum: ["visual.transparent_sprite", "visual.sprite_frame_set"] },
      sourcePath: { type: "string" },
      id: { type: "string", minLength: 1 },
      target: {
        type: "object",
        required: ["engine", "framework", "projectRoot"],
        properties: {
          engine: { enum: ["phaser", "godot", "love2d"] },
          framework: { enum: ["vite", "godot", "love2d"] },
          projectRoot: { type: "string" }
        }
      },
      visual: { type: "object" },
      install: { "$ref": "#/$defs/install" },
      verify: { type: "object" }
    },
    "$defs": {
      install: {
        type: "object",
        required: ["enabled", "assetRoot", "writeManifest", "writeCodegen", "snapshotBeforeInstall"],
        properties: {
          enabled: { type: "boolean" },
          assetRoot: { type: "string" },
          writeManifest: { type: "boolean" },
          writeCodegen: { type: "boolean" },
          snapshotBeforeInstall: { type: "boolean" }
        }
      }
    }
  },
  output: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/run-output.schema.json",
    title: "openRender Compile Output",
    type: "object",
    required: ["dryRun", "projectRoot", "input", "alpha", "contract", "outputPlan", "installPlan", "agentSummary", "run"],
    properties: {
      dryRun: { type: "boolean" },
      projectRoot: { type: "string" },
      input: { type: "object" },
      alpha: { type: "object" },
      contract: { "$ref": "contract.schema.json" },
      outputPlan: { type: "object" },
      installPlan: { "$ref": "install-plan.schema.json" },
      agentSummary: { type: "string" },
      recipe: { type: "object" },
      validation: { type: "object" },
      invariants: { type: "object" },
      frameSlices: { type: "array" },
      framePreview: { type: "object" },
      run: { type: "object" }
    }
  },
  report: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/report.schema.json",
    title: "openRender Report Result",
    type: "object",
    required: ["runId", "jsonPath", "htmlPath", "previewHtmlPath", "latestJsonPath", "latestHtmlPath"],
    properties: {
      runId: { type: "string" },
      jsonPath: { type: "string" },
      htmlPath: { type: "string" },
      previewHtmlPath: { type: "string" },
      framePreviewPath: { type: "string" },
      latestJsonPath: { type: "string" },
      latestHtmlPath: { type: "string" },
      latestPreviewHtmlPath: { type: "string" },
      opened: { type: "boolean" }
    }
  },
  "install-plan": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/install-plan.schema.json",
    title: "openRender Install Plan",
    type: "object",
    required: ["id", "enabled", "files"],
    properties: {
      id: { type: "string" },
      enabled: { type: "boolean" },
      files: {
        type: "array",
        items: {
          type: "object",
          required: ["kind", "action", "to"],
          properties: {
            kind: { enum: ["compiled_asset", "manifest", "codegen"] },
            action: { enum: ["copy", "write"] },
            from: { type: "string" },
            to: { type: "string" },
            contents: { type: "string" }
          }
        }
      }
    }
  },
  "pack-manifest": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/pack-manifest.schema.json",
    title: "openRender Pack Manifest",
    type: "object",
    required: ["id", "name", "version", "license", "recipes"],
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      version: { type: "string" },
      license: { enum: ["free", "paid", "oem"] },
      builtIn: { type: "boolean" },
      localOnly: { type: "boolean" },
      recipes: {
        type: "array",
        items: { type: "string" }
      },
      summary: { type: "string" }
    }
  }
};

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
    const target = readTargetFlag(parsed, "phaser");
    const framework = readFrameworkFlag(parsed, defaultFrameworkForTarget(target));
    assertTargetFrameworkPair(target, framework);
    const result = await initializeOpenRenderProject({
      projectRoot: process.cwd(),
      target,
      framework,
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

  if (command === "schema") {
    const result = getSchemaResult(parsed.positionals[1]);
    console.log(JSON.stringify(result.schema, null, 2));
    return 0;
  }

  if (command === "pack") {
    if (subcommand === "list") {
      const result = listPacks();
      if (parsed.flags.get("json") === true) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printPackListResult(result);
      }
      return 0;
    }

    if (subcommand === "inspect") {
      const result = inspectPack(parsed.positionals[2]);
      if (parsed.flags.get("json") === true) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printPackInspectResult(result);
      }
      return 0;
    }

    if (subcommand === "sync") {
      const result = notImplementedIn031("pack sync");
      if (parsed.flags.get("json") === true) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printNotImplementedResult(result);
      }
      return 1;
    }
  }

  if (command === "recipe" && subcommand === "list") {
    const result = listRecipes();
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printRecipeListResult(result);
    }
    return 0;
  }

  if (command === "login" || (command === "license" && subcommand === "refresh")) {
    const result = notImplementedIn031(command === "login" ? "login" : "license refresh");
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printNotImplementedResult(result);
    }
    return 1;
  }

  if (command === "plan" && subcommand === "sprite") {
    const result = await planSprite(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printPlanResult(result);
    }
    return 0;
  }

  if (command === "detect-frames") {
    const result = await detectFramesCommand(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printDetectFramesResult(result);
    }
    return 0;
  }

  if (command === "normalize") {
    const result = await normalizeCommand(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printNormalizeResult(result);
    }
    return 0;
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

  if (command === "explain") {
    const result = await explainRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printExplainResult(result);
    }
    return 0;
  }

  if (command === "diff") {
    const result = await diffRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printDiffResult(result);
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

function readRunId(parsed: ParsedFlags, fallback = "latest"): string {
  const value = parsed.flags.get("run");
  if (typeof value === "string") return value;
  return parsed.positionals[1] ?? fallback;
}

function requireStringFlag(parsed: ParsedFlags, name: string): string {
  const value = parsed.flags.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option: --${name}`);
  }

  return value;
}

function requireSourcePathFlag(parsed: ParsedFlags): string {
  const value = parsed.flags.get("from") ?? parsed.flags.get("input");
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Missing required option: --from");
  }

  return value;
}

function requirePathArgument(parsed: ParsedFlags, commandName: string): string {
  const value = parsed.positionals[1] ?? parsed.flags.get("from") ?? parsed.flags.get("input");
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required path for ${commandName}.`);
  }

  return value;
}

function readTargetFlag(parsed: ParsedFlags, fallback: TargetEngine): TargetEngine {
  const value = readStringFlag(parsed, "target", fallback);
  if (value === "phaser" || value === "godot" || value === "love2d") return value;
  throw new Error(`Unsupported target for Developer Kit: ${value}`);
}

function readFrameworkFlag(parsed: ParsedFlags, fallback: TargetFramework): TargetFramework {
  const value = readStringFlag(parsed, "framework", fallback);
  if (value === "vite" || value === "godot" || value === "love2d") return value;
  throw new Error(`Unsupported framework for Developer Kit: ${value}`);
}

function defaultFrameworkForTarget(target: TargetEngine): TargetFramework {
  if (target === "love2d") return "love2d";
  return target === "godot" ? "godot" : "vite";
}

function defaultAssetRootForTarget(target: TargetEngine): string {
  return target === "godot" || target === "love2d" ? "assets/openrender" : "public/assets";
}

function assertTargetFrameworkPair(target: TargetEngine, framework: TargetFramework): void {
  if (target === "phaser" && framework !== "vite") {
    throw new Error("Phaser target requires the vite framework.");
  }

  if (target === "godot" && framework !== "godot") {
    throw new Error("Godot target requires the godot framework.");
  }

  if (target === "love2d" && framework !== "love2d") {
    throw new Error("LOVE2D target requires the love2d framework.");
  }
}

async function planSprite(parsed: ParsedFlags): Promise<PlanCommandResult> {
  const forced = cloneParsedFlags(parsed);
  forced.flags.set("dry-run", true);
  forced.flags.set("install", true);
  const compileResult = await compileSprite(forced);
  const filesToWrite: string[] = [];
  const filesToModify: string[] = [];

  for (const file of compileResult.installPlan.files) {
    const exists = await pathExists(resolveInsideProject(process.cwd(), file.to));
    if (exists) {
      filesToModify.push(file.to);
    } else {
      filesToWrite.push(file.to);
    }
  }

  return {
    ok: compileResult.validation?.ok !== false,
    target: compileResult.contract.target.engine,
    operation: "plan",
    filesToWrite,
    filesToModify,
    rollbackWillBeCreated: compileResult.installPlan.files.length > 0,
    agentSummary: `Ready to install ${compileResult.contract.target.engine} asset ${compileResult.contract.id}.`,
    compile: compileResult
  };
}

async function detectFramesCommand(parsed: ParsedFlags): Promise<DetectFramesCommandResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requirePathArgument(parsed, "detect-frames"));
  const frames = readOptionalIntegerFlag(parsed, "frames");
  return detectFrameGrid({ sourcePath, frames });
}

async function normalizeCommand(parsed: ParsedFlags): Promise<NormalizeCommandResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requirePathArgument(parsed, "normalize"));
  const preset = readNormalizePreset(parsed);
  const outputPath = resolveInsideProject(projectRoot, readStringFlag(
    parsed,
    "out",
    path.posix.join(".openrender", "artifacts", "normalized", `${path.parse(sourcePath).name}-${preset}.png`)
  ));
  const output = await normalizeWithPreset({
    sourcePath,
    outputPath,
    preset,
    frameWidth: readOptionalIntegerFlag(parsed, "frame-width"),
    frameHeight: readOptionalIntegerFlag(parsed, "frame-height")
  });

  return {
    ok: true,
    preset,
    outputPath: path.relative(projectRoot, output.path),
    output
  };
}

async function explainRun(parsed: ParsedFlags): Promise<ExplainCommandResult> {
  const record = await readCompileRecord(process.cwd(), readRunId(parsed));
  const nextActionText = createNextActionText(record);
  return {
    ok: record.validation?.ok !== false && record.run.verification?.status !== "failed",
    runId: record.run.runId,
    agentSummary: createAgentSummary(record),
    nextActions: nextActionText
      ? nextActionText.split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2))
      : createSuccessNextActions(record)
  };
}

async function diffRun(parsed: ParsedFlags): Promise<DiffCommandResult> {
  const projectRoot = process.cwd();
  const record = await readCompileRecord(projectRoot, readRunId(parsed));
  const installResult = record.installResult ?? await readInstallResultIfAvailable(projectRoot, record.run.runId);
  const filesPlanned = record.installPlan.files.map((file) => file.to);
  const filesCreated = installResult?.snapshots
    .filter((snapshot) => !snapshot.existed)
    .map((snapshot) => snapshot.relativePath) ?? [];
  const filesModified = installResult?.snapshots
    .filter((snapshot) => snapshot.existed)
    .map((snapshot) => snapshot.relativePath) ?? [];
  const helperCodeGenerated = record.installPlan.files
    .filter((file) => file.kind === "codegen")
    .map((file) => file.to);

  return {
    ok: true,
    runId: record.run.runId,
    filesPlanned,
    filesCreated,
    filesModified,
    helperCodeGenerated,
    snapshotPath: installResult?.snapshotRoot ?? null,
    rollbackCommand: installResult ? `openrender rollback --run ${record.run.runId} --json` : null
  };
}

function cloneParsedFlags(parsed: ParsedFlags): ParsedFlags {
  return {
    flags: new Map(parsed.flags),
    positionals: [...parsed.positionals]
  };
}

function readNormalizePreset(parsed: ParsedFlags): NormalizePreset {
  const value = readStringFlag(parsed, "preset", "transparent-sprite");
  if (value === "transparent-sprite" || value === "ui-icon" || value === "sprite-strip" || value === "sprite-grid") {
    return value;
  }
  throw new Error(`Unsupported normalize preset: ${value}`);
}

function getSchemaResult(name: string | undefined): { name: string; schema: Record<string, unknown> } {
  const normalized = name ?? "contract";
  const schema = OPENRENDER_SCHEMAS[normalized];
  if (!schema) {
    throw new Error(`Unknown schema: ${normalized}. Use contract, output, report, install-plan, or pack-manifest.`);
  }
  return { name: normalized, schema };
}

function listPacks(): PackListCommandResult {
  return {
    ok: true,
    packs: [...CORE_PACKS]
  };
}

function inspectPack(packId: string | undefined): PackInspectCommandResult {
  const id = packId ?? CORE_PACK_ID;
  const pack = CORE_PACKS.find((candidate) => candidate.id === id);
  if (!pack) {
    throw new Error(`Unknown pack: ${id}. Available packs: ${CORE_PACKS.map((candidate) => candidate.id).join(", ")}.`);
  }

  return {
    ok: true,
    pack,
    recipes: CORE_RECIPES.filter((recipe) => recipe.packId === pack.id)
  };
}

function listRecipes(): RecipeListCommandResult {
  return {
    ok: true,
    recipes: [...CORE_RECIPES]
  };
}

function notImplementedIn031(commandName: string): NotImplementedCommandResult {
  return {
    ok: false,
    code: "not_implemented_in_0_3_1",
    command: commandName,
    message: `${commandName} is planned for a later release. openRender core works locally without login, billing, telemetry, or remote sync.`,
    nextActions: [
      "Use the built-in core recipes with openrender recipe list --json.",
      "Run local compile, verify, report, explain, diff, and rollback commands without an account."
    ]
  };
}

async function compileSprite(parsed: ParsedFlags): Promise<CompileSpriteResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requireSourcePathFlag(parsed));
  const id = requireStringFlag(parsed, "id");
  const target = readTargetFlag(parsed, "phaser");
  const framework = readFrameworkFlag(parsed, defaultFrameworkForTarget(target));
  assertTargetFrameworkPair(target, framework);
  const assetRoot = readStringFlag(parsed, "asset-root", defaultAssetRootForTarget(target));
  const layout = readStringFlag(parsed, "layout", "horizontal");
  const padding = readIntegerFlag(parsed, "padding", 0);
  const dryRun = parsed.flags.get("dry-run") === true;

  if (!["horizontal", "horizontal_strip", "grid"].includes(layout)) {
    throw new Error(`Unsupported sprite layout: ${layout}`);
  }
  const metadata = await loadImageMetadata(sourcePath);
  const alpha = await analyzeAlphaDiagnostics({ sourcePath });
  const frameSize = readOptionalSizeFlag(parsed, "frame-size");
  const frames = readOptionalIntegerFlag(parsed, "frames");
  const outputSize = readOptionalSizeFlag(parsed, "output-size");

  let contract: MediaContract;
  let frameSlices: FrameSlice[] | undefined;
  let validation: FrameValidationResult | undefined;
  let invariants: SpriteInvariantDiagnostics | undefined;

  if (frames !== undefined || frameSize !== undefined) {
    if (frames === undefined) throw new Error("--frames is required when --frame-size is provided.");
    if (frameSize === undefined) throw new Error("--frame-size is required when --frames is provided.");
    if (outputSize !== undefined) throw new Error("--output-size is only supported for transparent sprites.");

    contract = {
      schemaVersion: OPENRENDER_DEVKIT_VERSION,
      mediaType: "visual.sprite_frame_set",
      sourcePath: path.relative(projectRoot, sourcePath),
      target: {
        engine: target,
        framework,
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
    invariants = await analyzeSpriteInvariants({
      sourcePath,
      layout: contract.visual.layout,
      frames: contract.visual.frames,
      frameWidth: contract.visual.frameWidth,
      frameHeight: contract.visual.frameHeight
    });
  } else {
    const size = outputSize ?? { width: metadata.width, height: metadata.height };
    contract = {
      schemaVersion: OPENRENDER_DEVKIT_VERSION,
      mediaType: "visual.transparent_sprite",
      sourcePath: path.relative(projectRoot, sourcePath),
      target: {
        engine: target,
        framework,
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

  const descriptor = createEngineAssetDescriptor(contract);
  const run = createInitialRun({ id, mediaType: contract.mediaType });
  const artifactPath = path.posix.join(".openrender", "artifacts", run.runId, path.posix.basename(descriptor.assetPath));
  const installPlan = createEngineInstallPlan({
    contract,
    compiledAssetPath: artifactPath,
    frameSlices
  });
  let artifact: CompileSpriteResult["artifact"];
  let framePreview: FramePreviewSheetOutput | undefined;
  run.status = dryRun ? "harness_ready" : "completed";
  run.outputs = [
    { kind: "compiled_asset", path: artifactPath },
    { kind: "manifest", path: descriptor.manifestPath },
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : [])
  ];
  run.verification = validation
    ? {
        status: validation.ok && invariants?.ok !== false ? "passed" : "failed",
        checks: [
          {
            name: "frame_count_match",
            status: validation.ok ? "passed" : "failed",
            message: validation.reason
          },
          ...(invariants?.checks.map((check) => ({
            name: check.name,
            status: check.status,
            message: check.message
          })) ?? [])
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

    if (contract.mediaType === "visual.sprite_frame_set" && frameSlices?.length) {
      const framePreviewPath = path.posix.join(".openrender", "runs", run.runId, "preview_frames.png");
      framePreview = await createFramePreviewSheet({
        sourcePath: absoluteArtifactPath,
        outputPath: resolveInsideProject(projectRoot, framePreviewPath),
        frameSlices
      });
      run.outputs.push({ kind: "preview", path: framePreviewPath });
    }
  }

  const result: CompileSpriteResult = {
    dryRun,
    projectRoot,
    input: metadata,
    alpha,
    contract,
    outputPlan: descriptor,
    installPlan,
    artifact,
    recipe: createCoreRecipeReference(contract.mediaType),
    agentSummary: createCompileAgentSummary({
      contract,
      installPlan,
      dryRun,
      installedWrites: 0,
      validationOk: validation?.ok !== false
    }),
    generatedSources: createGeneratedSources(contract, frameSlices),
    validation,
    invariants,
    frameSlices,
    framePreview,
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
    result.agentSummary = createCompileAgentSummary({
      contract,
      installPlan,
      dryRun,
      installedWrites: result.installResult.writes.length,
      validationOk: true
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

function createEngineAssetDescriptor(contract: MediaContract): EngineAssetDescriptor {
  if (contract.target.engine === "godot") {
    return createGodotAssetDescriptor(contract);
  }

  if (contract.target.engine === "love2d") {
    return createLove2DAssetDescriptor(contract);
  }

  return createPhaserAssetDescriptor(contract);
}

function createEngineInstallPlan(input: {
  contract: MediaContract;
  compiledAssetPath: string;
  frameSlices?: FrameSlice[];
}): EngineInstallPlan {
  if (input.contract.target.engine === "godot") {
    return createGodotInstallPlan(input);
  }

  if (input.contract.target.engine === "love2d") {
    return createLove2DInstallPlan(input);
  }

  return createPhaserInstallPlan({
    contract: input.contract,
    compiledAssetPath: input.compiledAssetPath
  });
}

function createGeneratedSources(
  contract: MediaContract,
  frameSlices?: FrameSlice[]
): CompileSpriteResult["generatedSources"] {
  if (contract.target.engine === "godot") {
    return contract.mediaType === "visual.sprite_frame_set"
      ? {
          manifest: generateGodotManifestSource([contract]),
          animationHelper: generateGodotAnimationHelperSource(contract, frameSlices)
        }
      : {
          manifest: generateGodotManifestSource([contract])
        };
  }

  if (contract.target.engine === "love2d") {
    return contract.mediaType === "visual.sprite_frame_set"
      ? {
          manifest: generateLove2DManifestSource([contract]),
          animationHelper: generateLove2DAnimationHelperSource(contract, frameSlices)
        }
      : {
          manifest: generateLove2DManifestSource([contract])
        };
  }

  return contract.mediaType === "visual.sprite_frame_set"
    ? {
        manifest: generateManifestSource([contract]),
        animationHelper: generateAnimationHelperSource(contract)
      }
    : {
        manifest: generateManifestSource([contract])
    };
}

function isLoadPathValid(outputPlan: EngineAssetDescriptor): boolean {
  if (outputPlan.engine === "godot") {
    return outputPlan.loadPath.startsWith("res://") && outputPlan.loadPath.endsWith(".png");
  }

  if (outputPlan.engine === "love2d") {
    return !outputPlan.loadPath.startsWith("/") && !outputPlan.loadPath.includes("..") && outputPlan.loadPath.endsWith(".png");
  }

  return outputPlan.publicUrl.startsWith("/") && outputPlan.publicUrl.endsWith(".png");
}

async function installRun(parsed: ParsedFlags): Promise<InstallCommandResult> {
  const projectRoot = process.cwd();
  const runId = readRunId(parsed);
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

async function readInstallResultIfAvailable(projectRoot: string, runId: string): Promise<InstallCommandResult | null> {
  const installResultPath = path.posix.join(".openrender", "runs", `${runId}.install.json`);
  try {
    return JSON.parse(
      await fs.readFile(resolveInsideProject(projectRoot, installResultPath), "utf8")
    ) as InstallCommandResult;
  } catch {
    return null;
  }
}

async function verifyRun(parsed: ParsedFlags): Promise<VerifyCommandResult> {
  const projectRoot = process.cwd();
  const runId = readRunId(parsed);
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

  checks.push({
    name: "engine_load_path_shape",
    status: isLoadPathValid(record.outputPlan) ? "passed" : "failed",
    path: record.outputPlan.loadPath ?? ("publicUrl" in record.outputPlan ? record.outputPlan.publicUrl : undefined),
    message: record.outputPlan.engine
  });

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
  const runId = readRunId(parsed);
  const record = await readCompileRecord(projectRoot, runId);
  const reportJsonPath = path.posix.join(".openrender", "reports", `${record.run.runId}.json`);
  const reportHtmlPath = path.posix.join(".openrender", "reports", `${record.run.runId}.html`);
  const previewHtmlPath = path.posix.join(".openrender", "previews", `${record.run.runId}.html`);
  const json = `${JSON.stringify(record, null, 2)}\n`;
  const visualOverlayHtml = createVisualOverlayHtml(record);
  const nextAction = createNextActionText(record);
  const framePreviewPath = record.run.outputs.find((output) => output.kind === "preview")?.path;
  const html = createReportHtml({
    title: `openRender report ${record.run.runId}`,
    run: record.run,
    sections: [
      { heading: "Contract", body: JSON.stringify(record.contract, null, 2) },
      { heading: "Input", body: JSON.stringify(record.input, null, 2) },
      { heading: "Artifact", body: JSON.stringify(record.artifact ?? null, null, 2) },
      { heading: "Agent Summary", body: record.agentSummary },
      { heading: "Core Recipe", body: JSON.stringify(record.recipe, null, 2) },
      ...(framePreviewPath ? [{ heading: "Frame Preview Sheet", body: framePreviewPath }] : []),
      ...(visualOverlayHtml ? [{ heading: "Visual Overlay", trustedHtml: visualOverlayHtml }] : []),
      { heading: "Install Plan", body: JSON.stringify(record.installPlan, null, 2) },
      { heading: "Validation", body: JSON.stringify(record.validation ?? null, null, 2) },
      { heading: "Run Verification", body: JSON.stringify(record.run.verification ?? null, null, 2) },
      ...(record.contract.target.engine === "godot"
        ? [{
            heading: "Godot Import Note",
            body: "openRender installs source PNG assets and GDScript helpers only. Godot owns .import metadata and .godot/ cache files; open the project or run Godot's import flow before assuming editor-side imported resources exist."
          }]
        : []),
      ...(record.contract.target.engine === "love2d"
        ? [{
            heading: "LOVE2D Load Note",
            body: "openRender installs source PNG assets and Lua helper modules only. Require the generated Lua module from openrender/ and load images through love.graphics.newImage at runtime."
          }]
        : []),
      ...(nextAction ? [{ heading: "Next Action", body: nextAction }] : [])
    ]
  });
  const previewHtml = createPreviewHtml({
    title: `openRender preview ${record.run.runId}`,
    assetUrl: createPreviewAssetUrl(record)
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
    framePreviewPath,
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

function createPreviewAssetUrl(record: CompileSpriteResult): string | undefined {
  if ("publicUrl" in record.outputPlan) return record.outputPlan.publicUrl;

  const artifactPath = record.run.outputs.find((output) => output.kind === "compiled_asset")?.path;
  if (!artifactPath) return undefined;
  return path.posix.relative(".openrender/previews", artifactPath);
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

function createAgentSummary(record: CompileSpriteResult): string {
  const target = record.contract.target.engine;
  const asset = record.contract.id;
  const installed = record.installResult
    ? `Installed ${asset} for ${target} and wrote ${record.installResult.writes.length} file(s).`
    : `Prepared ${asset} for ${target} with ${record.installPlan.files.length} planned file(s).`;
  const report = record.run.outputs.find((output) => output.kind === "report")?.path ?? ".openrender/reports/latest.html";
  return `${installed} Review ${report} before wiring game code.`;
}

function createCoreRecipeReference(mediaType: MediaContract["mediaType"]): CompileSpriteResult["recipe"] {
  const recipe = CORE_RECIPES.find((candidate) => candidate.mediaType === mediaType);
  if (!recipe) throw new Error(`No built-in core recipe for ${mediaType}.`);

  return {
    packId: recipe.packId,
    packVersion: CLI_VERSION,
    recipeId: recipe.id,
    localOnly: true
  };
}

function createCompileAgentSummary(input: {
  contract: MediaContract;
  installPlan: EngineInstallPlan;
  dryRun: boolean;
  installedWrites: number;
  validationOk: boolean;
}): string {
  if (!input.validationOk) {
    return `Blocked ${input.contract.id} for ${input.contract.target.engine}; fix frame geometry before installing.`;
  }

  if (input.dryRun) {
    return `Planned ${input.contract.id} for ${input.contract.target.engine}; review ${input.installPlan.files.length} file(s) before install.`;
  }

  if (input.installedWrites > 0) {
    return `Installed ${input.contract.id} for ${input.contract.target.engine}; wrote ${input.installedWrites} file(s) with rollback available.`;
  }

  return `Compiled ${input.contract.id} for ${input.contract.target.engine}; install when the plan is acceptable.`;
}

function createSuccessNextActions(record: CompileSpriteResult): string[] {
  const actions = [
    `Use asset path ${record.outputPlan.assetPath}.`,
    `Inspect ${record.run.runId} with openrender report --run ${record.run.runId} --json.`
  ];
  if (record.outputPlan.codegenPath) {
    actions.unshift(`Import or require generated helper ${record.outputPlan.codegenPath}.`);
  }
  if (record.installResult) {
    actions.push(`Rollback with openrender rollback --run ${record.run.runId} --json if needed.`);
  }
  return actions;
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
  const runIdFlag = readRunId(parsed);
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
  console.log(`Load path: ${result.outputPlan.loadPath}`);
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

function printPlanResult(result: PlanCommandResult): void {
  console.log("openRender plan sprite");
  console.log("");
  console.log(`Target: ${result.target}`);
  console.log(`Status: ${result.ok ? "ready" : "blocked"}`);
  console.log(result.agentSummary);
  for (const file of result.filesToWrite) console.log(`Create: ${file}`);
  for (const file of result.filesToModify) console.log(`Modify: ${file}`);
}

function printDetectFramesResult(result: DetectFramesCommandResult): void {
  console.log("openRender detect-frames");
  console.log("");
  console.log(`Source: ${result.sourcePath}`);
  console.log(`Layout: ${result.suggested.layout}`);
  console.log(`Frame size: ${result.suggested.frameWidth}x${result.suggested.frameHeight}`);
  console.log(`Frames: ${result.suggested.frameCount}`);
  console.log(`Confidence: ${result.confidence}`);
  for (const diagnostic of result.diagnostics) console.log(`Note: ${diagnostic}`);
}

function printNormalizeResult(result: NormalizeCommandResult): void {
  console.log("openRender normalize");
  console.log("");
  console.log(`Preset: ${result.preset}`);
  console.log(`Output: ${result.outputPath}`);
}

function printPackListResult(result: PackListCommandResult): void {
  console.log("openRender pack list");
  console.log("");
  for (const pack of result.packs) {
    console.log(`${pack.id} ${pack.version}: ${pack.summary}`);
  }
}

function printPackInspectResult(result: PackInspectCommandResult): void {
  console.log("openRender pack inspect");
  console.log("");
  console.log(`${result.pack.id} ${result.pack.version}`);
  console.log(result.pack.summary);
  for (const recipe of result.recipes) {
    console.log(`Recipe: ${recipe.id}`);
  }
}

function printRecipeListResult(result: RecipeListCommandResult): void {
  console.log("openRender recipe list");
  console.log("");
  for (const recipe of result.recipes) {
    console.log(`${recipe.id}: ${recipe.summary}`);
  }
}

function printNotImplementedResult(result: NotImplementedCommandResult): void {
  console.log(`openRender ${result.command}`);
  console.log("");
  console.log(result.message);
  for (const action of result.nextActions) console.log(`Next: ${action}`);
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
  if (result.framePreviewPath) console.log(`Frame preview: ${result.framePreviewPath}`);
}

function printRollbackResult(result: RollbackCommandResult): void {
  console.log("openRender rollback");
  console.log("");
  console.log(`Run: ${result.runId}`);
  for (const action of result.actions) {
    console.log(`${action.action}: ${action.path}`);
  }
}

function printExplainResult(result: ExplainCommandResult): void {
  console.log("openRender explain");
  console.log("");
  console.log(`Run: ${result.runId}`);
  console.log(result.agentSummary);
  for (const action of result.nextActions) console.log(`Next: ${action}`);
}

function printDiffResult(result: DiffCommandResult): void {
  console.log("openRender diff");
  console.log("");
  console.log(`Run: ${result.runId}`);
  for (const file of result.filesPlanned) console.log(`Planned: ${file}`);
  for (const file of result.filesCreated) console.log(`Created: ${file}`);
  for (const file of result.filesModified) console.log(`Modified: ${file}`);
  if (result.snapshotPath) console.log(`Snapshot: ${result.snapshotPath}`);
  if (result.rollbackCommand) console.log(`Rollback: ${result.rollbackCommand}`);
}

function printHelp(): void {
  console.log(`openRender ${CLI_VERSION}

Usage:
  openrender --version
  openrender init [--target phaser|godot|love2d] [--framework vite|godot|love2d] [--force] [--json]
  openrender scan [--json]
  openrender doctor [--json]
  openrender schema contract|output|report|install-plan|pack-manifest
  openrender pack list|inspect [packId] [--json]
  openrender recipe list [--json]
  openrender plan sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d] [--frames n --frame-size WxH] [--json]
  openrender detect-frames <path> [--frames n] [--json]
  openrender normalize <path> [--preset transparent-sprite|ui-icon|sprite-strip|sprite-grid] [--out <path>] [--json]
  openrender compile sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d] [--frames n --frame-size WxH] [--output-size WxH] [--install] [--force] [--dry-run] [--json]
  openrender install [runId|--run latest] [--force] [--json]
  openrender verify [runId|--run latest] [--json]
  openrender report [runId|--run latest] [--open] [--json]
  openrender explain [runId|--run latest] [--json]
  openrender diff [runId|--run latest] [--json]
  openrender rollback [runId|--run latest] [--json]
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
  framePreviewPath?: string;
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

interface PlanCommandResult {
  ok: boolean;
  target: TargetEngine;
  operation: "plan";
  filesToWrite: string[];
  filesToModify: string[];
  rollbackWillBeCreated: boolean;
  agentSummary: string;
  compile: CompileSpriteResult;
}

type DetectFramesCommandResult = Awaited<ReturnType<typeof detectFrameGrid>>;

type CorePack = (typeof CORE_PACKS)[number];
type CoreRecipe = (typeof CORE_RECIPES)[number];

interface PackListCommandResult {
  ok: true;
  packs: CorePack[];
}

interface PackInspectCommandResult {
  ok: true;
  pack: CorePack;
  recipes: CoreRecipe[];
}

interface RecipeListCommandResult {
  ok: true;
  recipes: CoreRecipe[];
}

interface NotImplementedCommandResult {
  ok: false;
  code: "not_implemented_in_0_3_1";
  command: string;
  message: string;
  nextActions: string[];
}

interface NormalizeCommandResult {
  ok: true;
  preset: NormalizePreset;
  outputPath: string;
  output: Awaited<ReturnType<typeof normalizeWithPreset>>;
}

interface ExplainCommandResult {
  ok: boolean;
  runId: string;
  agentSummary: string;
  nextActions: string[];
}

interface DiffCommandResult {
  ok: true;
  runId: string;
  filesPlanned: string[];
  filesCreated: string[];
  filesModified: string[];
  helperCodeGenerated: string[];
  snapshotPath: string | null;
  rollbackCommand: string | null;
}

interface CompileSpriteResult {
  dryRun: boolean;
  projectRoot: string;
  input: ImageMetadata;
  alpha: AlphaDiagnostics;
  contract: MediaContract;
  outputPlan: EngineAssetDescriptor;
  installPlan: EngineInstallPlan;
  artifact?: {
    path: string;
    metadata: ImageMetadata;
  };
  recipe: {
    packId: string;
    packVersion: string;
    recipeId: string;
    localOnly: true;
  };
  agentSummary: string;
  generatedSources: {
    manifest: string;
    animationHelper?: string;
  };
  validation?: FrameValidationResult;
  invariants?: SpriteInvariantDiagnostics;
  frameSlices?: FrameSlice[];
  framePreview?: FramePreviewSheetOutput;
  run: ReturnType<typeof createInitialRun>;
  installResult?: InstallCommandResult;
}

const argv = process.argv.slice(2);

main(argv)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const parsed = parseArgs(argv);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify({
        ok: false,
        code: "OPENRENDER_ERROR",
        message,
        nextActions: createErrorNextActions(message)
      }, null, 2));
    } else {
      console.error(message);
    }
    process.exitCode = 1;
  });

function createErrorNextActions(message: string): string[] {
  if (message.includes("Missing required option: --from")) {
    return ["Pass --from <path> or --input <path> with a project-relative image path."];
  }

  if (message.includes("requires the")) {
    return ["Check --target and --framework, then re-run the command with a supported pair."];
  }

  if (message.includes("without --force")) {
    return ["Review the destination file, then re-run with --force only if overwriting is acceptable."];
  }

  return ["Review the command arguments and re-run with --json for structured output."];
}
