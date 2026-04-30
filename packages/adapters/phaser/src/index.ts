import path from "node:path";
import {
  assetIdToCamelCase,
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface PhaserAssetDescriptor {
  id: string;
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  publicUrl: string;
  codegenPath: string | null;
  manifestPath: string;
}

export function createPhaserAssetDescriptor(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): PhaserAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "src";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const publicUrl = assetPath.startsWith("public/")
    ? `/${assetPath.slice("public/".length)}`
    : `/${assetPath}`;
  const animationFile = `${fileStem}.ts`;

  return {
    id: contract.id,
    type:
      contract.mediaType === "visual.sprite_frame_set"
        ? "sprite_frame_set"
        : "transparent_sprite",
    assetPath,
    publicUrl,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "openrender", "animations", animationFile))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "assets", "openrender-manifest.ts"))
  };
}

export function generateManifestSource(contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>): string {
  const entries = contracts.map((contract) => {
    const descriptor = createPhaserAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  ${JSON.stringify(contract.id)}: {
    type: "sprite_frame_set",
    engine: "phaser",
    url: ${JSON.stringify(descriptor.publicUrl)},
    frameWidth: ${contract.visual.frameWidth},
    frameHeight: ${contract.visual.frameHeight},
    frames: ${contract.visual.frames},
    fps: ${contract.visual.fps ?? 8}
  }`;
    }

    return `  ${JSON.stringify(contract.id)}: {
    type: "transparent_sprite",
    engine: "phaser",
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

export function generateAnimationHelperSource(contract: SpriteFrameSetContract): string {
  const descriptor = createPhaserAssetDescriptor(contract);
  const symbolName = assetIdToCamelCase(contract.id);
  const pascalName = `${symbolName.charAt(0).toUpperCase()}${symbolName.slice(1)}`;
  const assetConstName = `${symbolName}Asset`;

  return `import type Phaser from "phaser";

export const ${assetConstName} = {
  key: ${JSON.stringify(contract.id)},
  url: ${JSON.stringify(descriptor.publicUrl)},
  frameWidth: ${contract.visual.frameWidth},
  frameHeight: ${contract.visual.frameHeight},
  frames: ${contract.visual.frames},
  frameRate: ${contract.visual.fps ?? 8}
} as const;

export function preload${pascalName}(scene: Phaser.Scene) {
  scene.load.spritesheet(${assetConstName}.key, ${assetConstName}.url, {
    frameWidth: ${assetConstName}.frameWidth,
    frameHeight: ${assetConstName}.frameHeight
  });
}

export function register${pascalName}(scene: Phaser.Scene) {
  if (scene.anims.exists(${assetConstName}.key)) return;

  scene.anims.create({
    key: ${assetConstName}.key,
    frames: scene.anims.generateFrameNumbers(${assetConstName}.key, {
      start: 0,
      end: ${assetConstName}.frames - 1
    }),
    frameRate: ${assetConstName}.frameRate,
    repeat: -1
  });
}
`;
}
