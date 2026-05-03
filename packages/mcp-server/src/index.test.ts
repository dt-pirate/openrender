import assert from "node:assert/strict";
import { test } from "node:test";
import { assertNoRemoteCapabilities, listMcpPrompts, listMcpResources, listMcpTools } from "./index.js";

test("MCP package exposes JSON-only local tools", () => {
  const tools = listMcpTools();

  assert.equal(tools.some((tool) => tool.name === "context"), true);
  assert.equal(tools.some((tool) => tool.name === "compile"), true);
  assert.equal(tools.some((tool) => tool.name === "install-agent"), true);
  assert.equal(tools.every((tool) => tool.jsonOnly && tool.localOnly), true);
});

test("MCP package exposes resources and all target prompts", () => {
  assert.equal(listMcpResources().some((resource) => resource.uri === "openrender://runs/latest"), true);
  assert.equal(listMcpResources().some((resource) => resource.uri === "openrender://context"), true);
  assert.equal(listMcpResources().some((resource) => resource.uri === "openrender://docs/llm-reference"), true);
  assert.deepEqual(listMcpPrompts().map((prompt) => prompt.target), ["phaser", "godot", "love2d", "pixi", "canvas"]);
  assert.equal(listMcpPrompts().every((prompt) => prompt.text.includes("context --json")), true);
});

test("MCP package declares no remote capabilities", () => {
  assert.deepEqual(assertNoRemoteCapabilities(), {
    upload: false,
    telemetry: false,
    sync: false,
    account: false
  });
});
