import fs from "node:fs/promises";
import path from "node:path";
import {
  OPENRENDER_CONFIG_FILE,
  OPENRENDER_STATE_DIR,
  pathExists
} from "./config.js";
import type { ProjectScan } from "./types.js";

interface PackageJsonShape {
  name?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function scanProject(projectRootInput = process.cwd()): Promise<ProjectScan> {
  const projectRoot = path.resolve(projectRootInput);
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = await readPackageJson(packageJsonPath);
  const dependencyNames = new Set([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {})
  ]);

  const assetRoot = "public/assets";
  const sourceRoot = "src";
  const godotAssetRoot = "assets/openrender";
  const godotSourceRoot = "scripts/openrender";
  const love2dAssetRoot = "assets/openrender";
  const love2dSourceRoot = "openrender";
  const unityAssetRoot = "Assets/OpenRender/Generated";
  const unitySourceRoot = "Assets/OpenRender";
  const godotProjectPath = path.join(projectRoot, "project.godot");
  const love2dMainPath = path.join(projectRoot, "main.lua");
  const love2dConfigPath = path.join(projectRoot, "conf.lua");
  const unityAssetsPath = path.join(projectRoot, "Assets");
  const unityProjectVersionPath = path.join(projectRoot, "ProjectSettings", "ProjectVersion.txt");
  const unityProjectSettingsPath = path.join(projectRoot, "ProjectSettings", "ProjectSettings.asset");
  const hasGodotProject = await pathExists(godotProjectPath);
  const hasLove2DProject = (await pathExists(love2dMainPath)) || (await pathExists(love2dConfigPath));
  const hasUnityProject =
    (await pathExists(unityAssetsPath)) &&
    ((await pathExists(unityProjectVersionPath)) || (await pathExists(unityProjectSettingsPath)));
  const hasVite = dependencyNames.has("vite");
  const hasPhaser = dependencyNames.has("phaser");
  const hasPixi = dependencyNames.has("pixi.js");
  const hasThree = dependencyNames.has("three");
  const framework = hasGodotProject
    ? "godot"
    : hasLove2DProject
      ? "love2d"
    : hasUnityProject
      ? "unity"
    : hasVite
      ? "vite"
      : "unknown";
  const engine = hasGodotProject
    ? "godot"
    : hasLove2DProject
      ? "love2d"
    : hasUnityProject
      ? "unity"
    : hasPhaser
      ? "phaser"
    : hasPixi
      ? "pixi"
    : hasThree
      ? "three"
    : hasVite
      ? "canvas"
      : "unknown";
  const detectedAssetRoot =
    engine === "godot"
      ? godotAssetRoot
      : engine === "love2d"
        ? love2dAssetRoot
        : engine === "unity"
          ? unityAssetRoot
          : assetRoot;
  const detectedSourceRoot =
    engine === "godot"
      ? godotSourceRoot
      : engine === "love2d"
        ? love2dSourceRoot
        : engine === "unity"
          ? unitySourceRoot
          : sourceRoot;
  const configPath = path.join(projectRoot, OPENRENDER_CONFIG_FILE);
  const statePath = path.join(projectRoot, OPENRENDER_STATE_DIR);
  const manifestPath = engine === "godot"
    ? path.join(projectRoot, detectedSourceRoot, "openrender_assets.gd")
    : engine === "love2d"
      ? path.join(projectRoot, detectedSourceRoot, "openrender_assets.lua")
      : engine === "unity"
        ? path.join(projectRoot, detectedSourceRoot, "OpenRenderAssets.cs")
    : path.join(projectRoot, detectedSourceRoot, "assets", "openrender-manifest.ts");

  return {
    projectRoot,
    packageManager: await detectPackageManager(projectRoot),
    packageJsonPath: (await pathExists(packageJsonPath)) ? packageJsonPath : null,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : null,
    framework,
    engine,
    assetRoot: detectedAssetRoot,
    assetRootExists: await pathExists(path.join(projectRoot, detectedAssetRoot)),
    sourceRoot: detectedSourceRoot,
    sourceRootExists: await pathExists(path.join(projectRoot, detectedSourceRoot)),
    configPath,
    configExists: await pathExists(configPath),
    statePath,
    stateExists: await pathExists(statePath),
    manifestPath,
    manifestExists: await pathExists(manifestPath)
  };
}

async function detectPackageManager(projectRoot: string): Promise<ProjectScan["packageManager"]> {
  let cursor = projectRoot;
  while (true) {
    if (await pathExists(path.join(cursor, "pnpm-lock.yaml"))) return "pnpm";
    if (await pathExists(path.join(cursor, "package-lock.json"))) return "npm";
    if (await pathExists(path.join(cursor, "yarn.lock"))) return "yarn";

    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return "unknown";
}

async function readPackageJson(packageJsonPath: string): Promise<PackageJsonShape | null> {
  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    return JSON.parse(raw) as PackageJsonShape;
  } catch {
    return null;
  }
}
