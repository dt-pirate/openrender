import {
  OPENRENDER_DEVKIT_VERSION,
  type MediaContract,
  type OpenRenderConfig,
  type OpenRenderRun
} from "./types.js";

export interface SchemaValidationIssue {
  path: string;
  message: string;
}

export type SchemaValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: SchemaValidationIssue[] };

const runStatuses = [
  "created",
  "input_loaded",
  "normalized",
  "harness_running",
  "harness_ready",
  "adapter_generating",
  "install_planned",
  "install_pending",
  "installed",
  "verifying",
  "verified",
  "report_generated",
  "completed",
  "failed_input",
  "failed_harness",
  "failed_adapter",
  "failed_install",
  "failed_verify",
  "rollback_available",
  "rolled_back"
] as const;

const outputKinds = [
  "raw_input",
  "normalized_input",
  "harnessed_visual",
  "compiled_asset",
  "manifest",
  "codegen",
  "install_plan",
  "installed_file",
  "preview",
  "report",
  "snapshot"
] as const;

const targetEngines = ["phaser", "godot", "love2d", "pixi", "canvas", "three", "unity"] as const;
const targetFrameworks = ["vite", "godot", "love2d", "unity"] as const;
const motionMediaTypes = [
  "visual.animation_clip",
  "visual.sprite_sequence",
  "visual.effect_loop",
  "visual.ui_motion",
  "visual.reference_video"
] as const;
const mediaTypes = [
  "visual.transparent_sprite",
  "visual.sprite_frame_set",
  ...motionMediaTypes,
  "audio.sound_effect",
  "audio.music_loop",
  "visual.tileset",
  "visual.atlas",
  "visual.ui_button",
  "visual.ui_panel",
  "visual.icon_set"
] as const;

export function validateOpenRenderConfig(input: unknown): SchemaValidationResult<OpenRenderConfig> {
  const issues: SchemaValidationIssue[] = [];
  const root = expectRecord(input, "$", issues);
  if (!root) return invalid(issues);

  expectOneOf(root.version, "$.version", [OPENRENDER_DEVKIT_VERSION], issues);

  const project = expectRecord(root.project, "$.project", issues);
  if (project) {
    expectString(project.id, "$.project.id", issues);
    expectString(project.name, "$.project.name", issues);
  }

  const target = expectRecord(root.target, "$.target", issues);
  if (target) {
    expectOneOf(target.engine, "$.target.engine", targetEngines, issues);
    expectOneOf(target.framework, "$.target.framework", targetFrameworks, issues);
    validateTargetFrameworkPair(target.engine, target.framework, "$.target", issues);
    expectString(target.assetRoot, "$.target.assetRoot", issues);
    expectString(target.sourceRoot, "$.target.sourceRoot", issues);
  }

  const install = expectRecord(root.install, "$.install", issues);
  if (install) {
    expectBoolean(install.writeManifest, "$.install.writeManifest", issues);
    expectBoolean(install.writeCodegen, "$.install.writeCodegen", issues);
    expectBoolean(install.snapshotBeforeInstall, "$.install.snapshotBeforeInstall", issues);
    expectBoolean(install.allowOverwrite, "$.install.allowOverwrite", issues);
  }

  const report = expectRecord(root.report, "$.report", issues);
  if (report) {
    expectArrayOf(report.format, "$.report.format", issues, (value, path) => {
      expectOneOf(value, path, ["html", "json"], issues);
    });
    expectBoolean(report.openAfterRun, "$.report.openAfterRun", issues);
  }

  const privacy = expectRecord(root.privacy, "$.privacy", issues);
  if (privacy) {
    expectLiteral(privacy.cloudSync, "$.privacy.cloudSync", false, issues);
    expectLiteral(privacy.telemetry, "$.privacy.telemetry", false, issues);
    expectLiteral(privacy.uploadArtifacts, "$.privacy.uploadArtifacts", false, issues);
  }

  return issues.length === 0 ? valid(input as OpenRenderConfig) : invalid(issues);
}

