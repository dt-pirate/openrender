import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import {
  assetIdToCamelCase,
  assetIdToKebabCase,
  normalizeProjectRelativePath,
  resolveInsideProject
} from "./index.js";

test("normalizes project-relative paths", () => {
  assert.equal(normalizeProjectRelativePath("public\\assets\\hero.png"), "public/assets/hero.png");
  assert.throws(() => normalizeProjectRelativePath("../outside.png"));
});

test("refuses paths outside project root", () => {
  const root = path.resolve("/tmp/openrender-project");
  assert.equal(resolveInsideProject(root, "public/assets/hero.png"), path.join(root, "public/assets/hero.png"));
  assert.throws(() => resolveInsideProject(root, "../outside.png"));
});

test("converts asset ids to generated names", () => {
  assert.equal(assetIdToKebabCase("enemy.slime.idle"), "enemy-slime-idle");
  assert.equal(assetIdToCamelCase("enemy.slime.idle"), "enemySlimeIdle");
});
