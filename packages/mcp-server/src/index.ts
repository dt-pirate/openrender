import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { OPENRENDER_DEVKIT_VERSION, type TargetEngine } from "@openrender/core";

const execFileAsync = promisify(execFile);
const TOOL_NAMES = ["scan", "plan", "compile", "install", "verify", "rollback", "report", "explain"] as const;
const TARGETS: TargetEngine[] = ["phaser", "godot", "love2d", "pixi", "canvas"];

export interface McpToolDescriptor {
  name: (typeof TOOL_NAMES)[number];
  description: string;
  jsonOnly: true;
  localOnly: true;
}

export interface McpResourceDescriptor {
  uri: string;
  description: string;
  localOnly: true;
}

export interface McpPromptDescriptor {
  name: string;
  target: TargetEngine;
  text: string;
}

export function listMcpTools(): McpToolDescriptor[] {
  return TOOL_NAMES.map((name) => ({
    name,
    description: `Run openrender ${name} locally and return parsed JSON.`,
    jsonOnly: true,
    localOnly: true
  }));
}

export function listMcpResources(): McpResourceDescriptor[] {
  return [
    { uri: "openrender://schema/contract", description: "Media contract schema", localOnly: true },
    { uri: "openrender://schema/report", description: "Report schema", localOnly: true },
    { uri: "openrender://schema/run-output", description: "Run output schema", localOnly: true },
    { uri: "openrender://runs/latest", description: "Latest local run JSON", localOnly: true },
    { uri: "openrender://reports/{runId}", description: "Local report JSON by run id", localOnly: true }
  ];
}

export function listMcpPrompts(): McpPromptDescriptor[] {
  return TARGETS.map((target) => ({
    name: `${target}-handoff`,
    target,
    text: `Use openRender ${OPENRENDER_DEVKIT_VERSION} locally for ${target}. Run scan, plan, compile --dry-run, install, verify, report, explain, diff, and rollback with --json. Do not upload artifacts or enable telemetry.`
  }));
}

export async function runMcpTool(input: {
  command: (typeof TOOL_NAMES)[number];
  args?: string[];
  cwd?: string;
  openrenderBin?: string;
}): Promise<unknown> {
  if (!TOOL_NAMES.includes(input.command)) throw new Error(`Unsupported MCP tool: ${input.command}`);
  const bin = input.openrenderBin ?? "openrender";
  const args = [...(input.args ?? []), "--json"];
  const { stdout } = await execFileAsync(bin, [input.command, ...args], { cwd: input.cwd });
  return JSON.parse(stdout);
}

export function assertNoRemoteCapabilities(): { upload: false; telemetry: false; sync: false; account: false } {
  return {
    upload: false,
    telemetry: false,
    sync: false,
    account: false
  };
}
