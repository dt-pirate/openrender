import path from "node:path";
import {
  assetIdToCamelCase,
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface CanvasFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasAssetDescriptor {
  id: string;
  engine: "canvas";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  publicUrl: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type CanvasInstallPlanEntry =
  | { kind: "compiled_asset"; action: "copy"; from: string; to: string }
  | { kind: "manifest" | "codegen"; action: "write"; to: string; contents: string };

export interface CanvasInstallPlan {
  id: string;
  enabled: boolean;
  files: CanvasInstallPlanEntry[];
}

export function createCanvasAssetDescriptor(contract: SpriteFrameSetContract | TransparentSpriteContract): CanvasAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "src";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const publicUrl = assetPath.startsWith("public/") ? `/${assetPath.slice("public/".length)}` : `/${assetPath}`;

  return {
    id: contract.id,
    engine: "canvas",
    type: contract.mediaType === "visual.sprite_frame_set" ? "sprite_frame_set" : "transparent_sprite",
    assetPath,
    loadPath: publicUrl,
    publicUrl,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "openrender", "canvas", `${fileStem}.ts`))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "assets", "openrender-manifest.ts"))
  };
}

export function generateCanvasManifestSource(contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>): string {
  const entries = contracts.map((contract) => {
    const descriptor = createCanvasAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  ${JSON.stringify(contract.id)}: {
    type: "sprite_frame_set",
    engine: "canvas",
    url: ${JSON.stringify(descriptor.publicUrl)},
    frameWidth: ${contract.visual.frameWidth},
    frameHeight: ${contract.visual.frameHeight},
    frames: ${contract.visual.frames},
    fps: ${contract.visual.fps ?? 8}
  }`;
    }

    return `  ${JSON.stringify(contract.id)}: {
    type: "transparent_sprite",
    engine: "canvas",
    url: ${JSON.stringify(descriptor.publicUrl)},
    width: ${contract.visual.outputWidth},
    height: ${contract.visual.outputHeight}
  }`;
  });

  return `export const openRenderAssets = {
${entries.join(",\n")}
} as const;

export type OpenRenderAssetId = keyof typeof openRenderAssets;
`;
}

export function generateCanvasAnimationHelperSource(contract: SpriteFrameSetContract, frameSlices?: CanvasFrameSlice[]): string {
  const descriptor = createCanvasAssetDescriptor(contract);
  const symbolName = assetIdToCamelCase(contract.id);
  const slices = frameSlices?.length ? frameSlices : createHorizontalSlices(contract);

  return `export const ${symbolName}Asset = {
  id: ${JSON.stringify(contract.id)},
  url: ${JSON.stringify(descriptor.publicUrl)},
  frameWidth: ${contract.visual.frameWidth},
  frameHeight: ${contract.visual.frameHeight},
  frames: ${JSON.stringify(slices)}
} as const;

export async function loadImageAsset(url = ${symbolName}Asset.url): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  frameIndex: number,
  x: number,
  y: number
) {
  const frame = ${symbolName}Asset.frames[frameIndex];
  if (!frame) throw new Error("Unknown frame index: " + frameIndex);
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, frame.width, frame.height);
}
`;
}

export function createCanvasInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: CanvasFrameSlice[];
}): CanvasInstallPlan {
  const descriptor = createCanvasAssetDescriptor(input.contract);
  const files: CanvasInstallPlanEntry[] = [
    { kind: "compiled_asset", action: "copy", from: input.compiledAssetPath, to: descriptor.assetPath }
  ];

  if (input.contract.install.writeManifest) {
    files.push({ kind: "manifest", action: "write", to: descriptor.manifestPath, contents: generateCanvasManifestSource([input.contract]) });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({ kind: "codegen", action: "write", to: descriptor.codegenPath, contents: generateCanvasAnimationHelperSource(input.contract, input.frameSlices) });
  }

  return { id: input.contract.id, enabled: input.contract.install.enabled, files };
}

function createHorizontalSlices(contract: SpriteFrameSetContract): CanvasFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}
