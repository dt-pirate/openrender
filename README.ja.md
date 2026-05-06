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
    <a href="./AGENT_USAGE.md#skill-setup">Agent Skill</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v1.0.0"><img alt="Release" src="https://img.shields.io/badge/release-v1.0.0-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## openRender とは？

openRender は、AI コーディングエージェントが生成済みゲームアセットを実際のゲームプロジェクトへ安全に配置するためのローカルファースト Developer Kit です。

画像生成器はピクセルを作ります。しかしゲームプロジェクトには、安定したパス、フレームメタデータ、manifest、補助コード、プレビュー、レポート、そしてインストールを戻せる境界が必要です。openRender はこのハンドオフ層を提供し、エージェントの推測を減らし、プロジェクト状態をレビュー可能に保ちます。

現在の `1.0.0` コアは、Vite + Phaser、Godot 4、LOVE2D、PixiJS + Vite、Three.js + Vite、Plain Canvas + Vite、Unity プロジェクトで、スプライト画像ハンドオフ、視覚リファレンス記録、モーション解析、アニメーションのコンパイル/インストール、音声、アトラス/タイルセット、UI アセットパイプライン、ループ実行履歴、エンジン別タスクパケット、ループ完了記録をサポートしています。

## クイックスタート

パッケージはローカル開発用に準備されています。公開前は、このリポジトリからビルドした CLI を実行してください。

```bash
pnpm install
pnpm build
```

エージェント主導で使う場合は、プロジェクトに openRender をインストールしてから、コーディングエージェントに openRender を使うよう伝えます。エージェントはローカル指示とリファレンスから正確な openRender コマンドを選べます。

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

セットアップは skill リクエストとして自然言語で伝えることもできます:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right local agent instructions, and explain what changed.
```

この skill はローカル agent 指示です。自然言語リクエストを `install-agent`、compact context、読み取り専用 wire-map、dry-run、検証、レポート、rollback ルールに対応させます。

以下の CLI 手順は、ローカル設定、エージェントの検証、手動参照用です。

対象のゲームプロジェクトで:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

AI コーディングエージェント向けのローカル指示は、まず dry-run で確認してからインストールします:

```bash
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform all --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform codex --json
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

animation アセットをインストールする前に、reference の記録や motion 解析を行えます:

```bash
node /path/to/openrender/packages/cli/dist/index.js ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "この動きのタイミングとスタイルに合わせる。" \
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
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json --compact
```

生成された helper をどこへ接続するかをエージェントが確認する場合は、`context --json --wire-map` で読み取り専用の候補を取得します。

直近の openRender インストールをロールバックします:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

`--target phaser`、`--target godot`、`--target love2d`、`--target pixi`、`--target three`、`--target canvas`、`--target unity` を使用できます。

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
- sketch、mockup、concept image、ローカルファイル、URL を visual reference として安全に記録。URL は provenance のみ保存し、自動ダウンロードしません。
- `detect-motion` で video/GIF/PNG sequence をインストール前に解析し、ffmpeg がない場合は明確な次の手順を返します。
- `compile animation` で animation sheet、エンジン別 runtime helper、wire-map handoff、検証、レポート、diff、explain、rollback を提供します。
- audio、atlas/tileset、UI の compile/install/verify/report/rollback を同じローカル run-state パイプラインで処理。
- context、検証、レポート、explain、diff 向けのコンパクトな agent 出力。
- ゲームコードの接続候補を示す読み取り専用 wiring map。
- alpha 診断、安全なデフォルト背景 cutout、edge-flood 背景除去、フレーム検出、normalize presets、sprite invariants、フレームプレビューシート。
- Phaser、Godot、LOVE2D、PixiJS、Three.js、Canvas、Unity 向けアダプター。
- JSON schemas、短い agent summaries、recipes、fixture capture、golden fixtures。
- サポート対象向けのローカル JSON-only MCP メタデータヘルパー。

## エンジン出力

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG assets、TypeScript manifest、animation helpers、preload snippets |
| Godot 4 | PNG assets、GDScript asset helpers、animation helpers、`res://` paths |
| LOVE2D | PNG assets、Lua asset module、animation metadata、load/draw snippets |
| PixiJS + Vite | PNG assets、optional spritesheet JSON、TypeScript Pixi helpers |
| Three.js + Vite | PNG assets、TypeScript manifest、`TextureLoader`、`Sprite`、`PlaneGeometry` helpers |
| Canvas + Vite | PNG assets、TypeScript manifest、image loading and frame drawing helpers |
| Unity | `Assets/OpenRender` 配下の PNG/audio assets、C# manifests、sprite/media helper classes |

Animation compile は同じ target adapters を再利用します。Phaser、Godot、LOVE2D、Unity にはより深い runtime helper を提供し、PixiJS、Three.js、Canvas には render loop へ接続するための helper path と snippet を提供します。openRender は引き続き game code を自動変更しません。

## エージェントルール

- 広くファイルを読む前、またはプロジェクト種別を推測する前に `context --json` を実行します。
- 最短のプロジェクト handoff が必要な場合は `context --json --compact` を使います。
- 生成 helper を接続するゲームコードを編集する前に `context --json --wire-map` を使います。
- 不慣れなプロジェクトへ書き込む前に `doctor --json` を実行します。
- `--install` の前に `plan sprite --json` または `compile sprite --dry-run --json` を使います。
- ユーザーが sketch、mockup、concept image、video URL、local reference file を示したら `ingest reference --json` で記録します。
- animation の fps、frame count、layout、loop を選ぶ前に `detect-motion --json --compact` を使います。
- animation asset をインストールする前に `compile animation --dry-run --json` で計画を確認します。
- インストール前に `installPlan.files` を確認します。
- ユーザーが上書きを承認しない限り `--force` を渡しません。
- 生成される manifest は既定の `merge` で項目を蓄積します。単一項目または共有 manifest を書かない流れが必要な場合だけ `--manifest-strategy replace|isolated` を使います。
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

## Contact

For project questions, contact `stelify87@gmail.com`.
