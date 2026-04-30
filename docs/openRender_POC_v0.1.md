# [POC Spec] openRender v0.1 — AI-Native Agentic Game Development Infrastructure

## Proof of Concept — Local-First Media-to-Engine Compiler

| 항목 | 내용 |
|---|---|
| 문서명 | `openRender_POC_v0.1.md` |
| 작성일 | 2026-04-30 |
| 프로젝트명 | `openRender` |
| 문서 상태 | Active POC scope reference |
| 기준 문서 | 본 문서가 `openRender v0.1` POC의 기준 문서다. |
| 문서 목적 | 새 오픈소스 프로젝트 `openRender`의 결제/계정/클라우드가 없는 **로컬 POC 구현 범위**를 확정한다. |
| 제품 성격 | AI-native agentic game development infrastructure |
| POC 핵심 | AI agent가 호출할 수 있는 local-first compiler로, raw generated media를 game engine-ready output으로 변환·설치·검증한다. |
| POC 첫 대상 | Vite + Phaser 기반 Web 2D 프로젝트 |
| POC 제외 | 결제, 계정, cloud API, hosted worker, playground, marketplace, full MCP, full Godot/Pixi/Canvas, audio/video 구현 |

---

## 0. 최종 전략 요약

`openRender`는 단순한 이미지 생성기, 에셋 다운로드 도구, 웹 playground가 아니다.

새로운 정의는 다음과 같다.

> **openRender는 AI agent가 게임을 만들 때 호출하는 local-first media-to-engine compiler다.**
>
> AI가 생성한 raw image, audio, video, scene, code fragment를 장기적으로 game engine-ready output으로 변환하고, 로컬 프로젝트에 설치·검증·보고·되돌리기까지 수행하는 agentic game development infrastructure를 지향한다.

다만 `v0.1`은 MVP가 아니라 **POC**다.

POC의 목표는 사업 검증이나 유료화가 아니다. 목표는 단 하나다.

```text
로컬 Web 2D 프로젝트에서
AI-generated raw image를
Phaser-ready asset으로 변환하고
프로젝트에 설치하고
브라우저 preview/report로 검증할 수 있는가?
```

핵심 방향:

- **오픈소스 새 레포에서 처음부터 시작한다.**
- **컴파일은 로컬에서 수행한다.**
- **계정 없이 시작한다.**
- **결제, 라이선스, entitlement는 POC에서 제거한다.**
- **Playground는 POC 중심에서 제거한다.**
- **API는 POC에 없다.**
- **첫 wedge는 Vite + Phaser 기반 Web 2D다.**
- **POC에서는 image asset만 구현한다.**
- **장기 설계는 sound/video/scene/code까지 확장 가능해야 한다.**
- **openRender는 Codex/Cursor/Claude Code와 경쟁하지 않는다. 이들이 호출하는 전문 인프라 레이어가 된다.**

---

## 1. 이름과 포지셔닝

### 1.1. 프로젝트명

프로젝트명은 `openRender`다.

표기 원칙:

```text
Brand: openRender
CLI: openrender
Config: openrender.config.json
Local state: .openrender/
NPM scope: @openrender/*
```

### 1.2. 이름의 의미

`render`는 여기서 단순한 GPU rendering만 뜻하지 않는다.

`openRender`에서 render는 다음 의미를 포함한다.

```text
AI-generated output을
실제 game engine 안에서 renderable/playable/useful한 상태로 만든다.
```

즉, openRender가 하는 일은 다음이다.

```text
raw generated media
→ contract에 맞게 정규화
→ engine-ready artifact로 변환
→ project에 install
→ preview/verify
→ report/rollback
```

### 1.3. 한 줄 제품 문장

영문:

> **openRender is open infrastructure for AI agents turning generated media into engine-ready playable projects.**

한국어:

> **openRender는 AI agent가 생성한 미디어를 게임 엔진에서 바로 쓸 수 있는 playable project 구성요소로 바꾸는 오픈 로컬 인프라다.**

### 1.4. POC 한 줄 문장

영문:

> **openRender v0.1 proves that a local CLI can turn a raw generated image into a Phaser-ready installed asset with report, preview, and rollback.**

한국어:

> **openRender v0.1 POC는 raw generated image를 로컬 CLI로 Phaser-ready asset으로 변환·설치·검증·rollback할 수 있음을 증명한다.**

---

## 2. 문제 정의

### 2.1. 시장 가설

AI agent를 이용한 게임 개발은 점점 자연스러운 개발 방식이 된다.

Codex, Cursor, Claude Code 같은 agent는 이미 다음을 수행한다.

```text
- 코드 생성
- 파일 수정
- 로컬 서버 실행
- 브라우저 확인
- 이미지 생성 또는 편집 호출
- 테스트 반복
```

그러나 agent가 코드를 만들고 이미지를 생성해도, generated output은 게임 프로젝트에 바로 들어가지 않는다.

현재 흐름은 대개 이렇다.

```text
AI agent가 게임 코드를 생성
→ image model이 raw asset을 생성
→ raw image가 게임 엔진에 바로 들어가지 않음
→ 개발자 또는 agent가 임시 스크립트 작성
→ crop, padding, alpha cleanup, frame slicing 필요
→ Phaser/Pixi/Godot 등 engine별 manifest/codegen 필요
→ preview에서 깨짐
→ 다시 수정
→ rollback도 불명확
```

### 2.2. 핵심 pain

openRender가 해결하려는 문제는 “이미지를 생성하는 것”이 아니다.

진짜 문제는 다음이다.

> **AI-generated output을 agentic game development workflow에서 바로 사용할 수 있는 engine-ready project component로 바꾸는 과정이 반복적이고 불안정하다.**

초기 Web 2D에서는 특히 다음 pain이 반복된다.

| 영역 | pain |
|---|---|
| Transparent object | 배경 제거, crop, padding, alpha edge cleanup이 매번 다름 |
| Sprite frame set | frame count, frame size, strip/grid slicing이 흔들림 |
| Web engine install | `public/assets`, preload code, manifest TS, animation helper 연결 필요 |
| Agent workflow | agent가 매번 임시 스크립트를 새로 작성함 |
| Visual QA | asset 단독 확인이 아니라 실제 canvas/scene 안에서 확인해야 함 |
| Rollback | agent가 파일을 수정한 뒤 되돌리기 어려움 |
| Reportability | 어떤 crop/padding/slicing이 적용됐는지 기록이 남지 않음 |
| Future media | sound/video/scene도 engine-ready 변환 규칙이 필요해짐 |

### 2.3. 왜 agent만으로 충분하지 않은가

AI coding agent는 강력하지만, 매번 즉석에서 처리하면 다음 문제가 생긴다.

