# [v0.1.0 기준 문서] openRender 0.1.0 - Agent-safe Media-to-Engine Compiler

## 문서 범위

| 항목 | 결정 |
|---|---|
| 기준 문서 | `docs/openRender_v0.1.0.md` |
| 작성일 | 2026-05-01 |
| 상태 | 0.1.0 활성 기준 문서 |
| 제품명 | openRender |
| 주 사용자 | 로컬 게임 프로젝트에서 작업하는 AI coding agent |
| 0.1.0 핵심 범위 | Phaser와 Godot용 로컬 이미지 에셋 handoff |
| 지원 엔진 | Phaser, Godot 4 |
| 지원 미디어 | 이미지 에셋만 |
| 실행 표면 | 로컬 CLI, JSON-first |
| 명시적 제외 범위 | 계정, 결제, 클라우드 API, hosted playground, 모델 호출, telemetry, full MCP server, Pixi/Canvas/Unity, audio/video/3D |

이 문서는 기존 `openRender_v0.1.md`의 Phaser 중심 기준을 대체한다. 0.1.0의 기준 범위는 기존 Vite + Phaser workflow에 Godot 4 이미지 에셋 workflow를 추가하는 것이다.

---

## 0. 전략 요약

openRender는 이미지 생성기, prompt playground, hosted game asset API, asset marketplace, 결제 제품이 아니다.

openRender는 다음 역할에 집중한다.

> AI agent가 호출하는 local-first media-to-engine compiler. 이미 생성된 로컬 미디어 파일을 엔진에서 바로 사용할 수 있는 프로젝트 에셋, 설치 계획, 검증 결과, report, rollback 단위로 바꾼다.

0.1.0은 아래 loop를 증명해야 한다.

```text
agent가 로컬 이미지 파일을 받거나 생성한다
-> agent가 대상 게임 프로젝트를 scan한다
-> openRender가 media contract를 구성한다
-> openRender가 deterministic PNG artifact를 만든다
-> openRender가 엔진별 install plan을 만든다
-> agent가 JSON output을 검토한다
-> openRender가 snapshot과 함께 파일을 설치한다
-> openRender가 로컬 파일 및 이미지 invariant를 검증한다
-> openRender가 로컬 report와 preview를 작성한다
-> agent가 생성된 path/helper를 사용해 게임 코드를 수정한다
-> openRender 설치 단위는 rollback 가능하게 남는다
```

0.1.0은 의도적으로 좁다.

- 계정이나 hosted service 없이 동작하는 local-first CLI workflow.
- AI agent가 읽기 쉬운 JSON-first command output.
- 대상 프로젝트 안에서 예측 가능한 deterministic file operation.
- 이미지 에셋을 PNG로 정규화하는 compile 단계.
- Phaser와 Godot 4 adapter output.
- 로컬 run record, report, preview, snapshot, verification, rollback.
- 모델 생성, 결제, telemetry, cloud orchestration, 엔진 runtime smoke test는 이 패키지 범위 밖.

---

## 1. 제품 포지셔닝

### 1.1 이름과 표면

```text
Brand: openRender
CLI: openrender
Config: openrender.config.json
Local state: .openrender/
NPM scope: @openrender/*
```

### 1.2 한 줄 정의

> openRender는 AI agent가 생성한 미디어를 게임 엔진에서 바로 쓸 수 있는 프로젝트 구성요소로 바꾸는 로컬 인프라다.

영문 보조 설명:

> openRender is local infrastructure for AI agents turning generated media into engine-ready playable projects.

### 1.3 0.1.0 기준 문장

> openRender 0.1.0은 raw generated image를 로컬 CLI로 Phaser 또는 Godot 프로젝트에 설치 가능한 이미지 에셋으로 변환하고, 검증과 report, rollback까지 제공할 수 있음을 증명한다.

---

## 2. 문제 정의

AI coding agent는 코드를 작성하고 이미지를 생성하거나 전달받을 수 있다. 그러나 raw generated media는 게임 프로젝트에 바로 들어가기 어렵다.

반복적으로 발생하는 문제는 다음과 같다.

- raw image는 crop, padding, alpha cleanup, format normalization이 필요하다.
- sprite frame set은 frame count, frame size, strip/grid 구조 검증이 필요하다.
- 엔진마다 asset path, load path, helper code 관례가 다르다.
- agent가 매번 일회성 script를 만들어 같은 문제를 다시 푼다.
- 생성 파일은 structured run record 없이는 audit하기 어렵다.
- agent가 asset과 helper file을 쓴 뒤 rollback 기준이 불명확하다.