export function validateMediaContract(input: unknown): SchemaValidationResult<MediaContract> {
  const issues: SchemaValidationIssue[] = [];
  const root = expectRecord(input, "$", issues);
  if (!root) return invalid(issues);

  expectOneOf(root.schemaVersion, "$.schemaVersion", [OPENRENDER_DEVKIT_VERSION], issues);
  expectOneOf(root.mediaType, "$.mediaType", mediaTypes, issues);
  expectString(root.sourcePath, "$.sourcePath", issues);
  expectString(root.id, "$.id", issues);

  validateTargetContract(root.target, "$.target", issues);
  validateInstallContract(root.install, "$.install", issues);
  validateVerifyContract(root.verify, "$.verify", issues);

  const needsVisual = typeof root.mediaType === "string" && root.mediaType.startsWith("visual.") && !["visual.ui_button", "visual.ui_panel", "visual.icon_set"].includes(root.mediaType);
  const visual = root.visual === undefined && !needsVisual ? undefined : expectRecord(root.visual, "$.visual", issues);
  if (visual && root.mediaType === "visual.transparent_sprite") {
    expectPositiveNumber(visual.outputWidth, "$.visual.outputWidth", issues);
    expectPositiveNumber(visual.outputHeight, "$.visual.outputHeight", issues);
    expectNonNegativeNumber(visual.padding, "$.visual.padding", issues);
    expectOneOf(visual.background, "$.visual.background", ["transparent", "solid"], issues);
    expectOneOf(visual.outputFormat, "$.visual.outputFormat", ["png"], issues);
  }

  if (visual && root.mediaType === "visual.sprite_frame_set") {
    expectOneOf(visual.layout, "$.visual.layout", ["horizontal", "horizontal_strip", "grid"], issues);
    expectPositiveNumber(visual.frames, "$.visual.frames", issues);
    expectPositiveNumber(visual.frameWidth, "$.visual.frameWidth", issues);
    expectPositiveNumber(visual.frameHeight, "$.visual.frameHeight", issues);
    if (visual.fps !== undefined) expectPositiveNumber(visual.fps, "$.visual.fps", issues);
    expectNonNegativeNumber(visual.padding, "$.visual.padding", issues);
    expectOneOf(visual.background, "$.visual.background", ["transparent", "solid"], issues);
    expectOneOf(visual.outputFormat, "$.visual.outputFormat", ["png"], issues);
  }

  const motion = root.motion === undefined ? undefined : expectRecord(root.motion, "$.motion", issues);
  if (typeof root.mediaType === "string" && isMotionMediaType(root.mediaType) && !motion) {
    issues.push({ path: "$.motion", message: "motion contract is required for motion media types" });
  }
  if (motion && typeof root.mediaType === "string" && isMotionMediaType(root.mediaType)) {
    expectOneOf(motion.layout, "$.motion.layout", ["horizontal_strip", "grid", "sequence"], issues);
    expectPositiveNumber(motion.fps, "$.motion.fps", issues);
    expectPositiveNumber(motion.frames, "$.motion.frames", issues);
    expectBoolean(motion.loop, "$.motion.loop", issues);
    if (motion.startMs !== undefined) expectNonNegativeNumber(motion.startMs, "$.motion.startMs", issues);
    if (motion.endMs !== undefined) expectPositiveNumber(motion.endMs, "$.motion.endMs", issues);
  }

  if (visual && typeof root.mediaType === "string" && isMotionMediaType(root.mediaType)) {
    expectOneOf(visual.layout, "$.visual.layout", ["horizontal", "horizontal_strip", "grid"], issues);
    expectPositiveNumber(visual.frames, "$.visual.frames", issues);
    expectPositiveNumber(visual.frameWidth, "$.visual.frameWidth", issues);
    expectPositiveNumber(visual.frameHeight, "$.visual.frameHeight", issues);
    expectPositiveNumber(visual.fps, "$.visual.fps", issues);
    expectNonNegativeNumber(visual.padding, "$.visual.padding", issues);
    expectOneOf(visual.background, "$.visual.background", ["transparent", "solid"], issues);
    expectOneOf(visual.outputFormat, "$.visual.outputFormat", ["png"], issues);
  }

  const audio = root.audio === undefined ? undefined : expectRecord(root.audio, "$.audio", issues);
  if (audio && (root.mediaType === "audio.sound_effect" || root.mediaType === "audio.music_loop")) {
    if (audio.durationMs !== undefined) expectPositiveNumber(audio.durationMs, "$.audio.durationMs", issues);
    expectBoolean(audio.loop, "$.audio.loop", issues);
    expectOneOf(audio.outputFormat, "$.audio.outputFormat", ["wav", "ogg", "mp3"], issues);
  }

  if (visual && (root.mediaType === "visual.tileset" || root.mediaType === "visual.atlas")) {
    expectPositiveNumber(visual.tileWidth, "$.visual.tileWidth", issues);
    expectPositiveNumber(visual.tileHeight, "$.visual.tileHeight", issues);
    expectPositiveNumber(visual.columns, "$.visual.columns", issues);
    expectPositiveNumber(visual.rows, "$.visual.rows", issues);
    expectOneOf(visual.outputFormat, "$.visual.outputFormat", ["png"], issues);
  }

  const ui = root.ui === undefined ? undefined : expectRecord(root.ui, "$.ui", issues);
  if (ui && (root.mediaType === "visual.ui_button" || root.mediaType === "visual.ui_panel" || root.mediaType === "visual.icon_set")) {
    expectArrayOf(ui.states, "$.ui.states", issues, (value, path) => expectString(value, path, issues));
    expectOneOf(ui.outputFormat, "$.ui.outputFormat", ["png"], issues);
  }

  return issues.length === 0 ? valid(input as MediaContract) : invalid(issues);
}

