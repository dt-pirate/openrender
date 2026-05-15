<div align="center">
  <h1>openRender</h1>
  <h3>AI 에이전트 네이티브 게임 개발을 위한 상태 인프라</h3>
  <p>
    openRender는 AI 코딩 에이전트가 게임 개발을 이어갈 수 있도록 로컬 프로젝트 상태 계층을 제공합니다:
    압축 메모리, 시각 근거, 엔진 핸드오프, 검증, 리포트, 롤백.
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

## openRender란?

openRender는 AI 코딩 에이전트가 여러 번의 build, test, refine 루프를 거치면서도 게임 프로젝트의 일관성을 잃지 않도록 돕는 로컬 상태 인프라입니다.

프로젝트 의도, 제작자 취향, 시각 방향, 엔진 제약, 복구 상태가 채팅에만 남아 있으면 에이전트는 쉽게 맥락을 잃습니다. openRender는 이 신호들을 파생된 프로젝트 상태로 저장하고, 계획, helper path, wire map, 리포트, 검증, 롤백으로 이어지는 결정적 미디어 핸드오프와 함께 묶습니다.

이미지 모델은 픽셀을 만듭니다. openRender는 그 픽셀이 실제 게임 프로젝트 안에서 계속 쓸 수 있는 상태가 되도록 돕습니다. 엔진을 대체하거나 gameplay code를 자동 수정하지 않고, 다음 에이전트가 실제 프로젝트 상태에서 이어갈 수 있는 압축 맥락을 제공합니다.

openRender 메모리는 노트 작성 계층이 아닙니다. run, loop, 사용자 피드백에서 파생된 이벤트, 결론, 프로젝트 카드, 에이전트 카드, 제작자 취향 카드, 게임 방향 카드, 시각 회피 카드, 시각 근거 인덱스를 저장해서 다음 에이전트 작업이 원시 로그를 다시 읽거나 모델 API로 에셋을 재생성하지 않고도 올바른 맥락을 이어받게 합니다.

현재 `1.1.1` 코어는 제작자 취향 연속성, 게임 방향 카드, 시각 회피 메모리, 시각 근거 브리프, run 드리프트 리뷰, loop task packet, service snapshot, 그리고 Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Three.js + Vite, Plain Canvas + Vite, Unity 프로젝트를 위한 스프라이트, 애니메이션, 오디오, 아틀라스/타일셋, UI 핸드오프를 지원합니다.

## 빠른 시작

CLI npm 패키지를 설치한 뒤, 에이전트가 프로젝트 맥락, 메모리, 검증, 미디어 핸드오프가 필요할 때 대상 게임 프로젝트에서 `openrender` 명령을 사용합니다:

```bash
npm install -g @openrender/cli
openrender --version
```

npm 패키지 이름은 `@openrender/cli`이고, 설치되는 명령은 `openrender`입니다. 범위 없는 npm 이름 `openrender`는 이미 다른 관리자가 소유하고 있으므로, 이름이 이전되기 전까지 `npm install -g openrender`는 릴리즈 경로가 아닙니다.

저장소 기반 개발이 필요할 때는 source에서 CLI를 빌드합니다:

```bash
pnpm install
pnpm build
```

에이전트 중심으로 사용할 때는 프로젝트에 openRender를 설치한 뒤, 코딩 에이전트에게 openRender를 사용하라고 말하면 됩니다. 정확한 openRender 명령 선택은 프로젝트 지침과 레퍼런스를 읽은 에이전트가 처리합니다.

```text
이 프로젝트에 openRender를 설치하고 compact project context를 읽은 뒤, 시각 방향, 엔진 제약, 복구 상태를 잃지 않게 다음 게임 개발 작업을 이어가줘.
openRender를 메모리, 검증, 리포트, 롤백 가능한 미디어 핸드오프에 사용하고, 무엇이 바뀌었는지와 다음 에이전트가 알아야 할 내용을 알려줘.
```

설정은 스킬 요청처럼 자연어로 말해도 됩니다:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right agent instructions, and explain what changed.
```

이 스킬은 프로젝트 에이전트 지침입니다. 자연어 요청을 `install-agent`, compact context, 읽기 전용 wire-map, dry-run, 검증, 리포트, 롤백 규칙으로 연결합니다.

아래 CLI 순서는 설정, 에이전트 검증, 수동 참고용입니다.

대상 게임 프로젝트에서:

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

AI 코딩 에이전트용 지침은 먼저 dry-run으로 확인한 뒤 설치합니다:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

파일을 쓰기 전에 계획과 dry-run을 확인합니다:

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

reference와 motion은 설치 전에 먼저 기록하거나 분석할 수 있습니다:

```bash
openrender ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "이 움직임의 타이밍과 스타일을 맞춘다." \
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

다음 에이전트 작업을 위해 프로젝트 의도와 시각 방향을 보존합니다:

```bash
openrender memory ingest \
  --feedback "UI는 읽기 쉽게 유지하고 neon arcade 방향을 보존한다." \
  --json

openrender memory query --for ui --json --compact
openrender memory review --run latest --json
openrender memory context --json --compact
openrender clean --memory --keep-latest --dry-run --json
```

계획이 맞을 때만 설치합니다:

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

