import fs from "node:fs/promises";
import path from "node:path";
import { resolveInsideProject } from "./paths.js";
import { pathExists } from "./config.js";

export interface SnapshotEntry {
  relativePath: string;
  existed: boolean;
  snapshotPath?: string;
}

export interface SafeWriteResult {
  relativePath: string;
  absolutePath: string;
  wrote: true;
}

export async function snapshotProjectFile(input: {
  projectRoot: string;
  snapshotRoot: string;
  relativePath: string;
}): Promise<SnapshotEntry> {
  const absolutePath = resolveInsideProject(input.projectRoot, input.relativePath);
  const existed = await pathExists(absolutePath);
  if (!existed) {
    return {
      relativePath: input.relativePath,
      existed: false
    };
  }

  const absoluteSnapshotRoot = resolveInsideProject(input.projectRoot, input.snapshotRoot);
  const snapshotPath = path.join(absoluteSnapshotRoot, input.relativePath);
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.copyFile(absolutePath, snapshotPath);

  return {
    relativePath: input.relativePath,
    existed: true,
    snapshotPath: path.relative(input.projectRoot, snapshotPath)
  };
}

export async function safeWriteProjectFile(input: {
  projectRoot: string;
  relativePath: string;
  contents: string | Uint8Array;
  allowOverwrite?: boolean;
}): Promise<SafeWriteResult> {
  const absolutePath = resolveInsideProject(input.projectRoot, input.relativePath);
  const exists = await pathExists(absolutePath);

  if (exists && input.allowOverwrite !== true) {
    throw new Error(`Refusing to overwrite existing file without allowOverwrite: ${input.relativePath}`);
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.contents);

  return {
    relativePath: input.relativePath,
    absolutePath,
    wrote: true
  };
}

export async function safeCopyProjectFile(input: {
  projectRoot: string;
  fromRelativePath: string;
  toRelativePath: string;
  allowOverwrite?: boolean;
}): Promise<SafeWriteResult> {
  const fromAbsolutePath = resolveInsideProject(input.projectRoot, input.fromRelativePath);
  const toAbsolutePath = resolveInsideProject(input.projectRoot, input.toRelativePath);
  const exists = await pathExists(toAbsolutePath);

  if (exists && input.allowOverwrite !== true) {
    throw new Error(`Refusing to overwrite existing file without allowOverwrite: ${input.toRelativePath}`);
  }

  await fs.mkdir(path.dirname(toAbsolutePath), { recursive: true });
  await fs.copyFile(fromAbsolutePath, toAbsolutePath);

  return {
    relativePath: input.toRelativePath,
    absolutePath: toAbsolutePath,
    wrote: true
  };
}