openRender는 media-to-engine handoff를 표준화한다. agent는 임시 이미지 처리 스크립트가 아니라 게임 통합과 gameplay code에 context를 써야 한다.

---

## 3. 사용자

### 3.1 주 사용자

```text
로컬 게임 repository 안에서 작업하는 AI coding agent
```

예시는 다음과 같다.

- Phaser prototype을 수정하는 Codex.
- Godot 4 프로젝트에 asset을 설치하는 Cursor 또는 Claude Code.
- 생성된 sprite를 안전하게 설치해 달라고 agent에게 요청하는 solo developer.

### 3.2 사람 사용자

사람도 CLI를 직접 사용할 수 있다. 다만 0.1.0은 agent-first product surface를 우선한다.

- workflow command는 `--json`을 지원해야 한다.
- dry-run은 생성 및 설치 예정 파일을 보여줘야 한다.
- 실패 output은 다음에 실행할 명령을 제안해야 한다.
- report는 로컬에서 열람 가능해야 한다.
- install은 rollback 가능해야 한다.

---

## 4. 0.1.0 지원 범위

### 4.1 엔진

| 엔진 | 0.1.0 상태 | 설명 |
|---|---:|---|
| Phaser | 지원 | 기존 Vite + Phaser workflow를 계속 지원한다. |
| Godot 4 | 지원 | 기본 이미지 에셋 설치와 GDScript helper 생성을 지원한다. |
| PixiJS | 미지원 | 향후 adapter 후보. |
| Canvas | 미지원 | 향후 adapter 후보. |
| Unity | 미지원 | 복잡도가 높아 0.1.0 범위 밖. |

### 4.2 미디어 타입

0.1.0에서 지원하는 media contract type은 두 가지다.

```text
visual.transparent_sprite
visual.sprite_frame_set
```

아래 타입은 이름만 예약하며 0.1.0에서 구현하지 않는다.

```text
audio.sound_effect
audio.music_loop
video.cutscene_clip
scene.prefab
scene.patch
```

### 4.3 프로젝트 감지

0.1.0은 다음을 감지해야 한다.

- `package.json` dependency 기반 Vite + Phaser 프로젝트.
- `project.godot` 기반 Godot 프로젝트.
- JavaScript 프로젝트의 package manager.
- `.openrender/`와 `openrender.config.json` 상태.

### 4.4 명시적 제외 범위

아래 항목은 0.1.0의 결핍이 아니라 의도적으로 제외한 범위다.

- account, login, license, billing, wallet, entitlement check.
- cloud API, hosted worker, report sync, remote artifact cache.
- model provider call 또는 BYOK generation integration.
- telemetry.
- full MCP server.
- Phaser 또는 Godot scene 자동 patch.
- Godot `.import` 파일 생성.
- Phaser canvas 또는 Godot editor/headless runtime 내부 smoke test.
- audio, video, 3D, atlas packing, advanced matting, segmentation.

---

## 5. Engine Adapter 정책

### 5.1 공통 책임

모든 engine adapter는 다음 정보를 제공해야 한다.

- asset descriptor.
- engine load path.
- install plan.
- optional manifest/helper source.
- report에 쓰기 쉬운 output field.

공통 descriptor 형태는 아래 기준을 따른다.

```ts
interface EngineAssetDescriptor {
  id: string;
  engine: "phaser" | "godot";
  type: "transparent_sprite" | "sprite_frame_set";
  assetPath: string;
  loadPath: string;
  manifestPath: string | null;
  codegenPath: string | null;
}
```

Phaser adapter는 기존 호환성을 위해 `publicUrl`을 `loadPath` alias로 계속 노출할 수 있다.

### 5.2 Phaser Adapter

기본 Phaser output:

```text
assetRoot: public/assets/openrender
sourceRoot: src/openrender
assetPath: public/assets/openrender/{asset}.png
loadPath: /assets/openrender/{asset}.png
manifestPath: src/openrender/openrender-assets.ts
codegenPath: src/openrender/animations/{asset}.ts
```

Phaser helper는 agent가 scene code에서 직접 import하거나 key/path를 복사해 사용할 수 있어야 한다.

Phaser command 예시:

```bash
openrender init --target phaser --json
openrender compile sprite --target phaser --input ./tmp/hero.png --id hero --install --json
openrender verify --json
```

### 5.3 Godot Adapter

기본 Godot output:

