import assert from "node:assert/strict";
import { test } from "node:test";
import { validateHorizontalFrameSet } from "./index.js";

test("validateHorizontalFrameSet passes exact strips", () => {
  const result = validateHorizontalFrameSet({
    imageWidth: 384,
    imageHeight: 64,
    frames: 6,
    frameWidth: 64,
    frameHeight: 64
  });

  assert.equal(result.ok, true);
});

test("validateHorizontalFrameSet explains mismatches", () => {
  const result = validateHorizontalFrameSet({
    imageWidth: 320,
    imageHeight: 64,
    frames: 6,
    frameWidth: 64,
    frameHeight: 64
  });

  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /384x64/);
});
