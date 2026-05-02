export const OPENRENDER_DEVKIT_VERSION = "0.4.0" as const;

export type OpenRenderDevkitVersion = typeof OPENRENDER_DEVKIT_VERSION;
export type TargetEngine = "phaser" | "godot" | "love2d" | "pixi" | "canvas";
export type TargetFramework = "vite" | "godot" | "love2d";
export type VisualMediaType = "visual.transparent_sprite" | "visual.sprite_frame_set";
export type OutputFormat = "png";
export type SpriteLayout = "horizontal" | "horizontal_strip" | "grid";
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

export type MediaContract = TransparentSpriteContract | SpriteFrameSetContract;

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
  status: "passed" | "failed" | "skipped";
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
    status: "passed" | "failed" | "skipped";
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
