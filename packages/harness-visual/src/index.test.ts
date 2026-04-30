import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import {
  loadImageMetadata,
  normalizeImageToPng,
  validateHorizontalFrameSet
} from "./index.js";

test("loadImageMetadata reads png dimensions and alpha metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-image-"));
  const imagePath = path.join(root, "sprite.png");

  await sharp({
    create: {
      width: 4,
      height: 3,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 }
    }
  })
    .png()
    .toFile(imagePath);

  const metadata = await loadImageMetadata(imagePath);

  assert.equal(metadata.width, 4);
  assert.equal(metadata.height, 3);
  assert.equal(metadata.format, "png");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.hash.length, 64);
});

test("loadImageMetadata rejects unsupported files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-not-image-"));
  const textPath = path.join(root, "sprite.txt");
  await fs.writeFile(textPath, "not an image", "utf8");

  await assert.rejects(() => loadImageMetadata(textPath));
});

test("normalizeImageToPng writes png output metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-normalize-"));
  const sourcePath = path.join(root, "sprite.webp");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp({
    create: {
      width: 5,
      height: 2,
      channels: 3,
      background: { r: 0, g: 0, b: 255 }
    }
  })
    .webp()
    .toFile(sourcePath);

  const output = await normalizeImageToPng({ sourcePath, outputPath });

  assert.equal(output.path, outputPath);
  assert.equal(output.metadata.width, 5);
  assert.equal(output.metadata.height, 2);
  assert.equal(output.metadata.format, "png");
});

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