```text
- 프로젝트마다 임시 스크립트가 다름
- crop/padding/frame slicing 기준이 일관되지 않음
- framework별 manifest/codegen이 흔들림
- 검증 결과가 표준화되지 않음
- report/rollback이 남지 않음
- agent가 동일한 시행착오를 반복함
- LLM에게 pixel-level 좌표와 mask 판단을 맡기게 됨
```

openRender의 가치는 agent보다 똑똑한 것이 아니다.

openRender의 가치는 다음이다.

> **AI agent가 매번 새로 만들어야 하는 지저분한 media-to-engine 변환·설치·검증 작업을 표준 로컬 인프라로 제공한다.**

---

## 3. 제품 정체성

### 3.1. openRender가 아닌 것

openRender는 다음이 아니다.

- AI image generation playground
- prompt playground
- model comparison UI
- OpenRouter for game assets
- background removal API
- zip delivery service
- asset marketplace
- credit wallet product
- browser-only asset generator
- Unity asset store 대체재
- UGC moderation product
- hosted SaaS-first product

### 3.2. openRender가 하는 것

openRender는 다음이다.

> **Agentic media-to-engine compiler**

구체적으로는 다음 흐름을 표준화한다.

```text
raw generated media
→ media contract 적용
→ deterministic harness 실행
→ engine adapter output 생성
→ local project에 install
→ preview/report 생성
→ verify
→ rollback 가능
→ agent가 다시 repair/iterate 가능
```

### 3.3. POC에서 openRender가 하는 것

v0.1 POC에서는 범위를 의도적으로 줄인다.

```text
raw generated image
→ visual contract 적용
→ crop/padding/frame slicing
→ Phaser-ready PNG + manifest/codegen
→ Vite + Phaser 프로젝트에 install
→ local report/preview 생성
→ verify
→ rollback
```

### 3.4. 장기적으로 openRender가 하는 것

POC 이후에는 다음으로 확장할 수 있어야 한다.

```text
image asset
sound effect
music loop
video/cutscene clip
sprite/vfx sheet
UI skin
scene object
engine prefab/resource
project integration patch
```

따라서 POC 구조는 image-only 구현이지만, 내부 이름과 contract는 가능하면 `asset-only`가 아니라 `media`, `artifact`, `engine output` 관점으로 설계한다.

---

## 4. POC 핵심 결정

### 4.1. POC는 MVP가 아니다

이 문서의 범위는 MVP가 아니라 POC다.

MVP라면 외부 사용자, 반복 사용, 유료 의향, pricing, account, entitlement까지 고려해야 한다.

하지만 openRender v0.1은 그렇지 않다.

POC의 질문은 다음이다.

```text
이 기술적 루프가 로컬 프로젝트에서 실제로 작동하는가?
```

즉, v0.1에서는 다음을 검증한다.

- 로컬 CLI가 프로젝트 구조를 감지할 수 있는가?
- raw image를 engine-ready image로 정규화할 수 있는가?
- spritesheet frame slicing을 안정적으로 수행할 수 있는가?
- Phaser용 manifest/codegen을 만들 수 있는가?
- 프로젝트에 안전하게 install할 수 있는가?
- local preview/report를 생성할 수 있는가?
- rollback이 작동하는가?

### 4.2. No account

POC에는 계정이 없다.

```text
openrender init
openrender compile sprite
openrender install
openrender verify
```

위 흐름에 login이 없어야 한다.

### 4.3. No billing

POC에는 결제가 없다.

POC에서 금지되는 것:

```text
- pricing page
- subscription
- project pass
- credit
- wallet
- license token
- entitlement check
- checkout
- billing webhook
```

### 4.4. No cloud API

POC에는 cloud API가 없다.

POC에서 금지되는 것:

```text
- report sync
- hosted worker
- remote generation API
- managed generation
- cloud artifact cache
- account API
```

### 4.5. CLI-first

POC의 primary surface는 CLI다.

이유:

- AI agent가 호출하기 쉽다.
- 로컬 프로젝트 파일을 읽고 쓰기 쉽다.
- Git diff, browser preview, local dev server와 자연스럽게 연결된다.
- 웹 playground보다 제품 본질을 빨리 검증할 수 있다.

### 4.6. Agent-compatible, not necessarily MCP-first

POC는 agent-first 철학을 유지하지만, full MCP server 구현은 POC 필수에서 제외한다.

POC에서는 다음을 우선한다.

```text
Agent가 shell command로 openrender CLI를 호출할 수 있는가?
```

MCP는 POC 이후 `v0.2`에서 구현한다.

다만 POC 문서에는 향후 MCP tool schema를 염두에 둔 contract 구조를 유지한다.

### 4.7. Local report, not playground

POC에는 hosted playground가 없다.

대신 다음을 생성한다.

```text
.openrender/reports/{run_id}.html
.openrender/reports/{run_id}.json
.openrender/previews/{run_id}.html
```

이 report는 독립 product UI가 아니라 local run debugger다.

### 4.8. Open-source first

openRender는 새 public repo 기준으로 시작한다.

권장 초기 원칙:

```text
- core local compiler 공개
- CLI 공개
- Phaser adapter 공개
- report/preview 공개
- docs 공개
```

POC에는 유료/비공개 layer가 없으므로, 별도 private backend repo도 필요 없다.

향후 hosted worker 또는 OEM backend가 생기면 별도 repository로 분리할 수 있다.

---

## 5. 핵심 사용자

### 5.1. POC Primary User

```text
AI agent로 Web 2D prototype을 만드는 개인 개발자
```

예시:

- Codex/Cursor/Claude Code로 Phaser 게임 prototype을 만드는 개발자
- image model로 캐릭터/아이템 이미지는 만들 수 있지만 프로젝트에 붙이는 과정이 귀찮은 개발자
- game jam 또는 빠른 prototype에서 asset polish가 필요한 solo dev
- generated image를 Photoshop/GIMP/Aseprite 없이 바로 engine-ready로 만들고 싶은 개발자

### 5.2. POC Secondary User

```text
AI coding agent에게 사용할 수 있는 로컬 에셋 변환 툴을 찾는 개발자
```

### 5.3. 장기 사용자

POC 이후 openRender가 확장되면 다음 사용자도 대상이 된다.

- AI game builder platform
- agentic IDE extension
- education/game creation platform
- browser game generation platform
- game jam platform
- indie team workflow automation

### 5.4. POC 비고객

초기 POC에서는 다음을 직접 타깃하지 않는다.

- AAA studio
- Unity-heavy production team
- 3D-heavy studio
- asset marketplace operator
- 단순 이미지 생성 사용자
- audio/video production tool 사용자
- non-game creative media editor 사용자

---

## 6. POC 단일 루프

### 6.1. POC 루프

