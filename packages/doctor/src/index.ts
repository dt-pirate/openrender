import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { scanProject, type ProjectScan } from "@openrender/core";

export interface DoctorCheck {
  name: string;
  status: "passed" | "failed" | "warning";
  message: string;
}

export interface DoctorResult {
  projectRoot: string;
  nodeVersion: string;
  scan: ProjectScan;
  checks: DoctorCheck[];
}

export async function runDoctor(projectRoot = process.cwd()): Promise<DoctorResult> {
  const scan = await scanProject(projectRoot);
  const checks: DoctorCheck[] = [];

  checks.push(checkNodeVersion(process.versions.node));
  checks.push({
    name: "package_json",
    status: scan.packageJsonPath ? "passed" : "warning",
    message: scan.packageJsonPath ? `found ${path.basename(scan.packageJsonPath)}` : "package.json not found"
  });
  if (scan.engine === "godot") {
    checks.push({
      name: "godot",
      status: "passed",
      message: "Godot project detected"
    });
  } else if (scan.engine === "love2d") {
    checks.push({
      name: "love2d",
      status: "passed",
      message: "LOVE2D project detected"
    });
  } else {
    checks.push({
      name: "vite",
      status: scan.framework === "vite" ? "passed" : "warning",
      message: scan.framework === "vite" ? "Vite detected" : "Vite dependency not detected"
    });
    checks.push({
      name: "phaser",
      status: scan.engine === "phaser" ? "passed" : "warning",
      message: scan.engine === "phaser" ? "Phaser detected" : "Phaser dependency not detected"
    });
  }
  checks.push({
    name: "write_permission",
    status: (await canWrite(scan.projectRoot)) ? "passed" : "failed",
    message: (await canWrite(scan.projectRoot)) ? "project root is writable" : "project root is not writable"
  });
  checks.push({
    name: "openrender_state",
    status: scan.stateExists ? "passed" : "warning",
    message: scan.stateExists ? ".openrender exists" : "run openrender init to create local state"
  });

  return {
    projectRoot: scan.projectRoot,
    nodeVersion: process.versions.node,
    scan,
    checks
  };
}

function checkNodeVersion(version: string): DoctorCheck {
  const major = Number(version.split(".")[0] ?? "0");
  const ok = major >= 22;
  return {
    name: "node_version",
    status: ok ? "passed" : "warning",
    message: ok ? `Node.js ${version}` : `Node.js ${version}; Node.js 22 or newer is recommended`
  };
}

async function canWrite(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(projectRoot, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}
