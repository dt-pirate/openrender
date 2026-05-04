import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { SpriteFrameSetContract, TransparentSpriteContract } from "@openrender/core";

export type SupportedImageFormat = "png" | "webp" | "jpeg";

export interface ImageMetadata {
  sourcePath: string;
  hash: string;
  width: number;
  height: number;
  format: SupportedImageFormat;
  hasAlpha: boolean;
  channels: number;
  colorSpace: string;
}

export interface FrameValidationResult {
  ok: boolean;
  expectedWidth: number;
  expectedHeight: number;
  actualWidth: number;
  actualHeight: number;
  reason?: string;
}

export interface FrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlphaDiagnostics {
  hasAlpha: boolean;
  alphaMin: number;
  alphaMax: number;
  transparentPixelRatio: number;
  partialAlphaPixelRatio: number;
  nonTransparentBounds: PixelBounds | null;
  edgeAlphaBleedRisk: "none" | "low" | "medium" | "high";
  emptyFrameDetected: boolean;
  oversizedCanvasDetected: boolean;
  subjectTooSmallRisk: boolean;
}

export interface FrameDetectionResult {
  ok: true;
  sourcePath: string;
  suggested: {
    layout: "horizontal_strip" | "grid";
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
  };
  confidence: number;
  diagnostics: string[];
}

export interface SpriteInvariantCheck {
  name:
    | "frameCountMatch"
    | "frameSizeMatch"
    | "imageWidthDivisible"
    | "imageHeightDivisible"
    | "emptyFrame"
    | "duplicateFrameApprox"
    | "frameBoundsJitter"
    | "alphaConsistency";
  status: "passed" | "failed" | "skipped";
  message?: string;
}

export interface SpriteInvariantDiagnostics {
  ok: boolean;
  checks: SpriteInvariantCheck[];
}

export interface FramePreviewSheetOutput extends NormalizedImageOutput {
  frameCount: number;
}

export type NormalizePreset =
  | "transparent-sprite"
  | "ui-icon"
  | "sprite-strip"
  | "sprite-grid";

export type BackgroundRemovalMode = "top-left" | "edge-flood";
export type BackgroundPolicy = "auto" | "preserve" | "remove";

export interface BackgroundDecision {
  policy: BackgroundPolicy;
  action: "preserved" | "removed" | "skipped";
  reason: string;
  confidence: "high" | "medium" | "low";
  mode?: BackgroundRemovalMode;
  tolerance?: number;
  feather?: number;
  inputTransparentPixelRatio?: number;
  outputTransparentPixelRatio?: number;
}

export interface VisualHarnessPlan {
  contractId: string;
  mediaType: SpriteFrameSetContract["mediaType"] | TransparentSpriteContract["mediaType"];
  stages: string[];
  implementationStatus: "planned" | "ready";
}

export interface NormalizedImageOutput {
  path: string;
  metadata: ImageMetadata;
}

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OutputSize {
  width: number;
  height: number;
}

export interface CroppedImageOutput extends NormalizedImageOutput {
  bounds: PixelBounds;
  padding: number;
  alphaCleanupThreshold: number;
  removedSolidBackground: boolean;
  backgroundMode?: BackgroundRemovalMode;
  backgroundTolerance?: number;
  feather?: number;
  outputSize?: OutputSize;
}

export const VISUAL_HARNESS_DEVKIT_STAGES = [
  "input_load",
  "format_detection",
  "format_normalization",
  "alpha_detection",
  "basic_alpha_cleanup",
  "object_bounds_detection",
  "crop",
  "padding_normalization",
  "frame_slicing",
  "metadata_generation"
] as const;