```text
local raw image file
→ openrender compile sprite
→ format normalization
→ crop / padding / alpha cleanup
→ frame slicing
→ Phaser-ready output generation
→ local project install
→ preview HTML 생성
→ report HTML/JSON 생성
→ verify
→ rollback 가능
```

### 6.2. POC 대상

| 항목 | 결정 |
|---|---|
| 첫 framework | Vite + Phaser |
| 첫 asset type | `visual.transparent_sprite`, `visual.sprite_frame_set` |
| 입력 | local PNG/WebP/JPEG image file |
| 출력 | PNG spritesheet, TypeScript manifest, TypeScript animation helper, local report |
| 생성 모델 호출 | POC 제외. 이미 생성된 raw image를 입력으로 사용 |
| cloud API | 없음 |
| billing | 없음 |
| auth | 없음 |
| telemetry | 없음 |
| MCP | POC 구현 제외, contract 설계만 고려 |
| audio/video | POC 구현 제외, future contract만 예약 |

### 6.3. POC 포함 범위

#### CLI

```bash
openrender init
openrender scan
openrender compile sprite
openrender install
openrender verify
openrender report --open
openrender rollback
openrender doctor
```

#### Visual harness

| 기능 | POC 포함 | 비고 |
|---|---:|---|
| image input load | ✅ | PNG/WebP/JPEG |
| format normalization | ✅ | PNG output default |
| alpha detection | ✅ | transparent 여부 판단 |
| basic alpha cleanup | ✅ | 가장자리 fringe 최소 처리 |
| background removal | ⚠️ basic | 단순 배경/투명 입력 중심. 고급 segmentation 제외 |
| object bounds detection | ✅ | alpha 또는 color threshold 기반 |
| smart crop | ✅ | bounding box 기반 |
| padding normalization | ✅ | configurable |
| frame slicing | ✅ | horizontal strip / grid basic |
| frame count validation | ✅ | requested frames와 image dimensions 비교 |
| output metadata | ✅ | JSON/TS |
| local preview | ✅ | HTML |
| local report | ✅ | HTML/JSON |
| rollback snapshot | ✅ | install 전 변경 파일 저장 |

#### Phaser adapter

```text
public/assets/{asset_path}.png
src/assets/openrender-manifest.ts
src/openrender/animations/{asset_id}.ts
.openrender/reports/{run_id}.html
.openrender/reports/{run_id}.json
.openrender/previews/{run_id}.html
```

### 6.4. POC 제외 범위

| 제외 | 이유 |
|---|---|
| hosted playground | POC 핵심은 local compile/install/verify |
| auth/account | POC 기술 검증과 무관 |
| billing/credit | POC에서는 수익화 검증하지 않음 |
| public REST API | local compiler 검증이 우선 |
| MCP full server | POC 이후 agent integration 단계에서 구현 |
| Codex plugin | POC 이후 packaging 단계 |
| PixiJS adapter | POC 이후 |
| Canvas adapter | POC 이후 |
| Godot adapter | POC 이후 |
| Unity adapter | 초기 복잡도 과다 |
| audio compiler | 장기 비전에는 포함, POC에서는 제외 |
| video compiler | 장기 비전에는 포함, POC에서는 제외 |
| 3D asset pipeline | Future |
| managed generation | POC에서는 raw local file 입력만 사용 |
| BYOK provider integration | POC에서는 모델 호출 없음 |
| advanced visual QA | POC에서는 기본 preview/verify만 |

---

## 7. 핵심 사용 시나리오

### 7.1. Agent가 raw image를 Phaser-ready spritesheet로 변환

```bash
openrender compile sprite \
  --from ./tmp/slime_raw.png \
  --target phaser \
  --framework vite \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal \
  --install
```

결과:

```text
public/assets/enemies/slime_idle.png
src/assets/openrender-manifest.ts
src/openrender/animations/enemy-slime-idle.ts
.openrender/reports/{run_id}.html
.openrender/reports/{run_id}.json
.openrender/previews/{run_id}.html
```

### 7.2. 단일 transparent sprite 변환

```bash
openrender compile sprite \
  --from ./tmp/tree_raw.png \
  --target phaser \
  --id prop.tree.oak \
  --output-size 128x128 \
  --padding 8 \
  --install
```

결과:

```text
public/assets/props/tree_oak.png
src/assets/openrender-manifest.ts
.openrender/reports/{run_id}.html
```

### 7.3. AI agent instruction 예시

```text
Use openRender to convert tmp/slime_raw.png into a Phaser-ready 6-frame idle spritesheet.
Install it into the current Vite + Phaser project, generate the animation helper, verify it, and open the local report.
```

Agent가 실행할 명령:

```bash
openrender scan
openrender compile sprite --from tmp/slime_raw.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --install
openrender verify --run latest --open
openrender report --open
```

### 7.4. Local report 확인

```bash
openrender report --open
```

Report에서 보여줄 것:

- run summary
- input contract
- raw input image
- detected alpha/background status
- crop box
- padding box
- frame slicing preview
- output files
- generated manifest
- generated animation helper
- install diff
- verification result
- rollback command

### 7.5. Rollback

```bash
openrender rollback --run latest
```

또는:

```bash
openrender rollback --run run_20260430_001
```

---

## 8. 기술 원리

### 8.1. 역할 분리

openRender는 LLM에게 pixel-level 처리를 맡기지 않는다.

```text
LLM / Agent:
- 무엇을 만들지 결정
- 어떤 target engine에 넣을지 결정
- 어떤 asset id로 설치할지 결정
- openRender CLI 호출

openRender:
- image load
- crop/padding/frame slicing
- deterministic metadata 생성
- Phaser manifest/codegen 생성
- local project install
- verify/report/rollback
```

### 8.2. 문제 전환

어려운 문제:

```text
LLM이 이미지를 완벽히 이해하고 엔진에 알아서 넣기
```

openRender가 바꾸는 문제:

```text
정해진 media contract에 맞춰
이미지 파일을 deterministic하게 변환하고
엔진별 adapter가 요구하는 output을 생성하기
```

### 8.3. POC 모듈 흐름

```text
CLI / Agent shell
  ↓
Project Scanner
  ↓
Media Contract Builder
  ↓
Visual Harness Pipeline
  ↓
Phaser Adapter
  ↓
Installer
  ↓
Verifier
  ↓
Local Report + Preview + Rollback
```

### 8.4. 설계 원칙

- POC에서는 image-only지만 구조는 media-general로 둔다.
- prompt보다 contract가 핵심이다.
- 변환은 가능한 deterministic해야 한다.
- 모든 파일 write는 project root 안에서만 수행한다.
- install 전 snapshot을 남긴다.
- report는 항상 JSON과 HTML로 남긴다.
- agent가 읽기 쉬운 machine-readable run JSON을 남긴다.
- 사람도 볼 수 있는 local report를 제공한다.
- destructive overwrite는 기본 금지한다.

