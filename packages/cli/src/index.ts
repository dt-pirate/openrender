#!/usr/bin/env node
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
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
  createPixiAssetDescriptor,
  createPixiInstallPlan,
  generatePixiAnimationHelperSource,
  generatePixiManifestSource
} from "@openrender/adapter-pixi";
import {
  createCanvasAssetDescriptor,
  createCanvasInstallPlan,
  generateCanvasAnimationHelperSource,
  generateCanvasManifestSource
} from "@openrender/adapter-canvas";
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
  type OpenRenderAdapter,
  type OpenRenderRun,
  type ProjectScan,
  type SpriteFrameSetContract,
  type TransparentSpriteContract,
  type TargetEngine,
  type TargetFramework
} from "@openrender/core";
import { runDoctor, type DoctorResult } from "@openrender/doctor";
import {
  analyzeAlphaDiagnostics,
  analyzeSpriteInvariants,
  createFramePreviewSheet,
  cropAlphaBoundsToPng,
  decideBackgroundRemoval,
  detectFrameGrid,
  loadImageMetadata,
  removeBackgroundInPlaceToPng,
  normalizeImageToPng,
  normalizeWithPreset,
  planFrameSlices,
  validateGridFrameSet,
  validateHorizontalFrameSet,
  type AlphaDiagnostics,
  type BackgroundDecision,
  type BackgroundRemovalMode,
  type BackgroundPolicy,
  type FramePreviewSheetOutput,
  type FrameSlice,
  type FrameValidationResult,
  type ImageMetadata,
  type NormalizePreset,
  type SpriteInvariantDiagnostics
} from "@openrender/harness-visual";
import { createPreviewHtml, createReportHtml } from "@openrender/reporter";

const CLI_VERSION = "0.7.2";

type EngineAssetDescriptor =
  | ReturnType<typeof createPhaserAssetDescriptor>
  | ReturnType<typeof createGodotAssetDescriptor>
  | ReturnType<typeof createLove2DAssetDescriptor>
  | ReturnType<typeof createPixiAssetDescriptor>
  | ReturnType<typeof createCanvasAssetDescriptor>;

type EngineInstallPlan =
  | ReturnType<typeof createPhaserInstallPlan>
  | ReturnType<typeof createGodotInstallPlan>
  | ReturnType<typeof createLove2DInstallPlan>
  | ReturnType<typeof createPixiInstallPlan>
  | ReturnType<typeof createCanvasInstallPlan>;
type EngineInstallPlanFile = EngineInstallPlan["files"][number];

type SpriteCompileContract = SpriteFrameSetContract | TransparentSpriteContract;
type SpriteAdapter = OpenRenderAdapter<EngineAssetDescriptor, EngineInstallPlan>;
type CompactTableCell = string | number | boolean | null;
type VerificationStatus = NonNullable<OpenRenderRun["verification"]>["status"];
type VerificationCheckStatus = NonNullable<OpenRenderRun["verification"]>["checks"][number]["status"];
type ManifestStrategy = "merge" | "replace" | "isolated";
type QualityLevel = "prototype" | "default" | "strict";
type ManifestEntryChange = "added" | "updated" | "replaced" | "isolated";

interface CompactTable {
  columns: string[];
  rows: CompactTableCell[][];
}

const SPRITE_ADAPTER_REGISTRY: Record<TargetEngine, SpriteAdapter> = {
  phaser: {
    id: "phaser",
    framework: "vite",
    detect: (scan) => scan.engine === "phaser",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createPhaserAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createPhaserInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath
      });
    },
    generateSources: (contract) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateManifestSource([contract]),
            animationHelper: generateAnimationHelperSource(contract)
          }
        : {
            manifest: generateManifestSource([contract])
          };
    },
    verify: (descriptor) => "publicUrl" in descriptor && descriptor.publicUrl.startsWith("/") && descriptor.publicUrl.endsWith(".png")
  },
  godot: {
    id: "godot",
    framework: "godot",
    detect: (scan) => scan.engine === "godot",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createGodotAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createGodotInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateGodotManifestSource([contract]),
            animationHelper: generateGodotAnimationHelperSource(contract, frameSlices)
          }
        : {
            manifest: generateGodotManifestSource([contract])
          };
    },
    verify: (descriptor) => descriptor.engine === "godot" && descriptor.loadPath.startsWith("res://") && descriptor.loadPath.endsWith(".png")
  },
  love2d: {
    id: "love2d",
    framework: "love2d",
    detect: (scan) => scan.engine === "love2d",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createLove2DAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createLove2DInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateLove2DManifestSource([contract]),
            animationHelper: generateLove2DAnimationHelperSource(contract, frameSlices)
          }
        : {
            manifest: generateLove2DManifestSource([contract])
          };
    },
    verify: (descriptor) => descriptor.engine === "love2d" && !descriptor.loadPath.startsWith("/") && !descriptor.loadPath.includes("..") && descriptor.loadPath.endsWith(".png")
  },
  pixi: {
    id: "pixi",
    framework: "vite",
    detect: (scan) => scan.engine === "pixi",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createPixiAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createPixiInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generatePixiManifestSource([contract]),
            animationHelper: generatePixiAnimationHelperSource(contract, frameSlices)
          }
        : {
            manifest: generatePixiManifestSource([contract])
          };
    },
    verify: (descriptor) => descriptor.engine === "pixi" && descriptor.publicUrl.startsWith("/") && descriptor.publicUrl.endsWith(".png")
  },
  canvas: {
    id: "canvas",
    framework: "vite",
    detect: (scan) => scan.engine === "canvas",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createCanvasAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createCanvasInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateCanvasManifestSource([contract]),
            animationHelper: generateCanvasAnimationHelperSource(contract, frameSlices)
          }
        : {
            manifest: generateCanvasManifestSource([contract])
          };
    },
    verify: (descriptor) => descriptor.engine === "canvas" && descriptor.publicUrl.startsWith("/") && descriptor.publicUrl.endsWith(".png")
  }
};

const CORE_PACK_ID = "core";
const CORE_RECIPES = [
  {
    id: "core.transparent-sprite",
    packId: CORE_PACK_ID,
    mediaType: "visual.transparent_sprite",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas"],
    summary: "Normalize one local PNG into an engine-ready transparent sprite asset."
  },
  {
    id: "core.sprite-frame-set",
    packId: CORE_PACK_ID,
    mediaType: "visual.sprite_frame_set",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas"],
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
    required: ["schemaVersion", "mediaType", "sourcePath", "target", "id", "install"],
    properties: {
      schemaVersion: { const: OPENRENDER_DEVKIT_VERSION },
      mediaType: {
        enum: [
          "visual.transparent_sprite",
          "visual.sprite_frame_set",
          "audio.sound_effect",
          "audio.music_loop",
          "visual.tileset",
          "visual.atlas",
          "visual.ui_button",
          "visual.ui_panel",
          "visual.icon_set"
        ]
      },
      sourcePath: { type: "string" },
      id: { type: "string", minLength: 1 },
      target: {
        type: "object",
        required: ["engine", "framework", "projectRoot"],
        properties: {
          engine: { enum: ["phaser", "godot", "love2d", "pixi", "canvas"] },
          framework: { enum: ["vite", "godot", "love2d"] },
          projectRoot: { type: "string" }
        }
      },
      visual: { type: "object" },
      audio: { type: "object" },
      ui: { type: "object" },
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
  },
  "media-p4": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/media-p4.schema.json",
    title: "openRender 0.7.2 P4 Media Contracts",
    type: "object",
    required: ["schemaVersion", "mediaType", "sourcePath", "target", "id", "install"],
    properties: {
      schemaVersion: { const: OPENRENDER_DEVKIT_VERSION },
      mediaType: {
        enum: [
          "audio.sound_effect",
          "audio.music_loop",
          "visual.tileset",
          "visual.atlas",
          "visual.ui_button",
          "visual.ui_panel",
          "visual.icon_set"
        ]
      },
      sourcePath: { type: "string" },
      id: { type: "string" },
      audio: { type: "object" },
      visual: { type: "object" },
      ui: { type: "object" },
      target: { type: "object" },
      install: { type: "object" }
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

  if ((command === "agent" && subcommand === "init") || command === "install-agent") {
    const result = await initAgentConfig(parsed, {
      defaultAll: command === "install-agent"
    });
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printAgentInitResult(result);
    }
    return 0;
  }

  if (command === "adapter" && subcommand === "create") {
    const result = await createAdapterScaffold(parsed);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "fixture" && subcommand === "capture") {
    const result = await captureFixture(parsed);
    console.log(JSON.stringify(result, null, 2));
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

  if (command === "context") {
    const result = await createAgentContext({
      includeWireMap: parsed.flags.get("wire-map") === true
    });
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactAgentContext(result) : result, null, 2));
    } else {
      printAgentContext(result);
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

  if (command === "recipe" && subcommand === "inspect") {
    const result = inspectRecipe(parsed.positionals[2]);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "recipe" && subcommand === "validate") {
    const result = await validateRecipeFiles(parsed);
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
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

  if (command === "metadata" && (subcommand === "audio" || subcommand === "atlas" || subcommand === "ui")) {
    const result = await inspectMediaMetadata(subcommand, parsed);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "smoke") {
    const result = await runtimeSmoke(parsed);
    console.log(JSON.stringify(result, null, 2));
    return result.status === "failed" ? 2 : 0;
  }

  if (command === "compile" && subcommand === "sprite") {
    const result = await compileSprite(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCompileSprite(result);
    }
    return result.validation?.ok === false || result.qualityGate?.status === "failed" ? 1 : 0;
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
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactVerifyResult(result) : result, null, 2));
    } else {
      printVerifyResult(result);
    }
    return result.status === "failed" ? 1 : 0;
  }

  if (command === "reports" && subcommand === "serve") {
    const result = await serveReports(parsed);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "report" && subcommand === "export") {
    const result = await exportReport(parsed);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "report") {
    const result = await writeReport(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactReportResult(result) : result, null, 2));
    } else {
      printReportResult(result);
    }
    return 0;
  }

  if (command === "explain") {
    const result = await explainRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactExplainResult(result) : result, null, 2));
    } else {
      printExplainResult(result);
    }
    return 0;
  }

  if (command === "diff") {
    const result = await diffRun(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactDiffResult(result) : result, null, 2));
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
  if (value === "phaser" || value === "godot" || value === "love2d" || value === "pixi" || value === "canvas") return value;
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
  if ((target === "phaser" || target === "pixi" || target === "canvas") && framework !== "vite") {
    throw new Error(`${target} target requires the vite framework.`);
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
  const backgroundMode = readBackgroundModeFlag(parsed);
  const backgroundTolerance = readIntegerFlag(parsed, "background-tolerance", 48);
  const backgroundPolicy = readBackgroundPolicyFlag(parsed);
  const feather = readNonNegativeIntegerFlag(parsed, "feather", 0);
  const outputPath = resolveInsideProject(projectRoot, readStringFlag(
    parsed,
    "out",
    path.posix.join(".openrender", "artifacts", "normalized", `${path.parse(sourcePath).name}-${preset}.png`)
  ));
  const background = await decideBackgroundRemoval({
    sourcePath,
    mediaType: preset === "transparent-sprite" || preset === "ui-icon"
      ? "visual.transparent_sprite"
      : "visual.sprite_frame_set",
    policy: backgroundPolicy,
    preset,
    tolerance: backgroundTolerance,
    mode: backgroundMode,
    feather
  });
  const output = await normalizeWithPreset({
    sourcePath,
    outputPath,
    preset,
    frameWidth: readOptionalIntegerFlag(parsed, "frame-width"),
    frameHeight: readOptionalIntegerFlag(parsed, "frame-height"),
    removeSolidBackground: background.action === "removed",
    backgroundMode,
    backgroundTolerance,
    feather
  });
  const outputAlpha = await analyzeAlphaDiagnostics({ sourcePath: output.path });

  return {
    ok: true,
    preset,
    background: {
      ...background,
      outputTransparentPixelRatio: outputAlpha.transparentPixelRatio
    },
    outputPath: path.relative(projectRoot, output.path),
    output
  };
}