export function validateOpenRenderRun(input: unknown): SchemaValidationResult<OpenRenderRun> {
  const issues: SchemaValidationIssue[] = [];
  const root = expectRecord(input, "$", issues);
  if (!root) return invalid(issues);

  expectString(root.runId, "$.runId", issues);
  expectString(root.createdAt, "$.createdAt", issues);
  expectOneOf(root.actor, "$.actor", ["cli", "agent"], issues);
  expectOneOf(root.status, "$.status", runStatuses, issues);

  const contract = expectRecord(root.contract, "$.contract", issues);
  if (contract) {
    expectOneOf(contract.schemaVersion, "$.contract.schemaVersion", [OPENRENDER_DEVKIT_VERSION], issues);
    expectOneOf(contract.mediaType, "$.contract.mediaType", mediaTypes, issues);
    expectString(contract.id, "$.contract.id", issues);
  }

  expectArrayOf(root.outputs, "$.outputs", issues, (value, path) => {
    const output = expectRecord(value, path, issues);
    if (!output) return;
    expectOneOf(output.kind, `${path}.kind`, outputKinds, issues);
    expectString(output.path, `${path}.path`, issues);
  });

  validateVerification(root.verification, "$.verification", issues);

  const rollback = root.rollback === undefined
    ? undefined
    : expectRecord(root.rollback, "$.rollback", issues);
  if (rollback) {
    expectString(rollback.snapshotId, "$.rollback.snapshotId", issues);
    expectBoolean(rollback.available, "$.rollback.available", issues);
  }

  const privacy = expectRecord(root.privacy, "$.privacy", issues);
  if (privacy) {
    expectLiteral(privacy.uploaded, "$.privacy.uploaded", false, issues);
    expectLiteral(privacy.cloudReport, "$.privacy.cloudReport", false, issues);
    expectLiteral(privacy.telemetry, "$.privacy.telemetry", false, issues);
  }

  return issues.length === 0 ? valid(input as OpenRenderRun) : invalid(issues);
}

function isMotionMediaType(value: string): boolean {
  return (motionMediaTypes as readonly string[]).includes(value);
}

function validateTargetContract(input: unknown, path: string, issues: SchemaValidationIssue[]): void {
  const target = expectRecord(input, path, issues);
  if (!target) return;
  expectOneOf(target.engine, `${path}.engine`, targetEngines, issues);
  expectOneOf(target.framework, `${path}.framework`, targetFrameworks, issues);
  validateTargetFrameworkPair(target.engine, target.framework, path, issues);
  expectString(target.projectRoot, `${path}.projectRoot`, issues);
}