---

## 9. Media Contract

### 9.1. Contract 개념

openRender의 핵심 단위는 prompt가 아니라 **media contract**다.

POC에서 contract는 다음 정보를 포함한다.

```text
- input source
- media type
- target engine
- output shape
- install destination
- generated code requirements
- verification expectations
```

### 9.2. POC contract schema 개요

```json
{
  "schemaVersion": "0.1",
  "mediaType": "visual.sprite_frame_set",
  "sourcePath": "tmp/slime_raw.png",
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "enemy.slime.idle",
  "visual": {
    "layout": "horizontal_strip",
    "frames": 6,
    "frameWidth": 64,
    "frameHeight": 64,
    "padding": 4,
    "background": "transparent",
    "outputFormat": "png"
  },
  "install": {
    "enabled": true,
    "assetRoot": "public/assets",
    "writeManifest": true,
    "writeCodegen": true,
    "snapshotBeforeInstall": true
  },
  "verify": {
    "preview": true,
    "checkFrameCount": true,
    "checkLoadPath": true
  }
}
```

### 9.3. POC media types

| Media type | POC | 설명 |
|---|---:|---|
| `visual.transparent_sprite` | ✅ | 단일 transparent object/character/prop |
| `visual.sprite_frame_set` | ✅ | horizontal strip 또는 grid spritesheet |
| `visual.icon` | ❌ | Future |
| `visual.simple_vfx` | ❌ | Future |
| `audio.sound_effect` | ❌ | Future |
| `audio.music_loop` | ❌ | Future |
| `video.cutscene_clip` | ❌ | Future |
| `scene.prefab` | ❌ | Future |
| `scene.patch` | ❌ | Future |

### 9.4. `visual.transparent_sprite` contract

```json
{
  "schemaVersion": "0.1",
  "mediaType": "visual.transparent_sprite",
  "sourcePath": "tmp/tree_raw.png",
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "prop.tree.oak",
  "visual": {
    "outputWidth": 128,
    "outputHeight": 128,
    "padding": 8,
    "background": "transparent",
    "outputFormat": "png"
  },
  "install": {
    "enabled": true,
    "assetRoot": "public/assets/props",
    "writeManifest": true,
    "writeCodegen": false,
    "snapshotBeforeInstall": true
  }
}
```

### 9.5. `visual.sprite_frame_set` contract

```json
{
  "schemaVersion": "0.1",
  "mediaType": "visual.sprite_frame_set",
  "sourcePath": "tmp/player_idle_raw.png",
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "player.idle",
  "visual": {
    "layout": "horizontal_strip",
    "frames": 8,
    "frameWidth": 64,
    "frameHeight": 64,
    "fps": 8,
    "padding": 0,
    "background": "transparent",
    "outputFormat": "png"
  },
  "install": {
    "enabled": true,
    "assetRoot": "public/assets/player",
    "writeManifest": true,
    "writeCodegen": true,
    "snapshotBeforeInstall": true
  }
}
```

### 9.6. Future contract placeholders

POC에서는 구현하지 않지만, naming과 architecture는 아래 확장을 막지 않아야 한다.

#### `audio.sound_effect`

```json
{
  "schemaVersion": "0.1",
  "mediaType": "audio.sound_effect",
  "sourcePath": "tmp/jump_raw.wav",
  "target": {
    "engine": "phaser",
    "framework": "vite"
  },
  "id": "sfx.player.jump",
  "audio": {
    "outputFormat": "ogg",
    "normalizeLoudness": true,
    "trimSilence": true,
    "maxDurationMs": 1200
  }
}
```

#### `video.cutscene_clip`

```json
{
  "schemaVersion": "0.1",
  "mediaType": "video.cutscene_clip",
  "sourcePath": "tmp/intro_raw.mp4",
  "target": {
    "engine": "web",
    "framework": "vite"
  },
  "id": "cutscene.intro",
  "video": {
    "outputFormat": "webm",
    "maxWidth": 1280,
    "maxHeight": 720,
    "loop": false
  }
}
```

이 placeholders는 POC 구현 대상이 아니라, 확장 방향을 명확히 하기 위한 설계 anchor다.

---

## 10. CLI Spec

### 10.1. CLI 이름

```bash
openrender
```

### 10.2. POC commands

```bash
openrender init
openrender scan
openrender compile sprite
openrender install
openrender verify
openrender report
openrender rollback
openrender doctor
```

### 10.3. 제외 commands

POC에서는 다음 command를 만들지 않는다.

```bash
openrender login
openrender license
openrender billing
openrender sync
openrender worker
openrender generate
```

이들은 cloud/paid/product 단계에서만 고려한다.

### 10.4. `openrender init`

로컬 프로젝트에 openRender 설정과 상태 디렉터리를 만든다.

```bash
openrender init
```

생성 파일:

```text
openrender.config.json
.openrender/
  artifacts/
  cache/
  previews/
  reports/
  runs/
  snapshots/
```

옵션:

```bash
openrender init --target phaser --framework vite
openrender init --force
```

기본 동작:

- `package.json` 확인
- Vite 여부 감지
- Phaser dependency 여부 감지
- `public/assets` 존재 여부 확인 또는 생성 제안
- `src` directory 감지
- config 생성

### 10.5. `openrender scan`

프로젝트 구조를 분석한다.

```bash
openrender scan
```

출력 예:

```text
openRender scan

Project root: .
Framework: vite
Engine: phaser
Asset root: public/assets
Source root: src
Manifest: missing
openRender state: initialized
```

JSON 출력:

```bash
openrender scan --json
```

검출 항목:

- package manager
- Vite 여부
- Phaser dependency
- asset root
- source root
- existing openRender manifest
- write permission
- `.openrender` state

### 10.6. `openrender compile sprite`

raw image를 visual asset으로 compile한다.

```bash
openrender compile sprite \
  --from ./tmp/slime_raw.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --layout horizontal
```

설치까지 함께 실행:

```bash
openrender compile sprite \
  --from ./tmp/slime_raw.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install
```

주요 옵션:

| 옵션 | 설명 |
|---|---|
| `--from` | 입력 이미지 경로 |
| `--target` | `phaser` |
| `--framework` | `vite` |
| `--id` | engine asset id |
| `--frames` | frame count |
| `--frame-size` | `64x64` 형식 |
| `--layout` | `horizontal`, `grid` |
| `--padding` | output padding |
| `--output-size` | 단일 sprite output size |
| `--install` | compile 후 install 수행 |
| `--dry-run` | 파일 write 없이 plan/report만 생성 |
| `--open-report` | 완료 후 report 열기 |

### 10.7. `openrender install`

compile output을 프로젝트에 설치한다.

```bash
openrender install --run latest
```

동작:

