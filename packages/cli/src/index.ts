#!/usr/bin/env node
import {
  initializeOpenRenderProject,
  OPENRENDER_POC_VERSION,
  scanProject,
  type ProjectScan
} from "@openrender/core";
import { runDoctor, type DoctorResult } from "@openrender/doctor";

interface ParsedFlags {
  flags: Map<string, string | boolean>;
  positionals: string[];
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.positionals;

  if (parsed.flags.get("version") === true || parsed.flags.get("v") === true) {
    console.log(OPENRENDER_POC_VERSION);
    return 0;
  }

  if (!command || parsed.flags.get("help") === true || command === "-h" || command === "help") {
    printHelp();
    return 0;
  }

  if (command === "-v" || command === "version") {
    console.log(OPENRENDER_POC_VERSION);
    return 0;
  }

  if (command === "init") {
    const result = await initializeOpenRenderProject({
      projectRoot: process.cwd(),
      target: readStringFlag(parsed, "target", "phaser") as "phaser",
      framework: readStringFlag(parsed, "framework", "vite") as "vite",
      force: parsed.flags.get("force") === true
    });

    console.log("openRender init");
    console.log(`Config: ${result.configPath}`);
    console.log(`State: ${result.statePath}`);
    console.log(
      result.configOverwritten
        ? "Config overwritten"
        : result.configCreated
          ? "Config created"
          : "Config already exists"
    );
    return 0;
  }

  if (command === "scan") {
    const scan = await scanProject(process.cwd());
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(scan, null, 2));
    } else {
      printScan(scan);
    }
    return 0;
  }

  if (command === "doctor") {
    const result = await runDoctor(process.cwd());
    if (parsed.flags.get("json") === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printDoctor(result);
    }
    return result.checks.some((check) => check.status === "failed") ? 1 : 0;
  }

  if (command === "compile" && subcommand === "sprite") {
    printPlannedCommand("compile sprite", "Visual image processing is the next POC milestone.");
    return 2;
  }

  if (["install", "verify", "report", "rollback"].includes(command)) {
    printPlannedCommand(command, "This command is planned for the install/verify/report/rollback milestone.");
    return 2;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Run openrender --help for usage.");
  return 1;
}

function parseArgs(argv: string[]): ParsedFlags {
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      if (!rawKey) continue;

      if (inlineValue !== undefined) {
        flags.set(rawKey, inlineValue);
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        flags.set(rawKey, next);
        index += 1;
      } else {
        flags.set(rawKey, true);
      }
      continue;
    }

    positionals.push(token);
  }

  return { flags, positionals };
}

function readStringFlag(parsed: ParsedFlags, name: string, fallback: string): string {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : fallback;
}

function printScan(scan: ProjectScan): void {
  console.log("openRender scan");
  console.log("");
  console.log(`Project root: ${scan.projectRoot}`);
  console.log(`Package manager: ${scan.packageManager}`);
  console.log(`Framework: ${scan.framework}`);
  console.log(`Engine: ${scan.engine}`);
  console.log(`Asset root: ${scan.assetRoot}${scan.assetRootExists ? "" : " (missing)"}`);
  console.log(`Source root: ${scan.sourceRoot}${scan.sourceRootExists ? "" : " (missing)"}`);
  console.log(`Manifest: ${scan.manifestExists ? scan.manifestPath : "missing"}`);
  console.log(`openRender state: ${scan.stateExists ? "initialized" : "missing"}`);
}

function printDoctor(result: DoctorResult): void {
  console.log("openRender doctor");
  console.log("");
  console.log(`Project root: ${result.projectRoot}`);
  console.log(`Node.js: ${result.nodeVersion}`);
  console.log("");

  for (const check of result.checks) {
    const marker = check.status === "passed" ? "ok" : check.status === "warning" ? "warn" : "fail";
    console.log(`${marker.padEnd(5)} ${check.name}: ${check.message}`);
  }
}

function printPlannedCommand(command: string, detail: string): void {
  console.error(`openrender ${command} is not implemented yet.`);
  console.error(detail);
}

function printHelp(): void {
  console.log(`openRender ${OPENRENDER_POC_VERSION}

Usage:
  openrender init [--target phaser] [--framework vite] [--force]
  openrender scan [--json]
  openrender doctor [--json]

Planned POC commands:
  openrender compile sprite
  openrender install
  openrender verify
  openrender report
  openrender rollback
`);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
