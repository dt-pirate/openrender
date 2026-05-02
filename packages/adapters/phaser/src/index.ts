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
  engine: "phaser";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  publicUrl: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type PhaserInstallPlanEntry =
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

export interface PhaserInstallPlan {
  id: string;
  enabled: boolean;
  files: PhaserInstallPlanEntry[];
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
    engine: "phaser",
    type:
      contract.mediaType === "visual.sprite_frame_set"
        ? "sprite_frame_set"
        : "transparent_sprite",
    assetPath,
    loadPath: publicUrl,
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

export function create${pascalName}Sprite(scene: Phaser.Scene, x: number, y: number) {
  register${pascalName}(scene);
  return scene.add.sprite(x, y, ${assetConstName}.key, 0);
}

export function configure${pascalName}ArcadeBody(sprite: Phaser.Physics.Arcade.Sprite) {
  sprite.body?.setSize(${assetConstName}.frameWidth, ${assetConstName}.frameHeight);
  return sprite;
}

export const ${symbolName}SceneSnippet = ${JSON.stringify(`preload${pascalName}(this);
register${pascalName}(this);
const sprite = create${pascalName}Sprite(this, x, y);`)};
`;
}

export function createPhaserInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
}): PhaserInstallPlan {
  const descriptor = createPhaserAssetDescriptor(input.contract);
  const files: PhaserInstallPlanEntry[] = [
    {
      kind: "compiled_asset",
      action: "copy",
      from: input.compiledAssetPath,
      to: descriptor.assetPath
    }
  ];

  if (input.contract.install.writeManifest) {
    files.push({
      kind: "manifest",
      action: "write",
      to: descriptor.manifestPath,
      contents: generateManifestSource([input.contract])
    });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({
      kind: "codegen",
      action: "write",
      to: descriptor.codegenPath,
      contents: generateAnimationHelperSource(input.contract)
    });
  }

  return {
    id: input.contract.id,
    enabled: input.contract.install.enabled,
    files
  };
}
