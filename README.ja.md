<div align="center">
  <h1>openRender</h1>
  <h3>AI ゲーム開発のためのローカル資産ハンドオフ基盤</h3>
  <p>
    openRender は既存の生成済みゲーム画像をエンジン対応のプロジェクトファイルに変換し、
    インストール計画、補助コード、レポート、検証、ロールバック記録を残します。
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

## openRender とは？

openRender は、AI コーディングエージェントが生成済みゲームアートを実際のゲームプロジェクトへ安全に配置するためのローカルファースト Developer Kit です。

画像生成器はピクセルを作ります。しかしゲームプロジェクトには、安定したパス、フレームメタデータ、manifest、補助コード、プレビュー、レポート、そしてインストールを戻せる境界が必要です。openRender はこのハンドオフ層を提供し、エージェントの推測を減らし、プロジェクト状態をレビュー可能に保ちます。

現在の `0.6.0` コアは、Vite + Phaser、Godot 4、LOVE2D、PixiJS + Vite、Plain Canvas + Vite の画像資産ハンドオフをサポートしています。

## クイックスタート

パッケージはローカル開発用に準備されています。公開前は、このリポジトリからビルドした CLI を実行してください。

```bash
pnpm install
pnpm build
```

対象のゲームプロジェクトで:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

ファイルを書き込む前に計画と dry-run を確認します:

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

計画が正しい場合だけインストールします:

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

直近の openRender インストールをロールバックします:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

`--target phaser`、`--target godot`、`--target love2d`、`--target pixi`、`--target canvas` を使用できます。

## 仕組み

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

openRender は `.openrender/` に artifacts、previews、reports、run records、rollback snapshots を保存します。

## コア機能

- プロジェクトスキャンと doctor チェック。
- sprite の計画、dry-run、インストール、検証、レポート、diff、explain、rollback。
- alpha 診断、フレーム検出、normalize presets、sprite invariants、フレームプレビューシート。
- Phaser、Godot、LOVE2D、PixiJS、Canvas 向けアダプター。
- JSON schemas、短い agent summaries、recipes、fixture capture、golden fixtures。
- サポート対象向けのローカル JSON-only MCP メタデータヘルパー。

## エンジン出力

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG assets、TypeScript manifest、animation helpers、preload snippets |
| Godot 4 | PNG assets、GDScript asset helpers、animation helpers、`res://` paths |
| LOVE2D | PNG assets、Lua asset module、animation metadata、load/draw snippets |
| PixiJS + Vite | PNG assets、optional spritesheet JSON、TypeScript Pixi helpers |
| Canvas + Vite | PNG assets、TypeScript manifest、image loading and frame drawing helpers |

## エージェントルール

- プロジェクト種別を推測する前に `scan --json` を実行します。
- 不慣れなプロジェクトへ書き込む前に `doctor --json` を実行します。
- `--install` の前に `plan sprite --json` または `compile sprite --dry-run --json` を使います。
- ユーザーが上書きを承認しない限り `--force` を渡しません。
- インストール後に `verify --run latest --json` を実行します。
- `rollback --run latest --json` は openRender のインストール結果にのみ使います。

## リポジトリ構成

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

## 開発

必要条件:

- Node.js 22 以上
- pnpm 10 以上

チェックを実行:

```bash
pnpm typecheck
pnpm test
```

ソースから CLI を実行:

```bash
pnpm build
node packages/cli/dist/index.js --version
```