```text
assetRoot: assets/openrender
sourceRoot: scripts/openrender
assetPath: assets/openrender/{asset}.png
loadPath: res://assets/openrender/{asset}.png
manifestPath: scripts/openrender/openrender_assets.gd
codegenPath: scripts/openrender/animations/{asset}.gd
```

Godot adapter의 0.1.0 기준은 다음과 같다.

- `project.godot`가 있으면 Godot 프로젝트로 scan한다.
- `init --target godot`은 Godot용 default config를 쓴다.
- image artifact는 `res://` load path를 기준으로 descriptor를 만든다.
- sprite frame set은 `SpriteFrames` 생성을 돕는 GDScript helper를 만든다.
- `.import`와 `.godot/` 파일은 생성하지 않는다.
- Godot editor import cache에 의존하지 않고 로컬 파일 구조와 load path shape만 검증한다.

Godot command 예시:

```bash
openrender init --target godot --json
openrender compile sprite --target godot --input ./tmp/enemy.png --id enemy --install --json
openrender verify --json
openrender rollback <runId> --json
```

---

## 6. CLI 계약

### 6.1 핵심 명령

0.1.0의 CLI는 아래 명령을 기준으로 한다.

```text
openrender --version
openrender init --target phaser|godot --json
openrender scan --json
openrender compile sprite --target phaser|godot --input <png> --id <id> --install --json
openrender verify --json
openrender report <runId> --json
openrender rollback <runId> --json
openrender doctor --json
```

### 6.2 Target과 Framework 규칙

0.1.0의 target/framework 조합은 명확해야 한다.

| target | framework | 상태 |
|---|---|---|
| `phaser` | `vite` | 지원 |
| `godot` | `godot` | 지원 |
| `phaser` | `godot` | 거부 |
| `godot` | `vite` | 거부 |

0.1.0 이후에는 지원 범위를 Phaser 단독으로 설명하면 안 된다. 이제 0.1.0은 `Phaser`와 `Godot 4`를 지원하되, Phaser의 웹 프로젝트 framework는 Vite로 한정한다.

### 6.3 JSON-first Output

agent가 호출하는 command는 사람이 읽는 문장보다 structured field를 우선해야 한다.

좋은 output 기준:

- `ok`, `runId`, `target`, `engine`, `artifact`, `installPlan`, `verification`, `reportPath`, `rollbackHint`를 명확히 둔다.
- 실패 시 `ok: false`, `code`, `message`, `nextActions`를 제공한다.
- 파일 경로는 project-relative path를 기본으로 하되 report에서는 absolute path도 필요하면 제공한다.

---

## 7. Media Contract

### 7.1 Transparent Sprite

```json
{
  "type": "visual.transparent_sprite",
  "id": "hero-idle",
  "input": "./tmp/hero-idle.png",
  "output": {
    "format": "png",
    "alpha": true
  }
}
```

검증 기준:

- PNG로 읽을 수 있어야 한다.
- width/height가 0보다 커야 한다.
- alpha channel이 필요한 sprite에서 유지되어야 한다.
- install plan이 engine load path를 포함해야 한다.

### 7.2 Sprite Frame Set

```json
{
  "type": "visual.sprite_frame_set",
  "id": "enemy-dot-idle",
  "input": "./tmp/enemy-dot-idle.png",
  "frames": {
    "frameWidth": 32,
    "frameHeight": 32,
    "frameCount": 4,
    "layout": "strip"
  }
}
```

검증 기준:

- 전체 이미지 크기가 frame size와 frame count에 맞아야 한다.
- frame metadata가 adapter helper에 반영되어야 한다.
- Phaser는 TypeScript animation helper를 만들 수 있다.
- Godot은 `SpriteFrames` helper GDScript를 만들 수 있다.

---

## 8. Repository 구조 기준

0.1.0 기준 monorepo package 역할은 다음과 같다.

```text
packages/core
  config, scan, validation, shared types

packages/cli
  agent-facing command surface

packages/adapters/phaser
  Phaser descriptor, install plan, helper generation

packages/adapters/godot
  Godot descriptor, install plan, GDScript helper generation

packages/doctor
  local environment/project diagnostics

packages/reporter
  local report generation

packages/harness-visual
  image artifact inspection and preview support
```

`packages/adapters/godot`은 0.1.0에서 실제 package로 존재해야 하며, root build/typecheck/test 경로에 포함되어야 한다.

---

## 9. Verification과 Report

### 9.1 Verification

0.1.0 verification은 엔진 내부 실행을 증명하지 않는다. 대신 agent handoff에 필요한 로컬 invariant를 검증한다.

