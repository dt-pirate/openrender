<div align="center">
  <h1>openRender</h1>
  <h3>面向 AI 游戏开发的本地资源交接基础设施</h3>
  <p>
    openRender 将已有的生成式游戏图片转换为可进入引擎项目的文件，
    并留下安装计划、辅助代码、报告、验证结果和回滚记录。
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a>
  </p>
  <p>
    <a href="./AGENT_USAGE.md">Agent Usage</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## 什么是 openRender？

openRender 是一个本地优先的 Developer Kit，帮助 AI 编码代理把生成式游戏美术安全地放入真实项目。

图像生成器产生像素，但游戏项目还需要稳定路径、帧元数据、manifest、辅助代码、预览、报告，以及可回滚的安装边界。openRender 提供这层交接能力，让代理减少猜测，并让项目状态保持可审查。

当前 `0.6.0` 核心支持 Vite + Phaser、Godot 4、LOVE2D、PixiJS + Vite、Plain Canvas + Vite 的图片资源交接。

## 快速开始

包已准备好用于本地开发。在发布前，请从本仓库运行构建后的 CLI。

```bash
pnpm install
pnpm build
```

在目标游戏项目中：

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

写入文件前先查看计划和 dry-run：

```bash
node /path/to/openrender/packages/cli/dist/index.js plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

确认计划正确后再安装：

```bash
node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json

node /path/to/openrender/packages/cli/dist/index.js verify --run latest --json
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json
```

回滚最近一次 openRender 安装：

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

可使用 `--target phaser`、`--target godot`、`--target love2d`、`--target pixi` 或 `--target canvas`。

## 工作流程

```text
local image
-> project scan
-> media contract
-> deterministic artifact
-> install plan
-> engine-shaped files
-> verify and report
-> agent handoff summary
-> rollback remains available
```

openRender 将运行状态保存在 `.openrender/` 下，包括 artifacts、previews、reports、run records 和 rollback snapshots。

## 核心能力

- 项目扫描和 doctor 检查。
- sprite 计划、dry-run、安装、验证、报告、diff、explain 和 rollback。
- alpha 诊断、帧检测、normalize presets、sprite invariants 和帧预览图。
- Phaser、Godot、LOVE2D、PixiJS、Canvas 适配器。
- JSON schemas、精简 agent summaries、recipes、fixture capture 和 golden fixtures。
- 面向支持目标的本地 JSON-only MCP 元数据辅助能力。

## 引擎输出

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG 资源、TypeScript manifest、动画辅助代码、preload snippets |
| Godot 4 | PNG 资源、GDScript 资源辅助代码、动画辅助代码、`res://` 路径 |
| LOVE2D | PNG 资源、Lua 资源模块、动画元数据、load/draw snippets |
| PixiJS + Vite | PNG 资源、可选 spritesheet JSON、TypeScript Pixi 辅助代码 |
| Canvas + Vite | PNG 资源、TypeScript manifest、图片加载和帧绘制辅助代码 |

## 代理规则

- 在假设项目类型前运行 `scan --json`。
- 在陌生项目中写文件前运行 `doctor --json`。
- 在 `--install` 前使用 `plan sprite --json` 或 `compile sprite --dry-run --json`。
- 除非用户接受覆盖目标文件，不要传入 `--force`。
- 安装后运行 `verify --run latest --json`。
- `rollback --run latest --json` 只用于 openRender 安装结果。

## 仓库结构

```text
packages/core              shared config, contracts, paths, and run state
packages/cli               openrender command-line interface
packages/harness-visual    image metadata, normalization, crop, and frame checks
packages/adapters/*        engine-specific project output helpers
packages/reporter          report and preview generation
packages/doctor            environment diagnostics
packages/mcp-server        local JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    local recipe metadata for supported targets
```

## 开发

要求：

- Node.js 22 或更高版本
- pnpm 10 或更高版本

运行检查：

```bash
pnpm typecheck
pnpm test
```

从源码运行 CLI：

```bash
pnpm build
node packages/cli/dist/index.js --version
```
