<div align="center">
  <h1>openRender</h1>
  <h3>AI エージェントネイティブなゲーム開発のための状態基盤</h3>
  <p>
    openRender は既存の生成済みゲームメディアをエンジン対応のプロジェクトファイルに変換し、
    インストール計画、補助コード、コンパクトメモリ、レポート、検証、ロールバック記録を残します。
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
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v1.1.1"><img alt="Release" src="https://img.shields.io/badge/release-v1.1.1-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## openRender とは？

openRender は、AI コーディングエージェントがプロジェクト意図、エンジン制約、視覚方向、復旧コンテキストを失わずにゲーム開発を継続するための状態基盤です。

画像生成器はピクセルを作ります。しかしゲームプロジェクトには、安定したパス、フレームメタデータ、manifest、補助コード、プレビュー、レポート、そしてインストールを戻せる境界が必要です。openRender はこのハンドオフ層を提供し、エージェントの推測を減らし、プロジェクト状態をレビュー可能に保ちます。

openRender memory はメモ取り用の層ではありません。run、loop、ユーザーフィードバックから派生したイベント、結論、プロジェクトカード、エージェントカード、作者の好みカード、ゲーム方向カード、避けるべき視覚カード、視覚根拠インデックスを保存し、次のエージェントタスクが生ログを読み直したりモデル API でアセットを再生成したりせずに文脈を引き継げるようにします。

現在の `1.1.1` コアは、Vite + Phaser、Godot 4、LOVE2D、PixiJS + Vite、Three.js + Vite、Plain Canvas + Vite、Unity プロジェクトで、スプライト画像ハンドオフ、視覚リファレンス記録、視覚メモリの蓄積、作者の好みの継続、フォーカス別メモリ brief、run drift review、モーション解析、アニメーションのコンパイル/インストール、音声、アトラス/タイルセット、UI アセットパイプライン、ループ実行履歴、エンジン別タスクパケット、ループ完了記録、ローカルサービススナップショット、任意実行のランタイム/ビルドスモークチェックをサポートしています。

## クイックスタート

CLI npm パッケージをインストールし、対象のゲームプロジェクトで `openrender` コマンドを使います:

```bash
npm install -g @openrender/cli
openrender --version
```

npm パッケージ名は `@openrender/cli` で、インストールされるコマンドは `openrender` です。スコープなしの npm 名 `openrender` はすでに別の maintainer が所有しているため、その名前が移管されるまでは `npm install -g openrender` はリリース経路ではありません。

リポジトリベースの開発では、source から CLI をビルドします:

```bash
pnpm install
pnpm build
```

エージェント主導で使う場合は、プロジェクトに openRender をインストールしてから、コーディングエージェントに openRender を使うよう伝えます。エージェントはプロジェクト指示とリファレンスから正確な openRender コマンドを選べます。

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

セットアップは skill リクエストとして自然言語で伝えることもできます:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right agent instructions, and explain what changed.
```

この skill はプロジェクト agent 指示です。自然言語リクエストを `install-agent`、compact context、読み取り専用 wire-map、dry-run、検証、レポート、rollback ルールに対応させます。

以下の CLI 手順は、セットアップ、エージェントの検証、手動参照用です。

対象のゲームプロジェクトで:

```bash
cd /path/to/game-project

openrender context --json
openrender context --json --compact
openrender memory status --json
openrender memory context --json --compact
openrender memory query --for style --json --compact
openrender memory review --run latest --json
openrender service snapshot --json
openrender loop status --json --compact
openrender scan --json
openrender doctor --json
```

AI コーディングエージェント向けの指示を書き込む前に、まず dry-run で確認します:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

ファイルを書き込む前に計画と dry-run を確認します:

```bash
openrender plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

openrender compile sprite \
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
openrender ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "この動きのタイミングとスタイルに合わせる。" \
  --json

openrender detect-motion tmp/slime_idle_frames --json --compact

openrender compile animation \
  --from tmp/slime_idle_frames \
  --target phaser \
  --id enemy.slime.idle \
  --fps 8 \
  --layout horizontal_strip \
  --dry-run \
  --json
```

次のエージェントタスクに向けて、プロジェクト意図と視覚方向を保存します:

```bash
openrender memory ingest \
  --feedback "UI は読みやすく保ち、neon arcade の方向性を維持する。" \
  --json

openrender memory query --for ui --json --compact
openrender memory review --run latest --json
openrender memory context --json --compact
openrender clean --memory --keep-latest --dry-run --json
```

計画が正しい場合だけインストールします:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --manifest-strategy merge \
  --install \
  --json

openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender loop attach --run latest --json --compact
openrender loop run animation --from tmp/slime_idle_frames --target phaser --id enemy.slime.idle --fps 8 --install --json --compact
openrender loop complete --notes "Helper wired and checked in game scene." --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
```

生成された helper をどこへ接続するかをエージェントが確認する場合は、`context --json --wire-map` で読み取り専用の候補を取得します。

直近の openRender インストールをロールバックします:

```bash
openrender rollback --run latest --json
```

`--target phaser`、`--target godot`、`--target love2d`、`--target pixi`、`--target three`、`--target canvas`、`--target unity` を使用できます。

## 仕組み

```text
source media
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
- sketch、mockup、concept image、プロジェクトファイル、URL を visual reference として安全に記録。URL は provenance のみ保存し、自動ダウンロードしません。
- `detect-motion` で video/GIF/PNG sequence をインストール前に解析し、ffmpeg がない場合は明確な次の手順を返します。
- `compile animation` で animation sheet、エンジン別 runtime helper、wire-map handoff、検証、レポート、diff、explain、rollback を提供します。
- audio、atlas/tileset、UI の compile/install/verify/report/rollback を同じ run-state パイプラインで処理。
- run、loop、ユーザーフィードバック、視覚リファレンスから project card、agent card、user-direction card、engine card、creator-taste card、game-direction card、visual-avoidance card、visual-evidence index を派生するメモリ基盤。
- `memory query` と `memory review` で、次のエージェントタスク前に作者の好み、ゲーム方向、避けるべき視覚、drift signal を短く確認。
- `service snapshot --json` で将来の dashboard や agent supervisor に渡せるローカル専用コンテキスト境界を出力。
- context、検証、レポート、explain、diff 向けのコンパクトな agent 出力。
- ゲームコードの接続候補を示す読み取り専用 wiring map。
- alpha 診断、安全なデフォルト背景 cutout、edge-flood 背景除去、フレーム検出、normalize presets、sprite invariants、フレームプレビューシート。
- Godot/LOVE2D runtime smoke と、`smoke --build` による任意実行の web build smoke。
- Phaser、Godot、LOVE2D、PixiJS、Three.js、Canvas、Unity 向けアダプター。
- JSON schemas、短い agent summaries、recipes、fixture capture、golden fixtures。
- サポート対象向けの JSON-only MCP メタデータヘルパー。

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
- ユーザーが sketch、mockup、concept image、video URL、プロジェクト reference file を示したら `ingest reference --json` で記録します。
- 次の作業が visual style や操作感に依存する場合は、`memory query --for style|ui|movement --json --compact` で作者の好みと視覚根拠を先に確認します。
- インストールや loop の後は `memory review --run latest --json` でメモリ不足や方向ずれの兆候を確認します。
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
packages/mcp-server        JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    recipe metadata for supported targets
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
