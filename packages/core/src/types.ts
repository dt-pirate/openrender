export const OPENRENDER_DEVKIT_VERSION = "0.9.0" as const;

export type OpenRenderDevkitVersion = typeof OPENRENDER_DEVKIT_VERSION;
export type TargetEngine = "phaser" | "godot" | "love2d" | "pixi" | "canvas" | "three" | "unity";
export type TargetFramework = "vite" | "godot" | "love2d" | "unity";
export type VisualMediaType =
  | "visual.transparent_sprite"
  | "visual.sprite_frame_set"
  | "visual.animation_clip"
  | "visual.sprite_sequence"
  | "visual.effect_loop"
  | "visual.ui_motion"
  | "visual.reference_video"
  | "visual.tileset"
  | "visual.atlas"
  | "visual.ui_button"
  | "visual.ui_panel"
  | "visual.icon_set";
export type AudioMediaType = "audio.sound_effect" | "audio.music_loop";
export type MediaType = VisualMediaType | AudioMediaType;
export type OutputFormat = "png";
export type SpriteLayout = "horizontal" | "horizontal_strip" | "grid";
export type MotionLayout = "horizontal_strip" | "grid" | "sequence";
export type VisualReferenceRole =
  | "mechanic"
  | "style"
  | "layout"
  | "logic"
  | "motion"
  | "mood"
  | "character"
  | "environment";
export type RunStatus =
  | "created"
  | "input_loaded"
  | "normalized"
  | "harness_running"
  | "harness_ready"
  | "adapter_generating"
  | "install_planned"
  | "install_pending"
  | "installed"
  | "verifying"
  | "verified"
  | "report_generated"
  | "completed"
  | "failed_input"
  | "failed_harness"
  | "failed_adapter"
  | "failed_install"
  | "failed_verify"
  | "rollback_available"
  | "rolled_back";

export interface OpenRenderConfig {
  version: OpenRenderDevkitVersion;
  project: {
    id: string;
    name: string;
  };
  target: {
    engine: TargetEngine;
    framework: TargetFramework;
    assetRoot: string;
    sourceRoot: string;
  };
  install: {
    writeManifest: boolean;
    writeCodegen: boolean;
    snapshotBeforeInstall: boolean;
    allowOverwrite: boolean;
  };
  report: {
    format: Array<"html" | "json">;
    openAfterRun: boolean;
  };
  privacy: {
    cloudSync: false;
    telemetry: false;
    uploadArtifacts: false;
  };
}

export interface TargetContract {
  engine: TargetEngine;
  framework: TargetFramework;
  projectRoot: string;
}

export interface InstallContract {
  enabled: boolean;
  assetRoot: string;
  writeManifest: boolean;
  writeCodegen: boolean;
  snapshotBeforeInstall: boolean;
}

export interface VerifyContract {
  preview: boolean;
  checkFrameCount: boolean;
  checkLoadPath: boolean;
}