- install plan 확인
- 변경 대상 파일 snapshot 생성
- asset output 복사
- manifest 생성 또는 업데이트
- codegen 파일 생성
- run JSON 업데이트

### 10.8. `openrender verify`

설치 결과를 검증한다.

```bash
openrender verify --run latest
openrender verify --run latest --open
```

검증 항목:

- output file exists
- image dimensions match
- frame count match
- manifest valid
- codegen file exists
- asset URL path generated
- preview HTML generated

### 10.9. `openrender report`

local report를 연다.

```bash
openrender report --open
openrender report --run latest --open
```

### 10.10. `openrender rollback`

install 전 snapshot을 기반으로 변경을 되돌린다.

```bash
openrender rollback --run latest
```

기본 정책:

- snapshot이 없는 run은 rollback 불가
- rollback 결과도 새 run event로 기록
- 삭제/복원 파일 목록을 report에 표시

### 10.11. `openrender doctor`

환경 진단을 수행한다.

```bash
openrender doctor
```

출력 항목:

- Node.js version
- package manager
- project root
- Vite detected 여부
- Phaser detected 여부
- write permission
- config path
- `.openrender` state path
- last run status

POC에서는 support bundle 생성은 optional이다.

---

## 11. Local Project Model

### 11.1. Config file

`openrender.config.json`

```json
{
  "version": "0.1",
  "project": {
    "id": "local",
    "name": "my-phaser-game"
  },
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "assetRoot": "public/assets",
    "sourceRoot": "src"
  },
  "install": {
    "writeManifest": true,
    "writeCodegen": true,
    "snapshotBeforeInstall": true,
    "allowOverwrite": false
  },
  "report": {
    "format": ["html", "json"],
    "openAfterRun": false
  },
  "privacy": {
    "cloudSync": false,
    "telemetry": false,
    "uploadArtifacts": false
  }
}
```

### 11.2. Local state directory

```text
.openrender/
  artifacts/
    {run_id}/
  cache/
  previews/
    {run_id}.html
  reports/
    {run_id}.html
    {run_id}.json
    latest.html
    latest.json
  runs/
    {run_id}.json
    latest.json
  snapshots/
    {run_id}/
```

### 11.3. Run JSON schema

```json
{
  "runId": "run_20260430_001",
  "createdAt": "2026-04-30T00:00:00.000Z",
  "actor": "cli",
  "status": "completed",
  "contract": {
    "schemaVersion": "0.1",
    "mediaType": "visual.sprite_frame_set",
    "id": "enemy.slime.idle"
  },
  "input": {
    "sourcePath": "tmp/slime_raw.png",
    "hash": "sha256...",
    "width": 384,
    "height": 64,
    "format": "png"
  },
  "harness": {
    "normalized": true,
    "cropBox": { "x": 0, "y": 0, "width": 384, "height": 64 },
    "padding": 0,
    "frames": 6,
    "frameWidth": 64,
    "frameHeight": 64
  },
  "outputs": [
    {
      "kind": "compiled_visual_asset",
      "path": "public/assets/enemies/slime_idle.png"
    },
    {
      "kind": "manifest",
      "path": "src/assets/openrender-manifest.ts"
    },
    {
      "kind": "codegen",
      "path": "src/openrender/animations/enemy-slime-idle.ts"
    },
    {
      "kind": "preview",
      "path": ".openrender/previews/run_20260430_001.html"
    },
    {
      "kind": "report",
      "path": ".openrender/reports/run_20260430_001.html"
    }
  ],
  "verification": {
    "status": "passed",
    "checks": [
      { "name": "file_exists", "status": "passed" },
      { "name": "frame_count", "status": "passed" },
      { "name": "manifest_exists", "status": "passed" }
    ]
  },
  "rollback": {
    "snapshotId": "snap_run_20260430_001",
    "available": true
  },
  "privacy": {
    "uploaded": false,
    "cloudReport": false,
    "telemetry": false
  }
}
```

---

## 12. Visual Harness Pipeline

### 12.1. Harness principles

- Harness는 prompt rewriting layer가 아니다.
- Harness는 generation 이후 결과를 다루는 deterministic post-process layer다.
- POC에서는 model을 호출하지 않는다.
- LLM/VLM에게 pixel-level 판단을 전부 맡기지 않는다.
- crop, padding, frame slicing, metadata는 재현 가능한 방식으로 처리한다.
- agent가 매번 임시 스크립트를 작성하지 않아도 되는 것이 핵심 가치다.

### 12.2. POC stages

```text
Input load
→ format detection
→ format normalization
→ alpha/background detection
→ basic alpha cleanup
→ object bounds detection
→ crop
→ padding normalization
→ frame slicing
→ metadata generation
→ Phaser adapter output generation
→ install plan generation
→ verification
→ report generation
```

### 12.3. Stage details

| Stage | POC | Notes |
|---|---:|---|
| Input load | ✅ | PNG/WebP/JPEG |
| Format detection | ✅ | input metadata 기록 |
| Format normalization | ✅ | PNG output default |
| Alpha detection | ✅ | transparency 여부 판단 |
| Background removal | ⚠️ basic | 고급 AI segmentation 제외 |
| Alpha edge cleanup | ✅ basic | fringe cleanup 최소 처리 |
| Object bounds detection | ✅ | alpha 또는 threshold 기반 |
| Crop | ✅ | deterministic crop |
| Padding normalization | ✅ | configurable |
| Resize | ⚠️ basic | output-size 지정 시 적용 |
| Frame slicing | ✅ | horizontal/grid |
| Frame count validation | ✅ | required frames와 실제 dimension 비교 |
| Jitter detection | ❌ | Future |
| Pivot alignment | ❌ | Future |
| Atlas packing | ❌ | Future |
| Metadata generation | ✅ | JSON/TS |
| Adapter output generation | ✅ Phaser |
| Install patch generation | ✅ |
| Verification | ✅ basic |
| Report | ✅ |

### 12.4. Background removal policy

POC에서 background removal은 너무 넓게 잡지 않는다.

허용:

- 이미 transparent PNG인 경우 alpha 기반 crop/padding
- 단색 배경에 가까운 경우 threshold 기반 제거
- report에 background cleanup 결과 표시

제외:

- 복잡한 segmentation
- matting model
- cloud background removal API
- 사람/동물/머리카락 수준의 고품질 mask

POC 문서와 README에는 이 제약을 명확히 적는다.

---

## 13. Phaser Adapter

### 13.1. Adapter 목표

Phaser adapter는 compiled visual asset을 Vite + Phaser 프로젝트에서 바로 사용할 수 있는 형태로 만든다.

해야 할 일:

```text
- asset file path 결정
- manifest TS 생성 또는 업데이트
- preload helper 생성
- animation helper 생성
- preview HTML 생성
- verify plan 생성
```

### 13.2. Input contract 예시

