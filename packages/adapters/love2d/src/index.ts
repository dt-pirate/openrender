import path from "node:path";
import {
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface Love2DFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Love2DAssetDescriptor {
  id: string;
  engine: "love2d";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type Love2DInstallPlanEntry =
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

export interface Love2DInstallPlan {
  id: string;
  enabled: boolean;
  files: Love2DInstallPlanEntry[];
}

export function createLove2DAssetDescriptor(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): Love2DAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "openrender";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const helperFile = `${fileStem}.lua`;

  return {
    id: contract.id,
    engine: "love2d",
    type:
      contract.mediaType === "visual.sprite_frame_set"
        ? "sprite_frame_set"
        : "transparent_sprite",
    assetPath,
    loadPath: assetPath,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "animations", helperFile))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "openrender_assets.lua"))
  };
}

export function generateLove2DManifestSource(
  contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>
): string {
  const entries = contracts.map((contract) => {
    const descriptor = createLove2DAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  [${JSON.stringify(contract.id)}] = {
    type = "sprite_frame_set",
    engine = "love2d",
    path = ${JSON.stringify(descriptor.loadPath)},
    frame_width = ${contract.visual.frameWidth},
    frame_height = ${contract.visual.frameHeight},
    frames = ${contract.visual.frames},
    fps = ${contract.visual.fps ?? 8}
  }`;
    }

    return `  [${JSON.stringify(contract.id)}] = {
    type = "transparent_sprite",
    engine = "love2d",
    path = ${JSON.stringify(descriptor.loadPath)},
    width = ${contract.visual.outputWidth},
    height = ${contract.visual.outputHeight}
  }`;
  });

  return `local assets = {
${entries.join(",\n")}
}

return assets
`;
}

export function generateLove2DAnimationHelperSource(
  contract: SpriteFrameSetContract,
  frameSlices?: Love2DFrameSlice[]
): string {
  const descriptor = createLove2DAssetDescriptor(contract);
  const slices = frameSlices?.length
    ? frameSlices
    : createHorizontalSlices(contract);
  const sliceSource = slices
    .map((slice) => `  { x = ${slice.x}, y = ${slice.y}, width = ${slice.width}, height = ${slice.height} }`)
    .join(",\n");

  return `local M = {}

M.asset_id = ${JSON.stringify(contract.id)}
M.path = ${JSON.stringify(descriptor.loadPath)}
M.frame_width = ${contract.visual.frameWidth}
M.frame_height = ${contract.visual.frameHeight}
M.frame_count = ${contract.visual.frames}
M.fps = ${contract.visual.fps ?? 8}
M.frame_slices = {
${sliceSource}
}

function M.load(image)
  local sheet = image or love.graphics.newImage(M.path)
  local quads = {}
  local sheet_width, sheet_height = sheet:getDimensions()

  for index, slice in ipairs(M.frame_slices) do
    quads[index] = love.graphics.newQuad(
      slice.x,
      slice.y,
      slice.width,
      slice.height,
      sheet_width,
      sheet_height
    )
  end

  return {
    image = sheet,
    quads = quads,
    fps = M.fps,
    frame_count = M.frame_count
  }
end

function M.anim8_grid()
  return {
    frame_width = M.frame_width,
    frame_height = M.frame_height,
    path = M.path,
    frames = M.frame_count,
    fps = M.fps
  }
end

M.usage_snippet = [[
local asset = require("${descriptor.codegenPath?.replace(/\.lua$/, "").replaceAll("/", ".") ?? "openrender.animations.asset"}")
local state

function love.load()
  state = asset.load()
end

function love.draw()
  local frame = 1
  love.graphics.draw(state.image, state.quads[frame], 0, 0)
end
]]

return M
`;
}

export function createLove2DInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: Love2DFrameSlice[];
}): Love2DInstallPlan {
  const descriptor = createLove2DAssetDescriptor(input.contract);
  const files: Love2DInstallPlanEntry[] = [
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
      contents: generateLove2DManifestSource([input.contract])
    });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({
      kind: "codegen",
      action: "write",
      to: descriptor.codegenPath,
      contents: generateLove2DAnimationHelperSource(input.contract, input.frameSlices)
    });
  }

  return {
    id: input.contract.id,
    enabled: input.contract.install.enabled,
    files
  };
}

function createHorizontalSlices(contract: SpriteFrameSetContract): Love2DFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}