export interface TransparentSpriteContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType: "visual.transparent_sprite";
  sourcePath: string;
  target: TargetContract;
  id: string;
  visual: {
    outputWidth: number;
    outputHeight: number;
    padding: number;
    background: "transparent" | "solid";
    outputFormat: OutputFormat;
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export interface SpriteFrameSetContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType: "visual.sprite_frame_set";
  sourcePath: string;
  target: TargetContract;
  id: string;
  visual: {
    layout: SpriteLayout;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    fps?: number;
    padding: number;
    background: "transparent" | "solid";
    outputFormat: OutputFormat;
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export interface MotionContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType:
    | "visual.animation_clip"
    | "visual.sprite_sequence"
    | "visual.effect_loop"
    | "visual.ui_motion"
    | "visual.reference_video";
  sourcePath: string;
  target: TargetContract;
  id: string;
  motion: {
    layout: MotionLayout;
    fps: number;
    frames: number;
    loop: boolean;
    startMs?: number;
    endMs?: number;
  };
  visual: {
    layout: SpriteLayout;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    fps: number;
    padding: number;
    background: "transparent" | "solid";
    outputFormat: OutputFormat;
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export interface AudioContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType: AudioMediaType;
  sourcePath: string;
  target: TargetContract;
  id: string;
  audio: {
    durationMs?: number;
    loop: boolean;
    outputFormat: "wav" | "ogg" | "mp3";
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export interface AtlasContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType: "visual.atlas" | "visual.tileset";
  sourcePath: string;
  target: TargetContract;
  id: string;
  visual: {
    tileWidth: number;
    tileHeight: number;
    columns: number;
    rows: number;
    outputFormat: OutputFormat;
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export interface UiAssetContract {
  schemaVersion: OpenRenderDevkitVersion;
  mediaType: "visual.ui_button" | "visual.ui_panel" | "visual.icon_set";
  sourcePath: string;
  target: TargetContract;
  id: string;
  ui: {
    states: string[];
    outputFormat: OutputFormat;
  };
  install: InstallContract;
  verify?: Partial<VerifyContract>;
}

export type MediaContract =
  | TransparentSpriteContract
  | SpriteFrameSetContract
  | MotionContract
  | AudioContract
  | AtlasContract
  | UiAssetContract;

export interface VisualReferenceRecord {
  schemaVersion: OpenRenderDevkitVersion;
  referenceId: string;
  createdAt: string;
  role: VisualReferenceRole;
  intent: string;
  notes?: string;
  source:
    | {
        kind: "url";
        url: string;
        downloaded: false;
      }
    | {
        kind: "local_file";
        path: string;
        bytes: number;
        hash?: string;
      };
  localOnly: true;
}

export interface OutputDescriptor {
  kind:
    | "raw_input"
    | "normalized_input"
    | "harnessed_visual"
    | "compiled_asset"
    | "manifest"
    | "codegen"
    | "install_plan"
    | "installed_file"
    | "preview"
    | "report"
    | "snapshot";
  path: string;
}

export interface VerificationCheck {
  name: string;
  status: "passed" | "warning" | "failed" | "skipped";
  path?: string;
  message?: string;
}

export interface OpenRenderRun {
  runId: string;
  createdAt: string;
  actor: "cli" | "agent";
  status: RunStatus;
  contract: Pick<MediaContract, "schemaVersion" | "mediaType" | "id">;
  outputs: OutputDescriptor[];
  verification?: {
    status: "passed" | "warning" | "failed" | "skipped";
    checks: VerificationCheck[];
  };
  rollback?: {
    snapshotId: string;
    available: boolean;
  };
  privacy: {
    uploaded: false;
    cloudReport: false;
    telemetry: false;
  };
}

export interface ProjectScan {
  projectRoot: string;
  packageManager: "pnpm" | "npm" | "yarn" | "unknown";
  packageJsonPath: string | null;
  packageName: string | null;
  framework: TargetFramework | "unknown";
  engine: TargetEngine | "unknown";
  assetRoot: string;
  assetRootExists: boolean;
  sourceRoot: string;
  sourceRootExists: boolean;
  configPath: string;
  configExists: boolean;
  statePath: string;
  stateExists: boolean;
  manifestPath: string;
  manifestExists: boolean;
}

export interface OpenRenderAdapter<TDescriptor = unknown, TInstallPlan = unknown> {
  id: TargetEngine;
  framework: TargetFramework;
  detect(input: ProjectScan): boolean;
  describe(contract: MediaContract): TDescriptor;
  plan(input: {
    contract: MediaContract;
    compiledAssetPath: string;
    frameSlices?: Array<{ index: number; x: number; y: number; width: number; height: number }>;
  }): TInstallPlan;
  generateSources(
    contract: MediaContract,
    frameSlices?: Array<{ index: number; x: number; y: number; width: number; height: number }>
  ): {
    manifest: string;
    animationHelper?: string;
  };
  verify(descriptor: TDescriptor): boolean;
}