```json
{
  "target": {
    "engine": "phaser",
    "framework": "vite",
    "projectRoot": "."
  },
  "id": "enemy.slime.idle",
  "mediaType": "visual.sprite_frame_set",
  "sourcePath": "tmp/slime_raw.png",
  "visual": {
    "frames": 6,
    "frameWidth": 64,
    "frameHeight": 64,
    "layout": "horizontal_strip",
    "outputFormat": "png"
  },
  "install": {
    "assetRoot": "public/assets/enemies",
    "writeManifest": true,
    "writeCodegen": true
  }
}
```

### 13.3. Output files

```text
public/assets/enemies/slime_idle.png
src/assets/openrender-manifest.ts
src/openrender/animations/enemy-slime-idle.ts
.openrender/reports/{run_id}.html
.openrender/reports/{run_id}.json
.openrender/previews/{run_id}.html
```

### 13.4. Manifest example

```ts
export const openRenderAssets = {
  "enemy.slime.idle": {
    type: "sprite_frame_set",
    engine: "phaser",
    url: "/assets/enemies/slime_idle.png",
    frameWidth: 64,
    frameHeight: 64,
    frames: 6,
    fps: 8,
  },
} as const;

export type OpenRenderAssetId = keyof typeof openRenderAssets;
```

### 13.5. Generated animation helper example

```ts
import type Phaser from "phaser";

export const enemySlimeIdleAsset = {
  key: "enemy.slime.idle",
  url: "/assets/enemies/slime_idle.png",
  frameWidth: 64,
  frameHeight: 64,
  frames: 6,
  frameRate: 8,
} as const;

export function preloadEnemySlimeIdle(scene: Phaser.Scene) {
  scene.load.spritesheet(enemySlimeIdleAsset.key, enemySlimeIdleAsset.url, {
    frameWidth: enemySlimeIdleAsset.frameWidth,
    frameHeight: enemySlimeIdleAsset.frameHeight,
  });
}

export function registerEnemySlimeIdle(scene: Phaser.Scene) {
  if (scene.anims.exists(enemySlimeIdleAsset.key)) return;

  scene.anims.create({
    key: enemySlimeIdleAsset.key,
    frames: scene.anims.generateFrameNumbers(enemySlimeIdleAsset.key, {
      start: 0,
      end: enemySlimeIdleAsset.frames - 1,
    }),
    frameRate: enemySlimeIdleAsset.frameRate,
    repeat: -1,
  });
}
```

### 13.6. Patch policy

POC 기본 정책:

- 기존 Phaser scene 파일을 자동 수정하지 않는다.
- openRender helper 파일을 생성한다.
- report에 “how to import” snippet을 제공한다.

예:

```ts
import {
  preloadEnemySlimeIdle,
  registerEnemySlimeIdle,
} from "./openrender/animations/enemy-slime-idle";

// In preload()
preloadEnemySlimeIdle(this);

// In create()
registerEnemySlimeIdle(this);
```

자동 scene patch는 POC 이후 optional feature로 둔다.

---

## 14. Verification

### 14.1. POC verification checks

| Check | 설명 |
|---|---|
| `file_exists` | output PNG가 존재하는지 확인 |
| `image_dimensions` | output image dimension 확인 |
| `frame_count_match` | requested frame count와 실제 slicing 가능 여부 확인 |
| `frame_size_match` | frame width/height 일치 여부 확인 |
| `alpha_present` | transparent asset이면 alpha channel 존재 여부 확인 |
| `manifest_exists` | manifest TS 생성 여부 확인 |
| `codegen_exists` | animation helper 생성 여부 확인 |
| `asset_url_shape` | Vite public path 형식 확인 |
| `preview_generated` | preview HTML 생성 여부 확인 |
| `rollback_available` | snapshot 존재 여부 확인 |

### 14.2. Preview HTML

Web target은 다음 파일을 생성한다.

```text
.openrender/previews/{run_id}.html
```

Preview 포함:

- asset on transparent checkerboard
- asset on dark background
- asset on light background
- frame grid
- animation loop
- scale preview
- generated code snippet

### 14.3. Verify command output

```text
openRender verify run_20260430_001

✓ file_exists
✓ image_dimensions: 384x64
✓ frame_count_match: 6
✓ frame_size_match: 64x64
✓ manifest_exists
✓ codegen_exists
✓ preview_generated
✓ rollback_available

Status: passed
Report: .openrender/reports/run_20260430_001.html
Preview: .openrender/previews/run_20260430_001.html
```

### 14.4. Failure example

```text
✕ frame_count_match
Expected: 6 frames of 64x64
Actual image width: 320
Reason: horizontal strip requires width 384

Suggested repair:
- Use --frames 5
- Or use --frame-size 53x64
- Or regenerate/resize source image
```

POC에서는 repair를 자동 수행하지 않는다. report에 suggestion만 표시한다.

---

## 15. Local Report

### 15.1. Report files

```text
.openrender/reports/{run_id}.html
.openrender/reports/{run_id}.json
.openrender/reports/latest.html
.openrender/reports/latest.json
```

### 15.2. Report sections

- Summary
- Input contract
- Source image metadata
- Raw image preview
- Alpha/background status
- Crop box visualization
- Padding visualization
- Frame slicing visualization
- Output files
- Generated manifest
- Generated code
- Install plan
- Install result
- Verification result
- Rollback information
- Privacy status

### 15.3. Report principles

- report는 hosted UI가 아니다.
- report는 local run debugger다.
- report는 agent가 읽을 수 있는 JSON과 사람이 볼 수 있는 HTML을 모두 제공한다.
- report는 실패 원인과 다음 command suggestion을 제공해야 한다.

---

## 16. Rollback / Safety

### 16.1. Snapshot policy

install 전 변경 대상 파일을 snapshot으로 저장한다.

```text
.openrender/snapshots/{run_id}/
```

저장 대상:

- 기존 manifest file
- 기존 codegen file
- overwrite 대상 asset file
- 기타 install로 수정될 파일

### 16.2. File write policy

- project root 밖에는 쓰지 않는다.
- destructive overwrite는 기본 금지한다.
- `--force` 없이 기존 파일을 덮어쓰지 않는다.
- 기존 파일 변경 시 report에 diff를 표시한다.
- 자동 scene patch는 POC에서 제외한다.
- user confirmation 없이 대량 overwrite하지 않는다.

### 16.3. Rollback command

```bash
openrender rollback --run {run_id}
```

동작:

- snapshot 확인
- 생성 파일 삭제 또는 이전 파일 복원
- rollback 결과를 run JSON에 기록
- rollback report 생성 또는 기존 report 업데이트

### 16.4. Dry run

POC에 `--dry-run`을 제공한다.

```bash
openrender compile sprite --from tmp/slime.png --target phaser --id enemy.slime.idle --frames 6 --frame-size 64x64 --dry-run
```

