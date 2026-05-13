#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = process.env.OPENRENDER_REGISTRY_VERSION || rootPackage.version;
const keep = process.env.OPENRENDER_KEEP_REGISTRY_SMOKE === "1";
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openrender-registry-smoke-"));
const prefix = path.join(tempRoot, "prefix");
const cache = path.join(tempRoot, "npm-cache");
const project = path.join(tempRoot, "love2d-project");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: { ...process.env, npm_config_cache: cache, ...options.env }
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    const stdout = result.stdout ? `\n${result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}${stdout}${stderr}`);
  }

  return result.stdout || "";
}

try {
  fs.mkdirSync(prefix, { recursive: true });
  fs.mkdirSync(cache, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "main.lua"), "function love.draw() end\n");
  fs.writeFileSync(path.join(project, "conf.lua"), "function love.conf(t) t.identity = 'openrender_registry_smoke' end\n");

  run("npm", [
    "install",
    "--global",
    "--prefix",
    prefix,
    `@openrender/cli@${version}`
  ]);

  const binName = process.platform === "win32" ? "openrender.cmd" : "openrender";
  const openrender = path.join(prefix, "bin", binName);
  const installedVersion = run(openrender, ["--version"], { capture: true }).trim();
  const scan = JSON.parse(run(openrender, ["scan", "--json"], { cwd: project, capture: true }));
  const context = JSON.parse(run(openrender, ["context", "--json", "--compact"], { cwd: project, capture: true }));
  const service = JSON.parse(run(openrender, ["service", "snapshot", "--json"], { cwd: project, capture: true }));

  if (installedVersion !== version) {
    throw new Error(`Installed CLI version ${installedVersion} did not match expected ${version}.`);
  }
  if (scan.engine !== "love2d" || scan.framework !== "love2d") {
    throw new Error(`Expected LOVE2D scan, got ${scan.engine}/${scan.framework}.`);
  }
  if (context.ok !== true || context.version !== version) {
    throw new Error("Registry CLI context check failed.");
  }
  if (service.operation !== "service.snapshot" || service.localOnly !== true) {
    throw new Error("Registry CLI service snapshot check failed.");
  }

  console.log(JSON.stringify({
    ok: true,
    package: "@openrender/cli",
    install: `npm install -g @openrender/cli@${version}`,
    command: "openrender",
    version: installedVersion,
    tempRoot: keep ? tempRoot : undefined
  }, null, 2));
} finally {
  if (!keep) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