에이전트가 생성된 helper를 어디에 연결할지 알아야 할 때는 `context --json --wire-map`으로 읽기전용 연결 후보를 확인합니다.

최근 openRender 설치를 되돌립니다:

```bash
openrender rollback --run latest --json
```

`--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, `--target canvas`, `--target three`, `--target unity`를 사용할 수 있습니다.

## 작동 방식

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

openRender는 `.openrender/` 아래에 아티팩트, 미리보기, 리포트, 실행 기록, 롤백 스냅샷을 저장합니다.

## 핵심 기능

- 프로젝트 스캔과 doctor 체크.
- sprite 계획, dry-run, 설치, 검증, 리포트, diff, explain, rollback.
- 스케치, 목업, 컨셉 이미지, 프로젝트 파일, URL을 안전하게 남기는 visual reference 기록. URL은 다운로드하지 않고 provenance만 저장한다.
- `detect-motion`으로 video/GIF/PNG sequence를 먼저 분석하고, ffmpeg가 없을 때는 명확한 다음 행동을 반환한다.
- `compile animation`으로 animation sheet, 엔진별 runtime helper, wire-map handoff, 검증, 리포트, diff, explain, rollback을 제공한다.
- audio, atlas/tileset, UI compile/install/verify/report/rollback을 같은 run-state 파이프라인으로 처리.
- run, loop, 사용자 피드백, 시각 레퍼런스에서 project card, agent card, user-direction card, engine card, creator-taste card, game-direction card, visual-avoidance card, visual-evidence index를 파생하는 메모리 인프라.
- `memory query`와 `memory review`로 다음 에이전트 작업 전 제작자 취향, 게임 방향, 시각 회피, 드리프트 신호를 짧게 확인.
- `service snapshot --json`으로 미래 dashboard나 agent supervisor가 사용할 로컬 전용 컨텍스트 경계를 출력.
- context, 검증, 리포트, explain, diff를 위한 짧은 agent 출력.
- 게임 코드 연결 후보를 알려주는 읽기전용 wiring map.
- alpha 진단, 안전한 기본 배경 cutout, edge-flood 배경 제거, 프레임 감지, normalize preset, sprite invariant, 프레임 미리보기 시트.
- Godot/LOVE2D 런타임 스모크와 `smoke --build` 기반 선택형 웹 빌드 스모크.
- Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas, Unity 어댑터.
- JSON 스키마, 짧은 agent summary, recipe, fixture capture, golden fixture.
- 지원 타깃을 위한 JSON-only MCP 메타데이터 헬퍼.

## 엔진 출력

| Target | Output Shape |
|---|---|
| Vite + Phaser | PNG 에셋, TypeScript 매니페스트, 애니메이션 헬퍼, preload snippet |
| Godot 4 | PNG 에셋, GDScript 에셋 헬퍼, 애니메이션 헬퍼, `res://` 경로 |
| LOVE2D | PNG 에셋, Lua 에셋 모듈, 애니메이션 메타데이터, load/draw snippet |
| PixiJS + Vite | PNG 에셋, 선택적 spritesheet JSON, TypeScript Pixi 헬퍼 |
| Three.js + Vite | PNG 에셋, TypeScript 매니페스트, `TextureLoader`, `Sprite`, `PlaneGeometry` 헬퍼 |
| Canvas + Vite | PNG 에셋, TypeScript 매니페스트, 이미지 로딩 및 프레임 drawing 헬퍼 |
| Unity | `Assets/OpenRender` 아래 PNG/audio 에셋, C# 매니페스트, sprite/media 헬퍼 클래스 |

Animation compile은 같은 target adapter를 재사용한다. Phaser, Godot, LOVE2D, Unity는 더 깊은 runtime helper를 제공하고, PixiJS, Three.js, Canvas는 render loop에 연결할 helper path와 snippet을 제공한다. openRender는 여전히 game code를 자동 패치하지 않는다.

## 에이전트 규칙

- 프로젝트 타입을 추측하거나 넓게 파일을 읽기 전에 `context --json`을 실행합니다.
- 가장 짧은 프로젝트 handoff가 필요하면 `context --json --compact`를 사용합니다.
- 생성된 helper를 게임 코드에 연결하기 전 `context --json --wire-map`으로 후보 위치를 확인합니다.
- 낯선 프로젝트에 파일을 쓰기 전에 `doctor --json`을 실행합니다.
- `--install` 전에 `plan sprite --json` 또는 `compile sprite --dry-run --json`을 사용합니다.
- 사용자가 스케치, 목업, 컨셉 이미지, 영상 URL, 프로젝트 reference file을 주면 `ingest reference --json`으로 기록합니다.
- 다음 작업이 시각 스타일이나 조작감에 의존하면 `memory query --for style|ui|movement --json --compact`로 제작자 취향과 시각 근거를 먼저 확인합니다.
- 설치나 루프 이후에는 `memory review --run latest --json`으로 메모리 부족 또는 방향 이탈 신호를 확인합니다.
- animation fps, frame count, layout, loop를 고르기 전 `detect-motion --json --compact`를 사용합니다.
- animation asset을 설치하기 전 `compile animation --dry-run --json`으로 계획을 확인합니다.
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
packages/mcp-server        JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    recipe metadata for supported targets
```

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