function validateTargetFrameworkPair(
  engine: unknown,
  framework: unknown,
  path: string,
  issues: SchemaValidationIssue[]
): void {
  if (typeof engine !== "string" || typeof framework !== "string") return;

  if ((engine === "phaser" || engine === "pixi" || engine === "canvas" || engine === "three") && framework !== "vite") {
    issues.push({ path: `${path}.framework`, message: `${engine} target requires vite framework` });
  }

  if (engine === "godot" && framework !== "godot") {
    issues.push({ path: `${path}.framework`, message: "godot target requires godot framework" });
  }

  if (engine === "love2d" && framework !== "love2d") {
    issues.push({ path: `${path}.framework`, message: "love2d target requires love2d framework" });
  }

  if (engine === "unity" && framework !== "unity") {
    issues.push({ path: `${path}.framework`, message: "unity target requires unity framework" });
  }
}

function validateInstallContract(input: unknown, path: string, issues: SchemaValidationIssue[]): void {
  const install = expectRecord(input, path, issues);
  if (!install) return;
  expectBoolean(install.enabled, `${path}.enabled`, issues);
  expectString(install.assetRoot, `${path}.assetRoot`, issues);
  expectBoolean(install.writeManifest, `${path}.writeManifest`, issues);
  expectBoolean(install.writeCodegen, `${path}.writeCodegen`, issues);
  expectBoolean(install.snapshotBeforeInstall, `${path}.snapshotBeforeInstall`, issues);
}

function validateVerifyContract(input: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (input === undefined) return;
  const verify = expectRecord(input, path, issues);
  if (!verify) return;
  if (verify.preview !== undefined) expectBoolean(verify.preview, `${path}.preview`, issues);
  if (verify.checkFrameCount !== undefined) expectBoolean(verify.checkFrameCount, `${path}.checkFrameCount`, issues);
  if (verify.checkLoadPath !== undefined) expectBoolean(verify.checkLoadPath, `${path}.checkLoadPath`, issues);
}

function validateVerification(input: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (input === undefined) return;
  const verification = expectRecord(input, path, issues);
  if (!verification) return;
  expectOneOf(verification.status, `${path}.status`, ["passed", "warning", "failed", "skipped"], issues);
  expectArrayOf(verification.checks, `${path}.checks`, issues, (value, itemPath) => {
    const check = expectRecord(value, itemPath, issues);
    if (!check) return;
    expectString(check.name, `${itemPath}.name`, issues);
    expectOneOf(check.status, `${itemPath}.status`, ["passed", "warning", "failed", "skipped"], issues);
    if (check.path !== undefined) expectString(check.path, `${itemPath}.path`, issues);
    if (check.message !== undefined) expectString(check.message, `${itemPath}.message`, issues);
  });
}

function valid<T>(value: T): SchemaValidationResult<T> {
  return { ok: true, value };
}

function invalid<T>(issues: SchemaValidationIssue[]): SchemaValidationResult<T> {
  return { ok: false, issues };
}

function expectRecord(
  value: unknown,
  path: string,
  issues: SchemaValidationIssue[]
): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  issues.push({ path, message: "expected object" });
  return null;
}

function expectArrayOf(
  value: unknown,
  path: string,
  issues: SchemaValidationIssue[],
  validateItem: (value: unknown, path: string) => void
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "expected array" });
    return;
  }

  value.forEach((item, index) => validateItem(item, `${path}[${index}]`));
}

function expectString(value: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push({ path, message: "expected non-empty string" });
  }
}

function expectBoolean(value: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (typeof value !== "boolean") {
    issues.push({ path, message: "expected boolean" });
  }
}

function expectLiteral<T extends string | boolean>(
  value: unknown,
  path: string,
  literal: T,
  issues: SchemaValidationIssue[]
): void {
  if (value !== literal) {
    issues.push({ path, message: `expected ${String(literal)}` });
  }
}

function expectOneOf<T extends readonly string[]>(
  value: unknown,
  path: string,
  allowed: T,
  issues: SchemaValidationIssue[]
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push({ path, message: `expected one of: ${allowed.join(", ")}` });
  }
}

function expectPositiveNumber(value: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push({ path, message: "expected positive number" });
  }
}

function expectNonNegativeNumber(value: unknown, path: string, issues: SchemaValidationIssue[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({ path, message: "expected non-negative number" });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
