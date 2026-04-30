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
  const configPath = path.join(projectRoot, OPENRENDER_CONFIG_FILE);
  const statePath = path.join(projectRoot, OPENRENDER_STATE_DIR);
  const manifestPath = path.join(projectRoot, sourceRoot, "assets", "openrender-manifest.ts");

  return {
    projectRoot,
    packageManager: await detectPackageManager(projectRoot),
    packageJsonPath: (await pathExists(packageJsonPath)) ? packageJsonPath : null,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : null,
    framework: dependencyNames.has("vite") ? "vite" : "unknown",
    engine: dependencyNames.has("phaser") ? "phaser" : "unknown",
    assetRoot,
    assetRootExists: await pathExists(path.join(projectRoot, assetRoot)),
    sourceRoot,
    sourceRootExists: await pathExists(path.join(projectRoot, sourceRoot)),
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