동작:

- 파일 write 없이 contract, install plan, expected output path를 report로 생성한다.

---

## 17. Privacy / Data Policy

### 17.1. 기본 원칙

> **POC에서는 모든 코드와 asset이 로컬에 남는다.**

### 17.2. POC data handling

```text
- 코드 업로드 없음
- 이미지 업로드 없음
- report sync 없음
- telemetry 없음
- crash upload 없음
- API key 없음
- account 없음
```

### 17.3. Privacy section in report

Report에는 다음을 명시한다.

```text
cloud sync: off
telemetry: off
uploaded artifacts: none
model provider calls: none
```

### 17.4. Future BYOK note

POC 이후 generation provider integration이 들어가더라도 기본 원칙은 다음이어야 한다.

```text
User model keys stay local unless managed cloud mode is explicitly enabled.
```

하지만 이 기능은 v0.1 POC 범위가 아니다.

---

## 18. Repository / Implementation Architecture

### 18.1. POC monorepo structure

```text
openrender/
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  docs/
    openRender_POC_v0.1.md
    quickstart-phaser.md
    cli-reference.md
    contracts.md
    troubleshooting.md
  packages/
    cli/
    core/
    harness-visual/
    adapters/
      phaser/
    reporter/
    doctor/
```

### 18.2. POC packages

#### `/packages/core`

Responsibilities:

- config schema
- media contract schema
- run state model
- output descriptor model
- path normalization
- safe file write helpers
- verification result model

#### `/packages/cli`

Responsibilities:

- command parsing
- init/scan/compile/install/verify/report/rollback/doctor commands
- orchestrating core, harness, adapter, reporter

#### `/packages/harness-visual`

Responsibilities:

- image input load
- format normalization
- alpha detection
- crop/padding
- frame slicing
- visual metadata

#### `/packages/adapters/phaser`

Responsibilities:

- Phaser/Vite detection
- asset path resolution
- manifest generation
- animation helper codegen
- verify plan
- install plan

#### `/packages/reporter`

Responsibilities:

- report JSON generation
- report HTML generation
- preview HTML generation
- visual overlays
- code/diff rendering
- open report helper

#### `/packages/doctor`

Responsibilities:

- environment diagnostics
- project detection checks
- write permission checks
- dependency checks

### 18.3. Packages intentionally excluded from POC

```text
/packages/mcp
/packages/codex-plugin
/packages/model-providers
/packages/cloud-client
/packages/license
/apps/web
/apps/worker
```

These are future layers, not POC requirements.

### 18.4. Language / runtime recommendation

POC 권장 stack:

```text
Runtime: Node.js
Language: TypeScript
Package manager: pnpm
Image processing: sharp 또는 jimp 계열
CLI: commander 또는 cac 계열
Report: static HTML generation
```

실제 library 선택은 구현 시점에 결정하되, POC의 핵심은 library 선택이 아니라 local compile/install/verify loop 검증이다.

---

## 19. Run State Model

### 19.1. Run states

```text
created
→ input_loaded
→ normalized
→ harness_running
→ harness_ready
→ adapter_generating
→ install_planned
→ install_pending
→ installed
→ verifying
→ verified
→ report_generated
→ completed
```

Failure states:

```text
failed_input
failed_harness
failed_adapter
failed_install
failed_verify
rollback_available
rolled_back
```

### 19.2. Output states

```text
raw_input
normalized_input
harnessed_visual
compiled_asset
manifest
codegen
install_plan
installed_file
preview
report
snapshot
```

---

## 20. Documentation Requirements

### 20.1. POC docs

| 문서 | 내용 |
|---|---|
| `README.md` | openRender 정의, 설치, quickstart |
| `docs/openRender_POC_v0.1.md` | 본 문서 |
| `docs/quickstart-phaser.md` | Vite + Phaser 프로젝트에 sprite install |
| `docs/cli-reference.md` | POC CLI command 설명 |
| `docs/contracts.md` | media contract 설명 |
| `docs/troubleshooting.md` | frame mismatch, path issue, alpha issue |

### 20.2. README 첫 문장

```md
# openRender

openRender is open infrastructure for AI agents turning generated media into engine-ready playable projects.

The v0.1 POC focuses on local image-to-Phaser asset compilation: compile, install, verify, report, and rollback.
```

### 20.3. README에서 피해야 할 설명

피해야 할 표현:

```text
AI image generator
asset marketplace
prompt playground
game asset API
credit-based generation service
```

권장 표현:

```text
local-first compiler
agent-callable infrastructure
media-to-engine pipeline
engine-ready generated media
compile/install/verify/report/rollback
```

---

## 21. POC Development Plan

### 21.1. Milestone 0 — Repo bootstrap

목표:

```text
새 repo에서 TypeScript monorepo 초기화
```

Tasks:

- [x] repo 생성
- [x] license 추가
- [x] README 초안 작성
- [x] pnpm workspace 설정
- [x] TypeScript base config
- [x] package skeleton 생성

### 21.2. Milestone 1 — Core schema

목표:

```text
config, contract, run model 정의
```

Tasks:

- [x] `openrender.config.json` TypeScript model
- [x] media contract TypeScript model
- [x] run JSON TypeScript model
- [x] path normalization helper
- [x] safe project root validation
- [x] output descriptor model
- [ ] runtime schema validation

### 21.3. Milestone 2 — CLI init/scan

목표:

```text
로컬 프로젝트 감지 및 초기화
```

Tasks:

- [x] `openrender init`
- [x] `.openrender` directory 생성
- [x] config 생성
- [x] `openrender scan`
- [x] Vite + Phaser detection
- [x] JSON output mode

### 21.4. Milestone 3 — Visual harness

목표:

```text
raw image를 normalized visual output으로 변환
```

Tasks:

- [x] image load
- [x] metadata extraction
- [x] PNG output normalization
- [x] alpha detection
- [x] basic alpha-bounds crop
- [x] padding
- [x] frame slicing metadata plan
- [x] horizontal strip frame validation helper
- [x] integrated frame validation in `compile sprite --dry-run`
- [ ] harness metadata output

### 21.5. Milestone 4 — Phaser adapter

목표:

```text
Phaser-ready output 생성
```

Tasks:

- [x] output path resolver
- [x] manifest TS generator
- [x] animation helper generator
- [ ] install plan generator
- [x] Vite public URL resolver

### 21.6. Milestone 5 — Install / rollback

목표:

```text
프로젝트에 안전하게 파일을 쓰고 되돌릴 수 있음
```

Tasks:

- [ ] snapshot creation
- [ ] safe write helper
- [ ] overwrite policy
- [ ] install command
- [ ] rollback command
- [x] dry-run support

### 21.7. Milestone 6 — Verify / report / preview

