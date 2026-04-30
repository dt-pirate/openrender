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
}): Promise<NormalizedImageOutput> {
  const tolerance = input.tolerance ?? 12;
  const alphaCleanupThreshold = input.alphaCleanupThreshold ?? 2;
  const { data, info } = await sharp(input.sourcePath, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = cleanupAlphaEdges(
    removeSolidBackground(data, tolerance),
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

export async function cropAlphaBoundsToPng(input: {
  sourcePath: string;
  outputPath: string;
  padding?: number;
  alphaThreshold?: number;
  alphaCleanupThreshold?: number;
  removeSolidBackground?: boolean;
  backgroundTolerance?: number;
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
      alphaCleanupThreshold: input.alphaCleanupThreshold
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

function removeSolidBackground(data: Buffer, tolerance: number): Buffer {
  const cleaned = Buffer.from(data);
  const backgroundRed = cleaned[0] ?? 0;
  const backgroundGreen = cleaned[1] ?? 0;
  const backgroundBlue = cleaned[2] ?? 0;

  for (let index = 0; index < cleaned.length; index += 4) {
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
