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

export const VISUAL_HARNESS_POC_STAGES = [
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

export function createVisualHarnessPlan(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): VisualHarnessPlan {
  return {
    contractId: contract.id,
    mediaType: contract.mediaType,
    stages: [...VISUAL_HARNESS_POC_STAGES],
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

function normalizeFormat(format: string | undefined): SupportedImageFormat | null {
  if (format === "jpg") return "jpeg";
  if (format === "jpeg" || format === "png" || format === "webp") return format;
  return null;
}
