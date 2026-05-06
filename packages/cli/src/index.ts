#!/usr/bin/env node
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
  createThreeAssetDescriptor,
  createThreeInstallPlan,
  generateThreeHelperSource,
  generateThreeManifestSource
} from "@openrender/adapter-three";
import {
  createUnityAssetDescriptor,
  createUnityInstallPlan,
  generateUnityAnimationHelperSource,
  generateUnityManifestSource
} from "@openrender/adapter-unity";
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
  type AudioContract,
  type AtlasContract,
  type MotionContract,
  type MotionLayout,
  type SpriteFrameSetContract,
  type UiAssetContract,
  type TransparentSpriteContract,
  type TargetEngine,
  type TargetFramework,
  type VisualReferenceRecord,
  type VisualReferenceRole
} from "@openrender/core";
import { runDoctor, type DoctorResult } from "@openrender/doctor";
import {
  analyzeAlphaDiagnostics,
  analyzeSpriteInvariants,
  createFramePreviewSheet,
  composeFrameSequenceToSpriteSheet,
  cropAlphaBoundsToPng,
  decideBackgroundRemoval,
  detectFrameGrid,
  detectPngSequence,
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
  type PngSequenceDetectionResult,
  type SpriteInvariantDiagnostics
} from "@openrender/harness-visual";
import { createPreviewHtml, createReportHtml } from "@openrender/reporter";

const CLI_VERSION = "0.9.2";

type EngineAssetDescriptor =
  | ReturnType<typeof createPhaserAssetDescriptor>
  | ReturnType<typeof createGodotAssetDescriptor>
  | ReturnType<typeof createLove2DAssetDescriptor>
  | ReturnType<typeof createPixiAssetDescriptor>
  | ReturnType<typeof createCanvasAssetDescriptor>
  | ReturnType<typeof createThreeAssetDescriptor>
  | ReturnType<typeof createUnityAssetDescriptor>;

type EngineInstallPlan =
  | ReturnType<typeof createPhaserInstallPlan>
  | ReturnType<typeof createGodotInstallPlan>
  | ReturnType<typeof createLove2DInstallPlan>
  | ReturnType<typeof createPixiInstallPlan>
  | ReturnType<typeof createCanvasInstallPlan>
  | ReturnType<typeof createThreeInstallPlan>
  | ReturnType<typeof createUnityInstallPlan>;
type EngineInstallPlanFile = EngineInstallPlan["files"][number];

type SpriteCompileContract = SpriteFrameSetContract | TransparentSpriteContract;
type MotionCompileContract = MotionContract;
type P4CompileContract = AudioContract | AtlasContract | UiAssetContract;
type OpenRenderCompileRecord = CompileSpriteResult | CompileP4Result | CompileAnimationResult;
type OpenRenderInstallPlan = EngineInstallPlan | P4InstallPlan;
type OpenRenderInstallPlanFile = EngineInstallPlanFile | P4InstallPlanFile;
type ManifestStateDescriptor = Pick<EngineAssetDescriptor | P4AssetDescriptor, "assetPath" | "loadPath">;
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
  },
  three: {
    id: "three",
    framework: "vite",
    detect: (scan) => scan.engine === "three",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createThreeAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createThreeInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return {
        manifest: generateThreeManifestSource([contract]),
        animationHelper: generateThreeHelperSource(contract, frameSlices)
      };
    },
    verify: (descriptor) => descriptor.engine === "three" && descriptor.publicUrl.startsWith("/") && descriptor.publicUrl.endsWith(".png")
  },
  unity: {
    id: "unity",
    framework: "unity",
    detect: (scan) => scan.engine === "unity",
    describe: (contract) => {
      assertSpriteCompileContract(contract);
      return createUnityAssetDescriptor(contract);
    },
    plan: (input) => {
      assertSpriteCompileContract(input.contract);
      return createUnityInstallPlan({
        contract: input.contract,
        compiledAssetPath: input.compiledAssetPath,
        frameSlices: input.frameSlices
      });
    },
    generateSources: (contract, frameSlices) => {
      assertSpriteCompileContract(contract);
      return contract.mediaType === "visual.sprite_frame_set"
        ? {
            manifest: generateUnityManifestSource([contract]),
            animationHelper: generateUnityAnimationHelperSource(contract, frameSlices)
          }
        : {
            manifest: generateUnityManifestSource([contract])
          };
    },
    verify: (descriptor) => descriptor.engine === "unity" && descriptor.loadPath.startsWith("Assets/") && descriptor.loadPath.endsWith(".png") && !descriptor.loadPath.includes("..")
  }
};

