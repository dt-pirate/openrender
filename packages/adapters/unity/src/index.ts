import path from "node:path";
import {
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  toPosixPath,
  type SpriteFrameSetContract,
  type TransparentSpriteContract
} from "@openrender/core";

export interface UnityFrameSlice {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UnityAssetDescriptor {
  id: string;
  engine: "unity";
  type: "sprite_frame_set" | "transparent_sprite";
  assetPath: string;
  loadPath: string;
  codegenPath: string | null;
  manifestPath: string;
}

export type UnityInstallPlanEntry =
  | { kind: "compiled_asset"; action: "copy"; from: string; to: string }
  | { kind: "manifest" | "codegen"; action: "write"; to: string; contents: string };

export interface UnityInstallPlan {
  id: string;
  enabled: boolean;
  files: UnityInstallPlanEntry[];
}

export function createUnityAssetDescriptor(
  contract: SpriteFrameSetContract | TransparentSpriteContract
): UnityAssetDescriptor {
  const assetRoot = normalizeProjectRelativePath(contract.install.assetRoot);
  const sourceRoot = "Assets/OpenRender";
  const fileStem = assetIdToKebabCase(contract.id);
  const assetPath = toPosixPath(path.posix.join(assetRoot, `${fileStem}.png`));

  return {
    id: contract.id,
    engine: "unity",
    type: contract.mediaType === "visual.sprite_frame_set" ? "sprite_frame_set" : "transparent_sprite",
    assetPath,
    loadPath: assetPath,
    codegenPath:
      contract.mediaType === "visual.sprite_frame_set" && contract.install.writeCodegen
        ? toPosixPath(path.posix.join(sourceRoot, "Sprites", `${assetIdToPascalCase(contract.id)}Sprites.cs`))
        : null,
    manifestPath: toPosixPath(path.posix.join(sourceRoot, "OpenRenderAssets.cs"))
  };
}

export function generateUnityManifestSource(
  contracts: Array<SpriteFrameSetContract | TransparentSpriteContract>
): string {
  const entries = contracts.map((contract) => {
    const descriptor = createUnityAssetDescriptor(contract);
    if (contract.mediaType === "visual.sprite_frame_set") {
      return `      new AssetInfo {
        Id = ${toCSharpString(contract.id)},
        Type = "sprite_frame_set",
        Path = ${toCSharpString(descriptor.loadPath)},
        FrameWidth = ${contract.visual.frameWidth},
        FrameHeight = ${contract.visual.frameHeight},
        Frames = ${contract.visual.frames},
        Fps = ${contract.visual.fps ?? 8}
      }`;
    }

    return `      new AssetInfo {
        Id = ${toCSharpString(contract.id)},
        Type = "transparent_sprite",
        Path = ${toCSharpString(descriptor.loadPath)},
        Width = ${contract.visual.outputWidth},
        Height = ${contract.visual.outputHeight}
      }`;
  });

  return `namespace OpenRender
{
  public sealed class AssetInfo
  {
    public string Id;
    public string Type;
    public string Path;
    public int Width;
    public int Height;
    public int FrameWidth;
    public int FrameHeight;
    public int Frames;
    public int Fps;
  }

  public static class OpenRenderAssets
  {
    public static readonly AssetInfo[] All = new AssetInfo[]
    {
${entries.join(",\n")}
    };

    public static AssetInfo Find(string id)
    {
      for (var index = 0; index < All.Length; index++)
      {
        if (All[index].Id == id) return All[index];
      }

      return null;
    }
  }
}
`;
}

export function generateUnityAnimationHelperSource(
  contract: SpriteFrameSetContract,
  frameSlices?: UnityFrameSlice[]
): string {
  const descriptor = createUnityAssetDescriptor(contract);
  const className = `${assetIdToPascalCase(contract.id)}Sprites`;
  const slices = frameSlices?.length ? frameSlices : createHorizontalSlices(contract);
  const rects = slices
    .map((slice) => `      new Rect(${slice.x}f, ${slice.y}f, ${slice.width}f, ${slice.height}f)`)
    .join(",\n");

  return `using UnityEngine;

namespace OpenRender
{
  public static class ${className}
  {
    public const string AssetId = ${toCSharpString(contract.id)};
    public const string AssetPath = ${toCSharpString(descriptor.loadPath)};
    public const int FrameWidth = ${contract.visual.frameWidth};
    public const int FrameHeight = ${contract.visual.frameHeight};
    public const int FrameCount = ${contract.visual.frames};
    public const int Fps = ${contract.visual.fps ?? 8};

    public static readonly Rect[] FrameRects = new Rect[]
    {
${rects}
    };

    public static Sprite[] CreateSprites(Texture2D texture, float pixelsPerUnit = 100f)
    {
      var sprites = new Sprite[FrameRects.Length];
      for (var index = 0; index < FrameRects.Length; index++)
      {
        sprites[index] = Sprite.Create(texture, FrameRects[index], new Vector2(0.5f, 0.5f), pixelsPerUnit);
      }

      return sprites;
    }

    public static AnimationClip CreateAnimationClip(Sprite[] sprites, string clipName = AssetId)
    {
      var clip = new AnimationClip { name = clipName, frameRate = Fps };
      return clip;
    }
  }
}
`;
}

export function createUnityInstallPlan(input: {
  contract: SpriteFrameSetContract | TransparentSpriteContract;
  compiledAssetPath: string;
  frameSlices?: UnityFrameSlice[];
}): UnityInstallPlan {
  const descriptor = createUnityAssetDescriptor(input.contract);
  const files: UnityInstallPlanEntry[] = [
    { kind: "compiled_asset", action: "copy", from: input.compiledAssetPath, to: descriptor.assetPath }
  ];

  if (input.contract.install.writeManifest) {
    files.push({
      kind: "manifest",
      action: "write",
      to: descriptor.manifestPath,
      contents: generateUnityManifestSource([input.contract])
    });
  }

  if (input.contract.mediaType === "visual.sprite_frame_set" && descriptor.codegenPath) {
    files.push({
      kind: "codegen",
      action: "write",
      to: descriptor.codegenPath,
      contents: generateUnityAnimationHelperSource(input.contract, input.frameSlices)
    });
  }

  return { id: input.contract.id, enabled: input.contract.install.enabled, files };
}

function createHorizontalSlices(contract: SpriteFrameSetContract): UnityFrameSlice[] {
  return Array.from({ length: contract.visual.frames }, (_, index) => ({
    index,
    x: index * contract.visual.frameWidth,
    y: 0,
    width: contract.visual.frameWidth,
    height: contract.visual.frameHeight
  }));
}

function assetIdToPascalCase(value: string): string {
  const normalized = assetIdToKebabCase(value);
  const pascal = normalized
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
  return pascal.length > 0 ? pascal : "Asset";
}

function toCSharpString(value: string): string {
  return JSON.stringify(value);
}
