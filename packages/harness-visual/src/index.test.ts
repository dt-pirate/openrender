import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import {
  cleanupAlphaEdgesToPng,
  createFramePreviewSheet,
  cropAlphaBoundsToPng,
  detectAlphaBounds,
  loadImageMetadata,
  normalizeImageToPng,
  planFrameSlices,
  removeSolidBackgroundToPng,
  validateGridFrameSet,
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

test("createFramePreviewSheet writes indexed frame overlay png", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-frame-preview-"));
  const sourcePath = path.join(root, "strip.png");
  const outputPath = path.join(root, "out", "preview_frames.png");

  const redFrame = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
  const greenFrame = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 4,
      height: 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: redFrame, left: 0, top: 0 },
      { input: greenFrame, left: 2, top: 0 }
    ])
    .png()
    .toFile(sourcePath);

  const output = await createFramePreviewSheet({
    sourcePath,
    outputPath,
    frameSlices: planFrameSlices({
      layout: "horizontal_strip",
      imageWidth: 4,
      frames: 2,
      frameWidth: 2,
      frameHeight: 2
    })
  });

  assert.equal(output.path, outputPath);
  assert.equal(output.frameCount, 2);
  assert.equal(output.metadata.width, 4);
  assert.equal(output.metadata.height, 2);
  assert.equal(output.metadata.format, "png");
});

test("cleanupAlphaEdgesToPng removes low-alpha fringe pixels", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-alpha-cleanup-"));
  const sourcePath = path.join(root, "sprite.png");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp(Buffer.from([
    255, 0, 0, 1,
    0, 255, 0, 255
  ]), {
    raw: {
      width: 2,
      height: 1,
      channels: 4
    }
  })
    .png()
    .toFile(sourcePath);

  await cleanupAlphaEdgesToPng({ sourcePath, outputPath, alphaThreshold: 8 });
  const { data } = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(data[3], 0);
  assert.equal(data[7], 255);
});

test("removeSolidBackgroundToPng clears pixels matching the top-left background", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-solid-bg-"));
  const sourcePath = path.join(root, "sprite.png");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp({
    create: {
      width: 3,
      height: 1,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
          .png()
          .toBuffer(),
        left: 1,
        top: 0
      }
    ])
    .png()
    .toFile(sourcePath);

  await removeSolidBackgroundToPng({ sourcePath, outputPath, tolerance: 4 });
  const { data } = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(data[3], 0);
  assert.equal(data[7], 255);
  assert.equal(data[11], 0);
});

test("detectAlphaBounds finds non-transparent pixels", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-bounds-"));
  const imagePath = path.join(root, "sprite.png");

  await sharp({
    create: {
      width: 6,
      height: 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 2,
            height: 2,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
          .png()
          .toBuffer(),
        left: 2,
        top: 1
      }
    ])
    .png()
    .toFile(imagePath);

  const bounds = await detectAlphaBounds({ sourcePath: imagePath });

  assert.deepEqual(bounds, { x: 2, y: 1, width: 2, height: 2 });
});

test("cropAlphaBoundsToPng crops transparent edges and applies padding", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-crop-"));
  const sourcePath = path.join(root, "sprite.png");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp({
    create: {
      width: 6,
      height: 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 2,
            height: 2,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
          .png()
          .toBuffer(),
        left: 2,
        top: 1
      }
    ])
    .png()
    .toFile(sourcePath);

  const output = await cropAlphaBoundsToPng({ sourcePath, outputPath, padding: 1 });

  assert.deepEqual(output.bounds, { x: 2, y: 1, width: 2, height: 2 });
  assert.equal(output.metadata.width, 4);
  assert.equal(output.metadata.height, 4);
  assert.equal(output.metadata.format, "png");
  assert.equal(output.alphaCleanupThreshold, 2);
});

test("cropAlphaBoundsToPng can fit the crop into an exact output size", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-crop-resize-"));
  const sourcePath = path.join(root, "sprite.png");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp({
    create: {
      width: 6,
      height: 4,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 2,
            height: 1,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
          .png()
          .toBuffer(),
        left: 2,
        top: 1
      }
    ])
    .png()
    .toFile(sourcePath);

  const output = await cropAlphaBoundsToPng({
    sourcePath,
    outputPath,
    outputSize: { width: 8, height: 8 }
  });

  assert.deepEqual(output.bounds, { x: 2, y: 1, width: 2, height: 1 });
  assert.deepEqual(output.outputSize, { width: 8, height: 8 });
  assert.equal(output.metadata.width, 8);
  assert.equal(output.metadata.height, 8);
  assert.equal(output.metadata.format, "png");
});

test("cropAlphaBoundsToPng can remove simple solid backgrounds before cropping", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openrender-crop-solid-bg-"));
  const sourcePath = path.join(root, "sprite.png");
  const outputPath = path.join(root, "out", "sprite.png");

  await sharp({
    create: {
      width: 5,
      height: 5,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { r: 0, g: 0, b: 255, alpha: 1 }
          }
        })
          .png()
          .toBuffer(),
        left: 2,
        top: 2
      }
    ])
    .png()
    .toFile(sourcePath);

  const output = await cropAlphaBoundsToPng({
    sourcePath,
    outputPath,
    removeSolidBackground: true,
    backgroundTolerance: 4
  });

  assert.deepEqual(output.bounds, { x: 2, y: 2, width: 1, height: 1 });
  assert.equal(output.metadata.width, 1);
  assert.equal(output.metadata.height, 1);
  assert.equal(output.removedSolidBackground, true);
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

test("validateGridFrameSet validates grid capacity and dimensions", () => {
  const result = validateGridFrameSet({
    imageWidth: 128,
    imageHeight: 64,
    frames: 4,
    frameWidth: 64,
    frameHeight: 32
  });

  assert.equal(result.ok, true);
});

test("planFrameSlices creates horizontal and grid coordinates", () => {
  assert.deepEqual(planFrameSlices({
    layout: "horizontal_strip",
    imageWidth: 192,
    frames: 3,
    frameWidth: 64,
    frameHeight: 32
  }), [
    { index: 0, x: 0, y: 0, width: 64, height: 32 },
    { index: 1, x: 64, y: 0, width: 64, height: 32 },
    { index: 2, x: 128, y: 0, width: 64, height: 32 }
  ]);

  assert.deepEqual(planFrameSlices({
    layout: "grid",
    imageWidth: 128,
    frames: 3,
    frameWidth: 64,
    frameHeight: 32
  }), [
    { index: 0, x: 0, y: 0, width: 64, height: 32 },
    { index: 1, x: 64, y: 0, width: 64, height: 32 },
    { index: 2, x: 0, y: 32, width: 64, height: 32 }
  ]);
});
