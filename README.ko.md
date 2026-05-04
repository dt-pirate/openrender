<div align="center">
  <h1>openRender</h1>
  <h3>AI 게임 개발을 위한 로컬 에셋 핸드오프 인프라</h3>
  <p>
    openRender는 이미 생성된 게임 이미지를 실행 가능한 프로젝트 파일로 바꾸고,
    설치 계획, 헬퍼 코드, 리포트, 검증, 롤백 기록을 함께 남깁니다.
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a>
  </p>
  <p>
    <a href="https://docs-gamma-orcin.vercel.app">Docs</a> •
    <a href="./AGENT_USAGE.md">Agent Usage</a> •
    <a href="./AGENT_USAGE.md#skill-setup">Agent Skill</a> •
    <a href="https://docs-gamma-orcin.vercel.app/llm-reference.html">LLM Reference</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v0.7.2"><img alt="Release" src="https://img.shields.io/badge/release-v0.7.2-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## openRender란?

openRender는 AI 코딩 에이전트가 생성된 게임 이미지를 실제 게임 프로젝트에 안전하게 배치할 수 있도록 돕는 로컬 우선 Developer Kit입니다.

이미지 생성기는 픽셀을 만듭니다. 하지만 게임 프로젝트에는 안정적인 경로, 프레임 메타데이터, 매니페스트, 헬퍼 코드, 미리보기, 리포트, 그리고 설치를 되돌릴 수 있는 경계가 필요합니다. openRender는 에이전트가 추측을 줄이고 프로젝트 상태를 검토 가능한 형태로 남기도록 이 핸드오프 계층을 제공합니다.

현재 `0.7.2` 코어는 Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Plain Canvas + Vite의 이미지 에셋 핸드오프를 지원합니다.

## 빠른 시작

패키지는 로컬 개발용으로 준비되어 있습니다. 아직 배포 전이므로 이 저장소에서 빌드한 CLI를 실행합니다.

```bash
pnpm install
pnpm build
```

에이전트 중심으로 사용할 때는 프로젝트에 openRender를 설치한 뒤, 코딩 에이전트에게 openRender를 사용하라고 말하면 됩니다. 정확한 openRender 명령 선택은 로컬 지침과 레퍼런스를 읽은 에이전트가 처리합니다.

```text
Install openRender for this project, then use it to add the generated game asset to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```

설정은 스킬 요청처럼 자연어로 말해도 됩니다:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right local agent instructions, and explain what changed.
```

이 스킬은 로컬 에이전트 지침입니다. 자연어 요청을 `install-agent`, compact context, 읽기 전용 wire-map, dry-run, 검증, 리포트, 롤백 규칙으로 연결합니다.

아래 CLI 순서는 로컬 설정, 에이전트 검증, 수동 참고용입니다.

대상 게임 프로젝트에서:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

AI 코딩 에이전트용 지침은 먼저 dry-run으로 확인한 뒤 설치합니다:

```bash
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform all --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform codex --json
```

파일을 쓰기 전에 계획과 dry-run을 확인합니다:

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

계획이 맞을 때만 설치합니다:

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

에이전트가 생성된 helper를 어디에 연결할지 알아야 할 때는 `context --json --wire-map`으로 읽기전용 연결 후보를 확인합니다.

최근 openRender 설치를 되돌립니다:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

`--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, `--target canvas`를 사용할 수 있습니다.

## 작동 방식

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

openRender는 `.openrender/` 아래에 아티팩트, 미리보기, 리포트, 실행 기록, 롤백 스냅샷을 저장합니다.

## 핵심 기능

- 프로젝트 스캔과 doctor 체크.
- sprite 계획, dry-run, 설치, 검증, 리포트, diff, explain, rollback.
- context, 검증, 리포트, explain, diff를 위한 짧은 agent 출력.
- 게임 코드 연결 후보를 알려주는 읽기전용 wiring map.
- alpha 진단, 안전한 기본 배경 cutout, edge-flood 배경 제거, 프레임 감지, normalize preset, sprite invariant, 프레임 미리보기 시트.
- Phaser, Godot, LOVE2D, PixiJS, Canvas 어댑터.
- JSON 스키마, 짧은 agent summary, recipe, fixture capture, golden fixture.
- 지원 타깃을 위한 로컬 JSON-only MCP 메타데이터 헬퍼.

## 엔진 출력

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG 에셋, TypeScript 매니페스트, 애니메이션 헬퍼, preload snippet |
| Godot 4 | PNG 에셋, GDScript 에셋 헬퍼, 애니메이션 헬퍼, `res://` 경로 |
| LOVE2D | PNG 에셋, Lua 에셋 모듈, 애니메이션 메타데이터, load/draw snippet |
| PixiJS + Vite | PNG 에셋, 선택적 spritesheet JSON, TypeScript Pixi 헬퍼 |
| Canvas + Vite | PNG 에셋, TypeScript 매니페스트, 이미지 로딩 및 프레임 drawing 헬퍼 |

## 에이전트 규칙

- 프로젝트 타입을 추측하거나 넓게 파일을 읽기 전에 `context --json`을 실행합니다.
- 가장 짧은 프로젝트 handoff가 필요하면 `context --json --compact`를 사용합니다.
- 생성된 helper를 게임 코드에 연결하기 전 `context --json --wire-map`으로 후보 위치를 확인합니다.
- 낯선 프로젝트에 파일을 쓰기 전에 `doctor --json`을 실행합니다.
- `--install` 전에 `plan sprite --json` 또는 `compile sprite --dry-run --json`을 사용합니다.
- 설치 전에 `installPlan.files`를 확인합니다.
- 사용자가 덮어쓰기를 허용하지 않는 한 `--force`를 넘기지 않습니다.
- 생성된 매니페스트는 기본 `merge` 전략으로 누적하고, 단일 항목 또는 공유 매니페스트 미작성 흐름이 필요할 때만 `--manifest-strategy replace|isolated`를 사용합니다.
- 설치 후 `verify --run latest --json`을 실행합니다.
- agent가 상태, 다음 행동, compact table만 필요할 때는 `report`, `explain`, `diff`에 `--compact`를 붙입니다.
- `rollback --run latest --json`은 openRender 설치 결과에만 사용합니다.

## 저장소 구조

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

## Docs 배포

공식 공개 문서 URL은 다음 고정 Vercel production alias입니다:

```text
https://docs-gamma-orcin.vercel.app
```

GitHub README, 릴리스 노트, 이슈, 사용자에게 전달하는 링크에는 이 Vercel production alias를 사용합니다. Vercel은 배포할 때마다 `https://docs-<hash>-stelify87s-projects.vercel.app` 같은 고유 URL도 만들지만, 이 URL은 배포 결과 확인용 산출물이며 안정적인 문서 링크가 아닙니다.

릴리스 환경에서 설정된 Vercel production 사이트를 배포합니다:

```bash
vercel deploy <site-source> --prod -y
vercel inspect <deployment-url>
```

배포 후 alias 목록에 `https://docs-gamma-orcin.vercel.app`가 포함되어 있는지 확인합니다. GitHub Pages는 공식 문서 경로가 아니며, 공개 URL은 Vercel production alias로 유지합니다.

## 개발

필수 조건:

- Node.js 22 이상
- pnpm 10 이상

검사 실행:

```bash
pnpm typecheck
pnpm test
```

소스에서 CLI 실행:

```bash
pnpm build
node packages/cli/dist/index.js --version
```

## 연락처

프로젝트 문의는 `stelify87@gmail.com`으로 연락하세요.