export async function loadImageMetadata(sourcePath: string): Promise<ImageMetadata> {
  const input = await fs.readFile(sourcePath);
  const metadata = await sharp(input, { failOn: "error" }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${sourcePath}`);
  }

  const format = normalizeFormat(metadata.format);
  if (!format) {
    throw new Error(`Unsupported image format: ${metadata.format ?? "unknown"}`);
  }

  return {
    sourcePath,
    hash: createHash("sha256").update(input).digest("hex"),
    width: metadata.width,
    height: metadata.height,
    format,
    hasAlpha: metadata.hasAlpha === true,
    channels: metadata.channels ?? 0,
    colorSpace: metadata.space ?? "unknown"
  };
}

export async function normalizeImageToPng(input: {
  sourcePath: string;
  outputPath: string;
}): Promise<NormalizedImageOutput> {
  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  await sharp(input.sourcePath, { failOn: "error" })
    .png()
    .toFile(input.outputPath);

  return {
    path: input.outputPath,
    metadata: await loadImageMetadata(input.outputPath)
  };
}

export async function cleanupAlphaEdgesToPng(input: {
  sourcePath: string;
  outputPath: string;
  alphaThreshold?: number;
}): Promise<NormalizedImageOutput> {
  const alphaThreshold = input.alphaThreshold ?? 2;
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = cleanupAlphaEdges(data, alphaThreshold);

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  await sharp(cleaned, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(input.outputPath);

  return {
    path: input.outputPath,
    metadata: await loadImageMetadata(input.outputPath)
  };
}

export async function removeSolidBackgroundToPng(input: {
  sourcePath: string;
  outputPath: string;
  tolerance?: number;
  alphaCleanupThreshold?: number;
  backgroundMode?: BackgroundRemovalMode;
  feather?: number;
}): Promise<NormalizedImageOutput> {
  const tolerance = input.tolerance ?? 12;
  const alphaCleanupThreshold = input.alphaCleanupThreshold ?? 2;
  const backgroundMode = input.backgroundMode ?? "top-left";
  const feather = input.feather ?? 0;
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = cleanupAlphaEdges(
    removeSolidBackground(data, {
      width: info.width,
      height: info.height,
      channels: info.channels
    }, tolerance, backgroundMode, feather),
    alphaCleanupThreshold
  );

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  await sharp(cleaned, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(input.outputPath);

  return {
    path: input.outputPath,
    metadata: await loadImageMetadata(input.outputPath)
  };
}

export async function removeBackgroundInPlaceToPng(input: {
  sourcePath: string;
  outputPath: string;
  mode: BackgroundRemovalMode;
  tolerance: number;
  feather: number;
}): Promise<NormalizedImageOutput> {
  return removeSolidBackgroundToPng({
    sourcePath: input.sourcePath,
    outputPath: input.outputPath,
    tolerance: input.tolerance,
    backgroundMode: input.mode,
    feather: input.feather
  });
}

export async function detectAlphaBounds(input: {
  sourcePath: string;
  alphaThreshold?: number;
}): Promise<PixelBounds | null> {
  const alphaThreshold = input.alphaThreshold ?? 0;
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (alpha <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

export async function analyzeAlphaDiagnostics(input: {
  sourcePath: string;
  alphaThreshold?: number;
}): Promise<AlphaDiagnostics> {
  const alphaThreshold = input.alphaThreshold ?? 0;
  const metadata = await loadImageMetadata(input.sourcePath);
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparentPixels = 0;
  let nonTransparentPixels = 0;
  let partialAlphaPixels = 0;
  let edgeAlphaPixels = 0;
  let alphaMin = 255;
  let alphaMax = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      alphaMin = Math.min(alphaMin, alpha);
      alphaMax = Math.max(alphaMax, alpha);
      if (alpha > alphaThreshold && alpha < 255) {
        partialAlphaPixels += 1;
      }
      if (alpha <= alphaThreshold) {
        transparentPixels += 1;
        continue;
      }

      nonTransparentPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edgeAlphaPixels += 1;
      }
    }
  }

  const totalPixels = Math.max(info.width * info.height, 1);
  const nonTransparentBounds = nonTransparentPixels === 0
    ? null
    : {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      };
  const subjectAreaRatio = nonTransparentBounds
    ? (nonTransparentBounds.width * nonTransparentBounds.height) / totalPixels
    : 0;
  const edgeRatio = edgeAlphaPixels / totalPixels;

  return {
    hasAlpha: metadata.hasAlpha,
    alphaMin,
    alphaMax,
    transparentPixelRatio: roundRatio(transparentPixels / totalPixels),
    partialAlphaPixelRatio: roundRatio(partialAlphaPixels / totalPixels),
    nonTransparentBounds,
    edgeAlphaBleedRisk: edgeRatio === 0
      ? "none"
      : edgeRatio < 0.01
        ? "low"
        : edgeRatio < 0.05
          ? "medium"
          : "high",
    emptyFrameDetected: nonTransparentPixels === 0,
    oversizedCanvasDetected: subjectAreaRatio > 0 && subjectAreaRatio < 0.25,
    subjectTooSmallRisk: subjectAreaRatio > 0 && subjectAreaRatio < 0.08
  };
}

export async function decideBackgroundRemoval(input: {
  sourcePath: string;
  mediaType: "visual.transparent_sprite" | "visual.sprite_frame_set";
  policy: BackgroundPolicy;
  preset?: NormalizePreset;
  frameSlices?: FrameSlice[];
  tolerance: number;
  mode: BackgroundRemovalMode;
  feather: number;
}): Promise<BackgroundDecision> {
  const inputAlpha = await analyzeAlphaDiagnostics({ sourcePath: input.sourcePath });
  const baseDecision = {
    policy: input.policy,
    mode: input.mode,
    tolerance: input.tolerance,
    feather: input.feather,
    inputTransparentPixelRatio: inputAlpha.transparentPixelRatio
  };

  if (input.policy === "remove") {
    return {
      ...baseDecision,
      action: "removed",
      reason: "background removal was requested explicitly",
      confidence: "high"
    };
  }

  if (input.policy === "preserve") {
    return {
      ...baseDecision,
      action: "preserved",
      reason: "background preservation was requested explicitly",
      confidence: "high",
      outputTransparentPixelRatio: inputAlpha.transparentPixelRatio
    };
  }

  if (inputAlpha.transparentPixelRatio > 0.001) {
    return {
      ...baseDecision,
      action: "preserved",
      reason: "source already has meaningful transparency",
      confidence: "high",
      outputTransparentPixelRatio: inputAlpha.transparentPixelRatio
    };
  }

  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = cleanupAlphaEdges(
    removeSolidBackground(data, {
      width: info.width,
      height: info.height,
      channels: info.channels
    }, input.tolerance, input.mode, input.feather),
    2
  );
  const stats = readAlphaStats(cleaned, {
    width: info.width,
    height: info.height,
    channels: 4
  }, input.frameSlices);

  const outputTransparentPixelRatio = roundRatio(stats.transparentPixelRatio);
  const removedRatio = outputTransparentPixelRatio - inputAlpha.transparentPixelRatio;
  const minRemovedRatio = Math.max(0.015, 1 / Math.max(info.width * info.height, 1));

  if (removedRatio < minRemovedRatio) {
    return {
      ...baseDecision,
      action: "skipped",
      reason: "edge-connected background mask was too small to be safe",
      confidence: "low",
      outputTransparentPixelRatio
    };
  }

  if (outputTransparentPixelRatio > 0.98 || stats.nonTransparentPixels === 0) {
    return {
      ...baseDecision,
      action: "skipped",
      reason: "background removal would erase too much of the image",
      confidence: "low",
      outputTransparentPixelRatio
    };
  }

  if (input.frameSlices?.length) {
    if (stats.emptyFrameIndexes.length > 0) {
      return {
        ...baseDecision,
        action: "skipped",
        reason: `background removal would leave empty frame indexes: ${stats.emptyFrameIndexes.join(", ")}`,
        confidence: "low",
        outputTransparentPixelRatio
      };
    }

    if (stats.frameAlphaRange > 0.7) {
      return {
        ...baseDecision,
        action: "skipped",
        reason: `post-cutout frame alpha coverage range ${roundRatio(stats.frameAlphaRange)} is too high`,
        confidence: "low",
        outputTransparentPixelRatio
      };
    }
  }

  return {
    ...baseDecision,
    action: "removed",
    reason: "source had no alpha and edge-connected background removal passed safety checks",
    confidence: removedRatio > 0.15 ? "high" : "medium",
    outputTransparentPixelRatio
  };
}

export async function detectFrameGrid(input: {
  sourcePath: string;
  frames?: number;
}): Promise<FrameDetectionResult> {
  const metadata = await loadImageMetadata(input.sourcePath);
  const diagnostics: string[] = [];

  if (input.frames && input.frames > 0) {
    const horizontalWidth = metadata.width / input.frames;
    if (Number.isInteger(horizontalWidth) && horizontalWidth > 0) {
      return {
        ok: true,
        sourcePath: input.sourcePath,
        suggested: {
          layout: "horizontal_strip",
          frameWidth: horizontalWidth,
          frameHeight: metadata.height,
          frameCount: input.frames
        },
        confidence: 0.86,
        diagnostics: ["frame count provided; horizontal strip divides evenly"]
      };
    }

    const grid = detectGridWithFrameCount(metadata.width, metadata.height, input.frames);
    if (grid) {
      return {
        ok: true,
        sourcePath: input.sourcePath,
        suggested: grid,
        confidence: 0.74,
        diagnostics: ["frame count provided; grid layout divides evenly"]
      };
    }

    diagnostics.push("provided frame count does not divide image dimensions cleanly");
  }

  if (metadata.width > metadata.height && metadata.width % metadata.height === 0) {
    return {
      ok: true,
      sourcePath: input.sourcePath,
      suggested: {
        layout: "horizontal_strip",
        frameWidth: metadata.height,
        frameHeight: metadata.height,
        frameCount: metadata.width / metadata.height
      },
      confidence: 0.72,
      diagnostics: ["wide image with square horizontal frame heuristic"]
    };
  }

  return {
    ok: true,
    sourcePath: input.sourcePath,
    suggested: {
      layout: "horizontal_strip",
      frameWidth: metadata.width,
      frameHeight: metadata.height,
      frameCount: 1
    },
    confidence: 0.35,
    diagnostics: [...diagnostics, "low confidence; pass --frames or --frame-size for deterministic compile"]
  };
}

export async function analyzeSpriteInvariants(input: {
  sourcePath: string;
  layout: "horizontal" | "horizontal_strip" | "grid";
  frames: number;
  frameWidth: number;
  frameHeight: number;
}): Promise<SpriteInvariantDiagnostics> {
  const metadata = await loadImageMetadata(input.sourcePath);
  const normalizedLayout = input.layout === "horizontal" ? "horizontal_strip" : input.layout;
  const frameValidation = normalizedLayout === "grid"
    ? validateGridFrameSet({
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        frames: input.frames,
        frameWidth: input.frameWidth,
        frameHeight: input.frameHeight
      })
    : validateHorizontalFrameSet({
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        frames: input.frames,
        frameWidth: input.frameWidth,
        frameHeight: input.frameHeight
      });

  const checks: SpriteInvariantCheck[] = [
    {
      name: "frameSizeMatch",
      status: frameValidation.ok ? "passed" : "failed",
      message: frameValidation.reason
    },
    {
      name: "imageWidthDivisible",
      status: metadata.width % input.frameWidth === 0 ? "passed" : "failed",
      message: metadata.width % input.frameWidth === 0 ? undefined : `image width ${metadata.width} is not divisible by ${input.frameWidth}`
    },
    {
      name: "imageHeightDivisible",
      status: metadata.height % input.frameHeight === 0 ? "passed" : "failed",
      message: metadata.height % input.frameHeight === 0 ? undefined : `image height ${metadata.height} is not divisible by ${input.frameHeight}`
    },
    {
      name: "frameCountMatch",
      status: frameValidation.ok ? "passed" : "failed",
      message: frameValidation.reason
    }
  ];

  if (!frameValidation.ok) {
    checks.push(
      { name: "emptyFrame", status: "skipped", message: "frame geometry is invalid" },
      { name: "duplicateFrameApprox", status: "skipped", message: "frame geometry is invalid" },
      { name: "frameBoundsJitter", status: "skipped", message: "frame geometry is invalid" },
      { name: "alphaConsistency", status: "skipped", message: "frame geometry is invalid" }
    );
    return { ok: false, checks };
  }

  const frameSlices = planFrameSlices({
    layout: normalizedLayout,
    imageWidth: metadata.width,
    frames: input.frames,
    frameWidth: input.frameWidth,
    frameHeight: input.frameHeight
  });
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frameStats = frameSlices.map((slice) => readFrameStats(data, info, slice));
  const emptyFrames = frameStats.filter((stat) => stat.alphaPixels === 0).map((stat) => stat.index);
  const duplicatePairs = findDuplicateFramePairs(frameStats);
  const alphaRatios = frameStats.map((stat) => stat.alphaRatio);
  const alphaRange = Math.max(...alphaRatios) - Math.min(...alphaRatios);
  const xPositions = frameStats.filter((stat) => stat.bounds).map((stat) => stat.bounds?.x ?? 0);
  const yPositions = frameStats.filter((stat) => stat.bounds).map((stat) => stat.bounds?.y ?? 0);
  const jitter = Math.max(range(xPositions), range(yPositions));

  checks.push(
    {
      name: "emptyFrame",
      status: emptyFrames.length === 0 ? "passed" : "failed",
      message: emptyFrames.length === 0 ? undefined : `empty frame indexes: ${emptyFrames.join(", ")}`
    },
    {
      name: "duplicateFrameApprox",
      status: duplicatePairs.length === 0 ? "passed" : "failed",
      message: duplicatePairs.length === 0 ? undefined : `duplicate-like frame pairs: ${duplicatePairs.join(", ")}`
    },
    {
      name: "frameBoundsJitter",
      status: jitter <= Math.max(input.frameWidth, input.frameHeight) * 0.35 ? "passed" : "failed",
      message: jitter <= Math.max(input.frameWidth, input.frameHeight) * 0.35 ? undefined : `frame bounds jitter ${jitter}px exceeds threshold`
    },
    {
      name: "alphaConsistency",
      status: alphaRange <= 0.45 ? "passed" : "failed",
      message: alphaRange <= 0.45 ? undefined : `alpha coverage range ${roundRatio(alphaRange)} is high`
    }
  );

  return {
    ok: checks.every((check) => check.status !== "failed"),
    checks
  };
}

export async function normalizeWithPreset(input: {
  sourcePath: string;
  outputPath: string;
  preset: NormalizePreset;
  frameWidth?: number;
  frameHeight?: number;
  removeSolidBackground?: boolean;
  backgroundMode?: BackgroundRemovalMode;
  backgroundTolerance?: number;
  feather?: number;
}): Promise<NormalizedImageOutput | CroppedImageOutput> {
  if (input.preset === "transparent-sprite") {
    return cropAlphaBoundsToPng({
      sourcePath: input.sourcePath,
      outputPath: input.outputPath,
      padding: 0,
      alphaCleanupThreshold: 2,
      removeSolidBackground: input.removeSolidBackground,
      backgroundMode: input.backgroundMode,
      backgroundTolerance: input.backgroundTolerance,
      feather: input.feather
    });
  }

  if (input.preset === "ui-icon") {
    return cropAlphaBoundsToPng({
      sourcePath: input.sourcePath,
      outputPath: input.outputPath,
      padding: 4,
      alphaCleanupThreshold: 2,
      removeSolidBackground: input.removeSolidBackground,
      backgroundMode: input.backgroundMode,
      backgroundTolerance: input.backgroundTolerance,
      feather: input.feather,
      outputSize: { width: 64, height: 64 }
    });
  }

  if (input.removeSolidBackground) {
    return removeBackgroundInPlaceToPng({
      sourcePath: input.sourcePath,
      outputPath: input.outputPath,
      mode: input.backgroundMode ?? "edge-flood",
      tolerance: input.backgroundTolerance ?? 48,
      feather: input.feather ?? 0
    });
  }

  return normalizeImageToPng({
    sourcePath: input.sourcePath,
    outputPath: input.outputPath
  });
}

export async function createFramePreviewSheet(input: {
  sourcePath: string;
  outputPath: string;
  frameSlices: FrameSlice[];
  checkerSize?: number;
}): Promise<FramePreviewSheetOutput> {
  const metadata = await loadImageMetadata(input.sourcePath);
  const frameSlices = input.frameSlices.length > 0
    ? input.frameSlices
    : [{ index: 0, x: 0, y: 0, width: metadata.width, height: metadata.height }];
  const sourcePng = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const checkerboard = createCheckerboardSvg(metadata.width, metadata.height, input.checkerSize ?? 12);
  const overlay = createFramePreviewOverlaySvg(metadata.width, metadata.height, frameSlices);

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  await sharp(Buffer.from(checkerboard))
    .composite([
      { input: sourcePng, left: 0, top: 0 },
      { input: Buffer.from(overlay), left: 0, top: 0 }
    ])
    .png()
    .toFile(input.outputPath);

  return {
    path: input.outputPath,
    metadata: await loadImageMetadata(input.outputPath),
    frameCount: frameSlices.length
  };
}

export async function cropAlphaBoundsToPng(input: {
  sourcePath: string;
  outputPath: string;
  padding?: number;
  alphaThreshold?: number;
  alphaCleanupThreshold?: number;
  removeSolidBackground?: boolean;
  backgroundMode?: BackgroundRemovalMode;
  backgroundTolerance?: number;
  feather?: number;
  outputSize?: OutputSize;
}): Promise<CroppedImageOutput> {
  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  if (input.outputSize && (input.outputSize.width <= 0 || input.outputSize.height <= 0)) {
    throw new Error("outputSize must use positive dimensions.");
  }

  const preparedSourcePath = input.removeSolidBackground
    ? path.join(path.dirname(input.outputPath), `.${path.basename(input.outputPath)}.background-cleaned.tmp.png`)
    : input.sourcePath;

  if (input.removeSolidBackground) {
    await removeSolidBackgroundToPng({
      sourcePath: input.sourcePath,
      outputPath: preparedSourcePath,
      tolerance: input.backgroundTolerance,
      alphaCleanupThreshold: input.alphaCleanupThreshold,
      backgroundMode: input.backgroundMode,
      feather: input.feather
    });
  }

  const sourceMetadata = await loadImageMetadata(preparedSourcePath);
  const detectedBounds = await detectAlphaBounds({
    sourcePath: preparedSourcePath,
    alphaThreshold: input.alphaThreshold
  });
  const bounds = detectedBounds ?? {
    x: 0,
    y: 0,
    width: sourceMetadata.width,
    height: sourceMetadata.height
  };
  const padding = input.padding ?? 0;
  const alphaCleanupThreshold = input.alphaCleanupThreshold ?? 2;

  try {
    const { data, info } = await sharp(preparedSourcePath, { failOn: "error" })
      .ensureAlpha()
      .extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cleaned = cleanupAlphaEdges(data, alphaCleanupThreshold);

    let pipeline = sharp(cleaned, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    });

    if (input.outputSize) {
      pipeline = pipeline.resize({
        width: input.outputSize.width,
        height: input.outputSize.height,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }

    await pipeline.png().toFile(input.outputPath);
  } finally {
    if (input.removeSolidBackground) {
      await fs.rm(preparedSourcePath, { force: true });
    }
  }

  return {
    path: input.outputPath,
    metadata: await loadImageMetadata(input.outputPath),
    bounds,
    padding,
    alphaCleanupThreshold,
    removedSolidBackground: input.removeSolidBackground === true,
    backgroundMode: input.removeSolidBackground ? input.backgroundMode ?? "top-left" : undefined,
    backgroundTolerance: input.removeSolidBackground ? input.backgroundTolerance ?? 12 : undefined,
    feather: input.removeSolidBackground ? input.feather ?? 0 : undefined,
    outputSize: input.outputSize
  };
}

export function createVisualHarnessPlan(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): VisualHarnessPlan {
  return {
    contractId: contract.id,
    mediaType: contract.mediaType,
    stages: [...VISUAL_HARNESS_DEVKIT_STAGES],
    implementationStatus: "planned"
  };
}

export function validateHorizontalFrameSet(input: {
  imageWidth: number;
  imageHeight: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
}): FrameValidationResult {
  const expectedWidth = input.frames * input.frameWidth;
  const expectedHeight = input.frameHeight;
  const ok = input.imageWidth === expectedWidth && input.imageHeight === expectedHeight;

  return {
    ok,
    expectedWidth,
    expectedHeight,
    actualWidth: input.imageWidth,
    actualHeight: input.imageHeight,
    reason: ok
      ? undefined
      : `horizontal strip requires ${expectedWidth}x${expectedHeight}, got ${input.imageWidth}x${input.imageHeight}`
  };
}

export function validateGridFrameSet(input: {
  imageWidth: number;
  imageHeight: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
}): FrameValidationResult {
  const widthDivides = input.imageWidth % input.frameWidth === 0;
  const heightDivides = input.imageHeight % input.frameHeight === 0;
  const columns = Math.floor(input.imageWidth / input.frameWidth);
  const rows = Math.floor(input.imageHeight / input.frameHeight);
  const capacity = columns * rows;
  const ok = widthDivides && heightDivides && input.frames <= capacity;

  return {
    ok,
    expectedWidth: input.imageWidth,
    expectedHeight: input.imageHeight,
    actualWidth: input.imageWidth,
    actualHeight: input.imageHeight,
    reason: ok
      ? undefined
      : `grid requires dimensions divisible by ${input.frameWidth}x${input.frameHeight} and capacity >= ${input.frames}; capacity is ${capacity}`
  };
}

export function planFrameSlices(input: {
  layout: "horizontal" | "horizontal_strip" | "grid";
  imageWidth: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
}): FrameSlice[] {
  if (input.layout === "horizontal" || input.layout === "horizontal_strip") {
    return Array.from({ length: input.frames }, (_, index) => ({
      index,
      x: index * input.frameWidth,
      y: 0,
      width: input.frameWidth,
      height: input.frameHeight
    }));
  }

  const columns = Math.floor(input.imageWidth / input.frameWidth);
  return Array.from({ length: input.frames }, (_, index) => ({
    index,
    x: (index % columns) * input.frameWidth,
    y: Math.floor(index / columns) * input.frameHeight,
    width: input.frameWidth,
    height: input.frameHeight
  }));
}

function normalizeFormat(format: string | undefined): SupportedImageFormat | null {
  if (format === "jpg") return "jpeg";
  if (format === "jpeg" || format === "png" || format === "webp") return format;
  return null;
}

function cleanupAlphaEdges(data: Buffer, alphaThreshold: number): Buffer {
  const cleaned = Buffer.from(data);

  for (let index = 0; index < cleaned.length; index += 4) {
    const alpha = cleaned[index + 3] ?? 0;
    if (alpha > alphaThreshold) continue;

    cleaned[index] = 0;
    cleaned[index + 1] = 0;
    cleaned[index + 2] = 0;
    cleaned[index + 3] = 0;
  }

  return cleaned;
}

function removeSolidBackground(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  tolerance: number,
  mode: BackgroundRemovalMode,
  feather: number
): Buffer {
  if (mode === "edge-flood") {
    return removeEdgeConnectedBackground(data, info, tolerance, feather);
  }

  const cleaned = Buffer.from(data);
  const backgroundRed = cleaned[0] ?? 0;
  const backgroundGreen = cleaned[1] ?? 0;
  const backgroundBlue = cleaned[2] ?? 0;

  for (let index = 0; index < cleaned.length; index += info.channels) {
    const red = cleaned[index] ?? 0;
    const green = cleaned[index + 1] ?? 0;
    const blue = cleaned[index + 2] ?? 0;
    const distance = Math.max(
      Math.abs(red - backgroundRed),
      Math.abs(green - backgroundGreen),
      Math.abs(blue - backgroundBlue)
    );

    if (distance > tolerance) continue;

    cleaned[index] = 0;
    cleaned[index + 1] = 0;
    cleaned[index + 2] = 0;
    cleaned[index + 3] = 0;
  }

  return cleaned;
}

function removeEdgeConnectedBackground(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  tolerance: number,
  feather: number
): Buffer {
  const cleaned = Buffer.from(data);
  const totalPixels = info.width * info.height;
  const removed = new Uint8Array(totalPixels);
  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [];
  const backgroundColor = readPixel(cleaned, 0, info.channels);

  const enqueueIfBackground = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const pixelIndex = y * info.width + x;
    if (visited[pixelIndex]) return;
    const byteIndex = pixelIndex * info.channels;
    const alpha = cleaned[byteIndex + 3] ?? 0;
    if (alpha === 0 || colorDistance(cleaned, byteIndex, backgroundColor) > tolerance) return;
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueueIfBackground(x, 0);
    enqueueIfBackground(x, info.height - 1);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    enqueueIfBackground(0, y);
    enqueueIfBackground(info.width - 1, y);
  }

  while (queue.length > 0) {
    const pixelIndex = queue.shift() ?? 0;
    removed[pixelIndex] = 1;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    enqueueIfBackground(x + 1, y);
    enqueueIfBackground(x - 1, y);
    enqueueIfBackground(x, y + 1);
    enqueueIfBackground(x, y - 1);
  }

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    if (!removed[pixelIndex]) continue;
    const byteIndex = pixelIndex * info.channels;
    cleaned[byteIndex] = 0;
    cleaned[byteIndex + 1] = 0;
    cleaned[byteIndex + 2] = 0;
    cleaned[byteIndex + 3] = 0;
  }

  if (feather > 0) {
    featherRemovedEdge(cleaned, removed, info, feather);
  }

  return cleaned;
}

function readPixel(data: Buffer, pixelIndex: number, channels: number): { red: number; green: number; blue: number } {
  const byteIndex = pixelIndex * channels;
  return {
    red: data[byteIndex] ?? 0,
    green: data[byteIndex + 1] ?? 0,
    blue: data[byteIndex + 2] ?? 0
  };
}

function colorDistance(
  data: Buffer,
  byteIndex: number,
  color: { red: number; green: number; blue: number }
): number {
  return Math.max(
    Math.abs((data[byteIndex] ?? 0) - color.red),
    Math.abs((data[byteIndex + 1] ?? 0) - color.green),
    Math.abs((data[byteIndex + 2] ?? 0) - color.blue)
  );
}

function featherRemovedEdge(
  data: Buffer,
  removed: Uint8Array,
  info: { width: number; height: number; channels: number },
  radius: number
): void {
  const maxRadius = Math.max(1, Math.min(radius, 8));
  const originalAlpha = Buffer.alloc(info.width * info.height);

  for (let pixelIndex = 0; pixelIndex < info.width * info.height; pixelIndex += 1) {
    originalAlpha[pixelIndex] = data[pixelIndex * info.channels + 3] ?? 0;
  }

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixelIndex = y * info.width + x;
      if (removed[pixelIndex] || originalAlpha[pixelIndex] === 0) continue;

      let nearestRemoved = Number.POSITIVE_INFINITY;
      for (let dy = -maxRadius; dy <= maxRadius; dy += 1) {
        for (let dx = -maxRadius; dx <= maxRadius; dx += 1) {
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance === 0 || distance > maxRadius || distance >= nearestRemoved) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
          if (removed[ny * info.width + nx]) nearestRemoved = distance;
        }
      }

      if (!Number.isFinite(nearestRemoved)) continue;
      const alphaScale = Math.max(0.35, nearestRemoved / (maxRadius + 1));
      data[pixelIndex * info.channels + 3] = Math.round((originalAlpha[pixelIndex] ?? 0) * alphaScale);
    }
  }
}

function detectGridWithFrameCount(
  imageWidth: number,
  imageHeight: number,
  frames: number
): FrameDetectionResult["suggested"] | null {
  let best: FrameDetectionResult["suggested"] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= frames; columns += 1) {
    const rows = Math.ceil(frames / columns);
    if (imageWidth % columns !== 0 || imageHeight % rows !== 0) continue;
    const frameWidth = imageWidth / columns;
    const frameHeight = imageHeight / rows;
    const score = Math.abs(frameWidth - frameHeight) + Math.abs(columns - rows) * 4;
    if (score < bestScore) {
      bestScore = score;
      best = {
        layout: "grid",
        frameWidth,
        frameHeight,
        frameCount: frames
      };
    }
  }

  return best;
}

function readFrameStats(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  slice: FrameSlice
): {
  index: number;
  alphaPixels: number;
  alphaRatio: number;
  hash: string;
  bounds: PixelBounds | null;
} {
  let alphaPixels = 0;
  let minX = slice.width;
  let minY = slice.height;
  let maxX = -1;
  let maxY = -1;
  const hash = createHash("sha256");

  for (let localY = 0; localY < slice.height; localY += 1) {
    for (let localX = 0; localX < slice.width; localX += 1) {
      const x = slice.x + localX;
      const y = slice.y + localY;
      const index = (y * info.width + x) * info.channels;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 0;
      hash.update(Buffer.from([red, green, blue, alpha]));
      if (alpha === 0) continue;
      alphaPixels += 1;
      minX = Math.min(minX, localX);
      minY = Math.min(minY, localY);
      maxX = Math.max(maxX, localX);
      maxY = Math.max(maxY, localY);
    }
  }

  return {
    index: slice.index,
    alphaPixels,
    alphaRatio: roundRatio(alphaPixels / Math.max(slice.width * slice.height, 1)),
    hash: hash.digest("hex"),
    bounds: alphaPixels === 0
      ? null
      : {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        }
  };
}

function readAlphaStats(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  frameSlices?: FrameSlice[]
): {
  transparentPixelRatio: number;
  nonTransparentPixels: number;
  emptyFrameIndexes: number[];
  frameAlphaRange: number;
} {
  let transparentPixels = 0;
  let nonTransparentPixels = 0;
  const totalPixels = Math.max(info.width * info.height, 1);

  for (let pixelIndex = 0; pixelIndex < info.width * info.height; pixelIndex += 1) {
    const alpha = data[pixelIndex * info.channels + 3] ?? 0;
    if (alpha === 0) {
      transparentPixels += 1;
    } else {
      nonTransparentPixels += 1;
    }
  }

  const frameStats = frameSlices?.map((slice) => readFrameStats(data, info, slice)) ?? [];
  const alphaRatios = frameStats.map((stat) => stat.alphaRatio);

  return {
    transparentPixelRatio: transparentPixels / totalPixels,
    nonTransparentPixels,
    emptyFrameIndexes: frameStats.filter((stat) => stat.alphaPixels === 0).map((stat) => stat.index),
    frameAlphaRange: range(alphaRatios)
  };
}

function findDuplicateFramePairs(frames: Array<{ index: number; hash: string }>): string[] {
  const seen = new Map<string, number>();
  const pairs: string[] = [];
  for (const frame of frames) {
    const previous = seen.get(frame.hash);
    if (previous !== undefined) {
      pairs.push(`${previous}-${frame.index}`);
    } else {
      seen.set(frame.hash, frame.index);
    }
  }
  return pairs;
}

function range(values: number[]): number {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function createCheckerboardSvg(width: number, height: number, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="checker" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse">
      <rect width="${size * 2}" height="${size * 2}" fill="#f7f7f7"/>
      <rect width="${size}" height="${size}" fill="#d8d8d8"/>
      <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#d8d8d8"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#checker)"/>
</svg>`;
}

function createFramePreviewOverlaySvg(width: number, height: number, frameSlices: FrameSlice[]): string {
  const strokeWidth = Math.max(1, Math.round(Math.min(width, height) / 96));
  const fontSize = Math.max(8, Math.round(Math.min(width, height) / 8));
  const labelPadding = Math.max(2, Math.round(fontSize / 4));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${frameSlices.map((slice) => {
    const label = String(slice.index);
    const labelWidth = Math.max(fontSize, label.length * Math.round(fontSize * 0.65)) + labelPadding * 2;
    const labelHeight = fontSize + labelPadding * 2;
    const labelX = Math.min(slice.x + strokeWidth, Math.max(0, width - labelWidth));
    const labelY = Math.min(slice.y + strokeWidth, Math.max(0, height - labelHeight));

    return `<g>
    <rect x="${slice.x}" y="${slice.y}" width="${slice.width}" height="${slice.height}" fill="none" stroke="#00a6b2" stroke-width="${strokeWidth}"/>
    <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="${labelPadding}" fill="#101010" fill-opacity="0.86"/>
    <text x="${labelX + labelPadding}" y="${labelY + labelPadding + fontSize * 0.82}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${label}</text>
  </g>`;
  }).join("\n  ")}
</svg>`;
}