const CORE_PACK_ID = "core";
const CORE_RECIPES = [
  {
    id: "core.transparent-sprite",
    packId: CORE_PACK_ID,
    mediaType: "visual.transparent_sprite",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Normalize one local PNG into an engine-ready transparent sprite asset."
  },
  {
    id: "core.sprite-frame-set",
    packId: CORE_PACK_ID,
    mediaType: "visual.sprite_frame_set",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Compile a local sprite sheet into frame metadata, helper code, reports, and rollback-safe install plans."
  },
  {
    id: "core.animation",
    packId: CORE_PACK_ID,
    mediaType: "visual.animation_clip",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Compile motion inputs into engine-ready animation assets with runtime helper paths and rollback-safe installs."
  },
  {
    id: "core.audio",
    packId: CORE_PACK_ID,
    mediaType: "audio.sound_effect",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Install local audio assets with engine paths, metadata manifests, verification, reports, and rollback."
  },
  {
    id: "core.atlas",
    packId: CORE_PACK_ID,
    mediaType: "visual.atlas",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Install local atlas or tileset images with tile metadata, manifests, verification, reports, and rollback."
  },
  {
    id: "core.ui",
    packId: CORE_PACK_ID,
    mediaType: "visual.ui_button",
    targets: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"],
    summary: "Install local UI image assets with state metadata, manifests, verification, reports, and rollback."
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
          "visual.animation_clip",
          "visual.sprite_sequence",
          "visual.effect_loop",
          "visual.ui_motion",
          "visual.reference_video",
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
          engine: { enum: ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"] },
          framework: { enum: ["vite", "godot", "love2d", "unity"] },
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
  media: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://openrender.dev/schemas/media.schema.json",
    title: "openRender 0.9.2 Media Contracts",
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
OPENRENDER_SCHEMAS["media-p4"] = OPENRENDER_SCHEMAS.media!;

interface ParsedFlags {
  flags: Map<string, string | boolean>;
  positionals: string[];
}

type LoopCommandResult =
  | LoopStartCommandResult
  | LoopRunCommandResult
  | LoopAttachCommandResult
  | LoopStatusCommandResult
  | LoopTaskCommandResult;
type LoopStatus = "created" | "needs_action" | "ready_for_wiring" | "failed" | "completed";
type LoopIterationStatus = "recorded" | "needs_action" | "ready_for_wiring" | "failed";

interface OpenRenderLoopRecord {
  schemaVersion: string;
  loopId: string;
  createdAt: string;
  updatedAt: string;
  goal: string;
  target: TargetEngine | "unknown";
  assetId?: string;
  mediaKind?: "sprite" | "animation" | "audio" | "atlas" | "ui" | "asset";
  sourcePath?: string;
  status: LoopStatus;
  latestRunId?: string;
  iterations: OpenRenderLoopIteration[];
  paths: {
    loop: string;
    latest: string;
    latestTask: string;
    latestSummary: string;
  };
  boundary: {
    assetRegeneration: false;
    modelProviderCalls: false;
    gameCodePatching: false;
    remoteDownload: false;
  };
  localOnly: true;
}

interface OpenRenderLoopIteration {
  iteration: number;
  createdAt: string;
  runId: string;
  command?: string;
  status: LoopIterationStatus;
  verification: VerificationStatus | null;
  reportPath: string | null;
  summary: string;
  failureSummary: string | null;
  nextActions: string[];
  rollbackCommand: string | null;
}

interface LoopStartCommandResult {
  ok: true;
  operation: "loop.start";
  loop: OpenRenderLoopRecord;
  taskPath: string;
  summaryPath: string;
  nextActions: string[];
}

interface LoopAttachCommandResult {
  ok: true;
  operation: "loop.attach";
  loop: OpenRenderLoopRecord;
  iteration: OpenRenderLoopIteration;
  taskPath: string;
  summaryPath: string;
}

interface LoopRunCommandResult {
  ok: true;
  operation: "loop.run";
  loop: OpenRenderLoopRecord;
  iteration: OpenRenderLoopIteration | null;
  taskPath: string;
  summaryPath: string;
  lifecycle: {
    compile: {
      runId: string;
      mediaType: MediaContract["mediaType"];
      installed: boolean;
    };
    verify: CompactVerifyCommandResult | null;
    report: CompactReportCommandResult | null;
    explain: CompactExplainCommandResult | null;
    diff: CompactDiffCommandResult | null;
  };
}

interface LoopStatusCommandResult {
  ok: true;
  operation: "loop.status";
  loop: OpenRenderLoopRecord;
  latestIteration: OpenRenderLoopIteration | null;
  nextActions: string[];
}

interface LoopTaskCommandResult {
  ok: true;
  operation: "loop.task";
  loopId: string;
  path: string;
  content: string;
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

  if (command === "ingest" && subcommand === "reference") {
    const result = await ingestReference(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printIngestReferenceResult(result);
    }
    return 0;
  }

  if (command === "loop") {
    const result = await handleLoopCommand(parsed);
    if (subcommand === "task" && parsed.flags.get("json") !== true) {
      console.log((result as LoopTaskCommandResult).content);
    } else if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactLoopResult(result) : result, null, 2));
    } else {
      printLoopResult(result);
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

  if (command === "detect-motion") {
    const result = await detectMotionCommand(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactDetectMotionResult(result) : result, null, 2));
    } else {
      printDetectMotionResult(result);
    }
    return result.ok ? 0 : 1;
  }

  if (command === "normalize") {
    const result = subcommand === "motion"
      ? await normalizeMotionCommand(parsed)
      : await normalizeCommand(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if ("motion" in result) printNormalizeMotionResult(result);
      else printNormalizeResult(result);
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

  if (command === "compile" && (subcommand === "audio" || subcommand === "atlas" || subcommand === "ui")) {
    const result = await compileP4Media(subcommand, parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCompileP4(result);
    }
    return result.validation?.status === "failed" ? 1 : 0;
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

  if (command === "compile" && subcommand === "animation") {
    const result = await compileAnimation(parsed);
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(parsed.flags.get("compact") === true ? compactCompileAnimationResult(result) : result, null, 2));
    } else {
      printCompileAnimation(result);
    }
    return result.validation.status === "failed" ? 1 : 0;
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

function readOptionalStringFlag(parsed: ParsedFlags, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
  if (value === "phaser" || value === "godot" || value === "love2d" || value === "pixi" || value === "canvas" || value === "three" || value === "unity") return value;
  throw new Error(`Unsupported target for Developer Kit: ${value}`);
}

function readFrameworkFlag(parsed: ParsedFlags, fallback: TargetFramework): TargetFramework {
  const value = readStringFlag(parsed, "framework", fallback);
  if (value === "vite" || value === "godot" || value === "love2d" || value === "unity") return value;
  throw new Error(`Unsupported framework for Developer Kit: ${value}`);
}

function defaultFrameworkForTarget(target: TargetEngine): TargetFramework {
  if (target === "love2d") return "love2d";
  if (target === "unity") return "unity";
  return target === "godot" ? "godot" : "vite";
}

function defaultAssetRootForTarget(target: TargetEngine): string {
  if (target === "unity") return "Assets/OpenRender/Generated";
  return target === "godot" || target === "love2d" ? "assets/openrender" : "public/assets";
}

function assertTargetFrameworkPair(target: TargetEngine, framework: TargetFramework): void {
  if ((target === "phaser" || target === "pixi" || target === "canvas" || target === "three") && framework !== "vite") {
    throw new Error(`${target} target requires the vite framework.`);
  }

  if (target === "godot" && framework !== "godot") {
    throw new Error("Godot target requires the godot framework.");
  }

  if (target === "love2d" && framework !== "love2d") {
    throw new Error("LOVE2D target requires the love2d framework.");
  }

  if (target === "unity" && framework !== "unity") {
    throw new Error("Unity target requires the unity framework.");
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

async function detectMotionCommand(parsed: ParsedFlags): Promise<DetectMotionCommandResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requirePathArgument(parsed, "detect-motion"));
  const fps = readIntegerFlag(parsed, "fps", 12);
  const stat = await fs.stat(sourcePath);

  if (stat.isDirectory()) {
    const sequence = await detectPngSequence({ sourcePath, fps });
    return createDetectMotionResultFromPngSequence(projectRoot, sequence);
  }

  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === ".png" || extension === ".webp" || extension === ".jpg" || extension === ".jpeg") {
    const metadata = await loadImageMetadata(sourcePath);
    const frames = readOptionalIntegerFlag(parsed, "frames");
    const detected = await detectFrameGrid({ sourcePath, frames });
    const frameSlices = planFrameSlices({
      layout: detected.suggested.layout,
      imageWidth: metadata.width,
      frames: detected.suggested.frameCount,
      frameWidth: detected.suggested.frameWidth,
      frameHeight: detected.suggested.frameHeight
    });
    const invariants = await analyzeSpriteInvariants({
      sourcePath,
      layout: detected.suggested.layout,
      frames: detected.suggested.frameCount,
      frameWidth: detected.suggested.frameWidth,
      frameHeight: detected.suggested.frameHeight
    });
    return {
      ok: true,
      sourcePath: path.relative(projectRoot, sourcePath),
      sourceType: "sprite_sheet",
      runtime: { ffmpeg: "not_required", ffprobe: "not_required" },
      durationMs: Math.round((detected.suggested.frameCount / fps) * 1000),
      width: metadata.width,
      height: metadata.height,
      fps,
      frameCount: detected.suggested.frameCount,
      hasAlpha: metadata.hasAlpha,
      frameSize: {
        width: detected.suggested.frameWidth,
        height: detected.suggested.frameHeight
      },
      suggested: {
        fps,
        frames: detected.suggested.frameCount,
        layout: detected.suggested.layout,
        loop: invariants.ok
      },
      diagnostics: {
        duplicateFrameRatio: invariants.checks.some((check) => check.name === "duplicateFrameApprox" && check.status === "failed") ? 0.5 : 0,
        emptyFrameRisk: invariants.checks.some((check) => check.name === "emptyFrame" && check.status === "failed") ? "high" : "none",
        boundsJitter: invariants.checks.some((check) => check.name === "frameBoundsJitter" && check.status === "failed") ? Math.max(detected.suggested.frameWidth, detected.suggested.frameHeight) : 0,
        loopConfidence: invariants.ok ? 0.62 : 0.35
      },
      nextActions: [
        "Run openrender compile animation --from <path> --target <engine> --id <asset.id> --dry-run --json.",
        "Choose --layout grid when the sheet has multiple rows; choose --layout horizontal_strip for a single strip."
      ],
      localOnly: true,
      frameSlices
    };
  }

  if (extension === ".mp4" || extension === ".webm" || extension === ".gif") {
    if (!await commandAvailable("ffprobe")) {
      return createMotionRuntimeMissingResult(projectRoot, sourcePath, "ffprobe");
    }
    const probe = await ffprobeMotion(sourcePath);
    return {
      ok: true,
      sourcePath: path.relative(projectRoot, sourcePath),
      sourceType: extension === ".gif" ? "gif" : "video",
      runtime: {
        ffmpeg: await commandAvailable("ffmpeg") ? "available" : "missing",
        ffprobe: "available"
      },
      durationMs: probe.durationMs,
      width: probe.width,
      height: probe.height,
      fps: probe.fps || fps,
      frameCount: probe.frameCount || Math.max(1, Math.round((probe.durationMs / 1000) * (probe.fps || fps))),
      hasAlpha: probe.hasAlpha,
      frameSize: {
        width: probe.width,
        height: probe.height
      },
      suggested: {
        fps: Math.min(Math.max(Math.round(probe.fps || fps), 1), 24),
        frames: probe.frameCount || Math.max(1, Math.round((probe.durationMs / 1000) * (probe.fps || fps))),
        layout: (probe.frameCount || 0) > 12 ? "grid" : "horizontal_strip",
        loop: extension === ".gif"
      },
      diagnostics: {
        duplicateFrameRatio: 0,
        emptyFrameRisk: "low",
        boundsJitter: 0,
        loopConfidence: extension === ".gif" ? 0.7 : 0.35
      },
      nextActions: await commandAvailable("ffmpeg")
        ? ["Run openrender compile animation when you are ready to extract frames and install helpers."]
        : ["Install ffmpeg before frame extraction: brew install ffmpeg, then re-run detect-motion or compile animation."],
      localOnly: true
    };
  }

  throw new Error(`Unsupported motion input: ${extension || "unknown"}. Use .mp4, .webm, .gif, a PNG sequence directory, or a sprite sheet image.`);
}

async function normalizeMotionCommand(parsed: ParsedFlags): Promise<NormalizeMotionCommandResult> {
  const projectRoot = process.cwd();
  const sourceArg = parsed.positionals[2] ?? parsed.flags.get("from") ?? parsed.flags.get("input");
  if (typeof sourceArg !== "string" || sourceArg.length === 0) {
    throw new Error("Missing required path for normalize motion.");
  }
  const sourcePath = resolveInsideProject(projectRoot, sourceArg);
  const id = readStringFlag(parsed, "id", "motion.normalized");
  const layout = readMotionLayoutFlag(parsed);
  const fps = readIntegerFlag(parsed, "fps", 12);
  const run = createInitialRun({ id, mediaType: "visual.animation_clip" });
  const prepared = await prepareMotionAsset({
    projectRoot,
    sourcePath,
    runId: run.runId,
    id,
    fps,
    frames: readOptionalIntegerFlag(parsed, "frames"),
    layout,
    dryRun: false,
    start: readOptionalNumberFlag(parsed, "start"),
    end: readOptionalNumberFlag(parsed, "end")
  });

  return {
    ok: true,
    motion: {
      sourceType: prepared.sourceType,
      durationMs: prepared.input.durationMs,
      fps: prepared.input.fps,
      frames: prepared.frameCount,
      layout: prepared.motionLayout,
      loop: prepared.diagnostics.loopConfidence >= 0.5
    },
    outputPath: prepared.artifactPath,
    output: prepared.artifact,
    frameSlices: prepared.frameSlices,
    diagnostics: prepared.diagnostics,
    localOnly: true
  };
}

async function compileAnimation(parsed: ParsedFlags): Promise<CompileAnimationResult> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requireSourcePathFlag(parsed));
  const id = requireStringFlag(parsed, "id");
  const target = readTargetFlag(parsed, "phaser");
  const framework = readFrameworkFlag(parsed, defaultFrameworkForTarget(target));
  assertTargetFrameworkPair(target, framework);
  const assetRoot = readStringFlag(parsed, "asset-root", defaultAssetRootForTarget(target));
  const fps = readIntegerFlag(parsed, "fps", 12);
  const frames = readOptionalIntegerFlag(parsed, "frames");
  const layout = readMotionLayoutFlag(parsed);
  const mediaType = readMotionMediaTypeFlag(parsed);
  const dryRun = parsed.flags.get("dry-run") === true;
  const manifestStrategy = readManifestStrategyFlag(parsed);
  const run = createInitialRun({ id, mediaType });
  const prepared = await prepareMotionAsset({
    projectRoot,
    sourcePath,
    runId: run.runId,
    id,
    fps,
    frames,
    layout,
    dryRun,
    start: readOptionalNumberFlag(parsed, "start"),
    end: readOptionalNumberFlag(parsed, "end")
  });
  const loop = parsed.flags.get("loop") === true || mediaType === "visual.effect_loop";
  const contract: MotionCompileContract = {
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    mediaType,
    sourcePath: path.relative(projectRoot, sourcePath),
    target: {
      engine: target,
      framework,
      projectRoot
    },
    id,
    motion: {
      layout: prepared.motionLayout,
      fps: prepared.input.fps,
      frames: prepared.frameCount,
      loop,
      ...(prepared.startMs !== undefined ? { startMs: prepared.startMs } : {}),
      ...(prepared.endMs !== undefined ? { endMs: prepared.endMs } : {})
    },
    visual: {
      layout: prepared.spriteLayout,
      frames: prepared.frameCount,
      frameWidth: prepared.frameWidth,
      frameHeight: prepared.frameHeight,
      fps: prepared.input.fps,
      padding: 0,
      background: prepared.input.hasAlpha ? "transparent" : "solid",
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
  const adapterContract = createAnimationAdapterContract(contract);
  const descriptor = createEngineAssetDescriptor(adapterContract);
  let installPlan = createEngineInstallPlan({
    contract: adapterContract,
    compiledAssetPath: prepared.artifactPath,
    frameSlices: prepared.frameSlices
  });
  run.status = dryRun ? "harness_ready" : "completed";
  const validation = createMotionValidation({
    contract,
    artifactPath: prepared.artifactPath,
    artifactExists: prepared.artifact !== undefined,
    frameSlices: prepared.frameSlices,
    diagnostics: prepared.diagnostics,
    dryRun
  });
  run.verification = validation;

  const manifestPlan = await applyManifestStrategy({
    projectRoot,
    contract: adapterContract,
    descriptor,
    installPlan,
    frameSlices: prepared.frameSlices,
    strategy: manifestStrategy,
    runId: run.runId
  });
  installPlan = manifestPlan.installPlan;
  run.outputs = [
    { kind: "compiled_asset", path: prepared.artifactPath },
    ...(manifestPlan.manifest.strategy === "isolated" ? [] : [{ kind: "manifest" as const, path: descriptor.manifestPath }]),
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : [])
  ];

  if (prepared.framePreview) {
    run.outputs.push({ kind: "preview", path: prepared.framePreview.path });
  }

  const result: CompileAnimationResult = {
    dryRun,
    projectRoot,
    input: prepared.input,
    contract,
    adapterContract,
    outputPlan: descriptor,
    installPlan,
    artifact: prepared.artifact,
    processing: {
      pipeline: "animation",
      sourceType: prepared.sourceType,
      layout: prepared.motionLayout,
      frameExtraction: prepared.frameExtraction,
      manifestStrategy
    },
    motion: {
      durationMs: prepared.input.durationMs,
      fps: prepared.input.fps,
      frames: prepared.frameCount,
      layout: prepared.motionLayout,
      loop,
      diagnostics: prepared.diagnostics
    },
    recipe: createCoreRecipeReference(contract.mediaType),
    agentSummary: createCompileAnimationAgentSummary({
      contract,
      installPlan,
      dryRun,
      installedWrites: 0,
      validationOk: validation.status !== "failed"
    }),
    generatedSources: manifestPlan.generatedSources,
    manifest: manifestPlan.manifest,
    validation,
    frameSlices: prepared.frameSlices,
    framePreview: prepared.framePreview,
    run
  };

  if (!dryRun) {
    await writeCompileRecord(projectRoot, result);
  }

  if (!dryRun && parsed.flags.get("install") === true && result.validation.status !== "failed") {
    result.installResult = await installCompiledRecord({
      projectRoot,
      record: result,
      force: parsed.flags.get("force") === true
    });
    result.agentSummary = createCompileAnimationAgentSummary({
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

async function prepareMotionAsset(input: {
  projectRoot: string;
  sourcePath: string;
  runId: string;
  id: string;
  fps: number;
  frames?: number;
  layout: MotionLayout;
  dryRun: boolean;
  start?: number;
  end?: number;
}): Promise<PreparedMotionAsset> {
  const sourceStat = await fs.stat(input.sourcePath);
  const safeId = sanitizeAssetId(input.id);
  const artifactPath = path.posix.join(".openrender", "artifacts", input.runId, "output", `${safeId}.png`);
  const absoluteArtifactPath = resolveInsideProject(input.projectRoot, artifactPath);

  if (sourceStat.isDirectory()) {
    const sequence = await detectPngSequence({ sourcePath: input.sourcePath, fps: input.fps });
    const outputLayout = motionLayoutToOutputSheetLayout(input.layout, sequence.frameCount);
    const frameSlices = createComposedFrameSlices({
      frameCount: sequence.frameCount,
      frameWidth: sequence.width,
      frameHeight: sequence.height,
      layout: outputLayout
    });
    const artifact = input.dryRun
      ? undefined
      : await composeFrameSequenceToSpriteSheet({
          framePaths: sequence.framePaths,
          outputPath: absoluteArtifactPath,
          layout: outputLayout
        });
    const framePreview = artifact
      ? await createFramePreviewSheet({
          sourcePath: absoluteArtifactPath,
          outputPath: resolveInsideProject(input.projectRoot, path.posix.join(".openrender", "runs", input.runId, "preview_frames.png")),
          frameSlices
        })
      : undefined;

    return {
      sourceType: "png_sequence",
      artifactPath,
      absoluteArtifactPath,
      artifact: artifact ? { path: artifact.path, metadata: artifact.metadata } : undefined,
      framePreview,
      frameSlices,
      frameCount: sequence.frameCount,
      frameWidth: sequence.width,
      frameHeight: sequence.height,
      spriteLayout: outputLayout,
      motionLayout: input.layout,
      diagnostics: sequence.diagnostics,
      input: {
        sourcePath: path.relative(input.projectRoot, input.sourcePath),
        sourceType: "png_sequence",
        durationMs: sequence.durationMs,
        width: sequence.width,
        height: sequence.height,
        fps: sequence.fps,
        frameCount: sequence.frameCount,
        hasAlpha: sequence.hasAlpha
      },
      frameExtraction: "not_required",
      startMs: input.start !== undefined ? Math.round(input.start * 1000) : undefined,
      endMs: input.end !== undefined ? Math.round(input.end * 1000) : undefined
    };
  }

  const extension = path.extname(input.sourcePath).toLowerCase();
  if (extension === ".png" || extension === ".webp" || extension === ".jpg" || extension === ".jpeg") {
    const metadata = await loadImageMetadata(input.sourcePath);
    const detected = await detectFrameGrid({ sourcePath: input.sourcePath, frames: input.frames });
    const selectedLayout = input.layout === "grid" ? "grid" : detected.suggested.layout;
    const frameSlices = planFrameSlices({
      layout: selectedLayout,
      imageWidth: metadata.width,
      frames: detected.suggested.frameCount,
      frameWidth: detected.suggested.frameWidth,
      frameHeight: detected.suggested.frameHeight
    });
    const invariants = await analyzeSpriteInvariants({
      sourcePath: input.sourcePath,
      layout: selectedLayout,
      frames: detected.suggested.frameCount,
      frameWidth: detected.suggested.frameWidth,
      frameHeight: detected.suggested.frameHeight
    });
    const artifact = input.dryRun
      ? undefined
      : await normalizeImageToPng({
          sourcePath: input.sourcePath,
          outputPath: absoluteArtifactPath
        });
    const framePreview = artifact
      ? await createFramePreviewSheet({
          sourcePath: absoluteArtifactPath,
          outputPath: resolveInsideProject(input.projectRoot, path.posix.join(".openrender", "runs", input.runId, "preview_frames.png")),
          frameSlices
        })
      : undefined;

    return {
      sourceType: "sprite_sheet",
      artifactPath,
      absoluteArtifactPath,
      artifact: artifact ? { path: artifact.path, metadata: artifact.metadata } : undefined,
      framePreview,
      frameSlices,
      frameCount: detected.suggested.frameCount,
      frameWidth: detected.suggested.frameWidth,
      frameHeight: detected.suggested.frameHeight,
      spriteLayout: selectedLayout,
      motionLayout: input.layout,
      diagnostics: {
        duplicateFrameRatio: invariants.checks.some((check) => check.name === "duplicateFrameApprox" && check.status === "failed") ? 0.5 : 0,
        emptyFrameRisk: invariants.checks.some((check) => check.name === "emptyFrame" && check.status === "failed") ? "high" : "none",
        boundsJitter: invariants.checks.some((check) => check.name === "frameBoundsJitter" && check.status === "failed") ? Math.max(detected.suggested.frameWidth, detected.suggested.frameHeight) : 0,
        loopConfidence: invariants.ok ? 0.62 : 0.35
      },
      input: {
        sourcePath: path.relative(input.projectRoot, input.sourcePath),
        sourceType: "sprite_sheet",
        durationMs: Math.round((detected.suggested.frameCount / input.fps) * 1000),
        width: metadata.width,
        height: metadata.height,
        fps: input.fps,
        frameCount: detected.suggested.frameCount,
        hasAlpha: metadata.hasAlpha
      },
      frameExtraction: "not_required",
      startMs: input.start !== undefined ? Math.round(input.start * 1000) : undefined,
      endMs: input.end !== undefined ? Math.round(input.end * 1000) : undefined
    };
  }

  if (extension === ".mp4" || extension === ".webm" || extension === ".gif") {
    const probe = await ffprobeMotion(input.sourcePath);
    if (input.dryRun) {
      const frameCount = input.frames ?? probe.frameCount ?? Math.max(1, Math.round((probe.durationMs / 1000) * input.fps));
      const outputLayout = motionLayoutToOutputSheetLayout(input.layout, frameCount);
      return {
        sourceType: extension === ".gif" ? "gif" : "video",
        artifactPath,
        absoluteArtifactPath,
        artifact: undefined,
        frameSlices: createComposedFrameSlices({
          frameCount,
          frameWidth: probe.width,
          frameHeight: probe.height,
          layout: outputLayout
        }),
        frameCount,
        frameWidth: probe.width,
        frameHeight: probe.height,
        spriteLayout: outputLayout,
        motionLayout: input.layout,
        diagnostics: {
          duplicateFrameRatio: 0,
          emptyFrameRisk: "low",
          boundsJitter: 0,
          loopConfidence: extension === ".gif" ? 0.7 : 0.35
        },
        input: {
          sourcePath: path.relative(input.projectRoot, input.sourcePath),
          sourceType: extension === ".gif" ? "gif" : "video",
          durationMs: probe.durationMs,
          width: probe.width,
          height: probe.height,
          fps: input.fps,
          frameCount,
          hasAlpha: probe.hasAlpha
        },
        frameExtraction: "dry_run",
        startMs: input.start !== undefined ? Math.round(input.start * 1000) : undefined,
        endMs: input.end !== undefined ? Math.round(input.end * 1000) : undefined
      };
    }

    if (!await commandAvailable("ffmpeg")) {
      throw new Error("MOTION_RUNTIME_MISSING: ffmpeg is required to extract video/GIF frames. Install it with `brew install ffmpeg` and re-run compile animation.");
    }
    const framesDir = path.posix.join(".openrender", "artifacts", input.runId, "frames");
    await extractMotionFrames({
      projectRoot: input.projectRoot,
      sourcePath: input.sourcePath,
      framesDir,
      fps: input.fps,
      frames: input.frames,
      start: input.start,
      end: input.end
    });
    const sequence = await detectPngSequence({
      sourcePath: resolveInsideProject(input.projectRoot, framesDir),
      fps: input.fps
    });
    const outputLayout = motionLayoutToOutputSheetLayout(input.layout, sequence.frameCount);
    const artifact = await composeFrameSequenceToSpriteSheet({
      framePaths: sequence.framePaths,
      outputPath: absoluteArtifactPath,
      layout: outputLayout
    });
    const framePreview = await createFramePreviewSheet({
      sourcePath: absoluteArtifactPath,
      outputPath: resolveInsideProject(input.projectRoot, path.posix.join(".openrender", "runs", input.runId, "preview_frames.png")),
      frameSlices: artifact.frameSlices
    });

    return {
      sourceType: extension === ".gif" ? "gif" : "video",
      artifactPath,
      absoluteArtifactPath,
      artifact: { path: artifact.path, metadata: artifact.metadata },
      framePreview,
      frameSlices: artifact.frameSlices,
      frameCount: sequence.frameCount,
      frameWidth: sequence.width,
      frameHeight: sequence.height,
      spriteLayout: outputLayout,
      motionLayout: input.layout,
      diagnostics: sequence.diagnostics,
      input: {
        sourcePath: path.relative(input.projectRoot, input.sourcePath),
        sourceType: extension === ".gif" ? "gif" : "video",
        durationMs: sequence.durationMs,
        width: sequence.width,
        height: sequence.height,
        fps: sequence.fps,
        frameCount: sequence.frameCount,
        hasAlpha: sequence.hasAlpha || probe.hasAlpha
      },
      frameExtraction: framesDir,
      startMs: input.start !== undefined ? Math.round(input.start * 1000) : undefined,
      endMs: input.end !== undefined ? Math.round(input.end * 1000) : undefined
    };
  }

  throw new Error(`Unsupported motion input: ${extension || "unknown"}.`);
}

function createAnimationAdapterContract(contract: MotionCompileContract): SpriteFrameSetContract {
  return {
    schemaVersion: contract.schemaVersion,
    mediaType: "visual.sprite_frame_set",
    sourcePath: contract.sourcePath,
    target: contract.target,
    id: contract.id,
    visual: {
      layout: contract.visual.layout,
      frames: contract.visual.frames,
      frameWidth: contract.visual.frameWidth,
      frameHeight: contract.visual.frameHeight,
      fps: contract.visual.fps,
      padding: contract.visual.padding,
      background: contract.visual.background,
      outputFormat: contract.visual.outputFormat
    },
    install: contract.install,
    verify: contract.verify
  };
}

function createMotionValidation(input: {
  contract: MotionCompileContract;
  artifactPath: string;
  artifactExists: boolean;
  frameSlices: FrameSlice[];
  diagnostics: MotionDiagnostics;
  dryRun: boolean;
}): MotionValidationResult {
  const checks: MotionValidationResult["checks"] = [
    {
      name: "motion_contract_pipeline",
      status: "passed",
      path: input.contract.sourcePath,
      message: `${input.contract.mediaType} uses animation compile/install/verify/report/rollback pipeline`
    },
    {
      name: "motion_compiled_artifact_ready",
      status: input.artifactExists ? "passed" : input.dryRun ? "skipped" : "failed",
      path: input.artifactPath,
      message: input.artifactExists ? "animation sheet written" : input.dryRun ? "dry-run only" : "artifact missing"
    },
    {
      name: "motion_frame_slices_ready",
      status: input.frameSlices.length === input.contract.motion.frames ? "passed" : "failed",
      path: input.artifactPath,
      message: `${input.frameSlices.length}/${input.contract.motion.frames} frame slices`
    },
    {
      name: "motion_empty_frame_risk",
      status: input.diagnostics.emptyFrameRisk === "high" ? "warning" : "passed",
      path: input.artifactPath,
      message: input.diagnostics.emptyFrameRisk
    },
    {
      name: "motion_loop_confidence",
      status: input.contract.motion.loop && input.diagnostics.loopConfidence < 0.4 ? "warning" : "passed",
      path: input.artifactPath,
      message: `loop confidence ${input.diagnostics.loopConfidence}`
    }
  ];

  return {
    status: createVerificationStatus(checks),
    checks
  };
}

function createDetectMotionResultFromPngSequence(
  projectRoot: string,
  sequence: PngSequenceDetectionResult
): DetectMotionCommandResult {
  return {
    ok: true,
    sourcePath: path.relative(projectRoot, sequence.sourcePath),
    sourceType: sequence.sourceType,
    runtime: { ffmpeg: "not_required", ffprobe: "not_required" },
    durationMs: sequence.durationMs,
    width: sequence.width,
    height: sequence.height,
    fps: sequence.fps,
    frameCount: sequence.frameCount,
    hasAlpha: sequence.hasAlpha,
    frameSize: {
      width: sequence.width,
      height: sequence.height
    },
    suggested: sequence.suggested,
    diagnostics: sequence.diagnostics,
    nextActions: [
      "Run openrender compile animation --from <frames-dir> --target <engine> --id <asset.id> --dry-run --json.",
      "Use --layout horizontal_strip for short loops or --layout grid for larger frame sets."
    ],
    localOnly: true
  };
}

function createMotionRuntimeMissingResult(
  projectRoot: string,
  sourcePath: string,
  runtime: "ffmpeg" | "ffprobe"
): DetectMotionCommandResult {
  return {
    ok: false,
    code: "MOTION_RUNTIME_MISSING",
    sourcePath: path.relative(projectRoot, sourcePath),
    sourceType: "video",
    runtime: {
      ffmpeg: runtime === "ffmpeg" ? "missing" : "unknown",
      ffprobe: runtime === "ffprobe" ? "missing" : "unknown"
    },
    durationMs: null,
    width: null,
    height: null,
    fps: null,
    frameCount: null,
    hasAlpha: null,
    frameSize: null,
    suggested: null,
    diagnostics: null,
    nextActions: [
      "Install ffmpeg/ffprobe first, for example: brew install ffmpeg.",
      "For an ffmpeg-free path, pass a PNG frame directory to detect-motion or compile animation."
    ],
    localOnly: true
  };
}

async function ffprobeMotion(sourcePath: string): Promise<{
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  frameCount: number | null;
  hasAlpha: boolean;
}> {
  if (!await commandAvailable("ffprobe")) {
    throw new Error("MOTION_RUNTIME_MISSING: ffprobe is required to inspect video/GIF inputs. Install it with `brew install ffmpeg`.");
  }

  const result = await runProcessCapture({
    command: "ffprobe",
    args: [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,avg_frame_rate,nb_frames,pix_fmt,duration",
      "-of", "json",
      sourcePath
    ],
    cwd: process.cwd(),
    timeoutMs: 30_000
  });
  const parsed = JSON.parse(result.stdout) as {
    streams?: Array<{
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      nb_frames?: string;
      pix_fmt?: string;
      duration?: string;
    }>;
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream.height) {
    throw new Error("Could not read video dimensions with ffprobe.");
  }
  const fps = parseFrameRate(stream.avg_frame_rate) || 12;
  const durationSeconds = Number.parseFloat(stream.duration ?? "0");
  const frameCount = stream.nb_frames ? Number.parseInt(stream.nb_frames, 10) : null;
  return {
    durationMs: Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.round(durationSeconds * 1000)
      : frameCount ? Math.round((frameCount / fps) * 1000) : 0,
    width: stream.width,
    height: stream.height,
    fps,
    frameCount: frameCount && Number.isFinite(frameCount) ? frameCount : null,
    hasAlpha: /rgba|argb|yuva|bgra|gbrap|alpha/i.test(stream.pix_fmt ?? "")
  };
}

async function extractMotionFrames(input: {
  projectRoot: string;
  sourcePath: string;
  framesDir: string;
  fps: number;
  frames?: number;
  start?: number;
  end?: number;
}): Promise<void> {
  const absoluteFramesDir = resolveInsideProject(input.projectRoot, input.framesDir);
  await fs.mkdir(absoluteFramesDir, { recursive: true });
  const outputPattern = path.join(absoluteFramesDir, "frame_%04d.png");
  const args = ["-y"];
  if (input.start !== undefined) args.push("-ss", String(input.start));
  args.push("-i", input.sourcePath);
  if (input.end !== undefined) args.push("-to", String(input.end));
  args.push("-vf", `fps=${input.fps}`);
  if (input.frames !== undefined) args.push("-frames:v", String(input.frames));
  args.push(outputPattern);
  await runProcessCapture({
    command: "ffmpeg",
    args,
    cwd: input.projectRoot,
    timeoutMs: 120_000
  });
}

async function runProcessCapture(input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({ stdout, stderr });
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      settle(new Error(`${input.command} timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => settle(error));
    child.on("exit", (code, signal) => {
      if (code === 0) {
        settle();
      } else {
        const exitLabel = signal ? `signal ${signal}` : `exit ${code ?? "unknown"}`;
        settle(new Error(`${input.command} failed with ${exitLabel}: ${stderr.trim().slice(0, 1200)}`));
      }
    });
  });
}

function parseFrameRate(value: string | undefined): number {
  if (!value || value === "0/0") return 0;
  const [left, right] = value.split("/");
  if (right === undefined) {
    const fps = Number.parseFloat(value);
    return Number.isFinite(fps) ? fps : 0;
  }
  const numerator = Number.parseFloat(left ?? "0");
  const denominator = Number.parseFloat(right ?? "0");
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
  return numerator / denominator;
}

function readMotionLayoutFlag(parsed: ParsedFlags): MotionLayout {
  const value = readStringFlag(parsed, "layout", "horizontal_strip");
  if (value === "horizontal_strip" || value === "grid" || value === "sequence") return value;
  throw new Error(`Unsupported motion layout: ${value}`);
}

function readMotionMediaTypeFlag(parsed: ParsedFlags): MotionCompileContract["mediaType"] {
  const value = readStringFlag(parsed, "media-type", "visual.animation_clip");
  if (
    value === "visual.animation_clip" ||
    value === "visual.sprite_sequence" ||
    value === "visual.effect_loop" ||
    value === "visual.ui_motion" ||
    value === "visual.reference_video"
  ) {
    return value;
  }
  throw new Error(`Unsupported animation media type: ${value}`);
}

function motionLayoutToOutputSheetLayout(layout: MotionLayout, frameCount: number): "horizontal_strip" | "grid" {
  if (layout === "grid") return "grid";
  if (layout === "sequence") return frameCount > 12 ? "grid" : "horizontal_strip";
  return "horizontal_strip";
}

function createComposedFrameSlices(input: {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  layout: "horizontal_strip" | "grid";
}): FrameSlice[] {
  const columns = input.layout === "horizontal_strip" ? input.frameCount : Math.ceil(Math.sqrt(input.frameCount));
  return Array.from({ length: input.frameCount }, (_, index) => ({
    index,
    x: (index % columns) * input.frameWidth,
    y: Math.floor(index / columns) * input.frameHeight,
    width: input.frameWidth,
    height: input.frameHeight
  }));
}

function sanitizeAssetId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
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
  if (target === "phaser" || target === "pixi" || target === "canvas" || target === "three") return null;
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
    ok: (isSpriteCompileRecord(record) ? record.validation?.ok !== false : record.validation.status !== "failed") && record.run.verification?.status !== "failed",
    runId: record.run.runId,
    agentSummary: createAgentSummary(record),
    backgroundSummary: isSpriteCompileRecord(record) ? createBackgroundSummary(record) : undefined,
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

async function handleLoopCommand(parsed: ParsedFlags): Promise<LoopCommandResult> {
  const subcommand = parsed.positionals[1];
  if (subcommand === "start") return startLoop(parsed);
  if (subcommand === "run") return runLoop(parsed);
  if (subcommand === "attach") return attachLoopRun(parsed);
  if (subcommand === "status") return statusLoop(parsed);
  if (subcommand === "task") return taskLoop(parsed);
  throw new Error("Unsupported loop command. Use start, attach, status, or task.");
}

async function startLoop(parsed: ParsedFlags): Promise<LoopStartCommandResult> {
  const projectRoot = process.cwd();
  const scan = await scanProject(projectRoot);
  const goal = requireStringFlag(parsed, "goal");
  const target = readOptionalTargetFlag(parsed) ?? (scan.engine === "unknown" ? "unknown" : scan.engine);
  const now = new Date();
  const loopId = createLoopId(now);
  const loop = createInitialLoopRecord({
    loopId,
    goal,
    target,
    assetId: readOptionalStringFlag(parsed, "id"),
    mediaKind: readLoopMediaKind(parsed),
    sourcePath: readOptionalStringFlag(parsed, "from") ?? readOptionalStringFlag(parsed, "input"),
    date: now
  });

  await persistLoop(projectRoot, loop);
  await persistLoopTask(projectRoot, loop, null);

  return {
    ok: true,
    operation: "loop.start",
    loop,
    taskPath: loop.paths.latestTask,
    summaryPath: loop.paths.latestSummary,
    nextActions: [
      "Run compile/verify/report as usual, then attach the latest run with openrender loop attach --run latest --json.",
      "Keep source media fixed; openRender loops do not call model providers or regenerate assets."
    ]
  };
}

async function runLoop(parsed: ParsedFlags): Promise<LoopRunCommandResult> {
  assertLoopDoesNotRequestRegeneration(parsed);
  const projectRoot = process.cwd();
  const mediaKind = readLoopRunMediaKind(parsed);
  const compileParsed = createParsed(["compile", mediaKind], Object.fromEntries(parsed.flags));
  let compile: OpenRenderCompileRecord;

  if (mediaKind === "sprite") {
    compile = await compileSprite(compileParsed);
  } else if (mediaKind === "animation") {
    compile = await compileAnimation(compileParsed);
  } else {
    compile = await compileP4Media(mediaKind, compileParsed);
  }

  let loop = await readLoopOrCreateFromRecord(projectRoot, parsed, compile);
  if (compile.dryRun) {
    const now = new Date().toISOString();
    loop = {
      ...loop,
      updatedAt: now,
      target: loop.target === "unknown" ? compile.contract.target.engine : loop.target,
      assetId: loop.assetId ?? compile.contract.id,
      mediaKind: loop.mediaKind ?? loopMediaKindFromRecord(compile),
      sourcePath: loop.sourcePath ?? compile.contract.sourcePath,
      status: "needs_action",
      latestRunId: compile.run.runId
    };
    await persistLoop(projectRoot, loop);
    await persistLoopTask(projectRoot, loop, compile);
    return {
      ok: true,
      operation: "loop.run",
      loop,
      iteration: null,
      taskPath: loop.paths.latestTask,
      summaryPath: loop.paths.latestSummary,
      lifecycle: {
        compile: {
          runId: compile.run.runId,
          mediaType: compile.contract.mediaType,
          installed: false
        },
        verify: null,
        report: null,
        explain: null,
        diff: null
      }
    };
  }

  const verify = await verifyRun(createParsed(["verify"], { run: compile.run.runId }));
  const report = await writeReport(createParsed(["report"], { run: compile.run.runId }));
  const explain = await explainRun(createParsed(["explain"], { run: compile.run.runId }));
  const diff = await diffRun(createParsed(["diff"], { run: compile.run.runId }));
  const latestRecord = await readCompileRecord(projectRoot, compile.run.runId);
  const installResult = latestRecord.installResult ?? await readInstallResultIfAvailable(projectRoot, latestRecord.run.runId);
  const iteration = await createLoopIterationFromRecord({
    projectRoot,
    loop,
    record: latestRecord,
    report,
    installRecorded: installResult !== null,
    command: createLoopRunCommandSummary(mediaKind, parsed)
  });
  loop = {
    ...loop,
    updatedAt: iteration.createdAt,
    target: loop.target === "unknown" ? latestRecord.contract.target.engine : loop.target,
    assetId: loop.assetId ?? latestRecord.contract.id,
    mediaKind: loop.mediaKind ?? loopMediaKindFromRecord(latestRecord),
    sourcePath: loop.sourcePath ?? latestRecord.contract.sourcePath,
    status: iteration.status === "ready_for_wiring" ? "ready_for_wiring" : "needs_action",
    latestRunId: latestRecord.run.runId,
    iterations: [...loop.iterations, iteration]
  };
  await persistLoop(projectRoot, loop);
  await persistLoopTask(projectRoot, loop, latestRecord);

  return {
    ok: true,
    operation: "loop.run",
    loop,
    iteration,
    taskPath: loop.paths.latestTask,
    summaryPath: loop.paths.latestSummary,
    lifecycle: {
      compile: {
        runId: latestRecord.run.runId,
        mediaType: latestRecord.contract.mediaType,
        installed: installResult !== null
      },
      verify: compactVerifyResult(verify),
      report: compactReportResult(report),
      explain: compactExplainResult(explain),
      diff: compactDiffResult(diff)
    }
  };
}

async function attachLoopRun(parsed: ParsedFlags): Promise<LoopAttachCommandResult> {
  const projectRoot = process.cwd();
  const runId = readRunId({ ...parsed, positionals: ["attach", parsed.positionals[2] ?? "latest"] });
  const record = await readCompileRecord(projectRoot, runId);
  let loop = await readLoopOrCreateFromRecord(projectRoot, parsed, record);
  const report = await writeReport(createParsed(["report"], { run: record.run.runId }));
  const installResult = record.installResult ?? await readInstallResultIfAvailable(projectRoot, record.run.runId);
  const latestRecord = await readCompileRecord(projectRoot, record.run.runId);
  const iteration = await createLoopIterationFromRecord({
    projectRoot,
    loop,
    record: latestRecord,
    report,
    installRecorded: installResult !== null,
    command: readOptionalStringFlag(parsed, "command") ?? undefined
  });

  loop = {
    ...loop,
    updatedAt: iteration.createdAt,
    target: loop.target === "unknown" ? latestRecord.contract.target.engine : loop.target,
    assetId: loop.assetId ?? latestRecord.contract.id,
    mediaKind: loop.mediaKind ?? loopMediaKindFromRecord(latestRecord),
    sourcePath: loop.sourcePath ?? latestRecord.contract.sourcePath,
    status: iteration.status === "ready_for_wiring" ? "ready_for_wiring" : "needs_action",
    latestRunId: latestRecord.run.runId,
    iterations: [...loop.iterations, iteration]
  };

  await persistLoop(projectRoot, loop);
  await persistLoopTask(projectRoot, loop, latestRecord);

  return {
    ok: true,
    operation: "loop.attach",
    loop,
    iteration,
    taskPath: loop.paths.latestTask,
    summaryPath: loop.paths.latestSummary
  };
}

async function statusLoop(parsed: ParsedFlags): Promise<LoopStatusCommandResult> {
  const projectRoot = process.cwd();
  const loop = await readLoop(projectRoot, readLoopId(parsed));
  const latestIteration = loop.iterations.at(-1) ?? null;
  return {
    ok: true,
    operation: "loop.status",
    loop,
    latestIteration,
    nextActions: latestIteration?.nextActions ?? [
      "Attach a run with openrender loop attach --run latest --json after compile/verify/report.",
      "Do not request asset regeneration from model providers inside this loop."
    ]
  };
}

async function taskLoop(parsed: ParsedFlags): Promise<LoopTaskCommandResult> {
  const projectRoot = process.cwd();
  const loop = await readLoop(projectRoot, readLoopId(parsed));
  let content: string;
  try {
    content = await fs.readFile(resolveInsideProject(projectRoot, loop.paths.latestTask), "utf8");
  } catch {
    const record = loop.latestRunId ? await readCompileRecord(projectRoot, loop.latestRunId) : null;
    content = await persistLoopTask(projectRoot, loop, record);
  }

  return {
    ok: true,
    operation: "loop.task",
    loopId: loop.loopId,
    path: loop.paths.latestTask,
    content
  };
}

async function readLoopOrCreateFromRecord(
  projectRoot: string,
  parsed: ParsedFlags,
  record: OpenRenderCompileRecord
): Promise<OpenRenderLoopRecord> {
  try {
    return await readLoop(projectRoot, readLoopId(parsed));
  } catch {
    const now = new Date();
    const loop = createInitialLoopRecord({
      loopId: createLoopId(now),
      goal: readOptionalStringFlag(parsed, "goal") ?? `Continue ${record.contract.id} handoff`,
      target: record.contract.target.engine,
      assetId: record.contract.id,
      mediaKind: loopMediaKindFromRecord(record),
      sourcePath: record.contract.sourcePath,
      date: now
    });
    await persistLoop(projectRoot, loop);
    return loop;
  }
}

function createInitialLoopRecord(input: {
  loopId: string;
  goal: string;
  target: TargetEngine | "unknown";
  assetId?: string;
  mediaKind?: OpenRenderLoopRecord["mediaKind"];
  sourcePath?: string;
  date: Date;
}): OpenRenderLoopRecord {
  const createdAt = input.date.toISOString();
  const loopPath = path.posix.join(".openrender", "loops", input.loopId, "loop.json");
  return {
    schemaVersion: CLI_VERSION,
    loopId: input.loopId,
    createdAt,
    updatedAt: createdAt,
    goal: input.goal,
    target: input.target,
    assetId: input.assetId,
    mediaKind: input.mediaKind,
    sourcePath: input.sourcePath,
    status: "created",
    iterations: [],
    paths: {
      loop: loopPath,
      latest: ".openrender/loops/latest.json",
      latestTask: path.posix.join(".openrender", "loops", input.loopId, "latest-agent-task.md"),
      latestSummary: path.posix.join(".openrender", "loops", input.loopId, "latest-compact-summary.json")
    },
    boundary: {
      assetRegeneration: false,
      modelProviderCalls: false,
      gameCodePatching: false,
      remoteDownload: false
    },
    localOnly: true
  };
}

function createLoopId(date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.(\d{3})Z$/, "$1Z");
  return `loop_${stamp}`;
}

async function persistLoop(projectRoot: string, loop: OpenRenderLoopRecord): Promise<void> {
  await safeWriteProjectFile({
    projectRoot,
    relativePath: loop.paths.loop,
    contents: `${JSON.stringify(loop, null, 2)}\n`,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: loop.paths.latest,
    contents: `${JSON.stringify(loop, null, 2)}\n`,
    allowOverwrite: true
  });
  await safeWriteProjectFile({
    projectRoot,
    relativePath: loop.paths.latestSummary,
    contents: `${JSON.stringify(compactLoopRecord(loop), null, 2)}\n`,
    allowOverwrite: true
  });
}

async function readLoop(projectRoot: string, loopId: string): Promise<OpenRenderLoopRecord> {
  const relativePath = loopId === "latest"
    ? ".openrender/loops/latest.json"
    : path.posix.join(".openrender", "loops", loopId, "loop.json");
  return JSON.parse(await fs.readFile(resolveInsideProject(projectRoot, relativePath), "utf8")) as OpenRenderLoopRecord;
}

async function readLatestLoopSummary(projectRoot: string): Promise<CompactLoopRecord | null> {
  try {
    const loop = await readLoop(projectRoot, "latest");
    return compactLoopRecord(loop);
  } catch {
    return null;
  }
}

function readLoopId(parsed: ParsedFlags): string {
  const value = parsed.flags.get("loop");
  if (typeof value === "string") return value;
  return parsed.positionals[2] ?? "latest";
}

function readOptionalTargetFlag(parsed: ParsedFlags): TargetEngine | undefined {
  const value = parsed.flags.get("target");
  if (value === undefined || value === false) return undefined;
  return readTargetFlag(parsed, "phaser");
}

function readLoopMediaKind(parsed: ParsedFlags): OpenRenderLoopRecord["mediaKind"] | undefined {
  const value = readOptionalStringFlag(parsed, "media") ?? readOptionalStringFlag(parsed, "kind");
  if (value === undefined) return undefined;
  if (value === "sprite" || value === "animation" || value === "audio" || value === "atlas" || value === "ui" || value === "asset") return value;
  throw new Error(`Unsupported loop media kind: ${value}`);
}

function readLoopRunMediaKind(parsed: ParsedFlags): "sprite" | "animation" | "audio" | "atlas" | "ui" {
  const value = parsed.positionals[2];
  if (value === "sprite" || value === "animation" || value === "audio" || value === "atlas" || value === "ui") return value;
  throw new Error("loop run requires sprite, animation, audio, atlas, or ui.");
}

function assertLoopDoesNotRequestRegeneration(parsed: ParsedFlags): void {
  const forbidden = ["prompt", "model", "provider", "api-key", "regenerate", "redraw", "reprompt", "download"];
  const used = forbidden.filter((flag) => parsed.flags.has(flag));
  if (used.length > 0) {
    throw new Error(`openRender loops do not call model providers or regenerate assets. Remove ${used.map((flag) => `--${flag}`).join(", ")}.`);
  }
}

function createLoopRunCommandSummary(mediaKind: string, parsed: ParsedFlags): string {
  const id = readOptionalStringFlag(parsed, "id");
  const source = readOptionalStringFlag(parsed, "from") ?? readOptionalStringFlag(parsed, "input");
  const target = readOptionalStringFlag(parsed, "target");
  return [
    "openrender",
    "loop",
    "run",
    mediaKind,
    ...(source ? ["--from", source] : []),
    ...(target ? ["--target", target] : []),
    ...(id ? ["--id", id] : [])
  ].join(" ");
}

function loopMediaKindFromRecord(record: OpenRenderCompileRecord): NonNullable<OpenRenderLoopRecord["mediaKind"]> {
  if (isAnimationCompileRecord(record)) return "animation";
  if (isSpriteCompileRecord(record)) return "sprite";
  if (record.contract.mediaType.startsWith("audio.")) return "audio";
  if (record.contract.mediaType === "visual.atlas" || record.contract.mediaType === "visual.tileset") return "atlas";
  return "ui";
}

async function createLoopIterationFromRecord(input: {
  projectRoot: string;
  loop: OpenRenderLoopRecord;
  record: OpenRenderCompileRecord;
  report: ReportCommandResult;
  installRecorded: boolean;
  command?: string;
}): Promise<OpenRenderLoopIteration> {
  const { record, report, installRecorded } = input;
  const failureSummary = createLoopFailureSummary(record);
  const status = createLoopIterationStatus(record, installRecorded);
  return {
    iteration: input.loop.iterations.length + 1,
    createdAt: new Date().toISOString(),
    runId: record.run.runId,
    command: input.command,
    status,
    verification: record.run.verification?.status ?? null,
    reportPath: report.htmlPath,
    summary: createAgentSummary(record),
    failureSummary,
    nextActions: report.nextActions,
    rollbackCommand: report.rollbackCommand
  };
}

function createLoopIterationStatus(record: OpenRenderCompileRecord, installRecorded: boolean): LoopIterationStatus {
  if (
    record.run.verification?.status === "failed" ||
    (isSpriteCompileRecord(record) && record.validation?.ok === false) ||
    (!isSpriteCompileRecord(record) && record.validation.status === "failed")
  ) {
    return "failed";
  }
  if (record.run.verification?.status === "warning" || !installRecorded) return "needs_action";
  if (record.run.verification?.status === "passed" && installRecorded) return "ready_for_wiring";
  return "recorded";
}

function createLoopFailureSummary(record: OpenRenderCompileRecord): string | null {
  const nextActionText = createNextActionText(record);
  if (!nextActionText) return null;
  const firstLine = nextActionText.split("\n").find((line) => line.startsWith("Failure:") || line.startsWith("Warning:"));
  return firstLine ?? null;
}

async function persistLoopTask(
  projectRoot: string,
  loop: OpenRenderLoopRecord,
  latestRecord: OpenRenderCompileRecord | null
): Promise<string> {
  const content = await createLoopTaskMarkdown(projectRoot, loop, latestRecord);
  await safeWriteProjectFile({
    projectRoot,
    relativePath: loop.paths.latestTask,
    contents: content,
    allowOverwrite: true
  });
  return content;
}

async function createLoopTaskMarkdown(
  projectRoot: string,
  loop: OpenRenderLoopRecord,
  latestRecord: OpenRenderCompileRecord | null
): Promise<string> {
  const latestIteration = loop.iterations.at(-1) ?? null;
  const scan = await scanProject(projectRoot);
  const wireMap = latestRecord ? await createWireMap(scan, latestRecord) : null;
  const helperPath = latestRecord?.outputPlan.codegenPath ?? null;
  const manifestPath = latestRecord?.outputPlan.manifestPath ?? null;
  const assetPath = latestRecord?.outputPlan.assetPath ?? null;
  const sections = [
    "# openRender Agent Loop Task",
    "",
    `Goal: ${loop.goal}`,
    `Loop: ${loop.loopId}`,
    `Status: ${loop.status}`,
    `Target: ${loop.target}`,
    `Asset: ${loop.assetId ?? latestRecord?.contract.id ?? "unknown"}`,
    "",
    "Boundary:",
    "- Do not call model provider APIs.",
    "- Do not regenerate, redraw, re-prompt, scrape, or download source assets.",
    "- Do not patch game code automatically through openRender.",
    "- Work only from existing source media, generated helper files, reports, and wire-map candidates.",
    "",
    "Latest run:",
    latestRecord
      ? [
          `- runId: ${latestRecord.run.runId}`,
          `- mediaType: ${latestRecord.contract.mediaType}`,
          `- verification: ${latestRecord.run.verification?.status ?? "not_run"}`,
          `- assetPath: ${assetPath ?? "n/a"}`,
          `- helperPath: ${helperPath ?? "n/a"}`,
          `- manifestPath: ${manifestPath ?? "n/a"}`,
          `- report: ${latestIteration?.reportPath ?? ".openrender/reports/latest.html"}`,
          `- rollback: ${latestIteration?.rollbackCommand ?? "not_available"}`
        ].join("\n")
      : "- No run attached yet.",
    "",
    ...(latestRecord ? ["Engine packet:", ...createEngineLoopPacket(latestRecord).map((line) => `- ${line}`), ""] : []),
    "Next actions:",
    ...(latestIteration?.nextActions.length
      ? latestIteration.nextActions.map((action) => `- ${action}`)
      : ["- Run compile/verify/report, then attach the run with openrender loop attach --run latest --json."]),
    "",
    ...(wireMap
      ? [
          "Read-only wire map:",
          ...(wireMap.latestAsset
            ? [
                `- latest asset path: ${wireMap.latestAsset.assetPath}`,
                `- latest load path: ${wireMap.latestAsset.loadPath}`,
                `- latest helper path: ${wireMap.latestAsset.helperPath ?? "n/a"}`
              ]
            : []),
          ...wireMap.candidates.slice(0, 5).map((candidate) => `- ${candidate.file}: ${candidate.suggestedAction}`),
          ""
        ]
      : []),
    "Recovery:",
    `- If this handoff is wrong, use ${latestIteration?.rollbackCommand ?? "openrender rollback --run <runId> --json after an install exists"}.`
  ];

  return `${sections.join("\n")}\n`;
}

function createEngineLoopPacket(record: OpenRenderCompileRecord): string[] {
  const target = record.contract.target.engine;
  const helper = record.outputPlan.codegenPath ?? "generated helper path not available";
  const manifest = record.outputPlan.manifestPath ?? "generated manifest path not available";
  const asset = record.outputPlan.assetPath;
  const loadPath = record.outputPlan.loadPath;

  if (target === "phaser") {
    return [
      `Use ${helper} from a Phaser Scene module.`,
      `Preload ${loadPath} in preload() and register the animation/helper in create().`,
      "Keep Arcade/body sizing edits in game code; openRender only provides helper and wire-map evidence."
    ];
  }
  if (target === "godot") {
    return [
      `Use ${helper} and ${manifest} from GDScript.`,
      `Load ${loadPath} after Godot imports the source asset.`,
      "Do not create .import or .godot cache files from openRender."
    ];
  }
  if (target === "love2d") {
    return [
      `Require ${helper} from main.lua or the target scene module.`,
      `Load ${loadPath} through love.graphics.newImage or love.audio.newSource as appropriate.`,
      "Keep update/draw integration in game code; openRender only records the helper path and rollback boundary."
    ];
  }
  if (target === "unity") {
    return [
      `Use ${helper} and ${manifest} from Unity C# scripts under Assets/OpenRender.`,
      `Reference ${asset} after Unity imports it into the Assets database.`,
      "Do not write .meta, Library, scene, prefab, or component changes through openRender."
    ];
  }
  if (target === "pixi") {
    return [
      `Import ${helper} from the Vite source tree.`,
      `Load ${loadPath} with Pixi Assets.load before constructing sprites or AnimatedSprite helpers.`,
      "Keep render-loop and container placement in game code."
    ];
  }
  if (target === "three") {
    return [
      `Import ${helper} from the Vite source tree.`,
      `Load ${loadPath} through TextureLoader or the generated sprite/plane helper.`,
      "Keep camera, scene, material, and animation-loop placement in game code."
    ];
  }
  return [
    `Import ${helper} from the Vite source tree.`,
    `Load ${loadPath} with Image, Audio, fetch, or createImageBitmap depending on media type.`,
    "Keep draw/update placement in game code."
  ];
}

function createParsed(positionals: string[], flags: Record<string, string | boolean | undefined> = {}): ParsedFlags {
  const map = new Map<string, string | boolean>();
  for (const [key, value] of Object.entries(flags)) {
    if (value !== undefined) map.set(key, value);
  }
  return { positionals, flags: map };
}

interface CompactLoopRecord {
  loopId: string;
  goal: string;
  target: OpenRenderLoopRecord["target"];
  status: LoopStatus;
  latestRunId: string | null;
  iterations: number;
  latestTaskPath: string;
  modelProviderCalls: false;
  assetRegeneration: false;
}

function compactLoopRecord(loop: OpenRenderLoopRecord): CompactLoopRecord {
  return {
    loopId: loop.loopId,
    goal: loop.goal,
    target: loop.target,
    status: loop.status,
    latestRunId: loop.latestRunId ?? null,
    iterations: loop.iterations.length,
    latestTaskPath: loop.paths.latestTask,
    modelProviderCalls: false,
    assetRegeneration: false
  };
}

function compactLoopResult(result: LoopCommandResult): unknown {
  if (result.operation === "loop.task") {
    return {
      ok: result.ok,
      operation: result.operation,
      loopId: result.loopId,
      path: result.path
    };
  }
  return {
    ok: result.ok,
    operation: result.operation,
    loop: compactLoopRecord(result.loop),
    ...("iteration" in result ? { iteration: result.iteration } : {}),
    ...("lifecycle" in result ? { lifecycle: result.lifecycle } : {}),
    ...("nextActions" in result ? { nextActions: result.nextActions } : {}),
    ...("taskPath" in result ? { taskPath: result.taskPath } : {})
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
    latestLoop: result.latestLoop,
    references: result.references.slice(0, 3),
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

function compactDetectMotionResult(result: DetectMotionCommandResult): CompactDetectMotionResult {
  return {
    ok: result.ok,
    code: result.ok ? undefined : result.code,
    sourceType: result.sourceType,
    recommendation: result.suggested
      ? {
          fps: result.suggested.fps,
          frames: result.suggested.frames,
          layout: result.suggested.layout,
          loop: result.suggested.loop
        }
      : null,
    diagnostics: result.diagnostics,
    runtime: result.runtime,
    nextActions: result.nextActions
  };
}

function compactCompileAnimationResult(result: CompileAnimationResult): CompactCompileAnimationResult {
  return {
    ok: result.validation.status !== "failed",
    runId: result.run.runId,
    assetId: result.contract.id,
    target: result.contract.target.engine,
    mediaType: result.contract.mediaType,
    motion: result.motion,
    assetPath: result.outputPlan.assetPath,
    helperPath: result.outputPlan.codegenPath ?? null,
    rollbackCommand: result.installResult ? `openrender rollback --run ${result.run.runId} --json` : null,
    tables: {
      installPlan: {
        columns: ["kind", "action", "to"],
        rows: result.installPlan.files.map((file) => [file.kind, file.action, file.to])
      },
      checks: createVerificationCheckTable(result.validation.checks)
    },
    nextActions: createSuccessNextActions(result)
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
    throw new Error(`Unknown schema: ${normalized}. Use contract, output, report, install-plan, pack-manifest, or media.`);
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

async function ingestReference(parsed: ParsedFlags): Promise<IngestReferenceCommandResult> {
  const projectRoot = process.cwd();
  const role = readReferenceRole(parsed);
  const intent = requireStringFlag(parsed, "intent");
  const notes = readOptionalStringFlag(parsed, "notes");
  const urlValue = parsed.flags.get("url");
  const fromValue = parsed.flags.get("from");
  if (typeof urlValue !== "string" && typeof fromValue !== "string") {
    throw new Error("Missing reference source: pass --url or --from.");
  }
  if (typeof urlValue === "string" && typeof fromValue === "string") {
    throw new Error("Reference ingest accepts either --url or --from, not both.");
  }

  const createdAt = new Date().toISOString();
  const referenceId = `ref_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}_${role}`;
  let record: VisualReferenceRecord;

  if (typeof urlValue === "string") {
    const url = new URL(urlValue);
    record = {
      schemaVersion: OPENRENDER_DEVKIT_VERSION,
      referenceId,
      createdAt,
      role,
      intent,
      ...(notes ? { notes } : {}),
      source: {
        kind: "url",
        url: url.toString(),
        downloaded: false
      },
      localOnly: true
    };
  } else if (typeof fromValue === "string") {
    const absolutePath = resolveInsideProject(projectRoot, fromValue);
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) throw new Error(`Reference --from must point to a file: ${fromValue}`);
    const bytes = await fs.readFile(absolutePath);
    record = {
      schemaVersion: OPENRENDER_DEVKIT_VERSION,
      referenceId,
      createdAt,
      role,
      intent,
      ...(notes ? { notes } : {}),
      source: {
        kind: "local_file",
        path: path.relative(projectRoot, absolutePath),
        bytes: stat.size,
        hash: createHash("sha256").update(bytes).digest("hex")
      },
      localOnly: true
    };
  } else {
    throw new Error("Missing reference source: pass --url or --from.");
  }

  const relativePath = path.posix.join(".openrender", "references", `${referenceId}.json`);
  await safeWriteProjectFile({
    projectRoot,
    relativePath,
    contents: `${JSON.stringify(record, null, 2)}\n`,
    allowOverwrite: false
  });

  return {
    ok: true,
    referenceId,
    path: relativePath,
    role,
    source: record.source,
    summary: `${role} reference recorded for agent context; remote URLs were not downloaded.`,
    nextActions: [
      "Run openrender context --json --compact to show the latest reference summary.",
      "Use the reference intent when choosing compile or animation settings."
    ],
    localOnly: true
  };
}

async function readReferenceSummaries(projectRoot: string): Promise<ReferenceSummary[]> {
  const referenceRoot = resolveInsideProject(projectRoot, ".openrender/references");
  if (!await pathExists(referenceRoot)) return [];
  let entries: string[];
  try {
    entries = await fs.readdir(referenceRoot);
  } catch {
    return [];
  }

  const summaries: ReferenceSummary[] = [];
  for (const entry of entries.filter((name) => name.endsWith(".json")).sort().reverse().slice(0, 12)) {
    try {
      const record = JSON.parse(await fs.readFile(path.join(referenceRoot, entry), "utf8")) as VisualReferenceRecord;
      summaries.push({
        referenceId: record.referenceId,
        createdAt: record.createdAt,
        role: record.role,
        intent: record.intent,
        source: record.source.kind === "url" ? record.source.url : record.source.path,
        sourceKind: record.source.kind,
        downloaded: record.source.kind === "url" ? record.source.downloaded : false,
        notes: record.notes
      });
    } catch {
      continue;
    }
  }

  return summaries;
}

function readReferenceRole(parsed: ParsedFlags): VisualReferenceRole {
  const value = readStringFlag(parsed, "role", "style");
  if (
    value === "mechanic" ||
    value === "style" ||
    value === "layout" ||
    value === "logic" ||
    value === "motion" ||
    value === "mood" ||
    value === "character" ||
    value === "environment"
  ) {
    return value;
  }
  throw new Error(`Unsupported reference role: ${value}`);
}

async function createAgentContext(options: { includeWireMap?: boolean } = {}): Promise<AgentContextCommandResult> {
  const projectRoot = process.cwd();
  const scan = await scanProject(projectRoot);
  const latestRun = await readLatestRunSummary(projectRoot);
  const latestLoop = await readLatestLoopSummary(projectRoot);
  const latestRecord = options.includeWireMap ? await readLatestCompileRecordIfAvailable(projectRoot) : null;
  const references = await readReferenceSummaries(projectRoot);
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
    recommendedNextActions.add("Run openrender init --target <engine> --json after choosing phaser, godot, love2d, pixi, canvas, three, or unity.");
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
    latestLoop,
    references,
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

async function readLatestCompileRecordIfAvailable(projectRoot: string): Promise<OpenRenderCompileRecord | null> {
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

async function createWireMap(scan: ProjectScan, latestRecord: OpenRenderCompileRecord | null = null): Promise<WireMapResult> {
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
  } else if (scan.engine === "unity") {
    if (await pathExists(path.join(projectRoot, "ProjectSettings", "ProjectVersion.txt"))) {
      candidates.push({
        file: "ProjectSettings/ProjectVersion.txt",
        kind: "config",
        signals: ["unity_project"],
        suggestedAction: "Use generated Assets/OpenRender C# helpers after Unity imports the source assets."
      });
    }
    const files = await listProjectTextFiles(projectRoot, ["Assets"], [".cs", ".unity", ".prefab"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const signals = collectSignals(contents, [
        ["mono_behaviour", /MonoBehaviour/],
        ["sprite_renderer", /SpriteRenderer|UnityEngine\.UI\.Image|\bImage\b/],
        ["audio_source", /AudioSource/],
        ["resources_load", /Resources\.Load/],
        ["addressables", /Addressables/],
        ["scene_yaml", /%YAML|!u!1 &|m_GameObject/],
        ["prefab_yaml", /PrefabInstance|m_SourcePrefab/]
      ]);
      if (signals.length > 0) {
        candidates.push({
          file,
          kind: file.endsWith(".cs") ? "script" : "scene",
          signals,
          suggestedAction: file.endsWith(".cs")
            ? "Reference generated OpenRender C# manifest or helper constants from this MonoBehaviour."
            : "Inspect this Unity scene/prefab in the editor and wire generated Assets/OpenRender assets manually."
        });
      }
    }
  } else if (scan.engine === "three") {
    const files = await listProjectTextFiles(projectRoot, ["src"], [".ts", ".tsx", ".js", ".jsx"]);
    for (const file of files) {
      const contents = await readSmallTextFile(resolveInsideProject(projectRoot, file));
      const signals = collectSignals(contents, [
        ["three_scene", /new\s+Scene|THREE\.Scene/],
        ["three_renderer", /WebGLRenderer|THREE\.WebGLRenderer/],
        ["three_texture_loader", /TextureLoader|loadAsync\s*\(/],
        ["three_sprite", /SpriteMaterial|new\s+Sprite/],
        ["three_mesh", /PlaneGeometry|MeshBasicMaterial|new\s+Mesh/]
      ]);
      if (signals.length > 0) {
        candidates.push({
          file,
          kind: "entry",
          signals,
          suggestedAction: "Use generated Three.js TextureLoader, Sprite, or Plane helpers near the detected scene setup."
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

function createWireMapLatestAsset(record: OpenRenderCompileRecord): WireMapLatestAsset {
  return {
    assetId: record.contract.id,
    mediaType: record.contract.mediaType,
    engine: record.contract.target.engine,
    assetPath: record.outputPlan.assetPath,
    loadPath: record.outputPlan.loadPath,
    manifestPath: record.outputPlan.manifestPath,
    helperPath: record.outputPlan.codegenPath ?? null,
    manifestModule: createManifestModuleName(record),
    runId: record.run.runId,
    suggestedUse: createWireMapSuggestedUse(record),
    snippets: createWireMapSnippets(record)
  };
}

function createWireMapSuggestedUse(record: OpenRenderCompileRecord): string {
  if (isAnimationCompileRecord(record)) {
    return `Connect ${record.motion.frames} frame(s) at ${record.motion.fps} fps using the generated helper; openRender does not patch engine code.`;
  }
  if (isP4CompileRecord(record)) {
    return `Load the installed ${record.contract.mediaType} through the generated media manifest.`;
  }
  return record.contract.mediaType === "visual.sprite_frame_set"
    ? "Use the generated frame helper near the target engine preload/create or render loop."
    : "Use the generated manifest load path where the target engine creates sprites.";
}

function createManifestModuleName(record: OpenRenderCompileRecord): string {
  const manifestPath = record.outputPlan.manifestPath;
  if (record.contract.target.engine === "love2d") {
    return manifestPath.replace(/\.lua$/, "").replace(/\//g, ".");
  }
  if (record.contract.target.engine === "godot") {
    return `res://${manifestPath}`;
  }
  if (record.contract.target.engine === "unity") {
    return "OpenRender";
  }
  return manifestPath.replace(/^src\//, "@/").replace(/\.[tj]s$/, "");
}

function createWireMapSnippets(record: OpenRenderCompileRecord): WireMapLatestAsset["snippets"] {
  const assetId = record.contract.id;
  const loadPath = record.outputPlan.loadPath;
  const manifestModule = createManifestModuleName(record);
  const codegenPath = record.outputPlan.codegenPath;
  const viteManifestExport = isP4CompileRecord(record) ? "openRenderMediaAssets" : "openRenderAssets";
  const p4EntryPath = isP4CompileRecord(record) ? "path" : "url";

  if (record.contract.target.engine === "love2d") {
    return [
      {
        label: isP4CompileRecord(record) ? "LOVE2D media manifest example" : "LOVE2D manifest load example",
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
        label: isP4CompileRecord(record) ? "Godot media manifest preload example" : "Godot manifest preload example",
        language: "gdscript",
        code: [
          `const OpenRenderAssets = preload(${JSON.stringify(manifestModule)})`,
          `var asset := OpenRenderAssets.get_asset(${JSON.stringify(assetId)})`,
          `var texture := load(asset.get("path", ${JSON.stringify(loadPath)}))`
        ].join("\n")
      }
    ];
  }

  if (record.contract.target.engine === "unity") {
    const className = codegenPath && !isP4CompileRecord(record)
      ? `${assetIdToPascalCase(assetId)}Sprites`
      : isP4CompileRecord(record)
        ? `${assetIdToPascalCase(assetId)}Media`
        : "OpenRenderAssets";
    return [
      {
        label: isP4CompileRecord(record) ? "Unity media manifest example" : "Unity manifest example",
        language: "csharp",
        code: [
          "using OpenRender;",
          "",
          `var asset = ${isP4CompileRecord(record) ? "OpenRenderMediaAssets" : "OpenRenderAssets"}.Find(${JSON.stringify(assetId)});`,
          `var path = asset != null ? asset.Path : ${JSON.stringify(loadPath)};`,
          `// ${className} is generated under Assets/OpenRender; attach it from your own MonoBehaviour.`
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
          `import { ${viteManifestExport} } from ${JSON.stringify(manifestModule)};`,
          `const asset = ${viteManifestExport}[${JSON.stringify(assetId)}];`,
          "preload() {",
          `  this.load.image(${JSON.stringify(assetId)}, asset.${p4EntryPath});`,
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
          `import { ${viteManifestExport} } from ${JSON.stringify(manifestModule)};`,
          `const asset = ${viteManifestExport}[${JSON.stringify(assetId)}];`,
          `await Assets.load(asset.${p4EntryPath});`
        ].join("\n")
      }
    ];
  }

  if (record.contract.target.engine === "three") {
    return [
      {
        label: "Three.js texture helper example",
        language: "ts",
        code: [
          "import { Sprite, SpriteMaterial, TextureLoader } from \"three\";",
          `import { ${viteManifestExport} } from ${JSON.stringify(manifestModule)};`,
          `const asset = ${viteManifestExport}[${JSON.stringify(assetId)}];`,
          "const texture = await new TextureLoader().loadAsync(asset.url);",
          "const material = new SpriteMaterial({ map: texture, transparent: true });",
          "scene.add(new Sprite(material));"
        ].join("\n")
      },
      ...(codegenPath && !isP4CompileRecord(record)
        ? [{
            label: "Three.js generated helper example",
            language: "ts",
            code: `import { load${assetIdToPascalCase(assetId)}Texture, create${assetIdToPascalCase(assetId)}Sprite, create${assetIdToPascalCase(assetId)}Plane } from ${JSON.stringify(codegenPath.replace(/^src\//, "@/").replace(/\.ts$/, ""))};`
          }]
        : [])
    ];
  }

  return [
    {
      label: "Canvas image load example",
      language: "ts",
      code: [
        `import { ${viteManifestExport} } from ${JSON.stringify(manifestModule)};`,
        `const asset = ${viteManifestExport}[${JSON.stringify(assetId)}];`,
        "const image = new Image();",
        `image.src = asset.${p4EntryPath};`
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
- Supported targets in 0.9.2: phaser, godot, love2d, pixi, canvas, three, unity.
- Media commands support audio, atlas/tileset, and UI assets through the same local install, verify, report, and rollback pipeline.
`;

  if (agent === "codex") return { relativePath: "AGENTS.md", contents: body };
  if (agent === "cursor") return { relativePath: ".cursor/rules/openrender.md", contents: body };
  return { relativePath: ".claude/openrender.md", contents: body };
}

async function createAdapterScaffold(parsed: ParsedFlags): Promise<AdapterCreateCommandResult> {
  const projectRoot = process.cwd();
  const name = requireStringFlag(parsed, "name");
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("--name must use lowercase letters, numbers, and dashes.");
  if (["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"].includes(name)) {
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

function assetIdToCamelCaseLocal(value: string): string {
  const pascal = assetIdToPascalCase(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

function normalizeProjectRelativePathLocal(value: string): string {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Path must stay inside the project: ${value}`);
  }
  return normalized;
}

function toLuaLiteral(value: unknown): string {
  if (value === null) return "nil";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return `{ ${value.map((entry) => toLuaLiteral(entry)).join(", ")} }`;
  }
  if (typeof value === "object") {
    return `{ ${Object.entries(value as Record<string, unknown>).map(([key, entry]) => `[${JSON.stringify(key)}] = ${toLuaLiteral(entry)}`).join(", ")} }`;
  }
  return "nil";
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

async function compileP4Media(
  kind: "audio" | "atlas" | "ui",
  parsed: ParsedFlags
): Promise<CompileP4Result> {
  const projectRoot = process.cwd();
  const sourcePath = resolveInsideProject(projectRoot, requireSourcePathFlag(parsed));
  const sourcePathRelative = path.relative(projectRoot, sourcePath);
  const id = requireStringFlag(parsed, "id");
  const target = readTargetFlag(parsed, "phaser");
  const framework = readFrameworkFlag(parsed, defaultFrameworkForTarget(target));
  assertTargetFrameworkPair(target, framework);
  const assetRoot = readStringFlag(parsed, "asset-root", defaultAssetRootForTarget(target));
  const dryRun = parsed.flags.get("dry-run") === true;
  const manifestStrategy = readManifestStrategyFlag(parsed);
  const metadata = await inspectP4Metadata(kind, sourcePath, sourcePathRelative, parsed);
  const contract = createP4Contract({
    kind,
    id,
    sourcePath: sourcePathRelative,
    target,
    framework,
    projectRoot,
    assetRoot,
    parsed,
    metadata
  });
  const contractValidation = validateMediaContract(contract);
  if (!contractValidation.ok) {
    throw new Error(`Invalid media contract: ${contractValidation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  }

  const descriptor = createP4AssetDescriptor(contract);
  const run = createInitialRun({ id, mediaType: contract.mediaType });
  const artifactPath = path.posix.join(".openrender", "artifacts", run.runId, path.posix.basename(descriptor.assetPath));
  let installPlan = createP4InstallPlan({
    contract,
    descriptor,
    compiledAssetPath: artifactPath
  });
  const manifestPlan = await applyP4ManifestStrategy({
    projectRoot,
    contract,
    descriptor,
    installPlan,
    strategy: manifestStrategy,
    runId: run.runId
  });
  installPlan = manifestPlan.installPlan;
  const generatedSources = manifestPlan.generatedSources;
  const manifest = manifestPlan.manifest;
  let artifact: CompileP4Result["artifact"];

  run.status = dryRun ? "harness_ready" : "completed";
  run.outputs = [
    { kind: "compiled_asset", path: artifactPath },
    ...(manifest.strategy === "isolated" ? [] : [{ kind: "manifest" as const, path: descriptor.manifestPath }]),
    ...(descriptor.codegenPath ? [{ kind: "codegen" as const, path: descriptor.codegenPath }] : [])
  ];

  if (!dryRun) {
    const absoluteArtifactPath = resolveInsideProject(projectRoot, artifactPath);
    await fs.mkdir(path.dirname(absoluteArtifactPath), { recursive: true });
    await fs.copyFile(sourcePath, absoluteArtifactPath);
    artifact = {
      path: artifactPath,
      metadata: metadata.kind === "audio"
        ? { bytes: metadata.bytes, outputFormat: metadata.outputFormat }
        : {
            width: metadata.width,
            height: metadata.height,
            format: "png",
            bytes: metadata.bytes
          }
    };
  }

  const validation = createP4Validation({
    contract,
    metadata,
    artifactPath,
    artifactExists: !dryRun
  });
  run.verification = validation;
  if (validation.status === "failed") {
    run.status = "failed_verify";
  }

  const result: CompileP4Result = {
    dryRun,
    projectRoot,
    input: metadata,
    contract,
    outputPlan: descriptor,
    installPlan,
    artifact,
    processing: {
      pipeline: "p4-media",
      copiedSource: !dryRun,
      manifestStrategy
    },
    recipe: createCoreRecipeReference(contract.mediaType),
    agentSummary: createCompileP4AgentSummary({
      contract,
      installPlan,
      dryRun,
      installedWrites: 0,
      validationOk: validation.status !== "failed"
    }),
    generatedSources,
    manifest,
    validation,
    run
  };

  if (!dryRun) {
    await writeCompileRecord(projectRoot, result);
  }

  if (!dryRun && parsed.flags.get("install") === true && validation.status !== "failed") {
    result.installResult = await installCompiledRecord({
      projectRoot,
      record: result,
      force: parsed.flags.get("force") === true
    });
    result.agentSummary = createCompileP4AgentSummary({
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

async function inspectP4Metadata(
  kind: "audio" | "atlas" | "ui",
  sourcePath: string,
  sourcePathRelative: string,
  parsed: ParsedFlags
): Promise<P4InputMetadata> {
  const stat = await fs.stat(sourcePath);

  if (kind === "audio") {
    const outputFormat = readAudioFormat(sourcePath);
    return {
      kind,
      sourcePath: sourcePathRelative,
      bytes: stat.size,
      outputFormat,
      loop: parsed.flags.get("loop") === true || parsed.flags.get("music-loop") === true || outputFormat === "ogg"
    };
  }

  const image = await loadImageMetadata(sourcePath);
  if (kind === "atlas") {
    const tileSize = readOptionalSizeFlag(parsed, "tile-size") ?? { width: 16, height: 16 };
    return {
      kind,
      sourcePath: sourcePathRelative,
      bytes: stat.size,
      width: image.width,
      height: image.height,
      tileWidth: tileSize.width,
      tileHeight: tileSize.height,
      columns: Math.floor(image.width / tileSize.width),
      rows: Math.floor(image.height / tileSize.height),
      outputFormat: "png"
    };
  }

  const states = readStringFlag(parsed, "states", "default").split(",").map((state) => state.trim()).filter(Boolean);
  return {
    kind,
    sourcePath: sourcePathRelative,
    bytes: stat.size,
    width: image.width,
    height: image.height,
    states,
    outputFormat: "png"
  };
}

function createP4Contract(input: {
  kind: "audio" | "atlas" | "ui";
  id: string;
  sourcePath: string;
  target: TargetEngine;
  framework: TargetFramework;
  projectRoot: string;
  assetRoot: string;
  parsed: ParsedFlags;
  metadata: P4InputMetadata;
}): P4CompileContract {
  const base = {
    schemaVersion: OPENRENDER_DEVKIT_VERSION,
    sourcePath: input.sourcePath,
    target: {
      engine: input.target,
      framework: input.framework,
      projectRoot: input.projectRoot
    },
    id: input.id,
    install: {
      enabled: input.parsed.flags.get("install") === true,
      assetRoot: input.assetRoot,
      writeManifest: true,
      writeCodegen: true,
      snapshotBeforeInstall: true
    },
    verify: {
      preview: input.kind !== "audio",
      checkFrameCount: false,
      checkLoadPath: true
    }
  } as const;

  if (input.kind === "audio" && input.metadata.kind === "audio") {
    const requested = readStringFlag(input.parsed, "media-type", input.parsed.flags.get("music-loop") === true ? "audio.music_loop" : "audio.sound_effect");
    const mediaType = requested === "audio.music_loop" || requested === "audio.sound_effect" ? requested : "audio.sound_effect";
    return {
      ...base,
      mediaType,
      audio: {
        loop: mediaType === "audio.music_loop" || input.metadata.loop,
        outputFormat: input.metadata.outputFormat
      }
    };
  }

  if (input.kind === "atlas" && input.metadata.kind === "atlas") {
    const requested = readStringFlag(input.parsed, "media-type", input.parsed.flags.get("tileset") === true ? "visual.tileset" : "visual.atlas");
    const mediaType = requested === "visual.tileset" || requested === "visual.atlas" ? requested : "visual.atlas";
    return {
      ...base,
      mediaType,
      visual: {
        tileWidth: input.metadata.tileWidth,
        tileHeight: input.metadata.tileHeight,
        columns: input.metadata.columns,
        rows: input.metadata.rows,
        outputFormat: "png"
      }
    };
  }

  if (input.kind === "ui" && input.metadata.kind === "ui") {
    const requested = readStringFlag(input.parsed, "media-type", "visual.ui_button");
    const mediaType =
      requested === "visual.ui_panel" || requested === "visual.icon_set" || requested === "visual.ui_button"
        ? requested
        : "visual.ui_button";
    return {
      ...base,
      mediaType,
      ui: {
        states: input.metadata.states,
        outputFormat: "png"
      }
    };
  }

  throw new Error(`Media metadata mismatch for ${input.kind}.`);
}

function createP4AssetDescriptor(contract: P4CompileContract): P4AssetDescriptor {
  const assetRoot = normalizeProjectRelativePathLocal(contract.install.assetRoot);
  const fileStem = assetIdToKebabCaseLocal(contract.id);
  const extension =
    contract.mediaType === "audio.sound_effect" || contract.mediaType === "audio.music_loop"
      ? contract.audio.outputFormat
      : "png";
  const assetPath = path.posix.join(assetRoot, `${fileStem}.${extension}`);
  const loadPath = contract.target.engine === "godot"
    ? `res://${assetPath}`
    : contract.target.engine === "love2d"
      ? assetPath
      : contract.target.engine === "unity"
        ? assetPath
      : assetPath.startsWith("public/")
        ? `/${assetPath.slice("public/".length)}`
        : `/${assetPath}`;
  const sourceRoot = contract.target.engine === "godot"
    ? "scripts/openrender"
    : contract.target.engine === "love2d"
      ? "openrender"
      : contract.target.engine === "unity"
        ? "Assets/OpenRender"
      : "src";
  const helperRoot = contract.target.engine === "godot"
    ? "scripts/openrender"
    : contract.target.engine === "love2d"
      ? "openrender"
      : contract.target.engine === "unity"
        ? "Assets/OpenRender"
      : "src/openrender";
  const helperExt = contract.target.engine === "godot"
    ? "gd"
    : contract.target.engine === "love2d"
      ? "lua"
      : contract.target.engine === "unity"
        ? "cs"
      : "ts";
  const manifestPath = contract.target.engine === "godot"
    ? path.posix.join(sourceRoot, "openrender_media_assets.gd")
    : contract.target.engine === "love2d"
      ? path.posix.join(sourceRoot, "openrender_media_assets.lua")
      : contract.target.engine === "unity"
        ? path.posix.join(sourceRoot, "OpenRenderMediaAssets.cs")
      : path.posix.join(sourceRoot, "assets", "openrender-media-manifest.ts");
  const codegenPath = contract.install.writeCodegen
    ? path.posix.join(helperRoot, "media", `${fileStem}.${helperExt}`)
    : null;

  return {
    id: contract.id,
    engine: contract.target.engine,
    mediaType: contract.mediaType,
    assetPath,
    loadPath,
    manifestPath,
    codegenPath
  };
}

function createP4InstallPlan(input: {
  contract: P4CompileContract;
  descriptor: P4AssetDescriptor;
  compiledAssetPath: string;
}): P4InstallPlan {
  const files: P4InstallPlanFile[] = [
    {
      kind: "compiled_asset",
      action: "copy",
      from: input.compiledAssetPath,
      to: input.descriptor.assetPath
    }
  ];

  if (input.contract.install.writeManifest) {
    files.push({
      kind: "manifest",
      action: "write",
      to: input.descriptor.manifestPath,
      contents: generateP4ManifestSource(input.contract.target.engine, [input.contract])
    });
  }

  if (input.descriptor.codegenPath) {
    files.push({
      kind: "codegen",
      action: "write",
      to: input.descriptor.codegenPath,
      contents: generateP4HelperSource(input.contract, input.descriptor)
    });
  }

  return {
    id: input.contract.id,
    enabled: input.contract.install.enabled,
    files
  };
}

async function applyP4ManifestStrategy(input: {
  projectRoot: string;
  contract: P4CompileContract;
  descriptor: P4AssetDescriptor;
  installPlan: P4InstallPlan;
  strategy: ManifestStrategy;
  runId: string;
}): Promise<{
  installPlan: P4InstallPlan;
  generatedSources: CompileP4Result["generatedSources"];
  manifest: ManifestStrategyResult;
}> {
  const generatedSources = createP4GeneratedSources(input.contract, input.descriptor);
  const state = await readManifestState(input.projectRoot, input.contract.target.engine, input.descriptor.manifestPath);
  const previousEntries = state?.entries ?? {};
  const previousEntry = previousEntries[input.contract.id];
  const previousCount = Object.keys(previousEntries).length;
  const statePath = createManifestStateRelativePath(input.contract.target.engine, input.descriptor.manifestPath);

  if (input.strategy === "isolated") {
    return {
      installPlan: patchP4InstallPlanManifest(input.installPlan, input.descriptor.manifestPath, {
        strategy: "isolated"
      }),
      generatedSources,
      manifest: {
        strategy: input.strategy,
        manifestPath: input.descriptor.manifestPath,
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
    .filter(isP4CompileContract)
    .sort((left, right) => left.id.localeCompare(right.id));
  const manifestSource = generateP4ManifestSource(input.contract.target.engine, contracts);
  const entryChange: ManifestEntryChange = input.strategy === "replace"
    ? (previousEntry ? "replaced" : "added")
    : (previousEntry ? "updated" : "added");
  const removedEntryIds = input.strategy === "replace"
    ? Object.keys(previousEntries).filter((entryId) => entryId !== input.contract.id)
    : [];

  return {
    installPlan: patchP4InstallPlanManifest(input.installPlan, input.descriptor.manifestPath, {
      strategy: input.strategy,
      contents: manifestSource
    }),
    generatedSources: {
      ...generatedSources,
      manifest: manifestSource
    },
    manifest: {
      strategy: input.strategy,
      manifestPath: input.descriptor.manifestPath,
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

function patchP4InstallPlanManifest(
  installPlan: P4InstallPlan,
  manifestPath: string,
  input: { strategy: ManifestStrategy; contents?: string }
): P4InstallPlan {
  return {
    ...installPlan,
    files: installPlan.files
      .filter((file) => input.strategy !== "isolated" || file.to !== manifestPath)
      .map((file) => {
        if (file.kind !== "manifest" || file.to !== manifestPath || input.contents === undefined) return file;
        return {
          ...file,
          contents: input.contents
        };
      })
  };
}

function createP4GeneratedSources(
  contract: P4CompileContract,
  descriptor: P4AssetDescriptor
): CompileP4Result["generatedSources"] {
  return {
    manifest: generateP4ManifestSource(contract.target.engine, [contract]),
    helper: descriptor.codegenPath ? generateP4HelperSource(contract, descriptor) : undefined
  };
}

function generateP4ManifestSource(target: TargetEngine, contracts: P4CompileContract[]): string {
  const entries = Object.fromEntries(contracts.map((contract) => {
    const descriptor = createP4AssetDescriptor(contract);
    return [contract.id, createP4ManifestEntry(contract, descriptor)];
  }));

  if (target === "godot") {
    return `extends RefCounted

const OPENRENDER_MEDIA_ASSETS := ${JSON.stringify(entries, null, 2)}

static func get_asset(asset_id: String) -> Dictionary:
  return OPENRENDER_MEDIA_ASSETS.get(asset_id, {})
`;
  }

  if (target === "love2d") {
    return `local assets = ${toLuaLiteral(entries)}

return assets
`;
  }

  if (target === "unity") {
    return `namespace OpenRender
{
  public sealed class MediaAssetInfo
  {
    public string Id;
    public string MediaType;
    public string Path;
    public string AssetPath;
    public bool Loop;
    public string OutputFormat;
    public int TileWidth;
    public int TileHeight;
    public int Columns;
    public int Rows;
    public string[] States;
  }

  public static class OpenRenderMediaAssets
  {
    public static readonly MediaAssetInfo[] All = new MediaAssetInfo[]
    {
${contracts.map((contract) => createP4UnityManifestEntry(contract, createP4AssetDescriptor(contract))).join(",\n")}
    };

    public static MediaAssetInfo Find(string id)
    {
      for (var index = 0; index < All.Length; index++)
      {
        if (All[index].Id == id) return All[index];
      }

      return null;
    }
  }
}
`;
  }

  return `export const openRenderMediaAssets = ${JSON.stringify(entries, null, 2)} as const;

export type OpenRenderMediaAssetId = keyof typeof openRenderMediaAssets;
`;
}

function createP4UnityManifestEntry(contract: P4CompileContract, descriptor: P4AssetDescriptor): string {
  const base = [
    `Id = ${JSON.stringify(contract.id)}`,
    `MediaType = ${JSON.stringify(contract.mediaType)}`,
    `Path = ${JSON.stringify(descriptor.loadPath)}`,
    `AssetPath = ${JSON.stringify(descriptor.assetPath)}`
  ];

  if (contract.mediaType === "audio.sound_effect" || contract.mediaType === "audio.music_loop") {
    base.push(`Loop = ${contract.audio.loop ? "true" : "false"}`);
    base.push(`OutputFormat = ${JSON.stringify(contract.audio.outputFormat)}`);
  } else if (contract.mediaType === "visual.atlas" || contract.mediaType === "visual.tileset") {
    base.push(`TileWidth = ${contract.visual.tileWidth}`);
    base.push(`TileHeight = ${contract.visual.tileHeight}`);
    base.push(`Columns = ${contract.visual.columns}`);
    base.push(`Rows = ${contract.visual.rows}`);
    base.push(`OutputFormat = ${JSON.stringify(contract.visual.outputFormat)}`);
  } else if (contract.mediaType === "visual.ui_button" || contract.mediaType === "visual.ui_panel" || contract.mediaType === "visual.icon_set") {
    base.push(`States = new string[] { ${contract.ui.states.map((state) => JSON.stringify(state)).join(", ")} }`);
    base.push(`OutputFormat = ${JSON.stringify(contract.ui.outputFormat)}`);
  }

  return `      new MediaAssetInfo { ${base.join(", ")} }`;
}

function createP4ManifestEntry(contract: P4CompileContract, descriptor: P4AssetDescriptor): Record<string, unknown> {
  const base = {
    mediaType: contract.mediaType,
    engine: contract.target.engine,
    path: descriptor.loadPath,
    assetPath: descriptor.assetPath
  };

  if (contract.mediaType === "audio.sound_effect" || contract.mediaType === "audio.music_loop") {
    return {
      ...base,
      loop: contract.audio.loop,
      outputFormat: contract.audio.outputFormat
    };
  }

  if (contract.mediaType === "visual.atlas" || contract.mediaType === "visual.tileset") {
    return {
      ...base,
      tileWidth: contract.visual.tileWidth,
      tileHeight: contract.visual.tileHeight,
      columns: contract.visual.columns,
      rows: contract.visual.rows,
      outputFormat: contract.visual.outputFormat
    };
  }

  if (contract.mediaType === "visual.ui_button" || contract.mediaType === "visual.ui_panel" || contract.mediaType === "visual.icon_set") {
    return {
      ...base,
      states: contract.ui.states,
      outputFormat: contract.ui.outputFormat
    };
  }

  return base;
}

function generateP4HelperSource(contract: P4CompileContract, descriptor: P4AssetDescriptor): string {
  const symbolName = assetIdToCamelCaseLocal(contract.id);
  const entry = createP4ManifestEntry(contract, descriptor);

  if (contract.target.engine === "godot") {
    return `const ${symbolName.toUpperCase()} = ${JSON.stringify(entry, null, 2)}

func get_asset():
  return ${symbolName.toUpperCase()}
`;
  }

  if (contract.target.engine === "love2d") {
    return `local M = {}

M.asset = ${toLuaLiteral(entry)}

return M
`;
  }

  if (contract.target.engine === "unity") {
    const className = `${assetIdToPascalCase(contract.id)}Media`;
    return `namespace OpenRender
{
  public static class ${className}
  {
    public static readonly MediaAssetInfo Asset = new MediaAssetInfo
    {
${createP4UnityHelperBody(contract, descriptor)}
    };

    public static MediaAssetInfo GetAsset()
    {
      return Asset;
    }
  }
}
`;
  }

  return `export const ${symbolName}Asset = ${JSON.stringify(entry, null, 2)} as const;

export function get${assetIdToPascalCase(contract.id)}Asset() {
  return ${symbolName}Asset;
}
`;
}

function createP4UnityHelperBody(contract: P4CompileContract, descriptor: P4AssetDescriptor): string {
  const linePrefix = "      ";
  const lines = [
    `Id = ${JSON.stringify(contract.id)}`,
    `MediaType = ${JSON.stringify(contract.mediaType)}`,
    `Path = ${JSON.stringify(descriptor.loadPath)}`,
    `AssetPath = ${JSON.stringify(descriptor.assetPath)}`
  ];

  if (contract.mediaType === "audio.sound_effect" || contract.mediaType === "audio.music_loop") {
    lines.push(`Loop = ${contract.audio.loop ? "true" : "false"}`);
    lines.push(`OutputFormat = ${JSON.stringify(contract.audio.outputFormat)}`);
  } else if (contract.mediaType === "visual.atlas" || contract.mediaType === "visual.tileset") {
    lines.push(`TileWidth = ${contract.visual.tileWidth}`);
    lines.push(`TileHeight = ${contract.visual.tileHeight}`);
    lines.push(`Columns = ${contract.visual.columns}`);
    lines.push(`Rows = ${contract.visual.rows}`);
    lines.push(`OutputFormat = ${JSON.stringify(contract.visual.outputFormat)}`);
  } else if (contract.mediaType === "visual.ui_button" || contract.mediaType === "visual.ui_panel" || contract.mediaType === "visual.icon_set") {
    lines.push(`States = new string[] { ${contract.ui.states.map((state) => JSON.stringify(state)).join(", ")} }`);
    lines.push(`OutputFormat = ${JSON.stringify(contract.ui.outputFormat)}`);
  }

  return lines.map((line, index) => `${linePrefix}${line}${index === lines.length - 1 ? "" : ","}`).join("\n");
}

function createP4Validation(input: {
  contract: P4CompileContract;
  metadata: P4InputMetadata;
  artifactPath: string;
  artifactExists: boolean;
}): P4ValidationResult {
  const checks: P4ValidationResult["checks"] = [
    {
      name: "p4_contract_pipeline",
      status: "passed",
      path: input.contract.sourcePath,
      message: `${input.contract.mediaType} uses compile/install/verify/report/rollback pipeline`
    },
    {
      name: "compiled_artifact_ready",
      status: input.artifactExists ? "passed" : "skipped",
      path: input.artifactPath,
      message: input.artifactExists ? "artifact was copied from local source" : "dry-run only"
    }
  ];

  if (input.contract.mediaType === "audio.sound_effect" || input.contract.mediaType === "audio.music_loop") {
    checks.push({
      name: "audio_format_supported",
      status: ["wav", "ogg", "mp3"].includes(input.contract.audio.outputFormat) ? "passed" : "failed",
      path: input.contract.sourcePath,
      message: input.contract.audio.outputFormat
    });
  }

  if ((input.contract.mediaType === "visual.atlas" || input.contract.mediaType === "visual.tileset") && input.metadata.kind === "atlas") {
    const divisible = input.metadata.width % input.metadata.tileWidth === 0 && input.metadata.height % input.metadata.tileHeight === 0;
    checks.push({
      name: "atlas_tile_grid_divisible",
      status: divisible ? "passed" : "failed",
      path: input.contract.sourcePath,
      message: `${input.metadata.width}x${input.metadata.height} / ${input.metadata.tileWidth}x${input.metadata.tileHeight}`
    });
  }

  if ((input.contract.mediaType === "visual.ui_button" || input.contract.mediaType === "visual.ui_panel" || input.contract.mediaType === "visual.icon_set") && input.metadata.kind === "ui") {
    checks.push({
      name: "ui_states_declared",
      status: input.metadata.states.length > 0 ? "passed" : "failed",
      path: input.contract.sourcePath,
      message: input.metadata.states.join(",")
    });
  }

  return {
    status: createVerificationStatus(checks),
    checks
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
        writeCodegen: target === "three",
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

async function writeCompileRecord(projectRoot: string, result: OpenRenderCompileRecord, allowOverwrite = false): Promise<void> {
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

function readOptionalNumberFlag(parsed: ParsedFlags, name: string): number | undefined {
  const value = parsed.flags.get(name);
  if (value === undefined || value === false) return undefined;
  if (typeof value !== "string") throw new Error(`--${name} requires a number.`);
  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) throw new Error(`--${name} must be a non-negative number.`);
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
    .filter(isSpriteCompileContract)
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
  if (target === "three") return generateThreeManifestSource(contracts);
  if (target === "unity") return generateUnityManifestSource(contracts);
  throw new Error(`Unsupported manifest target: ${target}`);
}

function createManifestStateEntry(
  contract: MediaContract,
  descriptor: ManifestStateDescriptor,
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

async function writeManifestStateFromRecord(projectRoot: string, record: OpenRenderCompileRecord): Promise<void> {
  if (!record.manifest || record.manifest.strategy === "isolated") return;

  const state = await readManifestState(projectRoot, record.contract.target.engine, record.manifest.manifestPath);
  const entries = record.manifest.strategy === "merge"
    ? { ...(state?.entries ?? {}) }
    : {};
  entries[record.contract.id] = createManifestStateEntry(getManifestContractForRecord(record), record.outputPlan, record.run.runId);

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

function getManifestContractForRecord(record: OpenRenderCompileRecord): MediaContract {
  return isAnimationCompileRecord(record) ? record.adapterContract : record.contract;
}

function createManifestStateRelativePath(target: TargetEngine, manifestPath: string): string {
  const normalizedManifestPath = manifestPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "manifest";
  return path.posix.join(".openrender", "manifest-state", `${target}-${normalizedManifestPath}.json`);
}

function isLoadPathValid(outputPlan: EngineAssetDescriptor | P4AssetDescriptor): boolean {
  if ("mediaType" in outputPlan) {
    const extensionOk = /\.(png|wav|ogg|mp3)$/.test(outputPlan.loadPath);
    if (outputPlan.engine === "godot") return extensionOk && outputPlan.loadPath.startsWith("res://");
    if (outputPlan.engine === "love2d") return extensionOk && !outputPlan.loadPath.startsWith("/") && !outputPlan.loadPath.includes("..");
    if (outputPlan.engine === "unity") return extensionOk && outputPlan.loadPath.startsWith("Assets/") && !outputPlan.loadPath.includes("..");
    return extensionOk && outputPlan.loadPath.startsWith("/");
  }
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

function isMotionCompileContract(contract: MediaContract): contract is MotionCompileContract {
  return (
    contract.mediaType === "visual.animation_clip" ||
    contract.mediaType === "visual.sprite_sequence" ||
    contract.mediaType === "visual.effect_loop" ||
    contract.mediaType === "visual.ui_motion" ||
    contract.mediaType === "visual.reference_video"
  );
}

function isSpriteCompileContract(contract: MediaContract): contract is SpriteCompileContract {
  return contract.mediaType === "visual.transparent_sprite" || contract.mediaType === "visual.sprite_frame_set";
}

function isP4CompileContract(contract: MediaContract): contract is P4CompileContract {
  return !isSpriteCompileContract(contract) && !isMotionCompileContract(contract);
}

function isSpriteCompileRecord(record: OpenRenderCompileRecord): record is CompileSpriteResult {
  return isSpriteCompileContract(record.contract);
}

function isP4CompileRecord(record: OpenRenderCompileRecord): record is CompileP4Result {
  return isP4CompileContract(record.contract);
}

function isAnimationCompileRecord(record: OpenRenderCompileRecord): record is CompileAnimationResult {
  return isMotionCompileContract(record.contract);
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
  record: OpenRenderCompileRecord;
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

function canOverwriteWithoutForce(record: OpenRenderCompileRecord, file: OpenRenderInstallPlanFile): boolean {
  if (!record.manifest || record.manifest.strategy !== "merge") return false;
  if (file.kind === "manifest" && file.to === record.manifest.manifestPath) return true;
  if (file.kind === "compiled_asset" && record.manifest.entryChange === "updated") return true;
  return false;
}

async function readCompileRecord(projectRoot: string, runId: string): Promise<OpenRenderCompileRecord> {
  const recordPath = runId === "latest"
    ? ".openrender/runs/latest.json"
    : path.posix.join(".openrender", "runs", `${runId}.json`);
  const record = JSON.parse(
    await fs.readFile(resolveInsideProject(projectRoot, recordPath), "utf8")
  ) as OpenRenderCompileRecord;
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
    const installedAssetAbsolutePath = resolveInsideProject(projectRoot, installedAsset.to);
    if (isSpriteCompileRecord(record) || isAnimationCompileRecord(record)) {
      visualSource = {
        relativePath: installedAsset.to,
        absolutePath: installedAssetAbsolutePath
      };
      const metadata = await loadImageMetadata(installedAssetAbsolutePath);
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
    } else if (record.contract.mediaType.startsWith("audio.")) {
      const stat = await fs.stat(installedAssetAbsolutePath);
      checks.push({
        name: "installed_audio_bytes",
        status: stat.size > 0 && stat.size === record.input.bytes ? "passed" : "failed",
        path: installedAsset.to,
        message: `${stat.size} bytes`
      });
    } else {
      const metadata = await loadImageMetadata(installedAssetAbsolutePath);
      const inputMetadata = record.input.kind === "audio" ? null : record.input;
      checks.push({
        name: "installed_media_dimensions",
        status:
          inputMetadata !== null &&
          metadata.width === inputMetadata.width &&
          metadata.height === inputMetadata.height
            ? "passed"
            : "failed",
        path: installedAsset.to,
        message: `${metadata.width}x${metadata.height}`
      });
    }
  } else if (artifactPath && artifactExists) {
    if (isSpriteCompileRecord(record) || isAnimationCompileRecord(record)) {
      visualSource = {
        relativePath: artifactPath,
        absolutePath: resolveInsideProject(projectRoot, artifactPath)
      };
    }
  }

  checks.push({
    name: "engine_load_path_shape",
    status: isLoadPathValid(record.outputPlan) ? "passed" : "failed",
    path: record.outputPlan.loadPath ?? ("publicUrl" in record.outputPlan ? record.outputPlan.publicUrl : undefined),
    message: record.outputPlan.engine
  });
  checks.push(...await createEngineReadinessChecks(record, projectRoot));

  if (isP4CompileRecord(record)) {
    const p4Validation = createP4Validation({
      contract: record.contract,
      metadata: record.input,
      artifactPath: artifactPath ?? record.outputPlan.assetPath,
      artifactExists
    });
    checks.push(...p4Validation.checks.filter((check) => check.name !== "compiled_artifact_ready"));
  }

  if (isAnimationCompileRecord(record)) {
    const motionValidation = createMotionValidation({
      contract: record.contract,
      artifactPath: artifactPath ?? record.outputPlan.assetPath,
      artifactExists,
      frameSlices: record.frameSlices,
      diagnostics: record.motion.diagnostics,
      dryRun: record.dryRun
    });
    checks.push(...motionValidation.checks.filter((check) => check.name !== "motion_compiled_artifact_ready"));
  }

  let visualQuality: VisualQualityResult | undefined;
  if (visualSource && isSpriteCompileRecord(record)) {
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
  if (isSpriteCompileRecord(record)) {
    record.visualQuality = visualQuality ?? record.visualQuality;
    record.qualityGate = createQualityGateResult({
      quality,
      validation: record.validation,
      invariants: record.invariants,
      visualQuality: record.visualQuality
    });
  } else if (isAnimationCompileRecord(record)) {
    record.validation = createMotionValidation({
      contract: record.contract,
      artifactPath: artifactPath ?? record.outputPlan.assetPath,
      artifactExists,
      frameSlices: record.frameSlices,
      diagnostics: record.motion.diagnostics,
      dryRun: record.dryRun
    });
  } else {
    record.validation = {
      status: result.status,
      checks: result.checks.filter((check) => check.name.startsWith("p4_") || check.name === "atlas_tile_grid_divisible" || check.name === "ui_states_declared" || check.name === "audio_format_supported")
    };
  }
  await writeCompileRecord(projectRoot, record, true);

  return result;
}

function createVerificationStatus(checks: VerifyCommandResult["checks"]): VerificationStatus {
  if (checks.some((check) => check.status === "failed")) return "failed";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "passed";
}

async function createEngineReadinessChecks(
  record: OpenRenderCompileRecord,
  projectRoot: string
): Promise<VerifyCommandResult["checks"]> {
  const checks: VerifyCommandResult["checks"] = [];
  const target = record.contract.target.engine;
  const manifestFile = record.installPlan.files.find((file) => file.kind === "manifest");
  const codegenFile = record.installPlan.files.find((file) => file.kind === "codegen");

  if (manifestFile) {
    checks.push({
      name: "engine_manifest_path_shape",
      status: manifestPathMatchesTarget(target, manifestFile.to) ? "passed" : "failed",
      path: manifestFile.to,
      message: target
    });
  }

  if (codegenFile) {
    checks.push({
      name: "engine_helper_path_shape",
      status: helperPathMatchesTarget(target, codegenFile.to) ? "passed" : "failed",
      path: codegenFile.to,
      message: target
    });
  }

  if (target === "phaser") {
    checks.push({
      name: "phaser_loader_path_ready",
      status: record.outputPlan.loadPath.startsWith("/") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "static Vite public URL can be passed to Phaser loader"
    });
  } else if (target === "pixi") {
    checks.push({
      name: "pixi_asset_load_path_ready",
      status: record.outputPlan.loadPath.startsWith("/") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "static Vite public URL can be passed to Pixi Assets.load"
    });
  } else if (target === "canvas") {
    checks.push({
      name: "canvas_media_load_path_ready",
      status: record.outputPlan.loadPath.startsWith("/") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "static Vite public URL can be used by Image, Audio, fetch, or createImageBitmap"
    });
  } else if (target === "three") {
    checks.push({
      name: "three_texture_load_path_ready",
      status: record.outputPlan.loadPath.startsWith("/") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "static Vite public URL can be passed to Three.js TextureLoader"
    });
  } else if (target === "godot") {
    const projectFileExists = await pathExists(resolveInsideProject(projectRoot, "project.godot"));
    checks.push({
      name: "godot_project_file_detected",
      status: projectFileExists ? "passed" : "skipped",
      path: "project.godot",
      message: projectFileExists ? "Godot project file found" : "project.godot not present in fixture"
    });
    checks.push({
      name: "godot_import_cache_boundary",
      status: "passed",
      path: record.outputPlan.assetPath,
      message: "openRender installs source assets only; Godot owns .import and .godot cache generation"
    });
  } else if (target === "love2d") {
    const hasMain = await pathExists(resolveInsideProject(projectRoot, "main.lua"));
    const hasConf = await pathExists(resolveInsideProject(projectRoot, "conf.lua"));
    checks.push({
      name: "love2d_entry_file_detected",
      status: hasMain || hasConf ? "passed" : "skipped",
      path: hasMain ? "main.lua" : "conf.lua",
      message: hasMain || hasConf ? "LOVE2D entry/config file found" : "main.lua or conf.lua not present in fixture"
    });
    checks.push({
      name: "love2d_relative_load_path_ready",
      status: !record.outputPlan.loadPath.startsWith("/") && !record.outputPlan.loadPath.includes("..") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "path can be passed to love.graphics.newImage or love.audio.newSource"
    });
  } else if (target === "unity") {
    const hasAssets = await pathExists(resolveInsideProject(projectRoot, "Assets"));
    const hasProjectVersion = await pathExists(resolveInsideProject(projectRoot, "ProjectSettings/ProjectVersion.txt"));
    const hasProjectSettings = await pathExists(resolveInsideProject(projectRoot, "ProjectSettings/ProjectSettings.asset"));
    checks.push({
      name: "unity_project_layout_detected",
      status: hasAssets && (hasProjectVersion || hasProjectSettings) ? "passed" : "skipped",
      path: hasProjectVersion ? "ProjectSettings/ProjectVersion.txt" : "ProjectSettings/ProjectSettings.asset",
      message: hasAssets && (hasProjectVersion || hasProjectSettings)
        ? "Unity Assets and ProjectSettings folders found"
        : "Unity project layout not present in fixture"
    });
    checks.push({
      name: "unity_asset_path_ready",
      status: record.outputPlan.loadPath.startsWith("Assets/") && !record.outputPlan.loadPath.includes("..") ? "passed" : "failed",
      path: record.outputPlan.loadPath,
      message: "Unity project-relative Assets path can be used by generated C# metadata"
    });
    checks.push({
      name: "unity_import_cache_boundary",
      status: "passed",
      path: record.outputPlan.assetPath,
      message: "openRender installs source assets and C# helpers only; Unity owns .meta and Library import generation"
    });
  }

  return checks;
}

function manifestPathMatchesTarget(target: TargetEngine, manifestPath: string): boolean {
  if (target === "godot") return manifestPath.startsWith("scripts/openrender/") && manifestPath.endsWith(".gd");
  if (target === "love2d") return manifestPath.startsWith("openrender/") && manifestPath.endsWith(".lua");
  if (target === "unity") return manifestPath.startsWith("Assets/OpenRender/") && manifestPath.endsWith(".cs");
  return manifestPath.startsWith("src/assets/") && manifestPath.endsWith(".ts");
}

function helperPathMatchesTarget(target: TargetEngine, helperPath: string): boolean {
  if (target === "godot") return helperPath.startsWith("scripts/openrender/") && helperPath.endsWith(".gd");
  if (target === "love2d") return helperPath.startsWith("openrender/") && helperPath.endsWith(".lua");
  if (target === "unity") return helperPath.startsWith("Assets/OpenRender/") && helperPath.endsWith(".cs");
  return helperPath.startsWith("src/openrender/") && helperPath.endsWith(".ts");
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
      ...(isSpriteCompileRecord(record) && record.background ? [{ heading: "Background Policy", body: createBackgroundReportText(record) }] : []),
      ...(isAnimationCompileRecord(record) ? [{ heading: "Motion Summary", body: JSON.stringify(record.motion, null, 2) }] : []),
      { heading: "Agent Summary", body: record.agentSummary },
      { heading: "Core Recipe", body: JSON.stringify(record.recipe, null, 2) },
      ...(framePreviewPath ? [{ heading: "Frame Preview Sheet", body: framePreviewPath }] : []),
      ...(visualOverlayHtml ? [{ heading: "Visual Overlay", trustedHtml: visualOverlayHtml }] : []),
      ...(isSpriteCompileRecord(record) && record.visualQuality ? [{ heading: "Visual Quality", body: JSON.stringify(record.visualQuality, null, 2) }] : []),
      ...(isSpriteCompileRecord(record) && record.qualityGate ? [{ heading: "Quality Gate", body: JSON.stringify(record.qualityGate, null, 2) }] : []),
      { heading: "Install Plan", body: JSON.stringify(record.installPlan, null, 2) },
      ...(record.manifest ? [{ heading: "Manifest Strategy", body: JSON.stringify(record.manifest, null, 2) }] : []),
      { heading: "Validation", body: JSON.stringify(record.validation ?? null, null, 2) },
      { heading: "Run Verification", body: JSON.stringify(record.run.verification ?? null, null, 2) },
      ...(isP4CompileRecord(record)
        ? [{
            heading: "Media Asset Pipeline",
            body: "Audio, atlas/tileset, and UI assets use the same local compile/install/verify/report/rollback pipeline as sprite assets. openRender installs files and helper metadata only; game code remains read-only until the developer or agent wires the generated paths."
          }]
        : []),
      ...(isAnimationCompileRecord(record)
        ? [{
            heading: "Animation Runtime Integration",
            body: "openRender installs an animation spritesheet plus target-shaped manifest/helper files. It stops before game-code patching: use the helper path, frame slices, and wire-map suggestions to connect the asset in the engine."
          }]
        : []),
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
      ...(record.contract.target.engine === "three"
        ? [{
            heading: "Three.js Load Note",
            body: "openRender installs source PNG assets plus TypeScript manifest and helper files for Three.js. Use the generated TextureLoader, Sprite, or Plane helpers from your own scene setup; openRender does not modify scene, renderer, camera, or animation-loop code."
          }]
        : []),
      ...(record.contract.target.engine === "unity"
        ? [{
            heading: "Unity Import Note",
            body: "openRender installs source assets and C# helper classes under Assets/OpenRender only. Unity owns .meta files, Library imports, scene references, prefabs, and component wiring."
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
    visualQuality: isSpriteCompileRecord(record) ? record.visualQuality : undefined,
    qualityGate: isSpriteCompileRecord(record) ? record.qualityGate : undefined,
    manifest: record.manifest,
    background: isSpriteCompileRecord(record) ? record.background : undefined
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

function createPreviewAssetUrl(record: OpenRenderCompileRecord): string | undefined {
  if (isP4CompileRecord(record) && record.contract.mediaType.startsWith("audio.")) return undefined;
  if ("publicUrl" in record.outputPlan) return record.outputPlan.publicUrl;

  const artifactPath = record.run.outputs.find((output) => output.kind === "compiled_asset")?.path;
  if (!artifactPath) return undefined;
  return path.posix.relative(".openrender/previews", artifactPath);
}

function createVisualOverlayHtml(record: OpenRenderCompileRecord): string | null {
  if (!isSpriteCompileRecord(record) && !isAnimationCompileRecord(record)) return null;
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

function createNextActionText(record: OpenRenderCompileRecord): string | null {
  if (isSpriteCompileRecord(record) && record.validation?.ok === false) {
    return [
      `Failure: ${record.validation.reason ?? "frame validation failed"}`,
      "",
      "Suggested next action:",
      ...createFrameValidationSuggestions(record).map((suggestion) => `- ${suggestion}`)
    ].join("\n");
  }

  if (isP4CompileRecord(record) && record.validation.status === "failed") {
    const failedChecks = record.validation.checks.filter((check) => check.status === "failed");
    return [
      "Failure: media validation failed",
      "",
      "Failed checks:",
      ...failedChecks.map((check) => `- ${check.name}${check.path ? `: ${check.path}` : ""}`),
      "",
      "Suggested next action:",
      ...createVerifySuggestions(record, failedChecks).map((suggestion) => `- ${suggestion}`)
    ].join("\n");
  }

  if (isAnimationCompileRecord(record) && record.validation.status === "failed") {
    const failedChecks = record.validation.checks.filter((check) => check.status === "failed");
    return [
      "Failure: animation validation failed",
      "",
      "Failed checks:",
      ...failedChecks.map((check) => `- ${check.name}${check.path ? `: ${check.path}` : ""}`),
      "",
      "Suggested next action:",
      ...createVerifySuggestions(record, failedChecks).map((suggestion) => `- ${suggestion}`)
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

  if (isSpriteCompileRecord(record) && (record.qualityGate?.status === "warning" || record.run.verification?.status === "warning")) {
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

function createAgentSummary(record: OpenRenderCompileRecord): string {
  const target = record.contract.target.engine;
  const asset = record.contract.id;
  const installed = record.installResult
    ? `Installed ${asset} for ${target} and wrote ${record.installResult.writes.length} file(s).`
    : `Prepared ${asset} for ${target} with ${record.installPlan.files.length} planned file(s).`;
  const report = record.run.outputs.find((output) => output.kind === "report")?.path ?? ".openrender/reports/latest.html";
  const background = isSpriteCompileRecord(record) && record.background ? `${createBackgroundSummary(record)} ` : "";
  const media = isP4CompileRecord(record) ? `${record.contract.mediaType} ` : "";
  const motion = isAnimationCompileRecord(record) ? "animation " : "";
  return `${installed} ${background}Review ${report} before wiring ${motion}${media}asset code.`;
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
  const normalizedMediaType =
    mediaType === "audio.music_loop"
      ? "audio.sound_effect"
      : isMotionMediaTypeValue(mediaType)
        ? "visual.animation_clip"
      : mediaType === "visual.tileset"
        ? "visual.atlas"
        : mediaType === "visual.ui_panel" || mediaType === "visual.icon_set"
          ? "visual.ui_button"
          : mediaType;
  const recipe = CORE_RECIPES.find((candidate) => candidate.mediaType === normalizedMediaType);
  if (!recipe) throw new Error(`No built-in core recipe for ${mediaType}.`);

  return {
    packId: recipe.packId,
    packVersion: CLI_VERSION,
    recipeId: recipe.id,
    localOnly: true
  };
}

function isMotionMediaTypeValue(mediaType: MediaContract["mediaType"]): boolean {
  return (
    mediaType === "visual.animation_clip" ||
    mediaType === "visual.sprite_sequence" ||
    mediaType === "visual.effect_loop" ||
    mediaType === "visual.ui_motion" ||
    mediaType === "visual.reference_video"
  );
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

function createCompileP4AgentSummary(input: {
  contract: P4CompileContract;
  installPlan: P4InstallPlan;
  dryRun: boolean;
  installedWrites: number;
  validationOk: boolean;
}): string {
  if (!input.validationOk) {
    return `Blocked ${input.contract.id} for ${input.contract.target.engine}; fix media metadata before installing.`;
  }

  if (input.dryRun) {
    return `Planned ${input.contract.mediaType} ${input.contract.id} for ${input.contract.target.engine}; review ${input.installPlan.files.length} file(s) before install.`;
  }

  if (input.installedWrites > 0) {
    return `Installed ${input.contract.mediaType} ${input.contract.id} for ${input.contract.target.engine}; wrote ${input.installedWrites} file(s) with rollback available.`;
  }

  return `Compiled ${input.contract.mediaType} ${input.contract.id} for ${input.contract.target.engine}; install when the plan is acceptable.`;
}

function createCompileAnimationAgentSummary(input: {
  contract: MotionCompileContract;
  installPlan: EngineInstallPlan;
  dryRun: boolean;
  installedWrites: number;
  validationOk: boolean;
}): string {
  if (!input.validationOk) {
    return `Blocked animation ${input.contract.id} for ${input.contract.target.engine}; inspect motion diagnostics before installing.`;
  }

  if (input.dryRun) {
    return `Planned animation ${input.contract.id} for ${input.contract.target.engine}; review ${input.installPlan.files.length} file(s), helper path, and frame slices before install.`;
  }

  if (input.installedWrites > 0) {
    return `Installed animation ${input.contract.id} for ${input.contract.target.engine}; wrote ${input.installedWrites} file(s) with rollback available.`;
  }

  return `Compiled animation ${input.contract.id} for ${input.contract.target.engine}; install when the plan is acceptable.`;
}

function createSuccessNextActions(record: OpenRenderCompileRecord): string[] {
  const actions = [
    `Use asset path ${record.outputPlan.assetPath}.`,
    `Inspect ${record.run.runId} with openrender report --run ${record.run.runId} --json.`
  ];
  if (isSpriteCompileRecord(record) && record.background) {
    actions.unshift(createBackgroundSummary(record));
  }
  if (record.outputPlan.codegenPath) {
    actions.unshift(`Import or require generated helper ${record.outputPlan.codegenPath}.`);
  }
  if (isAnimationCompileRecord(record)) {
    actions.unshift(`Use ${record.outputPlan.codegenPath ?? record.outputPlan.manifestPath} to connect ${record.motion.frames} frame(s) at ${record.motion.fps} fps.`);
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
    suggestions.add(`provide an existing source image sized ${validation.expectedWidth}x${validation.expectedHeight} or resize it outside openRender`);
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
  record: OpenRenderCompileRecord,
  failedChecks: NonNullable<OpenRenderCompileRecord["run"]["verification"]>["checks"]
): string[] {
  const suggestions = new Set<string>();
  for (const check of failedChecks) {
    if (check.name === "compiled_artifact_exists") {
      suggestions.add(`re-run openrender compile ${isP4CompileRecord(record) ? p4CommandKindForContract(record.contract) : isAnimationCompileRecord(record) ? "animation" : "sprite"} for the source asset`);
    } else if (check.name.endsWith("_installed")) {
      suggestions.add(`run openrender install --run ${record.run.runId}`);
    } else if (check.name === "installed_asset_dimensions") {
      suggestions.add(`re-run openrender install --run ${record.run.runId} --force after recompiling`);
    } else if (check.name === "motion_frame_slices_ready") {
      suggestions.add("re-run compile animation with explicit --frames, --fps, or --layout to match the source motion geometry");
    } else if (check.name === "atlas_tile_grid_divisible") {
      suggestions.add("adjust --tile-size or provide an existing atlas image with divisible dimensions");
    } else if (check.name === "ui_states_declared") {
      suggestions.add("pass --states default,hover,pressed or another non-empty UI state list");
    }
  }

  if (suggestions.size === 0) {
    suggestions.add("inspect the failed check paths, then re-run openrender verify --run latest");
  }

  return [...suggestions];
}

function p4CommandKindForContract(contract: P4CompileContract): "audio" | "atlas" | "ui" {
  if (contract.mediaType.startsWith("audio.")) return "audio";
  if (contract.mediaType === "visual.atlas" || contract.mediaType === "visual.tileset") return "atlas";
  return "ui";
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
  console.log(`Latest loop: ${result.latestLoop ? result.latestLoop.loopId : "missing"}`);
  for (const risk of result.overwriteRisks) console.log(`Overwrite risk: ${risk.path} (${risk.code})`);
  for (const action of result.recommendedNextActions) console.log(`Next: ${action}`);
}

function printLoopResult(result: LoopCommandResult): void {
  if (result.operation === "loop.task") {
    console.log(result.content);
    return;
  }

  console.log(`openRender ${result.operation}`);
  console.log("");
  console.log(`Loop: ${result.loop.loopId}`);
  console.log(`Status: ${result.loop.status}`);
  console.log(`Goal: ${result.loop.goal}`);
  console.log(`Task: ${"taskPath" in result ? result.taskPath : result.loop.paths.latestTask}`);
  if ("iteration" in result && result.iteration) console.log(`Iteration: ${result.iteration.iteration} (${result.iteration.status})`);
  if ("nextActions" in result) {
    for (const action of result.nextActions) console.log(`Next: ${action}`);
  }
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

function printCompileP4(result: CompileP4Result): void {
  console.log(`openRender compile ${p4CommandKindForContract(result.contract)}${result.dryRun ? " --dry-run" : ""}`);
  console.log("");
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Input: ${result.contract.sourcePath}`);
  console.log(`Asset id: ${result.contract.id}`);
  console.log(`Media type: ${result.contract.mediaType}`);
  console.log(`Output asset: ${result.outputPlan.assetPath}`);
  console.log(`Load path: ${result.outputPlan.loadPath}`);
  if (result.artifact) console.log(`Compiled artifact: ${result.artifact.path}`);
  console.log(`Manifest: ${result.outputPlan.manifestPath}`);
  if (result.outputPlan.codegenPath) console.log(`Codegen: ${result.outputPlan.codegenPath}`);
  if (result.manifest) console.log(`Manifest strategy: ${result.manifest.strategy} (${result.manifest.entryChange})`);
  console.log(`Install plan files: ${result.installPlan.files.length}`);
  console.log(`Validation: ${result.validation.status}`);
  if (result.installResult) {
    console.log(`Installed files: ${result.installResult.writes.length}`);
    console.log(`Snapshot: ${result.installResult.snapshotRoot}`);
  }
}

function printCompileAnimation(result: CompileAnimationResult): void {
  console.log(`openRender compile animation${result.dryRun ? " --dry-run" : ""}`);
  console.log("");
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Input: ${result.contract.sourcePath}`);
  console.log(`Asset id: ${result.contract.id}`);
  console.log(`Media type: ${result.contract.mediaType}`);
  console.log(`Motion: ${result.motion.frames} frame(s), ${result.motion.fps} fps, ${result.motion.layout}`);
  console.log(`Output asset: ${result.outputPlan.assetPath}`);
  console.log(`Load path: ${result.outputPlan.loadPath}`);
  if (result.outputPlan.codegenPath) console.log(`Codegen: ${result.outputPlan.codegenPath}`);
  if (result.manifest) console.log(`Manifest strategy: ${result.manifest.strategy} (${result.manifest.entryChange})`);
  console.log(`Install plan files: ${result.installPlan.files.length}`);
  console.log(`Validation: ${result.validation.status}`);
  if (result.installResult) {
    console.log(`Installed files: ${result.installResult.writes.length}`);
    console.log(`Snapshot: ${result.installResult.snapshotRoot}`);
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

function printDetectMotionResult(result: DetectMotionCommandResult): void {
  console.log("openRender detect-motion");
  console.log("");
  console.log(`Source: ${result.sourcePath}`);
  console.log(`Status: ${result.ok ? "ready" : result.code}`);
  console.log(`Type: ${result.sourceType}`);
  if (result.suggested) {
    console.log(`Suggested: ${result.suggested.frames} frame(s), ${result.suggested.fps} fps, ${result.suggested.layout}, loop=${result.suggested.loop}`);
  }
  for (const action of result.nextActions) console.log(`Next: ${action}`);
}

function printNormalizeResult(result: NormalizeCommandResult): void {
  console.log("openRender normalize");
  console.log("");
  console.log(`Preset: ${result.preset}`);
  console.log(`Background: ${result.background.policy} ${result.background.action} (${result.background.confidence})`);
  console.log(`Output: ${result.outputPath}`);
}

function printNormalizeMotionResult(result: NormalizeMotionCommandResult): void {
  console.log("openRender normalize motion");
  console.log("");
  console.log(`Output: ${result.outputPath}`);
  console.log(`Motion: ${result.motion.frames} frame(s), ${result.motion.fps} fps, ${result.motion.layout}`);
}

function printIngestReferenceResult(result: IngestReferenceCommandResult): void {
  console.log("openRender ingest reference");
  console.log("");
  console.log(`Reference: ${result.referenceId}`);
  console.log(`Role: ${result.role}`);
  console.log(`Path: ${result.path}`);
  console.log(result.summary);
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
  openrender init [--target phaser|godot|love2d|pixi|canvas|three|unity] [--framework vite|godot|love2d|unity] [--force] [--json]
  openrender agent init --codex|--cursor|--claude [--force] [--json]
  openrender install-agent [--platform codex|cursor|claude|all] [--dry-run] [--force] [--json]
  openrender adapter create --name <id> [--force] [--json]
  openrender fixture capture --name <id> --from <path> [--target engine] [--id asset.id] [--force] [--json]
  openrender scan [--json]
  openrender context [--json] [--compact] [--wire-map]
  openrender ingest reference --url <url>|--from <path> --role mechanic|style|layout|logic|motion|mood|character|environment --intent <text> [--notes <text>] [--json]
  openrender loop start --goal <text> [--target engine] [--id asset.id] [--media sprite|animation|audio|atlas|ui|asset] [--from <path>] [--json]
  openrender loop run sprite|animation|audio|atlas|ui --goal <text> --from|--input <path> --id <asset.id> [--target engine] [--install] [--force] [--json] [--compact]
  openrender loop attach [--loop latest|loopId] [--run latest|runId] [--goal <text>] [--json] [--compact]
  openrender loop status [--loop latest|loopId] [--json] [--compact]
  openrender loop task [--loop latest|loopId] [--json]
  openrender doctor [--json]
  openrender schema contract|output|report|install-plan|pack-manifest|media
  openrender pack list|inspect [packId] [--json]
  openrender recipe list|inspect|validate [recipeId] [--json]
  openrender plan sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--frames n --frame-size WxH] [--json]
  openrender detect-frames <path> [--frames n] [--json]
  openrender detect-motion <path> [--fps n] [--frames n] [--json] [--compact]
  openrender normalize <path> [--preset transparent-sprite|ui-icon|sprite-strip|sprite-grid] [--background-policy auto|preserve|remove] [--remove-background] [--background-mode edge-flood|top-left] [--background-tolerance n] [--feather n] [--out <path>] [--json]
  openrender normalize motion <path> [--fps n] [--frames n] [--layout horizontal_strip|grid|sequence] [--json]
  openrender metadata audio|atlas|ui <path> [--target engine] [--id asset.id] [--json]
  openrender smoke [--target phaser|godot|love2d|pixi|canvas|three|unity] [--run latest] [--timeout seconds] [--screenshot] [--json]
  openrender compile sprite --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--frames n --frame-size WxH] [--output-size WxH] [--background-policy auto|preserve|remove] [--remove-background] [--background-mode edge-flood|top-left] [--background-tolerance n] [--feather n] [--manifest-strategy merge|replace|isolated] [--quality prototype|default|strict] [--install] [--force] [--dry-run] [--json]
  openrender compile animation --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--fps n] [--frames n] [--loop] [--start seconds] [--end seconds] [--layout horizontal_strip|grid|sequence] [--background-policy auto|preserve|remove] [--manifest-strategy merge|replace|isolated] [--install] [--force] [--dry-run] [--json] [--compact]
  openrender compile audio --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--media-type audio.sound_effect|audio.music_loop] [--loop] [--manifest-strategy merge|replace|isolated] [--install] [--force] [--dry-run] [--json]
  openrender compile atlas --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--media-type visual.atlas|visual.tileset] [--tile-size WxH] [--manifest-strategy merge|replace|isolated] [--install] [--force] [--dry-run] [--json]
  openrender compile ui --from|--input <path> --id <asset.id> [--target phaser|godot|love2d|pixi|canvas|three|unity] [--media-type visual.ui_button|visual.ui_panel|visual.icon_set] [--states default,hover,pressed] [--manifest-strategy merge|replace|isolated] [--install] [--force] [--dry-run] [--json]
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
    status: OpenRenderCompileRecord["run"]["status"];
    mediaType: OpenRenderCompileRecord["run"]["contract"]["mediaType"];
    assetId: string;
    verification: NonNullable<OpenRenderCompileRecord["run"]["verification"]>["status"] | null;
    installRecorded: boolean;
  } | null;
  latestLoop: CompactLoopRecord | null;
  references: ReferenceSummary[];
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
  latestLoop: AgentContextCommandResult["latestLoop"];
  references: ReferenceSummary[];
  tables: {
    overwriteRisks: CompactTable;
  };
  nextActions: string[];
  wireMap?: WireMapResult;
  localOnly: true;
  capabilities: AgentContextCommandResult["capabilities"];
}

interface ReferenceSummary {
  referenceId: string;
  createdAt: string;
  role: VisualReferenceRole;
  intent: string;
  source: string;
  sourceKind: "url" | "local_file";
  downloaded: boolean;
  notes?: string;
}

interface IngestReferenceCommandResult {
  ok: true;
  referenceId: string;
  path: string;
  role: VisualReferenceRole;
  source: VisualReferenceRecord["source"];
  summary: string;
  nextActions: string[];
  localOnly: true;
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

interface CompactDetectMotionResult {
  ok: boolean;
  code?: "MOTION_RUNTIME_MISSING";
  sourceType: DetectMotionCommandResult["sourceType"];
  recommendation: DetectMotionCommandResult["suggested"];
  diagnostics: DetectMotionCommandResult["diagnostics"];
  runtime: DetectMotionCommandResult["runtime"];
  nextActions: string[];
}

interface CompactCompileAnimationResult {
  ok: boolean;
  runId: string;
  assetId: string;
  target: TargetEngine;
  mediaType: MotionCompileContract["mediaType"];
  motion: CompileAnimationResult["motion"];
  assetPath: string;
  helperPath: string | null;
  rollbackCommand: string | null;
  tables: {
    installPlan: CompactTable;
    checks: CompactTable;
  };
  nextActions: string[];
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

interface NormalizeMotionCommandResult {
  ok: true;
  motion: {
    sourceType: MotionSourceType;
    durationMs: number;
    fps: number;
    frames: number;
    layout: MotionLayout;
    loop: boolean;
  };
  outputPath: string;
  output?: {
    path: string;
    metadata: ImageMetadata;
  };
  frameSlices: FrameSlice[];
  diagnostics: MotionDiagnostics;
  localOnly: true;
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
  contract: MediaContract;
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
  helperPath: string | null;
  manifestModule: string;
  runId: string;
  suggestedUse: string;
  snippets: Array<{
    label: string;
    language: string;
    code: string;
  }>;
}

type P4InputMetadata =
  | {
      kind: "audio";
      sourcePath: string;
      bytes: number;
      outputFormat: "wav" | "ogg" | "mp3";
      loop: boolean;
    }
  | {
      kind: "atlas";
      sourcePath: string;
      bytes: number;
      width: number;
      height: number;
      tileWidth: number;
      tileHeight: number;
      columns: number;
      rows: number;
      outputFormat: "png";
    }
  | {
      kind: "ui";
      sourcePath: string;
      bytes: number;
      width: number;
      height: number;
      states: string[];
      outputFormat: "png";
    };

type MotionSourceType = "png_sequence" | "sprite_sheet" | "video" | "gif";

interface MotionDiagnostics {
  duplicateFrameRatio: number;
  emptyFrameRisk: "none" | "low" | "medium" | "high";
  boundsJitter: number;
  loopConfidence: number;
}

interface MotionInputMetadata {
  sourcePath: string;
  sourceType: MotionSourceType;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  hasAlpha: boolean;
}

interface MotionValidationResult {
  status: VerificationStatus;
  checks: VerifyCommandResult["checks"];
}

interface DetectMotionCommandResult {
  ok: boolean;
  code?: "MOTION_RUNTIME_MISSING";
  sourcePath: string;
  sourceType: MotionSourceType;
  runtime: {
    ffmpeg: "available" | "missing" | "not_required" | "unknown";
    ffprobe: "available" | "missing" | "not_required" | "unknown";
  };
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  frameCount: number | null;
  hasAlpha: boolean | null;
  frameSize: {
    width: number;
    height: number;
  } | null;
  suggested: {
    fps: number;
    frames: number;
    layout: MotionLayout;
    loop: boolean;
  } | null;
  diagnostics: MotionDiagnostics | null;
  nextActions: string[];
  localOnly: true;
  frameSlices?: FrameSlice[];
}

interface PreparedMotionAsset {
  sourceType: MotionSourceType;
  artifactPath: string;
  absoluteArtifactPath: string;
  artifact?: {
    path: string;
    metadata: ImageMetadata;
  };
  framePreview?: FramePreviewSheetOutput;
  frameSlices: FrameSlice[];
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  spriteLayout: SpriteFrameSetContract["visual"]["layout"];
  motionLayout: MotionLayout;
  diagnostics: MotionDiagnostics;
  input: MotionInputMetadata;
  frameExtraction: string;
  startMs?: number;
  endMs?: number;
}

interface P4AssetDescriptor {
  id: string;
  engine: TargetEngine;
  mediaType: P4CompileContract["mediaType"];
  assetPath: string;
  loadPath: string;
  manifestPath: string;
  codegenPath: string | null;
}

type P4InstallPlanFile =
  | {
      kind: "compiled_asset";
      action: "copy";
      from: string;
      to: string;
    }
  | {
      kind: "manifest" | "codegen";
      action: "write";
      to: string;
      contents: string;
    };

interface P4InstallPlan {
  id: string;
  enabled: boolean;
  files: P4InstallPlanFile[];
}

interface P4ValidationResult {
  status: VerificationStatus;
  checks: VerifyCommandResult["checks"];
}

interface CompileP4Result {
  dryRun: boolean;
  projectRoot: string;
  input: P4InputMetadata;
  contract: P4CompileContract;
  outputPlan: P4AssetDescriptor;
  installPlan: P4InstallPlan;
  artifact?: {
    path: string;
    metadata: Record<string, unknown>;
  };
  processing: {
    pipeline: "p4-media";
    copiedSource: boolean;
    manifestStrategy: ManifestStrategy;
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
    helper?: string;
  };
  manifest?: ManifestStrategyResult;
  validation: P4ValidationResult;
  run: ReturnType<typeof createInitialRun>;
  installResult?: InstallCommandResult;
}

interface CompileAnimationResult {
  dryRun: boolean;
  projectRoot: string;
  input: MotionInputMetadata;
  contract: MotionCompileContract;
  adapterContract: SpriteFrameSetContract;
  outputPlan: EngineAssetDescriptor;
  installPlan: EngineInstallPlan;
  artifact?: {
    path: string;
    metadata: ImageMetadata;
  };
  processing: {
    pipeline: "animation";
    sourceType: MotionSourceType;
    layout: MotionLayout;
    frameExtraction: string;
    manifestStrategy: ManifestStrategy;
  };
  motion: {
    durationMs: number;
    fps: number;
    frames: number;
    layout: MotionLayout;
    loop: boolean;
    diagnostics: MotionDiagnostics;
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
  validation: MotionValidationResult;
  frameSlices: FrameSlice[];
  framePreview?: FramePreviewSheetOutput;
  run: ReturnType<typeof createInitialRun>;
  installResult?: InstallCommandResult;
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
