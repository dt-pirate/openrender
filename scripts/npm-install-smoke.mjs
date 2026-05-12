#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.env.OPENRENDER_KEEP_NPM_SMOKE === "1";
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openrender-npm-smoke-"));
const packDir = path.join(tempRoot, "packs");
const prefix = path.join(tempRoot, "prefix");
const project = path.join(tempRoot, "love2d-project");

const packageDirs = [
  "packages/core",
  "packages/adapters/canvas",
  "packages/adapters/godot",
  "packages/adapters/love2d",
  "packages/adapters/phaser",
  "packages/adapters/pixi",
  "packages/adapters/three",
  "packages/adapters/unity",
  "packages/doctor",
  "packages/reporter",
  "packages/harness-visual",
  "packages/mcp-server",
  "packages/cli"
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: { ...process.env, ...options.env }
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    const stdout = result.stdout ? `\n${result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}${stdout}${stderr}`);
  }

  return result.stdout || "";
}

try {
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(prefix, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "main.lua"), "function love.draw() end\n");
  fs.writeFileSync(path.join(project, "conf.lua"), "function love.conf(t) t.identity = 'openrender_smoke' end\n");

  for (const packageDir of packageDirs) {
    run("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: path.join(root, packageDir)
    });
  }

  const tarballs = fs.readdirSync(packDir)
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => path.join(packDir, name))
    .sort();
  const cliTarball = tarballs.find((file) => path.basename(file).startsWith("openrender-cli-"));
  if (!cliTarball) {
    throw new Error("Missing @openrender/cli tarball.");
  }

  const cliPackageJson = run("tar", ["-xOf", cliTarball, "package/package.json"], { capture: true });
  const cliPackage = JSON.parse(cliPackageJson);
  if (cliPackage.name !== "@openrender/cli") {
    throw new Error(`Expected @openrender/cli tarball, got ${cliPackage.name}.`);
  }
  if (cliPackage.bin?.openrender !== "./dist/index.js") {
    throw new Error("CLI tarball does not expose the openrender bin.");
  }
  for (const [name, version] of Object.entries(cliPackage.dependencies || {})) {
    if (String(version).startsWith("workspace:")) {
      throw new Error(`Dependency ${name} still uses ${version} in packed package.json.`);
    }
  }

  run("npm", ["install", "--global", "--prefix", prefix, ...tarballs]);

  const binName = process.platform === "win32" ? "openrender.cmd" : "openrender";
  const openrender = path.join(prefix, "bin", binName);
  const version = run(openrender, ["--version"], { capture: true }).trim();
  const scan = JSON.parse(run(openrender, ["scan", "--json"], { cwd: project, capture: true }));
  const context = JSON.parse(run(openrender, ["context", "--json", "--compact"], { cwd: project, capture: true }));

  if (version !== cliPackage.version) {
    throw new Error(`Installed CLI version ${version} did not match package version ${cliPackage.version}.`);
  }
  if (scan.engine !== "love2d" || scan.framework !== "love2d") {
    throw new Error(`Expected LOVE2D scan, got ${scan.engine}/${scan.framework}.`);
  }
  if (context.ok !== true || context.version !== cliPackage.version) {
    throw new Error("Installed CLI context check failed.");
  }

  console.log(JSON.stringify({
    ok: true,
    package: cliPackage.name,
    install: "npm install -g @openrender/cli",
    command: "openrender",
    version,
    packedPackages: tarballs.length,
    tempRoot: keep ? tempRoot : undefined
  }, null, 2));
} finally {
  if (!keep) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