목표:

```text
결과를 검증하고 사람이 확인할 수 있는 report 생성
```

Tasks:

- [ ] verification checks
- [x] report JSON helper
- [x] report HTML helper
- [x] preview HTML helper
- [ ] report/preview file writing
- [ ] latest report symlink/copy
- [ ] `openrender report --open`

### 21.8. Milestone 7 — POC polish

목표:

```text
외부 개발자가 README만 보고 로컬 CLI 개발 환경을 실행 가능
```

Tasks:

- [x] quickstart 문서
- [x] troubleshooting 문서
- [ ] known limitations 문서

---

## 22. POC Success Criteria

### 22.1. Technical success criteria

- [x] 새 repo에서 `pnpm install`이 성공한다.
- [x] `openrender init`이 config와 `.openrender`를 생성한다.
- [x] `openrender scan`이 Vite + Phaser를 감지한다.
- [ ] local raw image를 `visual.sprite_frame_set`으로 compile할 수 있다.
- [x] frame count / frame size validation helper가 작동한다.
- [x] Phaser manifest TS generator가 동작한다.
- [x] Phaser animation helper TS generator가 동작한다.
- [ ] output PNG가 `public/assets`에 설치된다.
- [ ] local preview HTML에서 animation loop를 볼 수 있다.
- [ ] report HTML/JSON이 생성된다.
- [ ] verify가 pass/fail 결과를 출력한다.
- [ ] rollback으로 설치 전 상태를 복원할 수 있다.

### 22.2. Workflow success criteria

- [ ] 사용자가 이미지 편집 툴을 열지 않고 raw image를 Phaser-ready asset으로 변환한다.
- [ ] AI agent가 shell command만으로 동일 workflow를 실행할 수 있다.
- [ ] 실패 시 report가 원인과 다음 action을 설명한다.
- [ ] 전체 POC 루프가 10분 이내에 실행된다.

### 22.3. Non-goals for success

POC 성공 기준에 포함하지 않는다.

- 유료 결제
- account 생성
- cloud report sync
- external user acquisition
- business validation
- multi-engine support
- audio/video support
- high-quality background removal
- model provider integration

---

## 23. Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| 이름이 rendering engine으로 오해될 수 있음 | Medium | tagline에서 agentic media-to-engine infrastructure 명확화 |
| POC 범위가 MVP처럼 커짐 | High | Phaser + image-only + no account/no billing/no cloud 고정 |
| background removal 품질 이슈 | Medium | POC에서는 transparent/simple background 중심으로 명시 |
| agent가 임시 스크립트로 대체 가능 | High | report/rollback/contract/codegen까지 표준화해 차별화 |
| local write가 프로젝트를 망가뜨림 | High | snapshot, dry-run, no overwrite 기본 정책 |
| Phaser adapter codegen이 실제 프로젝트마다 다름 | Medium | scene patch 대신 helper file 생성으로 POC 범위 제한 |
| Open-source repo가 너무 빈약해 보임 | Medium | CLI, docs, tests를 우선 완성하고 demo fixture는 필요 시 추가 |
| sound/video 장기 비전과 image POC 사이 괴리 | Medium | media-general contract와 future placeholders 유지 |
| CLI UX가 복잡함 | Medium | POC command를 7개 내외로 제한 |

---

## 24. Future Roadmap Beyond POC

### 24.1. v0.1 — Local image-to-Phaser POC

목표:

```text
raw generated image → Phaser-ready installed asset
```

포함:

- CLI
- config
- visual harness basic
- Phaser adapter
- local report
- local preview
- rollback
- no account
- no billing
- no cloud

### 24.2. v0.2 — Agent integration alpha

목표:

```text
AI agent가 openRender를 더 안정적으로 호출
```

후보 포함:

- MCP server
- agent instruction docs
- Cursor/Codex/Claude Code usage examples
- command JSON mode 강화
- PixiJS adapter 시작
- plain Canvas helper 시작

### 24.3. v0.3 — Multi-engine visual alpha

목표:

```text
Web 2D + Godot 2D visual asset support
```

후보 포함:

- PixiJS adapter
- Canvas adapter
- Godot 4 basic adapter
- icon compiler
- simple VFX sheet
- improved report/repair suggestions

### 24.4. v0.4 — Multimodal media contracts

목표:

```text
image-only에서 sound/video-ready infrastructure로 확장
```

후보 포함:

- audio.sound_effect contract
- audio normalization
- trim silence
- web audio loader helper
- video.clip contract
- web video asset helper
- report sections for audio/video

### 24.5. Future — Hosted/paid layer

POC 이후 별도 판단.

가능한 방향:

- hosted worker
- cloud report sync
- managed generation
- OEM API
- project-level workflow pricing

단, 이들은 `openRender_POC_v0.1` 범위가 아니다.

---

## 25. Development Checklist

### P0 — Must-have for POC

- [x] 새 repo 생성
- [x] README 작성
- [x] `openrender` CLI skeleton
- [x] `openrender.config.json` TypeScript model
- [x] `.openrender` state directory 생성
- [x] `openrender init`
- [x] `openrender scan`
- [x] media contract TypeScript model
- [x] run JSON TypeScript model
- [x] image load/metadata extraction
- [x] crop/padding/frame slicing metadata
- [x] Phaser adapter skeleton
- [x] manifest TS generation helper
- [x] animation helper generation helper
- [ ] install plan
- [ ] safe write + snapshot
- [ ] rollback
- [ ] verify checks
- [x] report JSON helper
- [x] report HTML helper
- [x] preview HTML helper
- [x] quickstart doc

### P1 — Nice-to-have within POC if time permits

- [x] `--dry-run`
- [ ] `--json` output for all commands
- [ ] basic background removal for simple solid backgrounds
- [ ] better alpha edge cleanup
- [ ] report visual overlays
- [x] doctor command
- [x] troubleshooting doc

### Explicitly not POC

- [ ] login
- [ ] billing
- [ ] license
- [ ] cloud sync
- [ ] hosted worker
- [ ] MCP server implementation
- [ ] Codex plugin package
- [ ] Pixi adapter
- [ ] Godot adapter
- [ ] audio compiler
- [ ] video compiler
- [ ] model generation provider

---

## 26. Final POC Statement

> **openRender v0.1 POC는 결제·계정·클라우드 없이 시작하는 오픈소스 local-first compiler다.**
>
> **목표는 AI agent가 raw generated image를 Phaser-ready asset으로 변환하고, 로컬 프로젝트에 설치하고, preview/report로 검증하고, 필요하면 rollback할 수 있음을 증명하는 것이다.**
>
> **장기적으로 openRender는 이미지뿐 아니라 사운드, 영상, 씬, 코드 fragment까지 포함하는 AI-native agentic game development infrastructure로 확장된다.**
