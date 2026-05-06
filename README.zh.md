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
    <a href="./AGENT_USAGE.md#skill-setup">Agent Skill</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v0.9.1"><img alt="Release" src="https://img.shields.io/badge/release-v0.9.1-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## 什么是 openRender？

openRender 是一个本地优先的 Developer Kit，帮助 AI 编码代理把生成式游戏资源安全地放入真实项目。

图像生成器产生像素，但游戏项目还需要稳定路径、帧元数据、manifest、辅助代码、预览、报告，以及可回滚的安装边界。openRender 提供这层交接能力，让代理减少猜测，并让项目状态保持可审查。

当前 `0.9.1` 核心支持 Vite + Phaser、Godot 4、LOVE2D、PixiJS + Vite、Three.js + Vite、Plain Canvas + Vite、Unity 项目的 sprite 图片交接、visual reference 记录、motion 分析、animation compile/install，以及 audio、atlas/tileset、UI 资产管线，以及 agent loop task packet。

## 快速开始

包已准备好用于本地开发。在发布前，请从本仓库运行构建后的 CLI。

```bash
pnpm install
pnpm build
```

以代理为中心使用时，先为项目安装 openRender，然后告诉编码代理使用 openRender。代理可以根据本地指令和参考资料选择准确的 openRender 命令。

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

你也可以把设置说成一个 skill 请求:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right local agent instructions, and explain what changed.
```

这个 skill 是本地 agent 指令。它把自然语言请求映射到 `install-agent`、compact context、只读 wire-map、dry-run、verification、reports 和 rollback 规则。

下面的 CLI 顺序用于本地设置、代理验证和人工参考。

在目标游戏项目中：

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

为 AI 编码代理安装本地指令时，先执行 dry-run：

```bash
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform all --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform codex --json
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

安装 animation 资产前，可以先记录 reference 或分析 motion：

```bash
node /path/to/openrender/packages/cli/dist/index.js ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "匹配这个动作的节奏和风格。" \
  --json

node /path/to/openrender/packages/cli/dist/index.js detect-motion tmp/slime_idle_frames --json --compact

node /path/to/openrender/packages/cli/dist/index.js compile animation \
  --from tmp/slime_idle_frames \
  --target phaser \
  --id enemy.slime.idle \
  --fps 8 \
  --layout horizontal_strip \
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
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json --compact
```

当代理需要知道生成的 helper 应连接到哪里时，使用 `context --json --wire-map` 获取只读连接候选。

回滚最近一次 openRender 安装：

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

可使用 `--target phaser`、`--target godot`、`--target love2d`、`--target pixi`、`--target three`、`--target canvas` 或 `--target unity`。

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
- 安全记录 sketch、mockup、concept image、本地文件或 URL 作为 visual reference。URL 只保存 provenance，不自动下载。
- `detect-motion` 在安装前分析 video/GIF/PNG sequence；缺少 ffmpeg 时返回明确的下一步。
- `compile animation` 生成 animation sheet、目标引擎 runtime helper、wire-map handoff、验证、报告、diff、explain 和 rollback。
- audio、atlas/tileset、UI 的 compile/install/verify/report/rollback 使用同一套本地 run-state 管线。
- 面向 context、验证、报告、explain、diff 的紧凑 agent 输出。
- 指向可能代码连接位置的只读 wiring map。
- alpha 诊断、安全默认背景 cutout、edge-flood 背景移除、帧检测、normalize presets、sprite invariants 和帧预览图。
- Phaser、Godot、LOVE2D、PixiJS、Three.js、Canvas、Unity 适配器。
- JSON schemas、精简 agent summaries、recipes、fixture capture 和 golden fixtures。
- 面向支持目标的本地 JSON-only MCP 元数据辅助能力。

## 引擎输出

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG 资源、TypeScript manifest、动画辅助代码、preload snippets |
| Godot 4 | PNG 资源、GDScript 资源辅助代码、动画辅助代码、`res://` 路径 |
| LOVE2D | PNG 资源、Lua 资源模块、动画元数据、load/draw snippets |
| PixiJS + Vite | PNG 资源、可选 spritesheet JSON、TypeScript Pixi 辅助代码 |
| Three.js + Vite | PNG 资源、TypeScript manifest、`TextureLoader`、`Sprite`、`PlaneGeometry` 辅助代码 |
| Canvas + Vite | PNG 资源、TypeScript manifest、图片加载和帧绘制辅助代码 |
| Unity | `Assets/OpenRender` 下的 PNG/audio 资源、C# manifest、sprite/media 辅助类 |

Animation compile 复用同一套 target adapters。Phaser、Godot、LOVE2D、Unity 提供更深入的 runtime helper；PixiJS、Three.js、Canvas 提供 render loop 连接所需的 helper path 和 snippet。openRender 仍然不会自动修改 game code。

## 代理规则

- 在广泛读取文件或假设项目类型前运行 `context --json`。
- 需要最短项目 handoff 时使用 `context --json --compact`。
- 编辑连接生成 helper 的游戏代码前使用 `context --json --wire-map`。
- 在陌生项目中写文件前运行 `doctor --json`。
- 在 `--install` 前使用 `plan sprite --json` 或 `compile sprite --dry-run --json`。
- 用户提供 sketch、mockup、concept image、video URL 或本地 reference file 时，先用 `ingest reference --json` 记录。
- 选择 animation fps、frame count、layout、loop 前使用 `detect-motion --json --compact`。
- 安装 animation asset 前使用 `compile animation --dry-run --json` 查看计划。
- 安装前检查 `installPlan.files`。
- 除非用户接受覆盖目标文件，不要传入 `--force`。
- 生成的 manifest 默认使用 `merge` 累积条目；只有在需要单条目或不写共享 manifest 时才使用 `--manifest-strategy replace|isolated`。
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

## 联系方式

For project questions, contact `stelify87@gmail.com`.
