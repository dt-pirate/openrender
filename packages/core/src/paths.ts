import path from "node:path";

export function toPosixPath(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

export function normalizeProjectRelativePath(value: string): string {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Path must stay inside the project: ${value}`);
  }

  return normalized;
}

export function resolveInsideProject(projectRoot: string, candidatePath: string): string {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, candidatePath);
  const relative = path.relative(root, resolved);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolved;
  }

  throw new Error(`Refusing to resolve path outside project root: ${candidatePath}`);
}

export function assetIdToKebabCase(assetId: string): string {
  return assetId
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function assetIdToCamelCase(assetId: string): string {
  const parts = assetId
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) return lower;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
}
