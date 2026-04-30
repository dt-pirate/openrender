import type { SpriteFrameSetContract, TransparentSpriteContract } from "@openrender/core";

export interface ImageMetadata {
  width: number;
  height: number;
  format: "png" | "webp" | "jpeg" | "unknown";
  hasAlpha: boolean;
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