async function inspectMediaMetadata(
  kind: "audio" | "atlas" | "ui",
  parsed: ParsedFlags
): Promise<MediaMetadataCommandResult> {
  const projectRoot = process.cwd();
  const sourceArg = parsed.positionals[2] ?? parsed.flags.get("from") ?? parsed.flags.get("input");
  if (typeof sourceArg !== "string" || sourceArg.length === 0) throw new Error(`Missing required path for metadata ${kind}.`);
  const sourcePath = resolveInsideProject(projectRoot, sourceArg);
  const target = readTargetFlag(parsed, "phaser");
  const id = readStringFlag(parsed, "id", `asset.${kind}`);
  const stat = await fs.stat(sourcePath);

  if (kind === "audio") {
    const outputFormat = readAudioFormat(sourcePath);
    return {
      ok: true,
      kind,
      id,
      target,
      localOnly: true,
      metadata: {
        sourcePath: path.relative(projectRoot, sourcePath),
        bytes: stat.size,
        outputFormat,
        loop: parsed.flags.get("loop") === true || outputFormat === "ogg"
      }
    };
  }

  if (kind === "atlas") {
    const tileSize = readOptionalSizeFlag(parsed, "tile-size") ?? { width: 16, height: 16 };
    const metadata = await loadImageMetadata(sourcePath);
    return {
      ok: true,
      kind,
      id,
      target,
      localOnly: true,
      metadata: {
        sourcePath: path.relative(projectRoot, sourcePath),
        width: metadata.width,
        height: metadata.height,
        tileWidth: tileSize.width,
        tileHeight: tileSize.height,
        columns: Math.floor(metadata.width / tileSize.width),
        rows: Math.floor(metadata.height / tileSize.height),
        outputFormat: "png"
      }
    };
  }

  const states = readStringFlag(parsed, "states", "default").split(",").map((state) => state.trim()).filter(Boolean);
  return {
    ok: true,
    kind,
    id,
    target,
    localOnly: true,
    metadata: {
      sourcePath: path.relative(projectRoot, sourcePath),
      states,
      outputFormat: "png"
    }
  };
}

async function runtimeSmoke(parsed: ParsedFlags): Promise<RuntimeSmokeCommandResult> {
  const projectRoot = process.cwd();
  const runRequested = parsed.flags.get("run") !== undefined;
  const record = runRequested ? await readCompileRecord(projectRoot, readRunId(parsed)) : null;
  const target = parsed.flags.get("target") === undefined && record
    ? record.contract.target.engine
    : readTargetFlag(parsed, record?.contract.target.engine ?? "canvas");
  const runtime = runtimeBinaryForTarget(target);
  if (!runtime) {
    return {
      ok: true,
      target,
      status: "skipped",
      command: null,
      runId: record?.run.runId ?? null,
      screenshotPath: null,
      message: `${target} runtime smoke has no required local binary. Static verification remains the default boundary.`
    };
  }

  const available = await commandAvailable(runtime);
  if (!available) {
    return {
      ok: true,
      target,
      status: "skipped",
      command: runtime,
      runId: record?.run.runId ?? null,
      screenshotPath: null,
      message: `${runtime} was not found on PATH. Static verification remains the default boundary.`
    };
  }

  const timeoutMs = readIntegerFlag(parsed, "timeout", 3) * 1000;
  const args = runtimeArgsForTarget(target);
  const commandText = [runtime, ...args].join(" ");
  const smoke = await runRuntimeProcess({
    cwd: projectRoot,
    command: runtime,
    args,
    timeoutMs
  });
  const screenshotPath = parsed.flags.get("screenshot") === true
    ? await captureSmokeScreenshot(projectRoot, record?.run.runId ?? `${target}-${Date.now()}`)
    : null;

  return {
    ok: smoke.status === "passed",
    target,
    status: smoke.status,
    command: commandText,
    runId: record?.run.runId ?? null,
    screenshotPath,
    message: smoke.status === "passed"
      ? `${target} runtime launched for ${Math.round(timeoutMs / 1000)}s.`
      : `${target} runtime exited before timeout: ${smoke.message}`
  };
}

function readAudioFormat(sourcePath: string): "wav" | "ogg" | "mp3" {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === ".wav") return "wav";
  if (ext === ".ogg") return "ogg";
  if (ext === ".mp3") return "mp3";
  throw new Error("Audio metadata supports .wav, .ogg, and .mp3 sources.");
}

function runtimeBinaryForTarget(target: TargetEngine): string | null {
  if (target === "godot") return "godot";
  if (target === "love2d") return "love";
  if (target === "phaser" || target === "pixi" || target === "canvas") return null;
  return null;
}

function runtimeArgsForTarget(target: TargetEngine): string[] {
  if (target === "love2d") return ["."];
  if (target === "godot") return ["--headless", "--path", ".", "--quit-after", "1"];
  return [];
}

async function runRuntimeProcess(input: {
  cwd: string;
  command: string;
  args: string[];
  timeoutMs: number;
}): Promise<{ status: "passed" | "failed"; message: string }> {
  return new Promise((resolve) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (status: "passed" | "failed", message: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ status, message });
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      settle("passed", "process stayed alive until timeout");
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8").slice(0, 4096);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8").slice(0, 4096);
    });
    child.on("error", (error) => settle("failed", error.message));
    child.on("exit", (code, signal) => {
      if (settled) return;
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n").slice(0, 800);
      if (code === 0) {
        settle("passed", signal ? `exited with signal ${signal}` : "process exited successfully");
      } else {
        const exitLabel = signal ? `signal ${signal}` : `exit ${code ?? "unknown"}`;
        settle("failed", `${exitLabel}${details ? `\n${details}` : ""}`);
      }
    });
  });
}

async function captureSmokeScreenshot(projectRoot: string, runId: string): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  const relativePath = path.posix.join(".openrender", "smoke", `${runId}.png`);
  const outputPath = resolveInsideProject(projectRoot, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve) => {
    const child = spawn("screencapture", ["-x", outputPath], { stdio: "ignore" });
    child.on("error", () => resolve(null));
    child.on("exit", (code) => resolve(code === 0 ? relativePath : null));
  });
}

async function commandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function explainRun(parsed: ParsedFlags): Promise<ExplainCommandResult> {
  const record = await readCompileRecord(process.cwd(), readRunId(parsed));
  const nextActionText = createNextActionText(record);
  return {
    ok: record.validation?.ok !== false && record.run.verification?.status !== "failed",
    runId: record.run.runId,
    agentSummary: createAgentSummary(record),
    backgroundSummary: createBackgroundSummary(record),
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
    manifest: record.manifest ?? null,
    snapshotPath: installResult?.snapshotRoot ?? null,
    rollbackCommand: installResult ? `openrender rollback --run ${record.run.runId} --json` : null
  };
}

function compactAgentContext(result: AgentContextCommandResult): CompactAgentContextResult {
  return {
    ok: true,
    version: result.version,
    target: result.target,
    paths: {
      assetRoot: result.paths.assetRoot,
      sourceRoot: result.paths.sourceRoot,
      manifest: result.paths.manifest
    },
    latestRun: result.latestRun,
    tables: {
      overwriteRisks: {
        columns: ["code", "path", "note"],
        rows: result.overwriteRisks.map((risk) => [risk.code, risk.path, risk.note])
      }
    },
    nextActions: result.recommendedNextActions,
    localOnly: result.localOnly,
    capabilities: result.capabilities,
    ...(result.wireMap ? { wireMap: result.wireMap } : {})
  };
}

function compactVerifyResult(result: VerifyCommandResult): CompactVerifyCommandResult {
  const failedChecks = result.checks.filter((check) => check.status === "failed");
  const warningChecks = result.checks.filter((check) => check.status === "warning");
  return {
    ok: result.status !== "failed",
    runId: result.runId,
    status: result.status,
    summary: {
      checks: result.checks.length,
      failed: failedChecks.length,
      warnings: warningChecks.length
    },
    tables: {
      checks: createVerificationCheckTable(result.checks)
    },
    nextActions: failedChecks.length > 0
      ? failedChecks.map((check) => `Inspect ${check.name}${check.path ? ` at ${check.path}` : ""}.`)
      : ["Run openrender report --run latest --json --compact before wiring game code."]
  };
}

function compactReportResult(result: ReportCommandResult): CompactReportCommandResult {
  const visualRows = result.visualQuality?.checks
    .filter((check) => check.status !== "passed")
    .map((check) => [check.name, check.status, check.path ?? null, check.message ?? null] as CompactTableCell[]) ?? [];

  return {
    ok: true,
    runId: result.runId,
    status: result.status,
    agentSummary: result.agentSummary,
    reportPath: result.htmlPath,
    previewPath: result.previewHtmlPath,
    rollbackCommand: result.rollbackCommand,
    background: result.background,
    tables: {
      outputs: {
        columns: ["kind", "path"],
        rows: [
          ["html", result.htmlPath],
          ["json", result.jsonPath],
          ["preview", result.previewHtmlPath],
          ...(result.framePreviewPath ? [["framePreview", result.framePreviewPath] as CompactTableCell[]] : [])
        ]
      },
      visualQuality: {
        columns: ["name", "status", "path", "message"],
        rows: visualRows
      }
    },
    nextActions: result.nextActions
  };
}

function compactExplainResult(result: ExplainCommandResult): CompactExplainCommandResult {
  return {
    ok: result.ok,
    runId: result.runId,
    agentSummary: result.agentSummary,
    backgroundSummary: result.backgroundSummary,
    tables: {
      nextActions: {
        columns: ["index", "action"],
        rows: result.nextActions.map((action, index) => [index + 1, action])
      }
    }
  };
}

function compactDiffResult(result: DiffCommandResult): CompactDiffCommandResult {
  const rows = [
    ...result.filesPlanned.map((file) => ["planned", file] as CompactTableCell[]),
    ...result.filesCreated.map((file) => ["created", file] as CompactTableCell[]),
    ...result.filesModified.map((file) => ["modified", file] as CompactTableCell[]),
    ...result.helperCodeGenerated.map((file) => ["helper", file] as CompactTableCell[]),
    ...(result.manifest
      ? [["manifest", `${result.manifest.entryChange}:${result.manifest.manifestPath}`] as CompactTableCell[]]
      : [])
  ];

  return {
    ok: true,
    runId: result.runId,
    summary: {
      planned: result.filesPlanned.length,
      created: result.filesCreated.length,
      modified: result.filesModified.length,
      helperCodeGenerated: result.helperCodeGenerated.length,
      manifestChange: result.manifest?.entryChange ?? null,
      rollbackAvailable: result.rollbackCommand !== null
    },
    tables: {
      files: {
        columns: ["category", "path"],
        rows
      }
    },
    snapshotPath: result.snapshotPath,
    rollbackCommand: result.rollbackCommand
  };
}

