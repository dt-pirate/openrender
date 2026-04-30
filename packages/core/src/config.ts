import fs from "node:fs/promises";
import path from "node:path";
import { OPENRENDER_DEVKIT_VERSION, type OpenRenderConfig } from "./types.js";

export const OPENRENDER_CONFIG_FILE = "openrender.config.json";
export const OPENRENDER_STATE_DIR = ".openrender";
export const OPENRENDER_STATE_SUBDIRS = [
  "artifacts",
  "cache",
  "previews",
  "reports",
  "runs",
  "snapshots"
] as const;

export interface InitOptions {
  projectRoot: string;
  target?: "phaser";
  framework?: "vite";
  force?: boolean;
}

export interface InitResult {
  configPath: string;
  statePath: string;
  configCreated: boolean;
  configOverwritten: boolean;
  stateDirectoriesCreated: string[];
}

export function createDefaultConfig(projectName = "local"): OpenRenderConfig {
  return {
    version: OPENRENDER_DEVKIT_VERSION,
    project: {
      id: "local",
      name: projectName
    },
    target: {
      engine: "phaser",
      framework: "vite",
      assetRoot: "public/assets",
      sourceRoot: "src"
    },
    install: {
      writeManifest: true,
      writeCodegen: true,
      snapshotBeforeInstall: true,
      allowOverwrite: false
    },
    report: {
      format: ["html", "json"],
      openAfterRun: false
    },
    privacy: {
      cloudSync: false,
      telemetry: false,
      uploadArtifacts: false
    }
  };
}

export async function initializeOpenRenderProject(options: InitOptions): Promise<InitResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const configPath = path.join(projectRoot, OPENRENDER_CONFIG_FILE);
  const statePath = path.join(projectRoot, OPENRENDER_STATE_DIR);
  const configExists = await pathExists(configPath);
  const stateDirectoriesCreated: string[] = [];

  for (const subdir of OPENRENDER_STATE_SUBDIRS) {
    const dirPath = path.join(statePath, subdir);
    await fs.mkdir(dirPath, { recursive: true });
    stateDirectoriesCreated.push(path.relative(projectRoot, dirPath));
  }

  const shouldWriteConfig = options.force === true || !configExists;
  if (shouldWriteConfig) {
    const projectName = await readProjectName(projectRoot);
    const config = createDefaultConfig(projectName);
    config.target.engine = options.target ?? "phaser";
    config.target.framework = options.framework ?? "vite";
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  return {
    configPath,
    statePath,
    configCreated: !configExists,
    configOverwritten: configExists && options.force === true,
    stateDirectoriesCreated
  };
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readProjectName(projectRoot: string): Promise<string> {
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!(await pathExists(packageJsonPath))) return path.basename(projectRoot);

  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : path.basename(projectRoot);
  } catch {
    return path.basename(projectRoot);
  }
}
