import path from "node:path";
import {
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface GodotFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GodotAssetDescriptor {
  id: string;
  engine: "godot";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type GodotInstallPlanEntry =
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

export interface GodotInstallPlan {
  id: string;
  enabled: boolean;
  files: GodotInstallPlanEntry[];
}

export function createGodotAssetDescriptor(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): GodotAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "scripts/openrender";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));
  const helperFile = `${fileStem}.gd`;

  return {
    id: contract.id,
    engine: "godot",
    type:
      contract.mediaType === "visual.sprite_frame_set"
        ? "sprite_frame_set"
        : "transparent_sprite",
    assetPath,
    loadPath: `res://${assetPath}`,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "animations", helperFile))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "openrender_assets.gd"))
  };
}

export function generateGodotManifestSource(
  contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>
): string {
  const entries = contracts.map((contract) => {
    const descriptor = createGodotAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `  ${JSON.stringify(contract.id)}: {
    "type": "sprite_frame_set",
    "engine": "godot",
    "path": ${JSON.stringify(descriptor.loadPath)},
    "frame_width": ${contract.visual.frameWidth},
    "frame_height": ${contract.visual.frameHeight},
    "frames": ${contract.visual.frames},
    "fps": ${contract.visual.fps ?? 8}
  }`;
    }

    return `  ${JSON.stringify(contract.id)}: {
    "type": "transparent_sprite",
    "engine": "godot",
    "path": ${JSON.stringify(descriptor.loadPath)},
    "width": ${contract.visual.outputWidth},
    "height": ${contract.visual.outputHeight}
  }`;
  });

  return `extends RefCounted

const OPENRENDER_ASSETS := {
${entries.join(",\n")}
}

static func get_asset(asset_id: String) -> Dictionary:
  return OPENRENDER_ASSETS.get(asset_id, {})
`;
}

export function generateGodotAnimationHelperSource(
  contract: SpriteFrameSetContract,
  frameSlices?: GodotFrameSlice[]
): string {
  const descriptor = createGodotAssetDescriptor(contract);
  const slices = frameSlices?.length
    ? frameSlices
    : createHorizontalSlices(contract);
  const sliceSource = slices
    .map((slice) => `  {"x": ${slice.x}, "y": ${slice.y}, "width": ${slice.width}, "height": ${slice.height}}`)
    .join(",\n");

  return `extends RefCounted

const ASSET_ID := ${JSON.stringify(contract.id)}
const ASSET_PATH := ${JSON.stringify(descriptor.loadPath)}
const FRAME_WIDTH := ${contract.visual.frameWidth}
const FRAME_HEIGHT := ${contract.visual.frameHeight}
const FRAME_COUNT := ${contract.visual.frames}
const FPS := ${contract.visual.fps ?? 8}
const FRAME_SLICES := [
${sliceSource}
]

static func load_texture() -> Texture2D:
  return load(ASSET_PATH) as Texture2D

static func validate_resource_path() -> bool:
  return ASSET_PATH.begins_with("res://")

static func create_sprite_frames(animation_name: String = "default") -> SpriteFrames:
  var sprite_frames := SpriteFrames.new()
  sprite_frames.add_animation(animation_name)
  sprite_frames.set_animation_speed(animation_name, FPS)
  sprite_frames.set_animation_loop(animation_name, true)

  var sheet := load_texture()
  if sheet == null:
    return sprite_frames

  for slice in FRAME_SLICES:
    var atlas := AtlasTexture.new()
    atlas.atlas = sheet
    atlas.region = Rect2(slice["x"], slice["y"], slice["width"], slice["height"])
    sprite_frames.add_frame(animation_name, atlas)

  return sprite_frames

static func animated_sprite2d_snippet(node_name: String = "AnimatedSprite2D") -> String:
  return "var sprite := " + node_name + "\\n" + "sprite.sprite_frames = create_sprite_frames()\\n" + "sprite.play()"
`;
}

export function createGodotInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: GodotFrameSlice[];
}): GodotInstallPlan {
  const descriptor = createGodotAssetDescriptor(input.contract);
  const files: GodotInstallPlanEntry[] = [
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
      contents: generateGodotManifestSource([input.contract])
    });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({
      kind: "codegen",
      action: "write",
      to: descriptor.codegenPath,
      contents: generateGodotAnimationHelperSource(input.contract, input.frameSlices)
    });
  }

  return {
    id: input.contract.id,
    enabled: input.contract.install.enabled,
    files
  };
}

function createHorizontalSlices(contract: SpriteFrameSetContract): GodotFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}