function createVerificationCheckTable(checks: VerifyCommandResult["checks"]): CompactTable {
  return {
    columns: ["name", "status", "path", "message"],
    rows: checks.map((check) => [
      check.name,
      check.status,
      check.path ?? null,
      check.message ?? null
    ])
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

function readBackgroundModeFlag(parsed: ParsedFlags): BackgroundRemovalMode {
  const value = readStringFlag(parsed, "background-mode", "edge-flood");
  if (value === "top-left" || value === "edge-flood") return value;
  throw new Error(`Unsupported background mode: ${value}`);
}

function readBackgroundPolicyFlag(parsed: ParsedFlags): BackgroundPolicy {
  const rawValue = parsed.flags.get("background-policy");
  const removeBackground = parsed.flags.get("remove-background") === true;

  if (rawValue === true) {
    throw new Error("--background-policy requires auto, preserve, or remove.");
  }

  const value = typeof rawValue === "string" ? rawValue : "auto";
  if (value !== "auto" && value !== "preserve" && value !== "remove") {
    throw new Error(`Unsupported background policy: ${value}`);
  }

  if (removeBackground && value === "preserve") {
    throw new Error("Conflicting background options: --remove-background cannot be used with --background-policy preserve.");
  }

  return removeBackground ? "remove" : value;
}

function readManifestStrategyFlag(parsed: ParsedFlags): ManifestStrategy {
  const value = readStringFlag(parsed, "manifest-strategy", "merge");
  if (value === "merge" || value === "replace" || value === "isolated") return value;
  throw new Error(`Unsupported manifest strategy: ${value}`);
}

function readQualityFlag(parsed: ParsedFlags): QualityLevel {
  const value = readStringFlag(parsed, "quality", parsed.flags.get("strict-visual") === true ? "strict" : "default");
  if (value === "prototype" || value === "default" || value === "strict") return value;
  throw new Error(`Unsupported quality level: ${value}`);
}

function readNonNegativeIntegerFlag(parsed: ParsedFlags, name: string, fallback: number): number {
  const value = parsed.flags.get(name);
  if (value === undefined || value === false) return fallback;
  if (typeof value !== "string") throw new Error(`--${name} requires a number.`);
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) throw new Error(`--${name} must be a non-negative integer.`);
  return parsedValue;
}

function getSchemaResult(name: string | undefined): { name: string; schema: Record<string, unknown> } {
  const normalized = name ?? "contract";
  const schema = OPENRENDER_SCHEMAS[normalized];
  if (!schema) {
    throw new Error(`Unknown schema: ${normalized}. Use contract, output, report, install-plan, pack-manifest, or media-p4.`);
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

function inspectRecipe(recipeId: string | undefined): { ok: true; recipe: CoreRecipe } {
  if (!recipeId) throw new Error("Missing recipe id.");
  const recipe = CORE_RECIPES.find((candidate) => candidate.id === recipeId);
  if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);
  return { ok: true, recipe };
}

async function validateRecipeFiles(parsed: ParsedFlags): Promise<RecipeValidateCommandResult> {
  const projectRoot = process.cwd();
  const recipeRoot = resolveInsideProject(projectRoot, readStringFlag(parsed, "dir", "recipes"));
  const files = await listJsonFiles(recipeRoot);
  const results = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsedRecipe = JSON.parse(raw) as Partial<CoreRecipe>;
    const issues = [];
    if (typeof parsedRecipe.id !== "string" || parsedRecipe.id.length === 0) issues.push("id must be a non-empty string");
    if (parsedRecipe.packId !== CORE_PACK_ID) issues.push("packId must be core");
    if (parsedRecipe.mediaType !== "visual.transparent_sprite" && parsedRecipe.mediaType !== "visual.sprite_frame_set") {
      issues.push("mediaType must be visual.transparent_sprite or visual.sprite_frame_set");
    }
    const targets = parsedRecipe.targets as unknown;
    if (!Array.isArray(targets) || targets.length === 0) issues.push("targets must be a non-empty array");
    if (typeof parsedRecipe.summary !== "string" || parsedRecipe.summary.length === 0) issues.push("summary must be a non-empty string");

    results.push({
      path: path.relative(projectRoot, filePath),
      ok: issues.length === 0,
      issues
    });
  }

  return {
    ok: results.length > 0 && results.every((result) => result.ok),
    files: results
  };
}

async function listJsonFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function createAgentContext(options: { includeWireMap?: boolean } = {}): Promise<AgentContextCommandResult> {
  const projectRoot = process.cwd();
  const scan = await scanProject(projectRoot);
  const latestRun = await readLatestRunSummary(projectRoot);
  const latestRecord = options.includeWireMap ? await readLatestCompileRecordIfAvailable(projectRoot) : null;
  const overwriteRisks: AgentContextCommandResult["overwriteRisks"] = [];
  if (scan.manifestExists) {
    overwriteRisks.push({
      code: "manifest_exists",
      path: toProjectRelativePath(projectRoot, scan.manifestPath),
      note: "Generated manifests use --manifest-strategy merge by default; use replace or isolated when needed."
    });
  }

  const recommendedNextActions = new Set<string>();
  if (scan.engine === "unknown") {
    recommendedNextActions.add("Run openrender init --target <engine> --json after choosing phaser, godot, love2d, pixi, or canvas.");
  }
  recommendedNextActions.add("Run openrender compile sprite --dry-run --json and inspect installPlan.files before install.");
  if (scan.manifestExists) {
    recommendedNextActions.add("Use --manifest-strategy merge for cumulative manifests, replace for one-entry manifests, or isolated for no shared manifest write.");
  }
  if (latestRun) {
    recommendedNextActions.add("Run openrender verify --run latest --json and openrender report --run latest --json after install.");
  } else {
    recommendedNextActions.add("Run openrender scan --json and doctor --json before the first compile.");
  }

  return {
    ok: true,
    version: CLI_VERSION,
    projectRoot,
    packageManager: scan.packageManager,
    target: {
      engine: scan.engine,
      framework: scan.framework
    },
    paths: {
      assetRoot: scan.assetRoot,
      sourceRoot: scan.sourceRoot,
      config: toProjectRelativePath(projectRoot, scan.configPath),
      state: toProjectRelativePath(projectRoot, scan.statePath),
      manifest: toProjectRelativePath(projectRoot, scan.manifestPath)
    },
    exists: {
      packageJson: scan.packageJsonPath !== null,
      assetRoot: scan.assetRootExists,
      sourceRoot: scan.sourceRootExists,
      config: scan.configExists,
      state: scan.stateExists,
      manifest: scan.manifestExists
    },
    latestRun,
    overwriteRisks,
    recommendedNextActions: [...recommendedNextActions],
    localOnly: true,
    capabilities: {
      account: false,
      billing: false,
      cloudApi: false,
      hostedPlayground: false,
      modelProviderCalls: false,
      telemetry: false
    },
    ...(options.includeWireMap ? { wireMap: await createWireMap(scan, latestRecord) } : {})
  };
}

async function readLatestCompileRecordIfAvailable(projectRoot: string): Promise<CompileSpriteResult | null> {
  try {
    if (!await pathExists(resolveInsideProject(projectRoot, ".openrender/runs/latest.json"))) return null;
    return await readCompileRecord(projectRoot, "latest");
  } catch {
    return null;
  }
}

async function readLatestRunSummary(projectRoot: string): Promise<AgentContextCommandResult["latestRun"]> {
  try {
    if (!await pathExists(resolveInsideProject(projectRoot, ".openrender/runs/latest.json"))) return null;
    const record = await readCompileRecord(projectRoot, "latest");
    const installResult = await readInstallResultIfAvailable(projectRoot, record.run.runId);
    return {
      runId: record.run.runId,
      createdAt: record.run.createdAt,
      status: record.run.status,
      mediaType: record.run.contract.mediaType,
      assetId: record.run.contract.id,
      verification: record.run.verification?.status ?? null,
      installRecorded: installResult !== null
    };
  } catch {
    return null;
  }
}

async function createWireMap(scan: ProjectScan, latestRecord: CompileSpriteResult | null = null): Promise<WireMapResult> {
  const projectRoot = scan.projectRoot;
  const candidates: WireMapResult["candidates"] = [];
  const notes: string[] = ["Read-only scan; openRender does not patch game code."];
  const latestAsset = latestRecord ? createWireMapLatestAsset(latestRecord) : undefined;

  if (scan.engine === "phaser") {
    const files = await listProjectTextFiles(projectRoot, ["src"], [".ts", ".tsx", ".js", ".jsx"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const signals = collectSignals(contents, [
        ["phaser_scene", /extends\s+Phaser\.Scene|new\s+Phaser\.Scene/],
        ["preload", /\bpreload\s*\(/],
        ["create", /\bcreate\s*\(/],
        ["game_config", /new\s+Phaser\.Game|type\s*:\s*Phaser/]
      ]);
      if (signals.length > 0) {
        candidates.push({
          file,
          kind: signals.includes("phaser_scene") ? "scene" : "entry",
          signals,
          suggestedAction: signals.includes("preload") || signals.includes("create")
            ? "Wire generated preload/register helpers near the detected scene methods."
            : "Inspect this Phaser entry point before wiring generated helpers."
        });
      }
    }
  } else if (scan.engine === "godot") {
    if (await pathExists(path.join(projectRoot, "project.godot"))) {
      candidates.push({
        file: "project.godot",
        kind: "config",
        signals: ["godot_project"],
        suggestedAction: "Use generated res:// asset paths from openRender helpers."
      });
    }
    const files = await listProjectTextFiles(projectRoot, ["scripts", "scenes"], [".gd", ".tscn"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const signals = collectSignals(contents, [
        ["godot_script", /extends\s+\w+|class_name\s+\w+/],
        ["ready", /func\s+_ready\s*\(/],
        ["process", /func\s+_process\s*\(/],
        ["scene", /\[node|\[gd_scene/],
        ["sprite_node", /Sprite2D|AnimatedSprite2D|SpriteFrames/]
      ]);
      if (signals.length > 0) {
        candidates.push({
          file,
          kind: file.endsWith(".tscn") ? "scene" : "script",
          signals,
          suggestedAction: "Connect generated GDScript helpers from scripts/openrender without creating .import files."
        });
      }
    }
  } else if (scan.engine === "love2d") {
    const files = await listProjectTextFiles(projectRoot, ["."], [".lua"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const signals = collectSignals(contents, [
        ["love_load", /function\s+love\.load\s*\(/],
        ["love_draw", /function\s+love\.draw\s*\(/],
        ["love_update", /function\s+love\.update\s*\(/],
        ["require", /\brequire\s*\(/],
        ["love_config", /function\s+love\.conf\s*\(/]
      ]);
      if (signals.length > 0 || file === "main.lua" || file === "conf.lua") {
        candidates.push({
          file,
          kind: file === "conf.lua" ? "config" : "entry",
          signals: signals.length > 0 ? signals : ["love2d_entry"],
          suggestedAction: "Require generated Lua helpers from openrender/ and load images in the LOVE2D lifecycle."
        });
      }
    }
  } else if (scan.engine === "pixi" || scan.engine === "canvas") {
    const files = await listProjectTextFiles(projectRoot, ["src"], [".ts", ".tsx", ".js", ".jsx"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const pixiSignals = collectSignals(contents, [
        ["pixi_application", /new\s+Application|Application\.init|PIXI/],
        ["pixi_assets", /Assets\.load|AnimatedSprite|Sprite\.from/]
      ]);
      const canvasSignals = collectSignals(contents, [
        ["canvas_context", /getContext\s*\(\s*["']2d["']|HTMLCanvasElement/],
        ["draw_loop", /requestAnimationFrame|\bdraw\s*\(|\brender\s*\(/],
        ["image_load", /new\s+Image|createImageBitmap/]
      ]);
      const signals = scan.engine === "pixi" ? pixiSignals : canvasSignals;
      if (signals.length > 0) {
        candidates.push({
          file,
          kind: "entry",
          signals,
          suggestedAction: scan.engine === "pixi"
            ? "Use generated Pixi helper paths near the application asset load path."
            : "Use generated Canvas helper paths near image load or draw functions."
        });
      }
    }
  } else {
    notes.push("Target engine is unknown; run openrender scan --json or init with an explicit target first.");
  }

  if (candidates.length === 0) {
    notes.push("No obvious wiring location found; inspect the game entry file before editing.");
  }

  return {
    target: scan.engine,
    readOnly: true,
    ...(latestAsset ? { latestAsset } : {}),
    candidates: candidates.slice(0, 20),
    tables: {
      candidates: createWireMapTable(candidates.slice(0, 20))
    },
    notes
  };
}

async function listProjectTextFiles(
  projectRoot: string,
  roots: string[],
  extensions: string[],
  limit = 200
): Promise<string[]> {
  const files: string[] = [];
  for (const root of roots) {
    const absoluteRoot = resolveInsideProject(projectRoot, root);
    if (!await pathExists(absoluteRoot)) continue;
    await collectProjectTextFiles(projectRoot, absoluteRoot, extensions, files, limit);
    if (files.length >= limit) break;
  }
  return files;
}

async function collectProjectTextFiles(
  projectRoot: string,
  absoluteDir: string,
  extensions: string[],
  files: string[],
  limit: number
): Promise<void> {
  if (files.length >= limit) return;
  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= limit) return;
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".openrender" || entry.name === "dist") {
      continue;
    }
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      await collectProjectTextFiles(projectRoot, absolutePath, extensions, files, limit);
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      files.push(toProjectRelativePath(projectRoot, absolutePath));
    }
  }
}

async function readSmallTextFile(filePath: string, maxBytes = 64 * 1024): Promise<string> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const result = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, result.bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

function collectSignals(contents: string, patterns: Array<[string, RegExp]>): string[] {
  return patterns
    .filter(([, pattern]) => pattern.test(contents))
    .map(([signal]) => signal);
}

function createWireMapTable(candidates: WireMapResult["candidates"]): CompactTable {
  return {
    columns: ["kind", "file", "signals", "suggestedAction"],
    rows: candidates.map((candidate) => [
      candidate.kind,
      candidate.file,
      candidate.signals.join(","),
      candidate.suggestedAction
    ])
  };
}

function createWireMapLatestAsset(record: CompileSpriteResult): WireMapLatestAsset {
  return {
    assetId: record.contract.id,
    mediaType: record.contract.mediaType,
    engine: record.contract.target.engine,
    assetPath: record.outputPlan.assetPath,
    loadPath: record.outputPlan.loadPath,
    manifestPath: record.outputPlan.manifestPath,
    manifestModule: createManifestModuleName(record),
    runId: record.run.runId,
    snippets: createWireMapSnippets(record)
  };
}

function createManifestModuleName(record: CompileSpriteResult): string {
  const manifestPath = record.outputPlan.manifestPath;
  if (record.contract.target.engine === "love2d") {
    return manifestPath.replace(/\.lua$/, "").replace(/\//g, ".");
  }
  if (record.contract.target.engine === "godot") {
    return `res://${manifestPath}`;
  }
  return manifestPath.replace(/^src\//, "@/").replace(/\.[tj]s$/, "");
}

function createWireMapSnippets(record: CompileSpriteResult): WireMapLatestAsset["snippets"] {
  const assetId = record.contract.id;
  const loadPath = record.outputPlan.loadPath;
  const manifestModule = createManifestModuleName(record);
  const codegenPath = record.outputPlan.codegenPath;

  if (record.contract.target.engine === "love2d") {
    return [
      {
        label: "LOVE2D manifest load example",
        language: "lua",
        code: [
          `local openrender_assets = require(${JSON.stringify(manifestModule)})`,
          `local asset = openrender_assets[${JSON.stringify(assetId)}]`,
          "local image",
          "",
          "function love.load()",
          "  image = love.graphics.newImage(asset.path)",
          "end",
          "",
          "function love.draw()",
          "  love.graphics.draw(image, x, y)",
          "end"
        ].join("\n")
      },
      ...(codegenPath
        ? [{
            label: "LOVE2D animation helper example",
            language: "lua",
            code: `local helper = require(${JSON.stringify(codegenPath.replace(/\.lua$/, "").replace(/\//g, "."))})`
          }]
        : [])
    ];
  }

  if (record.contract.target.engine === "godot") {
    return [
      {
        label: "Godot manifest preload example",
        language: "gdscript",
        code: [
          `const OpenRenderAssets = preload(${JSON.stringify(manifestModule)})`,
          `var asset := OpenRenderAssets.get_asset(${JSON.stringify(assetId)})`,
          `var texture := load(asset.get("path", ${JSON.stringify(loadPath)}))`
        ].join("\n")
      }
    ];
  }

  if (record.contract.target.engine === "phaser") {
    return [
      {
        label: "Phaser scene example",
        language: "ts",
        code: [
          `import { openRenderAssets } from ${JSON.stringify(manifestModule)};`,
          `const asset = openRenderAssets[${JSON.stringify(assetId)}];`,
          "preload() {",
          "  this.load.image(asset.key ?? asset.url, asset.url);",
          "}"
        ].join("\n")
      }
    ];
  }

  if (record.contract.target.engine === "pixi") {
    return [
      {
        label: "Pixi asset load example",
        language: "ts",
        code: [
          `import { openRenderAssets } from ${JSON.stringify(manifestModule)};`,
          `const asset = openRenderAssets[${JSON.stringify(assetId)}];`,
          "await Assets.load(asset.url);"
        ].join("\n")
      }
    ];
  }

  return [
    {
      label: "Canvas image load example",
      language: "ts",
      code: [
        `import { openRenderAssets } from ${JSON.stringify(manifestModule)};`,
        `const asset = openRenderAssets[${JSON.stringify(assetId)}];`,
        "const image = new Image();",
        "image.src = asset.url;"
      ].join("\n")
    }
  ];
}

function toProjectRelativePath(projectRoot: string, absoluteOrRelativePath: string): string {
  if (!path.isAbsolute(absoluteOrRelativePath)) return absoluteOrRelativePath.split(path.sep).join(path.posix.sep);
  return path.relative(projectRoot, absoluteOrRelativePath).split(path.sep).join(path.posix.sep);
}

async function initAgentConfig(
  parsed: ParsedFlags,
  options: { defaultAll: boolean } = { defaultAll: false }
): Promise<AgentInitCommandResult> {
  const projectRoot = process.cwd();
  const agents = readAgentInstallTargets(parsed, options.defaultAll);
  const force = parsed.flags.get("force") === true;
  const dryRun = parsed.flags.get("dry-run") === true;
  const specs = agents.map((agent) => ({
    agent,
    ...createAgentConfigSpec(agent)
  }));

  if (!dryRun && !force) {
    for (const spec of specs) {
      if (await pathExists(resolveInsideProject(projectRoot, spec.relativePath))) {
        throw new Error(`Refusing to overwrite existing file without --force: ${spec.relativePath}`);
      }
    }
  }

  const files: AgentInstallFilePlan[] = [];
  for (const spec of specs) {
    const exists = await pathExists(resolveInsideProject(projectRoot, spec.relativePath));
    if (!dryRun) {
      await safeWriteProjectFile({
        projectRoot,
        relativePath: spec.relativePath,
        contents: spec.contents,
        allowOverwrite: force
      });
    }
    files.push({
      agent: spec.agent,
      path: spec.relativePath,
      exists,
      action: dryRun
        ? exists ? "would_overwrite" : "would_create"
        : exists ? "overwritten" : "created"
    });
  }

  return {
    ok: true,
    agent: agents.length === 1 ? agents[0]! : "all",
    path: agents.length === 1 ? specs[0]!.relativePath : "",
    files,
    dryRun,
    overwrittenAllowed: force,
    nextActions: [
      "Run openrender context --json to collect the minimal project handoff.",
      "Run openrender compile sprite --dry-run --json before install and inspect installPlan.files.",
      "Use --force only after confirming manifest or helper overwrites are acceptable."
    ]
  };
}

function readAgentInstallTargets(parsed: ParsedFlags, defaultAll: boolean): AgentKind[] {
  const flagTargets = [
    parsed.flags.get("codex") === true ? "codex" : null,
    parsed.flags.get("cursor") === true ? "cursor" : null,
    parsed.flags.get("claude") === true ? "claude" : null
  ].filter((value): value is AgentKind => value !== null);
  const platform = parsed.flags.get("platform");

  if (flagTargets.length > 0 && platform !== undefined) {
    throw new Error("Choose either --platform or one of --codex, --cursor, --claude.");
  }

  if (flagTargets.length > 0) return flagTargets;
  if (typeof platform === "string") {
    if (platform === "all") return ["codex", "cursor", "claude"];
    if (isAgentKind(platform)) return [platform];
    throw new Error("--platform must be codex, cursor, claude, or all.");
  }
  if (defaultAll) return ["codex", "cursor", "claude"];
  throw new Error("Choose an agent target: --codex, --cursor, --claude, or --platform codex|cursor|claude|all.");
}

function isAgentKind(value: string): value is AgentKind {
  return value === "codex" || value === "cursor" || value === "claude";
}

function createAgentConfigSpec(agent: AgentKind): { relativePath: string; contents: string } {
  const body = `# openRender Skill

Use openRender as a local-only handoff layer for generated media. Treat this file as the local openRender skill for the current coding agent.

- Read README.md and AGENT_USAGE.md first.
- Start with openrender context --json to collect the smallest useful project snapshot.
- Use openrender context --json --compact when you need the shortest project handoff.
- Use openrender context --json --wire-map to find read-only asset wiring candidates before editing game code.
- Prefer JSON commands: context, scan, doctor, plan, compile, install, verify, report, explain, diff, rollback.
- Before installing, run openrender compile sprite --dry-run --json and inspect installPlan.files.
- Generated sprite handoff uses --background-policy auto by default for safe opaque-background cutout.
- Use --background-policy preserve to keep the original background, or --background-policy remove / --remove-background to force cutout.
- Use --manifest-strategy merge for cumulative generated manifests; use replace or isolated only when that write policy is intended.
- Use --quality strict or verify --strict-visual when likely visual transparency problems should fail the run.
- By default, installs refuse unrelated destination overwrites. Use --force only after the user accepts helper or asset overwrite risk.
- After install, run openrender verify --run latest --json --compact.
- Use report, explain, and diff with --compact when you only need status, next actions, rollback information, and compact tables.
- Rollback only affects files in the selected install plan and does not undo game-code edits made separately.
- Never enable upload, telemetry, account, billing, or remote sync flows.
- Supported targets in 0.7.2: phaser, godot, love2d, pixi, canvas.
`;

  if (agent === "codex") return { relativePath: "AGENTS.md", contents: body };
  if (agent === "cursor") return { relativePath: ".cursor/rules/openrender.md", contents: body };
  return { relativePath: ".claude/openrender.md", contents: body };
}

async function createAdapterScaffold(parsed: ParsedFlags): Promise<AdapterCreateCommandResult> {
  const projectRoot = process.cwd();
  const name = requireStringFlag(parsed, "name");
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("--name must use lowercase letters, numbers, and dashes.");
  if (["phaser", "godot", "love2d", "pixi", "canvas"].includes(name)) {
    throw new Error(`Adapter ${name} already exists.`);
  }

  const base = path.posix.join("packages", "adapters", name);
  const packageName = `@openrender/adapter-${name}`;
  const files = [
    {
      path: path.posix.join(base, "package.json"),
      contents: `${JSON.stringify({
        name: packageName,
        version: CLI_VERSION,
        description: `${name} adapter scaffold for openRender`,
        license: "Apache-2.0",
        type: "module",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
        scripts: { build: "tsc -b", typecheck: "tsc -b --pretty false" },
        dependencies: { "@openrender/core": "workspace:*" }
      }, null, 2)}\n`
    },
    {
      path: path.posix.join(base, "tsconfig.json"),
      contents: `{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "references": [{ "path": "../../core" }]
}
`
    },
    {
      path: path.posix.join(base, "README.md"),
      contents: `# ${packageName}

Adapter scaffold. Implement descriptor, install-plan, helper generation, verification, and fixture acceptance tests before publishing.
`
    },
    {
      path: path.posix.join(base, "src", "index.ts"),
      contents: `import type { MediaContract } from "@openrender/core";

export function describe${assetIdToPascalCase(name)}Adapter(contract: MediaContract) {
  return {
    id: contract.id,
    engine: ${JSON.stringify(name)}
  };
}
`
    },
    {
      path: path.posix.join(base, "src", "index.test.ts"),
      contents: `import assert from "node:assert/strict";
import { test } from "node:test";

test("${name} adapter scaffold is ready for implementation", () => {
  assert.equal(${JSON.stringify(name)}.length > 0, true);
});
`
    },
    {
      path: path.posix.join("fixtures", `${name}-template`, "fixture.json"),
      contents: `${JSON.stringify({
        name: `${name}-template`,
        target: name,
        inputPngBase64: "<base64-png>",
        args: ["compile", "sprite", "--from", "input.png", "--target", name, "--id", "fixture.asset", "--dry-run", "--json"],
        expected: {
          mediaType: "visual.transparent_sprite",
          assetPath: "public/assets/fixture-asset.png",
          installKinds: ["compiled_asset", "manifest"]
        }
      }, null, 2)}\n`
    }
  ];

  const written = [];
  for (const file of files) {
    await safeWriteProjectFile({
      projectRoot,
      relativePath: file.path,
      contents: file.contents,
      allowOverwrite: parsed.flags.get("force") === true
    });
    written.push(file.path);
  }

  return {
    ok: true,
    adapter: name,
    files: written,
    nextActions: [
      "Wire the adapter into the internal registry after implementing descriptor and install-plan behavior.",
      "Add two golden fixtures before publishing the adapter."
    ]
  };
}

async function captureFixture(parsed: ParsedFlags): Promise<FixtureCaptureCommandResult> {
  const projectRoot = process.cwd();
  const name = requireStringFlag(parsed, "name");
  const source = resolveInsideProject(projectRoot, requireSourcePathFlag(parsed));
  const target = readTargetFlag(parsed, "phaser");
  const id = readStringFlag(parsed, "id", `fixture.${name}`);
  const relativeSource = path.relative(projectRoot, source);
  if (relativeSource.startsWith("..") || path.isAbsolute(relativeSource)) {
    throw new Error("Fixture capture refuses source files outside the project root.");
  }

  const inputPngBase64 = (await fs.readFile(source)).toString("base64");
  const fixture = {
    name,
    target,
    inputPngBase64,
    args: ["compile", "sprite", "--from", "input.png", "--target", target, "--id", id, "--dry-run", "--json"],
    expected: {
      mediaType: "visual.transparent_sprite",
      assetPath: `${defaultAssetRootForTarget(target)}/${assetIdToKebabCaseLocal(id)}.png`,
      installKinds: ["compiled_asset", "manifest"]
    },
    capture: {
      source: relativeSource,
      sanitized: true
    }
  };
  const fixturePath = path.posix.join("fixtures", "captured", assetIdToKebabCaseLocal(name), "fixture.json");
  await safeWriteProjectFile({
    projectRoot,
    relativePath: fixturePath,
    contents: `${JSON.stringify(fixture, null, 2)}\n`,
    allowOverwrite: parsed.flags.get("force") === true
  });

  return {
    ok: true,
    fixturePath,
    summary: `Captured ${name} for ${target} without referencing files outside the fixture.`
  };
}

async function exportReport(parsed: ParsedFlags): Promise<ReportExportCommandResult> {
  const projectRoot = process.cwd();
  const runId = parsed.positionals[2] ?? readRunId(parsed);
  const format = readStringFlag(parsed, "format", "html");
  if (format !== "html" && format !== "json") throw new Error("--format must be html or json.");
  const sourcePath = path.posix.join(".openrender", "reports", `${runId === "latest" ? "latest" : runId}.${format}`);
  const outputPath = readStringFlag(parsed, "out", path.posix.join(".openrender", "exports", `${runId}.${format}`));
  const source = await fs.readFile(resolveInsideProject(projectRoot, sourcePath), "utf8");
  await safeWriteProjectFile({
    projectRoot,
    relativePath: outputPath,
    contents: source,
    allowOverwrite: parsed.flags.get("force") === true
  });

  return {
    ok: true,
    runId,
    format,
    sourcePath,
    outputPath,
    localOnly: true
  };
}

async function serveReports(parsed: ParsedFlags): Promise<ReportsServeCommandResult> {
  const projectRoot = process.cwd();
  const port = readIntegerFlag(parsed, "port", 3579);
  const once = parsed.flags.get("once") === true;
  const html = await createReportsGalleryHtml(projectRoot);

  if (once) {
    return {
      ok: true,
      host: "localhost",
      port,
      url: `http://localhost:${port}`,
      once: true,
      htmlBytes: Buffer.byteLength(html)
    };
  }

  const server = createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));

  return new Promise<ReportsServeCommandResult>((resolve) => {
    process.on("SIGTERM", () => server.close());
    process.on("SIGINT", () => server.close());
    server.on("close", () => resolve({
      ok: true,
      host: "localhost",
      port,
      url: `http://localhost:${port}`,
      once: false,
      htmlBytes: Buffer.byteLength(html)
    }));
  });
}

async function createReportsGalleryHtml(projectRoot: string): Promise<string> {
  const reportsDir = resolveInsideProject(projectRoot, ".openrender/reports");
  const files = (await pathExists(reportsDir)) ? (await fs.readdir(reportsDir)).filter((file) => file.endsWith(".json")) : [];
  const sections = [];

  for (const file of files.sort()) {
    const raw = await fs.readFile(path.join(reportsDir, file), "utf8");
    const record = JSON.parse(raw) as Partial<CompileSpriteResult>;
    const runId = record.run?.runId ?? file.replace(/\.json$/, "");
    const outputs = record.run?.outputs ?? [];
    const checks = record.run?.verification?.checks ?? [];
    const helperCode = record.installPlan?.files.filter((plannedFile) => plannedFile.kind === "codegen").map((plannedFile) => plannedFile.to) ?? [];
    const preview = outputs.find((output) => output.kind === "preview")?.path ?? null;
    const diff = {
      filesPlanned: record.installPlan?.files.map((plannedFile) => plannedFile.to) ?? [],
      helperCodeGenerated: helperCode,
      rollbackCommand: record.installResult ? `openrender rollback --run ${runId} --json` : null
    };

    sections.push(`<section class="run-detail">
  <h2>${escapeHtmlText(runId)}</h2>
  <p>Asset: ${escapeHtmlText(record.contract?.id ?? "unknown")} / Target: ${escapeHtmlText(record.contract?.target.engine ?? "unknown")}</p>
  <h3>Previews</h3>
  <p>${escapeHtmlText(preview ?? "No frame sheet preview for this run")}</p>
  <h3>Verification checks</h3>
  <ul>${checks.map((check) => `<li>${escapeHtmlText(check.name)}: ${escapeHtmlText(check.status)}${check.path ? ` (${escapeHtmlText(check.path)})` : ""}</li>`).join("")}</ul>
  <h3>Helper code</h3>
  <ul>${helperCode.map((helperPath) => `<li>${escapeHtmlText(helperPath)}</li>`).join("")}</ul>
  <h3>Diff</h3>
  <pre>${escapeHtmlText(JSON.stringify(diff, null, 2))}</pre>
</section>`);
  }

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>openRender reports</title></head>
<body>
  <main>
    <h1>openRender reports</h1>
    <p>Local-only gallery. No upload, telemetry, or sync.</p>
    ${sections.length > 0 ? sections.join("\n") : "<p>No local reports found.</p>"}
  </main>
</body>
</html>`;
}

function assetIdToKebabCaseLocal(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function assetIdToPascalCase(value: string): string {
  return assetIdToKebabCaseLocal(value).split("-").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("");
}

function notImplementedIn031(commandName: string): NotImplementedCommandResult {
  return {
    ok: false,
    code: "future_surface",
    command: commandName,
    message: `${commandName} is an explicit future surface. openRender core works locally without login, billing, telemetry, or remote sync.`,
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
  const backgroundPolicy = readBackgroundPolicyFlag(parsed);
  const backgroundMode = readBackgroundModeFlag(parsed);
  const backgroundTolerance = readIntegerFlag(parsed, "background-tolerance", 48);
  const feather = readNonNegativeIntegerFlag(parsed, "feather", 0);
  const manifestStrategy = readManifestStrategyFlag(parsed);
  const quality = readQualityFlag(parsed);
  const dryRun = parsed.flags.get("dry-run") === true;

  if (!["horizontal", "horizontal_strip", "grid"].includes(layout)) {
    throw new Error(`Unsupported sprite layout: ${layout}`);
  }
  const metadata = await loadImageMetadata(sourcePath);
  const alpha = await analyzeAlphaDiagnostics({ sourcePath });
  const frameSize = readOptionalSizeFlag(parsed, "frame-size");
  const frames = readOptionalIntegerFlag(parsed, "frames");
  const outputSize = readOptionalSizeFlag(parsed, "output-size");

  let contract: SpriteCompileContract;
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
        background: metadata.hasAlpha || alpha.transparentPixelRatio > 0 ? "transparent" : "solid",
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
        background: metadata.hasAlpha || alpha.transparentPixelRatio > 0 ? "transparent" : "solid",
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

  let background = await decideBackgroundRemoval({
    sourcePath,
    mediaType: contract.mediaType,
    policy: backgroundPolicy,
    frameSlices,
    tolerance: backgroundTolerance,
    mode: backgroundMode,
    feather
  });
  contract = materializeBackgroundDecision(contract, background, alpha);

  let descriptor = createEngineAssetDescriptor(contract);
  const run = createInitialRun({ id, mediaType: contract.mediaType });
  const artifactPath = path.posix.join(".openrender", "artifacts", run.runId, path.posix.basename(descriptor.assetPath));
  let installPlan = createEngineInstallPlan({
    contract,
    compiledAssetPath: artifactPath,
    frameSlices
  });
  let artifact: CompileSpriteResult["artifact"];
  let framePreview: FramePreviewSheetOutput | undefined;
  let visualQuality: VisualQualityResult | undefined;
  run.status = dryRun ? "harness_ready" : "completed";
  run.outputs = [
    { kind: "compiled_asset", path: artifactPath },
    { kind: "manifest", path: descriptor.manifestPath },
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : [])
  ];
  run.verification = createRunVerification(validation, invariants);

  if (!dryRun && validation?.ok === false) {
    run.status = "failed_harness";
  } else if (!dryRun) {
    const absoluteArtifactPath = resolveInsideProject(projectRoot, artifactPath);
    if (contract.mediaType === "visual.sprite_frame_set") {
      artifact = background.action === "removed"
        ? await removeBackgroundInPlaceToPng({
            sourcePath,
            outputPath: absoluteArtifactPath,
            mode: backgroundMode,
            tolerance: backgroundTolerance,
            feather
          })
        : await normalizeImageToPng({
            sourcePath,
            outputPath: absoluteArtifactPath
          });
      invariants = await analyzeSpriteInvariants({
        sourcePath: absoluteArtifactPath,
        layout: contract.visual.layout,
        frames: contract.visual.frames,
        frameWidth: contract.visual.frameWidth,
        frameHeight: contract.visual.frameHeight
      });
      run.verification = createRunVerification(validation, invariants);
    } else {
      artifact = await cropAlphaBoundsToPng({
        sourcePath,
        outputPath: absoluteArtifactPath,
        padding,
        removeSolidBackground: background.action === "removed",
        backgroundMode,
        backgroundTolerance,
        feather,
        outputSize
      });
      contract = materializeTransparentSpriteArtifactDimensions(contract, artifact.metadata);
      descriptor = createEngineAssetDescriptor(contract);
      installPlan = createEngineInstallPlan({
        contract,
        compiledAssetPath: artifactPath,
        frameSlices
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

    if (artifact) {
      visualQuality = await createVisualQualityResult({
        projectRoot,
        contract,
        input: metadata,
        inputAlpha: alpha,
        artifactPath,
        sourcePath: absoluteArtifactPath,
        background,
        strict: quality === "strict"
      });
      background = {
        ...background,
        outputTransparentPixelRatio: visualQuality.diagnostics.transparentPixelRatio
      };
    }
  }

  const manifestPlan = await applyManifestStrategy({
    projectRoot,
    contract,
    descriptor,
    installPlan,
    frameSlices,
    strategy: manifestStrategy,
    runId: run.runId
  });
  installPlan = manifestPlan.installPlan;
  const generatedSources = manifestPlan.generatedSources;
  const manifest = manifestPlan.manifest;
  const qualityGate = createQualityGateResult({
    quality,
    validation,
    invariants,
    visualQuality
  });
  if (!dryRun && qualityGate.status === "failed") {
    run.status = "failed_verify";
  }
  run.outputs = [
    { kind: "compiled_asset", path: artifactPath },
    ...(manifest.strategy === "isolated" ? [] : [{ kind: "manifest" as const, path: descriptor.manifestPath }]),
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : []),
    ...(framePreview ? [{ kind: "preview" as const, path: path.posix.join(".openrender", "runs", run.runId, "preview_frames.png") }] : [])
  ];

  const result: CompileSpriteResult = {
    dryRun,
    projectRoot,
    input: metadata,
    alpha,
    contract,
    outputPlan: descriptor,
    installPlan,
    artifact,
    background,
    processing: {
      removeBackground: background.action === "removed",
      backgroundPolicy: background.policy,
      backgroundAction: background.action,
      backgroundMode,
      backgroundTolerance,
      feather,
      quality
    },
    recipe: createCoreRecipeReference(contract.mediaType),
    agentSummary: createCompileAgentSummary({
      contract,
      installPlan,
      dryRun,
      installedWrites: 0,
      validationOk: validation?.ok !== false && qualityGate.status !== "failed"
    }),
    generatedSources,
    manifest,
    visualQuality,
    qualityGate,
    validation,
    invariants,
    frameSlices,
    framePreview,
    run
  };

  if (!dryRun) {
    await writeCompileRecord(projectRoot, result);
  }

  if (!dryRun && parsed.flags.get("install") === true && result.validation?.ok !== false && result.qualityGate?.status !== "failed") {
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

function materializeTransparentSpriteArtifactDimensions(
  contract: SpriteCompileContract,
  artifactMetadata: ImageMetadata
): SpriteCompileContract {
  if (contract.mediaType !== "visual.transparent_sprite") return contract;
  if (
    contract.visual.outputWidth === artifactMetadata.width &&
    contract.visual.outputHeight === artifactMetadata.height
  ) {
    return contract;
  }

  return {
    ...contract,
    visual: {
      ...contract.visual,
      outputWidth: artifactMetadata.width,
      outputHeight: artifactMetadata.height
    }
  };
}

function materializeBackgroundDecision(
  contract: SpriteCompileContract,
  background: BackgroundDecision,
  inputAlpha: AlphaDiagnostics
): SpriteCompileContract {
  const shouldBeTransparent = background.action === "removed" || inputAlpha.transparentPixelRatio > 0.001;

  return {
    ...contract,
    visual: {
      ...contract.visual,
      background: shouldBeTransparent ? "transparent" : "solid"
    }
  } as SpriteCompileContract;
}

function createRunVerification(
  validation?: FrameValidationResult,
  invariants?: SpriteInvariantDiagnostics
): NonNullable<OpenRenderRun["verification"]> | undefined {
  if (!validation) return undefined;

  return {
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
  };
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

function createEngineAssetDescriptor(contract: SpriteCompileContract): EngineAssetDescriptor {
  return getSpriteAdapter(contract.target.engine).describe(contract);
}

function createEngineInstallPlan(input: {
  contract: SpriteCompileContract;
  compiledAssetPath: string;
  frameSlices?: FrameSlice[];
}): EngineInstallPlan {
  return getSpriteAdapter(input.contract.target.engine).plan(input);
}

function createGeneratedSources(
  contract: SpriteCompileContract,
  frameSlices?: FrameSlice[]
): CompileSpriteResult["generatedSources"] {
  return getSpriteAdapter(contract.target.engine).generateSources(contract, frameSlices);
}

async function applyManifestStrategy(input: {
  projectRoot: string;
  contract: SpriteCompileContract;
  descriptor: EngineAssetDescriptor;
  installPlan: EngineInstallPlan;
  frameSlices?: FrameSlice[];
  strategy: ManifestStrategy;
  runId: string;
}): Promise<{
  installPlan: EngineInstallPlan;
  generatedSources: CompileSpriteResult["generatedSources"];
  manifest: ManifestStrategyResult;
}> {
  const generatedSources = createGeneratedSources(input.contract, input.frameSlices);
  const state = await readManifestState(input.projectRoot, input.contract.target.engine, input.descriptor.manifestPath);
  const previousEntries = state?.entries ?? {};
  const previousEntry = previousEntries[input.contract.id];
  const previousCount = Object.keys(previousEntries).length;
  const manifestPath = input.descriptor.manifestPath;
  const statePath = createManifestStateRelativePath(input.contract.target.engine, manifestPath);

  if (input.strategy === "isolated") {
    return {
      installPlan: patchInstallPlanManifest(input.installPlan, manifestPath, {
        strategy: "isolated"
      }),
      generatedSources,
      manifest: {
        strategy: input.strategy,
        manifestPath,
        statePath,
        entryId: input.contract.id,
        entryChange: "isolated",
        previousCount,
        nextCount: previousCount,
        removedEntryIds: [],
        isolated: true
      }
    };
  }

  const nextEntries = input.strategy === "merge"
    ? {
        ...previousEntries,
        [input.contract.id]: createManifestStateEntry(input.contract, input.descriptor, input.runId)
      }
    : {
        [input.contract.id]: createManifestStateEntry(input.contract, input.descriptor, input.runId)
      };
  const contracts = Object.values(nextEntries)
    .map((entry) => entry.contract)
    .sort((left, right) => left.id.localeCompare(right.id));
  const manifestSource = generateManifestSourceForContracts(input.contract.target.engine, contracts);
  const entryChange: ManifestEntryChange = input.strategy === "replace"
    ? (previousEntry ? "replaced" : "added")
    : (previousEntry ? "updated" : "added");
  const removedEntryIds = input.strategy === "replace"
    ? Object.keys(previousEntries).filter((entryId) => entryId !== input.contract.id)
    : [];

  return {
    installPlan: patchInstallPlanManifest(input.installPlan, manifestPath, {
      strategy: input.strategy,
      contents: manifestSource
    }),
    generatedSources: {
      ...generatedSources,
      manifest: manifestSource
    },
    manifest: {
      strategy: input.strategy,
      manifestPath,
      statePath,
      entryId: input.contract.id,
      entryChange,
      previousCount,
      nextCount: contracts.length,
      removedEntryIds,
      isolated: false
    }
  };
}

function patchInstallPlanManifest(
  installPlan: EngineInstallPlan,
  manifestPath: string,
  input: { strategy: ManifestStrategy; contents?: string }
): EngineInstallPlan {
  const files = installPlan.files
    .filter((file) => input.strategy !== "isolated" || file.to !== manifestPath)
    .map((file) => {
      if (file.kind !== "manifest" || file.to !== manifestPath || input.contents === undefined) return file;
      return {
        ...file,
        contents: input.contents
      };
    }) as EngineInstallPlan["files"];

  return {
    ...installPlan,
    files
  } as EngineInstallPlan;
}

function generateManifestSourceForContracts(
  target: TargetEngine,
  contracts: SpriteCompileContract[]
): string {
  if (target === "phaser") return generateManifestSource(contracts);
  if (target === "godot") return generateGodotManifestSource(contracts);
  if (target === "love2d") return generateLove2DManifestSource(contracts);
  if (target === "pixi") return generatePixiManifestSource(contracts);
  if (target === "canvas") return generateCanvasManifestSource(contracts);
  throw new Error(`Unsupported manifest target: ${target}`);
}

function createManifestStateEntry(
  contract: SpriteCompileContract,
  descriptor: EngineAssetDescriptor,
  runId: string
): ManifestStateEntry {
  return {
    contract,
    runId,
    assetPath: descriptor.assetPath,
    loadPath: descriptor.loadPath,
    updatedAt: new Date().toISOString()
  };
}

async function readManifestState(
  projectRoot: string,
  target: TargetEngine,
  manifestPath: string
): Promise<ManifestState | null> {
  const statePath = resolveInsideProject(projectRoot, createManifestStateRelativePath(target, manifestPath));
  try {
    return JSON.parse(await fs.readFile(statePath, "utf8")) as ManifestState;
  } catch {
    return null;
  }
}

async function writeManifestStateFromRecord(projectRoot: string, record: CompileSpriteResult): Promise<void> {
  if (!record.manifest || record.manifest.strategy === "isolated") return;

  const state = await readManifestState(projectRoot, record.contract.target.engine, record.manifest.manifestPath);
  const entries = record.manifest.strategy === "merge"
    ? { ...(state?.entries ?? {}) }
    : {};
  entries[record.contract.id] = createManifestStateEntry(record.contract, record.outputPlan, record.run.runId);

  const nextState: ManifestState = {
    version: CLI_VERSION,
    target: record.contract.target.engine,
    manifestPath: record.manifest.manifestPath,
    updatedAt: new Date().toISOString(),
    entries
  };

  await safeWriteProjectFile({
    projectRoot,
    relativePath: record.manifest.statePath,
    contents: `${JSON.stringify(nextState, null, 2)}\n`,
    allowOverwrite: true
  });
}

function createManifestStateRelativePath(target: TargetEngine, manifestPath: string): string {
  const normalizedManifestPath = manifestPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "manifest";
  return path.posix.join(".openrender", "manifest-state", `${target}-${normalizedManifestPath}.json`);
}

function isLoadPathValid(outputPlan: EngineAssetDescriptor): boolean {
  return getSpriteAdapter(outputPlan.engine).verify(outputPlan);
}

function getSpriteAdapter(target: TargetEngine): SpriteAdapter {
  return SPRITE_ADAPTER_REGISTRY[target];
}

function assertSpriteCompileContract(contract: MediaContract): asserts contract is SpriteCompileContract {
  if (contract.mediaType !== "visual.transparent_sprite" && contract.mediaType !== "visual.sprite_frame_set") {
    throw new Error(`Sprite adapter registry only supports sprite contracts, got ${contract.mediaType}.`);
  }
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

  if (!force) {
    for (const file of record.installPlan.files) {
      if (canOverwriteWithoutForce(record, file)) continue;
      if (await pathExists(resolveInsideProject(projectRoot, file.to))) {
        throw new Error(`Refusing to overwrite existing file without --force: ${file.to}`);
      }
    }
  }

  const snapshots = [];
  for (const destinationPath of record.installPlan.files.map((file) => file.to)) {
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
        allowOverwrite: force || canOverwriteWithoutForce(record, file)
      }));
    } else {
      writes.push(await safeWriteProjectFile({
        projectRoot,
        relativePath: file.to,
        contents: file.contents,
        allowOverwrite: force || canOverwriteWithoutForce(record, file)
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
  await writeManifestStateFromRecord(projectRoot, record);

  return result;
}

function canOverwriteWithoutForce(record: CompileSpriteResult, file: EngineInstallPlanFile): boolean {
  if (!record.manifest || record.manifest.strategy !== "merge") return false;
  if (file.kind === "manifest" && file.to === record.manifest.manifestPath) return true;
  if (file.kind === "compiled_asset" && record.manifest.entryChange === "updated") return true;
  return false;
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

function createLegacyBackgroundDecision(record: CompileSpriteResult): BackgroundDecision {
  const removed = record.processing?.removeBackground === true;
  return {
    policy: removed ? "remove" : "preserve",
    action: removed ? "removed" : "preserved",
    reason: removed
      ? "legacy run used removeBackground processing"
      : "legacy run did not record background policy",
    confidence: removed ? "high" : "medium",
    mode: record.processing?.backgroundMode,
    tolerance: record.processing?.backgroundTolerance,
    feather: record.processing?.feather,
    inputTransparentPixelRatio: record.alpha.transparentPixelRatio,
    outputTransparentPixelRatio: record.visualQuality?.diagnostics.transparentPixelRatio
  };
}

async function createVisualQualityResult(input: {
  projectRoot: string;
  contract: SpriteCompileContract;
  input: ImageMetadata;
  inputAlpha: AlphaDiagnostics;
  artifactPath: string;
  sourcePath: string;
  background: BackgroundDecision;
  strict: boolean;
}): Promise<VisualQualityResult> {
  const diagnostics = await analyzeAlphaDiagnostics({ sourcePath: input.sourcePath });
  const checks: VisualQualityResult["checks"] = [];
  const metadata = await loadImageMetadata(input.sourcePath);
  const inputPixels = Math.max(input.input.width * input.input.height, 1);
  const sourceWasOpaque = inputPixels >= 16 && input.inputAlpha.transparentPixelRatio === 0;
  const autoSkippedOpaqueTarget = sourceWasOpaque && input.background.policy === "auto" && input.background.action === "skipped";
  const preservedOpaqueTarget = sourceWasOpaque && input.background.policy === "preserve" && input.background.action === "preserved";
  const expectedTransparent = input.contract.mediaType === "visual.transparent_sprite" || input.contract.mediaType === "visual.sprite_frame_set";
  const assetPath = input.artifactPath;

  if (expectedTransparent) {
    checks.push(createVisualCheck({
      name: "background_policy_decision",
      warning: autoSkippedOpaqueTarget,
      strict: input.strict,
      path: assetPath,
      message: `${input.background.policy}:${input.background.action} - ${input.background.reason}`
    }));
    checks.push(createVisualCheck({
      name: "auto_cutout_confidence",
      warning: input.background.policy === "auto" && input.background.confidence === "low",
      strict: input.strict,
      path: assetPath,
      message: `auto cutout confidence ${input.background.confidence}`
    }));
  }

  if (expectedTransparent) {
    checks.push(createVisualCheck({
      name: "post_cutout_alpha_presence",
      warning:
        diagnostics.transparentPixelRatio === 0 &&
        sourceWasOpaque &&
        (autoSkippedOpaqueTarget || (preservedOpaqueTarget && input.strict)),
      strict: input.strict,
      path: assetPath,
      message: diagnostics.transparentPixelRatio === 0
        ? "transparent target output has no transparent pixels"
        : `transparent pixels ${diagnostics.transparentPixelRatio}`,
      metric: diagnostics.transparentPixelRatio
    }));
    checks.push(createVisualCheck({
      name: "post_cutout_subject_bounds",
      warning:
        autoSkippedOpaqueTarget &&
        diagnostics.transparentPixelRatio < 0.01 &&
        boundsCoversImage(diagnostics.nonTransparentBounds, metadata.width, metadata.height),
      strict: input.strict,
      path: assetPath,
      message: diagnostics.nonTransparentBounds
        ? `alpha bounds cover full ${metadata.width}x${metadata.height} canvas`
        : "no visible alpha bounds detected",
      metric: diagnostics.transparentPixelRatio
    }));
  }

  if (input.contract.mediaType === "visual.sprite_frame_set") {
    const frameDiagnostics = await analyzeSpriteInvariants({
      sourcePath: input.sourcePath,
      layout: input.contract.visual.layout,
      frames: input.contract.visual.frames,
      frameWidth: input.contract.visual.frameWidth,
      frameHeight: input.contract.visual.frameHeight
    });
    const emptyFrame = frameDiagnostics.checks.find((check) => check.name === "emptyFrame");
    const alphaConsistency = frameDiagnostics.checks.find((check) => check.name === "alphaConsistency");
    checks.push(createVisualCheck({
      name: "sprite_frame_post_cutout_empty_frame",
      warning: emptyFrame?.status === "failed",
      strict: true,
      path: assetPath,
      message: emptyFrame?.message ?? "no empty frames after cutout"
    }));
    checks.push(createVisualCheck({
      name: "sprite_frame_post_cutout_alpha_consistency",
      warning: alphaConsistency?.status === "failed",
      strict: input.strict,
      path: assetPath,
      message: alphaConsistency?.message ?? "frame alpha coverage is consistent"
    }));
  }

  checks.push(createVisualCheck({
    name: "edge_alpha_bleed_risk",
    warning: input.inputAlpha.transparentPixelRatio > 0.001 && diagnostics.transparentPixelRatio > 0 && diagnostics.edgeAlphaBleedRisk === "high",
    strict: input.strict,
    path: assetPath,
    message: `edge alpha bleed risk ${diagnostics.edgeAlphaBleedRisk}`,
    metric: diagnostics.transparentPixelRatio
  }));

  return {
    status: checks.some((check) => check.status === "failed")
      ? "failed"
      : checks.some((check) => check.status === "warning")
        ? "warning"
        : "passed",
    sourcePath: assetPath,
    diagnostics,
    checks
  };
}

function createVisualCheck(input: {
  name: string;
  warning: boolean;
  strict: boolean;
  path: string;
  message: string;
  metric?: number;
}): VisualQualityResult["checks"][number] {
  return {
    name: input.name,
    status: input.warning ? (input.strict ? "failed" : "warning") : "passed",
    path: input.path,
    message: input.message,
    metric: input.metric
  };
}

function boundsCoversImage(bounds: AlphaDiagnostics["nonTransparentBounds"], width: number, height: number): boolean {
  return bounds !== null && bounds.x === 0 && bounds.y === 0 && bounds.width === width && bounds.height === height;
}

function createQualityGateResult(input: {
  quality: QualityLevel;
  validation?: FrameValidationResult;
  invariants?: SpriteInvariantDiagnostics;
  visualQuality?: VisualQualityResult;
}): QualityGateResult {
  const failedReasons = [];
  const warningReasons = [];

  if (input.validation?.ok === false) failedReasons.push(input.validation.reason ?? "frame validation failed");
  if (input.invariants?.ok === false) failedReasons.push("sprite invariant checks failed");

  const visualWarnings = input.visualQuality?.checks.filter((check) => check.status === "warning") ?? [];
  const visualFailures = input.visualQuality?.checks.filter((check) => check.status === "failed") ?? [];
  if (visualWarnings.length > 0) warningReasons.push(...visualWarnings.map((check) => check.name));
  if (visualFailures.length > 0) failedReasons.push(...visualFailures.map((check) => check.name));
  if (input.quality === "strict" && visualWarnings.length > 0) {
    failedReasons.push(...visualWarnings.map((check) => `strict:${check.name}`));
  }

  return {
    quality: input.quality,
    status: failedReasons.length > 0
      ? "failed"
      : warningReasons.length > 0
        ? "warning"
        : "passed",
    warningsAllowed: input.quality !== "strict",
    failedReasons,
    warningReasons
  };
}

async function verifyRun(parsed: ParsedFlags): Promise<VerifyCommandResult> {
  const projectRoot = process.cwd();
  const runId = readRunId(parsed);
  const quality = readQualityFlag(parsed);
  const strictVisual = parsed.flags.get("strict-visual") === true || quality === "strict";
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
  let visualSource: { relativePath: string; absolutePath: string } | null = null;
  if (installedAsset && await pathExists(resolveInsideProject(projectRoot, installedAsset.to))) {
    visualSource = {
      relativePath: installedAsset.to,
      absolutePath: resolveInsideProject(projectRoot, installedAsset.to)
    };
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
  } else if (artifactPath && artifactExists) {
    visualSource = {
      relativePath: artifactPath,
      absolutePath: resolveInsideProject(projectRoot, artifactPath)
    };
  }

  checks.push({
    name: "engine_load_path_shape",
    status: isLoadPathValid(record.outputPlan) ? "passed" : "failed",
    path: record.outputPlan.loadPath ?? ("publicUrl" in record.outputPlan ? record.outputPlan.publicUrl : undefined),
    message: record.outputPlan.engine
  });

  let visualQuality: VisualQualityResult | undefined;
  if (visualSource) {
    visualQuality = await createVisualQualityResult({
      projectRoot,
      contract: record.contract,
      input: record.input,
      inputAlpha: record.alpha,
      artifactPath: visualSource.relativePath,
      sourcePath: visualSource.absolutePath,
      background: record.background ?? createLegacyBackgroundDecision(record),
      strict: strictVisual
    });
    checks.push(...visualQuality.checks.map((check) => ({
      name: check.name,
      status: check.status,
      path: check.path,
      message: check.message
    })));
  }

  const result: VerifyCommandResult = {
    runId: record.run.runId,
    status: createVerificationStatus(checks),
    checks,
    visualQuality
  };
  record.run.status = result.status === "failed" ? "failed_verify" : "verified";
  record.run.verification = result;
  record.visualQuality = visualQuality ?? record.visualQuality;
  record.qualityGate = createQualityGateResult({
    quality,
    validation: record.validation,
    invariants: record.invariants,
    visualQuality: record.visualQuality
  });
  await writeCompileRecord(projectRoot, record, true);

  return result;
}

function createVerificationStatus(checks: VerifyCommandResult["checks"]): VerificationStatus {
  if (checks.some((check) => check.status === "failed")) return "failed";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "passed";
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
  const nextActions = nextAction
    ? nextAction.split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2))
    : createSuccessNextActions(record);
  const installResult = record.installResult ?? await readInstallResultIfAvailable(projectRoot, record.run.runId);
  const framePreviewPath = record.run.outputs.find((output) => output.kind === "preview")?.path;
  const html = createReportHtml({
    title: `openRender report ${record.run.runId}`,
    run: record.run,
    sections: [
      { heading: "Contract", body: JSON.stringify(record.contract, null, 2) },
      { heading: "Input", body: JSON.stringify(record.input, null, 2) },
      { heading: "Artifact", body: JSON.stringify(record.artifact ?? null, null, 2) },
      ...(record.background ? [{ heading: "Background Policy", body: createBackgroundReportText(record) }] : []),
      { heading: "Agent Summary", body: record.agentSummary },
      { heading: "Core Recipe", body: JSON.stringify(record.recipe, null, 2) },
      ...(framePreviewPath ? [{ heading: "Frame Preview Sheet", body: framePreviewPath }] : []),
      ...(visualOverlayHtml ? [{ heading: "Visual Overlay", trustedHtml: visualOverlayHtml }] : []),
      ...(record.visualQuality ? [{ heading: "Visual Quality", body: JSON.stringify(record.visualQuality, null, 2) }] : []),
      ...(record.qualityGate ? [{ heading: "Quality Gate", body: JSON.stringify(record.qualityGate, null, 2) }] : []),
      { heading: "Install Plan", body: JSON.stringify(record.installPlan, null, 2) },
      ...(record.manifest ? [{ heading: "Manifest Strategy", body: JSON.stringify(record.manifest, null, 2) }] : []),
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
    status: record.run.verification?.status ?? record.run.status,
    agentSummary: createAgentSummary(record),
    nextActions,
    rollbackCommand: installResult ? `openrender rollback --run ${record.run.runId} --json` : null,
    jsonPath: reportJsonPath,
    htmlPath: reportHtmlPath,
    previewHtmlPath,
    framePreviewPath,
    latestJsonPath: ".openrender/reports/latest.json",
    latestHtmlPath: ".openrender/reports/latest.html",
    latestPreviewHtmlPath: ".openrender/previews/latest.html",
    opened: false,
    visualQuality: record.visualQuality,
    qualityGate: record.qualityGate,
    manifest: record.manifest,
    background: record.background
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

  if (record.qualityGate?.status === "warning" || record.run.verification?.status === "warning") {
    const warningChecks = record.visualQuality?.checks.filter((check) => check.status === "warning") ?? [];
    return [
      "Warning: visual quality checks need review",
      "",
      "Warnings:",
      ...warningChecks.map((check) => `- ${check.name}${check.path ? `: ${check.path}` : ""}`),
      "",
      "Suggested next action:",
      "- inspect the preview and installed asset before wiring game code",
      "- re-run with --background-policy remove or --quality strict if the asset should have transparency"
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
  const background = record.background ? `${createBackgroundSummary(record)} ` : "";
  return `${installed} ${background}Review ${report} before wiring game code.`;
}

function createBackgroundSummary(record: CompileSpriteResult): string {
  const decision = record.background ?? createLegacyBackgroundDecision(record);
  if (decision.action === "removed") {
    const frameText = record.contract.mediaType === "visual.sprite_frame_set"
      ? ` Frame geometry stayed ${record.contract.visual.frames} x ${record.contract.visual.frameWidth}x${record.contract.visual.frameHeight}.`
      : "";
    return `openRender removed an edge-connected background before installing ${record.contract.id}.${frameText}`;
  }

  if (decision.action === "skipped") {
    return `openRender kept the original background for ${record.contract.id} because ${decision.reason}.`;
  }

  return `openRender preserved the source background for ${record.contract.id} because ${decision.reason}.`;
}

function createBackgroundReportText(record: CompileSpriteResult): string {
  const decision = record.background ?? createLegacyBackgroundDecision(record);
  return [
    `Background policy: ${decision.policy}`,
    `Decision: ${decision.action}`,
    `Reason: ${decision.reason}`,
    `Confidence: ${decision.confidence}`,
    `Mode: ${decision.mode ?? "n/a"}`,
    `Tolerance: ${decision.tolerance ?? "n/a"}`,
    `Feather: ${decision.feather ?? "n/a"}`,
    `Input alpha: transparent pixels ${decision.inputTransparentPixelRatio ?? record.alpha.transparentPixelRatio}`,
    `Output alpha: transparent pixels ${decision.outputTransparentPixelRatio ?? record.visualQuality?.diagnostics.transparentPixelRatio ?? "n/a"}`
  ].join("\n");
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
  contract: SpriteCompileContract;
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
  if (record.background) {
    actions.unshift(createBackgroundSummary(record));
  }
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

function printAgentContext(result: AgentContextCommandResult): void {
  console.log("openRender context");
  console.log("");
  console.log(`Version: ${result.version}`);
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Package manager: ${result.packageManager}`);
  console.log(`Target: ${result.target.engine}/${result.target.framework}`);
  console.log(`Manifest: ${result.exists.manifest ? result.paths.manifest : "missing"}`);
  console.log(`Latest run: ${result.latestRun ? result.latestRun.runId : "missing"}`);
  for (const risk of result.overwriteRisks) console.log(`Overwrite risk: ${risk.path} (${risk.code})`);
  for (const action of result.recommendedNextActions) console.log(`Next: ${action}`);
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
  if (result.manifest) console.log(`Manifest strategy: ${result.manifest.strategy} (${result.manifest.entryChange})`);
  if (result.outputPlan.codegenPath) console.log(`Codegen: ${result.outputPlan.codegenPath}`);
  if (result.background) console.log(`Background: ${result.background.policy} ${result.background.action} (${result.background.confidence})`);
  console.log(`Install plan files: ${result.installPlan.files.length}`);
  if (result.qualityGate) console.log(`Quality: ${result.qualityGate.quality} ${result.qualityGate.status}`);
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
  console.log(`Background: ${result.background.policy} ${result.background.action} (${result.background.confidence})`);
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
    const marker = check.status === "passed" ? "ok" : check.status === "warning" ? "warn" : check.status === "skipped" ? "skip" : "fail";
    console.log(`${marker} ${check.name}${check.path ? `: ${check.path}` : ""}`);
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
  if (result.background) console.log(`Background: ${result.background.policy} ${result.background.action}`);
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
  if (result.backgroundSummary) console.log(result.backgroundSummary);
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

function printAgentInitResult(result: AgentInitCommandResult): void {
  console.log("openRender install-agent");
  console.log("");
  console.log(`Agent: ${result.agent}`);
  console.log(`Dry run: ${result.dryRun ? "yes" : "no"}`);
  for (const file of result.files) console.log(`Config: ${file.path} (${file.action})`);
  for (const action of result.nextActions) console.log(`Next: ${action}`);
}

function printHelp(): void {
  console.log(`openRender ${CLI_VERSION}

Usage:
  openrender --version
  openrender init [--target phaser|godot|love2d|pixi|canvas] [--framework vite|godot|love2d] [--force] [--json]
  openrender agent init --codex|--cursor|--claude [--force] [--json]
  openrender install-agent [--platform codex|cursor|claude|all] [--dry-run] [--force] [--json]
  openrender adapter create --name <id> [--force] [--json]
  openrender fixture capture --name <id> --from <path> [--target engine] [--id asset.id] [--force] [--json]
  openrender scan [--json]
  openrender context [--json] [--compact] [--wire-map]
  openrender doctor [--json]
  openrender schema contract|output|report|install-plan|pack-manifest|media-p4
  openrender pack list|inspect [packId] [--json]
  openrender recipe list|inspect|validate [recipeId] [--json]
  openrender plan sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas] [--frames n --frame-size WxH] [--json]
  openrender detect-frames <path> [--frames n] [--json]
  openrender normalize <path> [--preset transparent-sprite|ui-icon|sprite-strip|sprite-grid] [--background-policy auto|preserve|remove] [--remove-background] [--background-mode edge-flood|top-left] [--background-tolerance n] [--feather n] [--out <path>] [--json]
  openrender metadata audio|atlas|ui <path> [--target engine] [--id asset.id] [--json]
  openrender smoke [--target phaser|godot|love2d|pixi|canvas] [--run latest] [--timeout seconds] [--screenshot] [--json]
  openrender compile sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas] [--frames n --frame-size WxH] [--output-size WxH] [--background-policy auto|preserve|remove] [--remove-background] [--background-mode edge-flood|top-left] [--background-tolerance n] [--feather n] [--manifest-strategy merge|replace|isolated] [--quality prototype|default|strict] [--install] [--force] [--dry-run] [--json]
  openrender install [runId|--run latest] [--force] [--json]
  openrender verify [runId|--run latest] [--strict-visual] [--quality prototype|default|strict] [--json] [--compact]
  openrender report [runId|--run latest] [--open] [--json] [--compact]
  openrender report export [runId|--run latest] --format html|json [--out <path>] [--force] [--json]
  openrender reports serve [--port 3579] [--once] [--json]
  openrender explain [runId|--run latest] [--json] [--compact]
  openrender diff [runId|--run latest] [--json] [--compact]
  openrender rollback [runId|--run latest] [--json]
`);
}

interface InstallCommandResult {
  runId: string;
  snapshotRoot: string;
  snapshots: Awaited<ReturnType<typeof snapshotProjectFile>>[];
  writes: Awaited<ReturnType<typeof safeWriteProjectFile>>[];
}

interface WireMapResult {
  target: ProjectScan["engine"];
  readOnly: true;
  latestAsset?: WireMapLatestAsset;
  candidates: Array<{
    file: string;
    kind: "entry" | "scene" | "script" | "config";
    signals: string[];
    suggestedAction: string;
  }>;
  tables: {
    candidates: CompactTable;
  };
  notes: string[];
}

interface VerifyCommandResult {
  runId: string;
  status: VerificationStatus;
  checks: Array<{
    name: string;
    status: VerificationCheckStatus;
    path?: string;
    message?: string;
  }>;
  visualQuality?: VisualQualityResult;
}

interface ReportCommandResult {
  runId: string;
  status: OpenRenderRun["status"] | NonNullable<OpenRenderRun["verification"]>["status"];
  agentSummary: string;
  nextActions: string[];
  rollbackCommand: string | null;
  jsonPath: string;
  htmlPath: string;
  previewHtmlPath: string;
  framePreviewPath?: string;
  latestJsonPath: string;
  latestHtmlPath: string;
  latestPreviewHtmlPath: string;
  opened: boolean;
  visualQuality?: VisualQualityResult;
  qualityGate?: QualityGateResult;
  manifest?: ManifestStrategyResult;
  background?: BackgroundDecision;
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

interface RecipeValidateCommandResult {
  ok: boolean;
  files: Array<{
    path: string;
    ok: boolean;
    issues: string[];
  }>;
}

type AgentKind = "codex" | "cursor" | "claude";

interface AgentContextCommandResult {
  ok: true;
  version: string;
  projectRoot: string;
  packageManager: ProjectScan["packageManager"];
  target: {
    engine: ProjectScan["engine"];
    framework: ProjectScan["framework"];
  };
  paths: {
    assetRoot: string;
    sourceRoot: string;
    config: string;
    state: string;
    manifest: string;
  };
  exists: {
    packageJson: boolean;
    assetRoot: boolean;
    sourceRoot: boolean;
    config: boolean;
    state: boolean;
    manifest: boolean;
  };
  latestRun: {
    runId: string;
    createdAt: string;
    status: CompileSpriteResult["run"]["status"];
    mediaType: CompileSpriteResult["run"]["contract"]["mediaType"];
    assetId: string;
    verification: NonNullable<CompileSpriteResult["run"]["verification"]>["status"] | null;
    installRecorded: boolean;
  } | null;
  overwriteRisks: Array<{
    code: "manifest_exists";
    path: string;
    note: string;
  }>;
  recommendedNextActions: string[];
  wireMap?: WireMapResult;
  localOnly: true;
  capabilities: {
    account: false;
    billing: false;
    cloudApi: false;
    hostedPlayground: false;
    modelProviderCalls: false;
    telemetry: false;
  };
}

interface CompactAgentContextResult {
  ok: true;
  version: string;
  target: AgentContextCommandResult["target"];
  paths: Pick<AgentContextCommandResult["paths"], "assetRoot" | "sourceRoot" | "manifest">;
  latestRun: AgentContextCommandResult["latestRun"];
  tables: {
    overwriteRisks: CompactTable;
  };
  nextActions: string[];
  wireMap?: WireMapResult;
  localOnly: true;
  capabilities: AgentContextCommandResult["capabilities"];
}

interface CompactVerifyCommandResult {
  ok: boolean;
  runId: string;
  status: VerifyCommandResult["status"];
  summary: {
    checks: number;
    failed: number;
    warnings: number;
  };
  tables: {
    checks: CompactTable;
  };
  nextActions: string[];
}

interface CompactReportCommandResult {
  ok: true;
  runId: string;
  status: ReportCommandResult["status"];
  agentSummary: string;
  reportPath: string;
  previewPath: string;
  rollbackCommand: string | null;
  background?: BackgroundDecision;
  tables: {
    outputs: CompactTable;
    visualQuality: CompactTable;
  };
  nextActions: string[];
}

interface CompactExplainCommandResult {
  ok: boolean;
  runId: string;
  agentSummary: string;
  backgroundSummary?: string;
  tables: {
    nextActions: CompactTable;
  };
}

interface CompactDiffCommandResult {
  ok: true;
  runId: string;
  summary: {
    planned: number;
    created: number;
    modified: number;
    helperCodeGenerated: number;
    manifestChange: ManifestEntryChange | null;
    rollbackAvailable: boolean;
  };
  tables: {
    files: CompactTable;
  };
  snapshotPath: string | null;
  rollbackCommand: string | null;
}

interface AgentInstallFilePlan {
  agent: AgentKind;
  path: string;
  exists: boolean;
  action: "created" | "overwritten" | "would_create" | "would_overwrite";
}

interface AgentInitCommandResult {
  ok: true;
  agent: AgentKind | "all";
  path: string;
  files: AgentInstallFilePlan[];
  dryRun: boolean;
  overwrittenAllowed: boolean;
  nextActions: string[];
}

interface AdapterCreateCommandResult {
  ok: true;
  adapter: string;
  files: string[];
  nextActions: string[];
}

interface FixtureCaptureCommandResult {
  ok: true;
  fixturePath: string;
  summary: string;
}

interface ReportExportCommandResult {
  ok: true;
  runId: string;
  format: "html" | "json";
  sourcePath: string;
  outputPath: string;
  localOnly: true;
}

interface ReportsServeCommandResult {
  ok: true;
  host: "localhost";
  port: number;
  url: string;
  once: boolean;
  htmlBytes: number;
}

interface MediaMetadataCommandResult {
  ok: true;
  kind: "audio" | "atlas" | "ui";
  id: string;
  target: TargetEngine;
  localOnly: true;
  metadata: Record<string, unknown>;
}

interface RuntimeSmokeCommandResult {
  ok: boolean;
  target: TargetEngine;
  status: "passed" | "failed" | "skipped";
  command: string | null;
  runId?: string | null;
  screenshotPath?: string | null;
  message: string;
}

interface NotImplementedCommandResult {
  ok: false;
  code: "future_surface";
  command: string;
  message: string;
  nextActions: string[];
}

interface NormalizeCommandResult {
  ok: true;
  preset: NormalizePreset;
  background: BackgroundDecision;
  outputPath: string;
  output: Awaited<ReturnType<typeof normalizeWithPreset>>;
}

interface ExplainCommandResult {
  ok: boolean;
  runId: string;
  agentSummary: string;
  backgroundSummary?: string;
  nextActions: string[];
}

interface DiffCommandResult {
  ok: true;
  runId: string;
  filesPlanned: string[];
  filesCreated: string[];
  filesModified: string[];
  helperCodeGenerated: string[];
  manifest: ManifestStrategyResult | null;
  snapshotPath: string | null;
  rollbackCommand: string | null;
}

interface ManifestStateEntry {
  contract: SpriteCompileContract;
  runId: string;
  assetPath: string;
  loadPath: string;
  updatedAt: string;
}

interface ManifestState {
  version: string;
  target: TargetEngine;
  manifestPath: string;
  updatedAt: string;
  entries: Record<string, ManifestStateEntry>;
}

interface ManifestStrategyResult {
  strategy: ManifestStrategy;
  manifestPath: string;
  statePath: string;
  entryId: string;
  entryChange: ManifestEntryChange;
  previousCount: number;
  nextCount: number;
  removedEntryIds: string[];
  isolated: boolean;
}

interface VisualQualityResult {
  status: "passed" | "warning" | "failed";
  sourcePath: string;
  diagnostics: AlphaDiagnostics;
  checks: Array<{
    name: string;
    status: "passed" | "warning" | "failed";
    path?: string;
    message?: string;
    metric?: number;
  }>;
}

interface QualityGateResult {
  quality: QualityLevel;
  status: "passed" | "warning" | "failed";
  warningsAllowed: boolean;
  failedReasons: string[];
  warningReasons: string[];
}

interface WireMapLatestAsset {
  assetId: string;
  mediaType: MediaContract["mediaType"];
  engine: TargetEngine;
  assetPath: string;
  loadPath: string;
  manifestPath: string;
  manifestModule: string;
  runId: string;
  snippets: Array<{
    label: string;
    language: string;
    code: string;
  }>;
}

interface CompileSpriteResult {
  dryRun: boolean;
  projectRoot: string;
  input: ImageMetadata;
  alpha: AlphaDiagnostics;
  contract: SpriteCompileContract;
  outputPlan: EngineAssetDescriptor;
  installPlan: EngineInstallPlan;
  artifact?: {
    path: string;
    metadata: ImageMetadata;
  };
  background?: BackgroundDecision;
  processing?: {
    removeBackground: boolean;
    backgroundPolicy?: BackgroundPolicy;
    backgroundAction?: BackgroundDecision["action"];
    backgroundMode: BackgroundRemovalMode;
    backgroundTolerance: number;
    feather: number;
    quality: QualityLevel;
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
  manifest?: ManifestStrategyResult;
  visualQuality?: VisualQualityResult;
  qualityGate?: QualityGateResult;
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
