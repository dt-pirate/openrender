import path from "node:path";
import {
  assetIdToCamelCase,
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface ThreeFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThreeAssetDescriptor {
  id: string;
  engine: "three";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  publicUrl: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type ThreeInstallPlanEntry =
  | { kind: "compiled_asset"; action: "copy"; from: string; to: string }
  | { kind: "manifest" | "codegen"; action: "write"; to: string; contents: string };

export interface ThreeInstallPlan {
  id: string;
  enabled: boolean;
  files: ThreeInstallPlanEntry[];
}

export function createThreeAssetDescriptor(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): ThreeAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "src";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const publicUrl = assetPath.startsWith("public/") ? `/${assetPath.slice("public/".length)}` : `/${assetPath}`;

  return {
    id: contract.id,
    engine: "three",
    type: contract.mediaType === "visual.sprite_frame_set" ? "sprite_frame_set" : "transparent_sprite",
    assetPath,
    loadPath: publicUrl,
    publicUrl,
    codegenPath: contract.install.writeCodegen
      ? toPosixPath(path.posix.join(sourceRoot, "openrender", "three", `${fileStem}.ts`))
      : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "assets", "openrender-manifest.ts"))
  };
}

export function generateThreeManifestSource(contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>): string {
  const entries = contracts.map((contract) => {
    const descriptor = createThreeAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  ${JSON.stringify(contract.id)}: {
    type: "sprite_frame_set",
    engine: "three",
    url: ${JSON.stringify(descriptor.publicUrl)},
    frameWidth: ${contract.visual.frameWidth},
    frameHeight: ${contract.visual.frameHeight},
    frames: ${contract.visual.frames},
    fps: ${contract.visual.fps ?? 8}
  }`;
    }

    return `  ${JSON.stringify(contract.id)}: {
    type: "transparent_sprite",
    engine: "three",
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

export function generateThreeHelperSource(
  contract: SpriteFrameSetContract | TransparentSpriteContract,
  frameSlices?: ThreeFrameSlice[]
): string {
  const descriptor = createThreeAssetDescriptor(contract);
  const symbolName = assetIdToCamelCase(contract.id);
  const pascalName = `${symbolName.charAt(0).toUpperCase()}${symbolName.slice(1)}`;
  const isFrameSet = contract.mediaType === "visual.sprite_frame_set";
  const slices = isFrameSet
    ? frameSlices?.length
      ? frameSlices
      : createHorizontalSlices(contract)
    : [{
        index: 0,
        x: 0,
        y: 0,
        width: contract.visual.outputWidth,
        height: contract.visual.outputHeight
      }];
  const sheetSize = createSheetSize(slices);
  const width = isFrameSet ? contract.visual.frameWidth : contract.visual.outputWidth;
  const height = isFrameSet ? contract.visual.frameHeight : contract.visual.outputHeight;
  const fps = isFrameSet ? contract.visual.fps ?? 8 : 0;

  return `import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader
} from "three";

export const ${symbolName}Asset = {
  id: ${JSON.stringify(contract.id)},
  url: ${JSON.stringify(descriptor.publicUrl)},
  width: ${width},
  height: ${height},
  sheetWidth: ${sheetSize.width},
  sheetHeight: ${sheetSize.height},
  frameRate: ${fps},
  frames: ${JSON.stringify(slices)}
} as const;

export async function load${pascalName}Texture(loader = new TextureLoader()) {
  const texture = await loader.loadAsync(${symbolName}Asset.url);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function create${pascalName}FrameTexture(baseTexture: Texture, frameIndex = 0) {
  const frame = ${symbolName}Asset.frames[frameIndex];
  if (!frame) throw new Error("Unknown frame index: " + frameIndex);

  const texture = baseTexture.clone();
  texture.needsUpdate = true;
  texture.repeat.set(frame.width / ${symbolName}Asset.sheetWidth, frame.height / ${symbolName}Asset.sheetHeight);
  texture.offset.set(frame.x / ${symbolName}Asset.sheetWidth, 1 - (frame.y + frame.height) / ${symbolName}Asset.sheetHeight);
  return texture;
}

export function create${pascalName}SpriteMaterial(texture: Texture, frameIndex = 0) {
  return new SpriteMaterial({
    map: create${pascalName}FrameTexture(texture, frameIndex),
    transparent: true
  });
}

export function create${pascalName}Sprite(texture: Texture, frameIndex = 0, pixelsPerUnit = 100) {
  const sprite = new Sprite(create${pascalName}SpriteMaterial(texture, frameIndex));
  const frame = ${symbolName}Asset.frames[frameIndex] ?? ${symbolName}Asset.frames[0];
  sprite.scale.set(frame.width / pixelsPerUnit, frame.height / pixelsPerUnit, 1);
  return sprite;
}

export function create${pascalName}PlaneMaterial(texture: Texture, frameIndex = 0) {
  return new MeshBasicMaterial({
    map: create${pascalName}FrameTexture(texture, frameIndex),
    transparent: true,
    side: DoubleSide
  });
}

export function create${pascalName}Plane(texture: Texture, frameIndex = 0, pixelsPerUnit = 100) {
  const frame = ${symbolName}Asset.frames[frameIndex] ?? ${symbolName}Asset.frames[0];
  const geometry = new PlaneGeometry(frame.width / pixelsPerUnit, frame.height / pixelsPerUnit);
  return new Mesh(geometry, create${pascalName}PlaneMaterial(texture, frameIndex));
}
`;
}

export function createThreeInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: ThreeFrameSlice[];
}): ThreeInstallPlan {
  const descriptor = createThreeAssetDescriptor(input.contract);
  const files: ThreeInstallPlanEntry[] = [
    { kind: "compiled_asset", action: "copy", from: input.compiledAssetPath, to: descriptor.assetPath }
  ];

  if (input.contract.install.writeManifest) {
    files.push({ kind: "manifest", action: "write", to: descriptor.manifestPath, contents: generateThreeManifestSource([input.contract]) });
  }

  if (descriptor.codegenPath) {
    files.push({ kind: "codegen", action: "write", to: descriptor.codegenPath, contents: generateThreeHelperSource(input.contract, input.frameSlices) });
  }

  return { id: input.contract.id, enabled: input.contract.install.enabled, files };
}

function createHorizontalSlices(contract: SpriteFrameSetContract): ThreeFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}

function createSheetSize(slices: ThreeFrameSlice[]): { width: number; height: number } {
  return slices.reduce(
    (size, slice) => ({
      width: Math.max(size.width, slice.x + slice.width),
      height: Math.max(size.height, slice.y + slice.height)
    }),
    { width: 1, height: 1 }
  );
}
