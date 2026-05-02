import path from "node:path";
import {
  assetIdToCamelCase,
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface PixiFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixiAssetDescriptor {
  id: string;
  engine: "pixi";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  publicUrl: string;
  spritesheetJsonPath: string | null;
  codegenPath: string | null;
  manifestPath: string;
}

export type PixiInstallPlanEntry =
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

export interface PixiInstallPlan {
  id: string;
  enabled: boolean;
  files: PixiInstallPlanEntry[];
}

export function createPixiAssetDescriptor(contract: SpriteFrameSetContract | TransparentSpriteContract): PixiAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "src";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const publicUrl = assetPath.startsWith("public/") ? `/${assetPath.slice("public/".length)}` : `/${assetPath}`;

  return {
    id: contract.id,
    engine: "pixi",
    type: contract.mediaType === "visual.sprite_frame_set" ? "sprite_frame_set" : "transparent_sprite",
    assetPath,
    loadPath: publicUrl,
    publicUrl,
    spritesheetJsonPath:
      contract.mediaType === "visual.sprite_frame_set"
        ? toPosixPath(path.posix.join(assetRoot, `${fileStem}.spritesheet.json`))
        : null,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "openrender", "pixi", `${fileStem}.ts`))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "assets", "openrender-manifest.ts"))
  };
}

export function generatePixiManifestSource(contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>): string {
  const entries = contracts.map((contract) => {
    const descriptor = createPixiAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  ${JSON.stringify(contract.id)}: {
    type: "sprite_frame_set",
    engine: "pixi",
    url: ${JSON.stringify(descriptor.publicUrl)},
    spritesheetJson: ${JSON.stringify(toPublicUrl(descriptor.spritesheetJsonPath ?? ""))},
    frameWidth: ${contract.visual.frameWidth},
    frameHeight: ${contract.visual.frameHeight},
    frames: ${contract.visual.frames},
    fps: ${contract.visual.fps ?? 8}
  }`;
    }

    return `  ${JSON.stringify(contract.id)}: {
    type: "transparent_sprite",
    engine: "pixi",
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

export function generatePixiAnimationHelperSource(contract: SpriteFrameSetContract, frameSlices?: PixiFrameSlice[]): string {
  const descriptor = createPixiAssetDescriptor(contract);
  const symbolName = assetIdToCamelCase(contract.id);
  const pascalName = `${symbolName.charAt(0).toUpperCase()}${symbolName.slice(1)}`;
  const slices = frameSlices?.length ? frameSlices : createHorizontalSlices(contract);

  return `import { Assets, AnimatedSprite, Texture, Rectangle } from "pixi.js";

export const ${symbolName}Asset = {
  id: ${JSON.stringify(contract.id)},
  url: ${JSON.stringify(descriptor.publicUrl)},
  frameRate: ${contract.visual.fps ?? 8},
  frames: ${JSON.stringify(slices)}
} as const;

export async function load${pascalName}Texture() {
  return Assets.load<Texture>(${symbolName}Asset.url);
}

export async function create${pascalName}AnimatedSprite() {
  const base = await load${pascalName}Texture();
  const textures = ${symbolName}Asset.frames.map((frame) =>
    new Texture({ source: base.source, frame: new Rectangle(frame.x, frame.y, frame.width, frame.height) })
  );
  const sprite = new AnimatedSprite(textures);
  sprite.animationSpeed = ${symbolName}Asset.frameRate / 60;
  return sprite;
}
`;
}

export function generatePixiSpritesheetJson(contract: SpriteFrameSetContract, frameSlices?: PixiFrameSlice[]): string {
  const descriptor = createPixiAssetDescriptor(contract);
  const slices = frameSlices?.length ? frameSlices : createHorizontalSlices(contract);
  const frames = Object.fromEntries(slices.map((slice) => [
    `${assetIdToKebabCase(contract.id)}_${slice.index}`,
    {
      frame: { x: slice.x, y: slice.y, w: slice.width, h: slice.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: slice.width, h: slice.height },
      sourceSize: { w: slice.width, h: slice.height }
    }
  ]));

  return `${JSON.stringify({ frames, meta: { image: path.posix.basename(descriptor.assetPath), scale: "1" } }, null, 2)}\n`;
}

export function createPixiInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: PixiFrameSlice[];
}): PixiInstallPlan {
  const descriptor = createPixiAssetDescriptor(input.contract);
  const files: PixiInstallPlanEntry[] = [
    { kind: "compiled_asset", action: "copy", from: input.compiledAssetPath, to: descriptor.assetPath }
  ];

  if (input.contract.install.writeManifest) {
    files.push({ kind: "manifest", action: "write", to: descriptor.manifestPath, contents: generatePixiManifestSource([input.contract]) });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.spritesheetJsonPath) {
    files.push({ kind: "manifest", action: "write", to: descriptor.spritesheetJsonPath, contents: generatePixiSpritesheetJson(input.contract, input.frameSlices) });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({ kind: "codegen", action: "write", to: descriptor.codegenPath, contents: generatePixiAnimationHelperSource(input.contract, input.frameSlices) });
  }

  return { id: input.contract.id, enabled: input.contract.install.enabled, files };
}

function toPublicUrl(assetPath: string): string {
  return assetPath.startsWith("public/") ? `/${assetPath.slice("public/".length)}` : `/${assetPath}`;
}

function createHorizontalSlices(contract: SpriteFrameSetContract): PixiFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}