- artifact file exists.
- artifact is valid PNG.
- installed asset exists.
- manifest/helper file exists when planned.
- load path shape is engine-correct.
- rollback snapshot exists when install happened.

Godot의 경우 `res://assets/openrender/...` 형태를 검증한다. `.import` 생성이나 Godot editor cache 검증은 0.1.0 범위 밖이다.

### 9.2 Report

report는 agent와 사람이 함께 볼 수 있어야 한다.

포함해야 할 내용:

- run id.
- target engine.
- source image.
- artifact path.
- installed files.
- generated helper files.
- verification result.
- rollback command.
- engine-specific note.

Godot report에는 `.import`를 생성하지 않는다는 note가 들어가야 한다. 이는 미구현 문구가 아니라 Godot editor가 import cache를 관리한다는 범위 설명이다.

---

## 10. Safety와 Privacy

0.1.0은 local-first tool이므로 다음 원칙을 따른다.

- 기본 동작에서 network call을 하지 않는다.
- account, billing, telemetry를 요구하지 않는다.
- model provider API를 호출하지 않는다.
- 입력 이미지는 로컬 파일로만 처리한다.
- 생성 파일은 install plan과 snapshot을 통해 추적한다.
- rollback 가능한 변경만 openRender install 단위로 관리한다.

이 표현은 “안 되는 것이 많다”는 목록처럼 보이면 안 된다. 제품 설명에서는 아래처럼 말한다.

> openRender 0.1.0은 hosted platform이 아니라 agent가 로컬 프로젝트 안에서 안전하게 호출하는 compiler layer다. 그래서 첫 버전은 계정, 결제, 원격 생성, telemetry를 넣지 않고 media handoff의 신뢰성과 rollback에 집중한다.

---

## 11. 0.1.0 완료 기준

0.1.0은 아래 기준을 충족해야 완료로 본다.

- `openrender --version`이 `0.1.0`을 반환한다.
- package metadata가 `0.1.0`으로 정렬되어 있다.
- `scan`이 Phaser와 Godot 프로젝트를 구분한다.
- `init --target phaser`가 Phaser/Vite config를 만든다.
- `init --target godot`이 Godot config를 만든다.
- `compile sprite --target phaser --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `compile sprite --target godot --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `verify`가 두 target에서 통과한다.
- `rollback`이 설치 파일을 되돌린다.
- Godot workflow가 `.import`와 `.godot/`을 만들지 않는다.
- `pnpm typecheck`와 `pnpm test`가 통과한다.
- README와 contributor/security 문서가 0.1.0 및 Godot 지원 상태와 일치한다.

---

## 12. 현재 구현 상태 기준

현재 0.1.0 목표 구현은 다음 상태를 기준으로 한다.

| 영역 | 상태 |
|---|---|
| version bump | 완료 |
| Phaser adapter | 유지 및 0.1.0 descriptor 정렬 |
| Godot adapter package | 구현 |
| Godot project scan | 구현 |
| Godot init defaults | 구현 |
| Godot compile/install | 구현 |
| Godot GDScript manifest/helper | 구현 |
| Godot verify/report/rollback | 구현 |
| package tarball install smoke | 검증 |
| README 및 repo 문서 정렬 | 갱신 |
| hosted/cloud/MCP server | 0.1.0 범위 밖 |

주의할 점:

- “지원”은 로컬 파일 설치와 helper generation 기준이다.
- Godot editor를 실제로 열어 import cache를 생성하거나 scene에 자동 연결하는 기능은 0.1.0 지원 범위가 아니다.
- full MCP server implementation은 0.1.0 목표가 아니므로 README에서 미완성 문구로 강조하지 않는다.

---

## 13. Roadmap

0.1.x 후보:

- Godot scene patch helper.
- Phaser scene integration snippet 강화.
- atlas packing.
- additional image normalization option.
- richer visual diff report.
- MCP server thin wrapper.

0.2.x 후보:

- PixiJS adapter.
- Canvas adapter.
- audio sound effect workflow.
- remote artifact registry optional mode.
- provider integration은 별도 명시적 opt-in으로만 검토.

---

## 14. 최종 기준

openRender 0.1.0의 목표는 넓은 플랫폼이 되는 것이 아니다.

목표는 AI agent가 로컬 게임 프로젝트 안에서 생성 이미지를 안전하게 설치하고, 엔진별 path/helper를 얻고, 검증하고, report를 남기고, 필요하면 rollback할 수 있게 만드는 것이다.

0.1.0에서 이 기준은 Phaser와 Godot 4 이미지 에셋 workflow로 충족한다.
