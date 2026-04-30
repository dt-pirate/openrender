import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialRun } from "@openrender/core";
import { createReportHtml, createReportJson } from "./index.js";

test("createReportJson serializes a run", () => {
  const run = createInitialRun({ id: "enemy.slime.idle", mediaType: "visual.sprite_frame_set" });
  const json = createReportJson(run);

  assert.match(json, /enemy\.slime\.idle/);
});

test("createReportHtml escapes section content", () => {
  const run = createInitialRun({ id: "enemy.slime.idle", mediaType: "visual.sprite_frame_set" });
  const html = createReportHtml({
    title: "Test Report",
    run,
    sections: [{ heading: "Input", body: "<script>alert(1)</script>" }]
  });

  assert.match(html, /&lt;script&gt;/);
});
