import { OPENRENDER_DEVKIT_VERSION, type MediaType, type OpenRenderRun } from "./types.js";

export function createRunId(date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `run_${stamp}`;
}

export function createInitialRun(input: {
  id: string;
  mediaType: MediaType;
  actor?: OpenRenderRun["actor"];
  date?: Date;
}): OpenRenderRun {
  const createdAt = (input.date ?? new Date()).toISOString();

  return {
    runId: createRunId(input.date),
    createdAt,
    actor: input.actor ?? "cli",
    status: "created",
    contract: {
      schemaVersion: OPENRENDER_DEVKIT_VERSION,
      mediaType: input.mediaType,
      id: input.id
    },
    outputs: [],
    privacy: {
      uploaded: false,
      cloudReport: false,
      telemetry: false
    }
  };
}
