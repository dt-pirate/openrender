# openRender 오픈소스 성장 전략 및 기능 확장 로드맵

| 항목 | 내용 |
|---|---|
| 문서명 | openRender Open Source Growth & Feature Roadmap |
| 버전 | v0.3.1 Growth Companion |
| 작성일 | 2026-05-02 |
| 기준 문서 | `openRender_v0.3.0.md`, `openRender_v0.6.1.md` |
| 상태 | 커뮤니티 성장 및 기능 확장 전략 문서 |
| 핵심 관점 | 수익화 이전 단계. openRender Core를 오픈소스 표준 공구로 확산시키는 전략 |
| 주요 목표 | AI coding agent가 게임 에셋 handoff에서 임시 스크립트를 만들지 않고 `openrender`를 호출하게 만들기 |

---

## 0. 요약

openRender의 현재 단계에서 가장 중요한 목표는 수익화가 아니다.

openRender는 먼저 **agentic game development의 media-to-engine handoff 표준 도구**가 되어야 한다.

즉, openRender는 다음을 목표로 한다.

```text
AI agent가 raw generated media를 받는다
→ agent가 openRender를 호출한다
→ openRender가 media contract를 구성한다
→ deterministic하게 asset을 정규화한다
→ Phaser / Godot / LOVE2D / Pixi / Canvas 등이 먹을 수 있는 descriptor/helper/report를 만든다
→ agent는 결과 JSON과 report만 보고 게임 코드에 통합한다
```

핵심 메시지:

> openRender는 이미지 생성기가 아니다.  
> openRender는 AI agent가 생성한 미디어를 게임 프로젝트가 이해할 수 있는 asset-ready output으로 바꾸는 local-first compiler다.

성장 전략:

```text
무료 local core
→ agent-safe JSON-first CLI
→ 실제 예제 프로젝트
→ fixture와 adapter 기여 구조
→ thin MCP / Codex integration
→ community corpus
→ engine ecosystem 확장
```

수익화는 0.4 이후 후보로만 다룬다.  
지금 단계에서는 **사용자 확보, 반복 사용, 기여자 확보, engine adapter 확장**이 우선이다.

---

## 1. 왜 지금은 오픈소스 커뮤니티가 먼저인가

openRender는 로컬에서 실행되는 compiler다. 따라서 compile 자체를 사용량 기반으로 과금하기 어렵고, 과금하려는 순간 개발자 반감이 커질 수 있다.

지금 단계의 좋은 전략은 다음이다.

```text
1. Core를 무료로 배포한다.
2. 개발자가 직접 만들기 전에 “그냥 openRender 쓰면 되잖아”가 되게 한다.
3. agent가 매번 임시 이미지 처리 스크립트를 만들지 않게 한다.
4. adapter / recipe / fixture 기여를 통해 생태계를 확장한다.
5. 나중에 유료 recipe pack, managed worker, OEM으로 확장한다.
```

즉 openRender의 0.3.x 성장 목표는 매출이 아니라 **표준화**다.

### 1.1 핵심 성장 루프

```text
agentic game dev 중 asset handoff 문제 발생
→ openRender 발견
→ npx openrender로 5분 안에 해결
→ local report / fixture / example 공유
→ issue / PR / adapter contribution 발생
→ 지원 engine과 recipe 증가
→ 더 많은 agentic dev가 사용
```

### 1.2 포지셔닝 문장

짧은 버전:

> openRender is a local-first media-to-engine compiler for AI coding agents.

긴 버전:

> openRender helps AI coding agents turn generated media into engine-ready game assets with deterministic install plans, helper code, verification reports, and rollback.

한국어 버전:

> openRender는 AI coding agent가 만든 raw media를 Phaser, Godot, LOVE2D 같은 게임 프로젝트에서 바로 사용할 수 있는 asset descriptor, helper code, report, rollback 단위로 바꾸는 로컬 컴파일러다.

---

## 2. 기능 확장 원칙

새 기능을 추가할 때의 기준은 다음이다.

### 2.1 추가해야 하는 기능

```text
- agent가 임시 스크립트를 만들지 않아도 되는 기능
- JSON-first output으로 agent가 쉽게 읽을 수 있는 기능
- deterministic하고 reproducible한 기능
- adapter별 fixture로 테스트 가능한 기능
- contributor가 작은 PR로 기여할 수 있는 기능
- local-first 원칙을 깨지 않는 기능
```

### 2.2 피해야 하는 기능

```text
- hosted playground 중심 기능
- 모델 호출 / provider routing 중심 기능
- 복잡한 billing / account 기능
- 사용량 측정 또는 telemetry 중심 기능
- 엔진 전체를 자동으로 조작하는 과도한 기능
- AI가 알아서 판단한다는 black-box 기능
```

### 2.3 0.3.x의 제품 철학

```text
local-first
JSON-first
agent-summary-first
fixture-first
adapter-contributor-friendly
no account
no billing
no cloud dependency
no telemetry by default
```

---

## 3. 기능 로드맵 P0 — Core 안정화와 contributor-friendly 기반

P0의 목적은 openRender를 “작고 안정적인 local compiler”로 만들고, 외부 contributor가 쉽게 들어오도록 하는 것이다.

### 3.1 공식 JSON Schema

명령:

```bash
openrender schema contract
openrender schema output
openrender schema report
```

생성 파일:

```text
schemas/contract.schema.json
schemas/run-output.schema.json
schemas/report.schema.json
schemas/install-plan.schema.json
```

목적:

- agent가 output을 안정적으로 파싱할 수 있게 한다.
- MCP tool schema와 잘 연결된다.
- contributor가 adapter output shape를 쉽게 검증한다.
- 외부 프로젝트가 openRender output을 신뢰하고 사용할 수 있다.

성공 기준:

```text
- 모든 주요 CLI output이 schema로 검증된다.
- schema 변경 시 breaking change 여부를 문서화한다.
- report와 run output의 주요 field가 안정화된다.
```

---

### 3.2 `openrender plan`

설치 전 파일 변경 계획을 출력한다.

명령:

```bash
openrender plan sprite --target phaser --from ./tmp/hero.png --id hero --json
```

예상 output:

```json
{
  "ok": true,
  "target": "phaser",
  "operation": "plan",
  "filesToWrite": [
    "public/assets/hero.png",
    "src/openrender/animations/hero.ts"
  ],
  "filesToModify": [],
  "rollbackWillBeCreated": true,
  "agentSummary": "Ready to install a Phaser sprite asset named hero."
}
```

왜 중요한가:

- agent가 실제 쓰기 작업 전에 계획을 확인할 수 있다.
- 사용자는 openRender가 어떤 파일을 건드릴지 알 수 있다.
- 신뢰와 안전성이 올라간다.

---

### 3.3 `openrender explain`

run 결과를 agent가 읽기 쉬운 compact summary로 변환한다.

명령:

```bash
openrender explain <runId> --json
```

예상 output:

```json
{
  "ok": true,
  "runId": "run_123",
  "agentSummary": "Installed hero sprite into public/assets and generated a Phaser animation helper.",
  "nextActions": [
    "Import src/openrender/animations/hero.ts in your Phaser scene.",
    "Use asset key 'hero'."
  ]
}
```

왜 중요한가:

- agent가 긴 report를 읽는 데 token을 쓰지 않게 한다.
- 실패 후 다음 행동을 구조화한다.
- Codex / Cursor / Claude Code의 반복 디버깅을 줄인다.

---

### 3.4 `openrender diff`

설치 전후 차이를 보여준다.

명령:

```bash
openrender diff <runId>
openrender diff <runId> --json
```

출력:

```text
- files created
- files modified
- helper code generated
- snapshot path
- rollback command
```

왜 중요한가:

- 개발자가 변경 내용을 신뢰할 수 있다.
- agent가 변경된 파일만 context로 읽을 수 있다.
- 커뮤니티 issue 재현이 쉬워진다.

---

### 3.5 Golden Fixture System

adapter별 fixture를 고정한다.

구조:

```text
fixtures/
  phaser-basic-sprite/
    input.png
    openrender.config.json
    expected.run.json
    expected.files.json
    README.md

  godot-sprite-frame-set/
    input.png
    openrender.config.json
    expected.run.json
    expected.files.json
    README.md

  love2d-quad-strip/
    input.png
    openrender.config.json
    expected.run.json
    expected.files.json
    README.md
```

각 fixture는 다음을 포함해야 한다.

```text
- input media
- target config
- expected output JSON
- expected installed files
- expected report fields
- expected rollback behavior
```

목적:

- contributor가 engine adapter를 고칠 때 regression을 방지한다.
- issue를 fixture PR로 전환할 수 있다.
- handoff corpus의 기반이 된다.

---

### 3.6 Compatibility Matrix

README와 docs에 지원 상태를 명확히 표시한다.

예시:

| Target | Transparent Sprite | Sprite Frame Set | Helper Code | Runtime Smoke | 상태 |
|---|---:|---:|---:|---:|---|
| Phaser + Vite | ✅ | ✅ | ✅ | ❌ | 0.3.x core |
| Godot 4 | ✅ | ✅ | ✅ | ❌ | 0.3.x core |
| LOVE2D | ✅ | ✅ | ✅ | ❌ | 0.3.x core |
| PixiJS | planned | planned | planned | ❌ | P2 |
| Plain Canvas | planned | planned | planned | ❌ | P2 |
| Unity | ❌ | ❌ | ❌ | ❌ | future |

명확한 compatibility matrix는 오픈소스 도구의 신뢰도를 높인다.

---

## 4. 기능 로드맵 P1 — 이미지 handoff 품질 강화

P1은 “이미지 생성”이 아니라 “이미 생성된 이미지를 게임 asset으로 안전하게 handoff하는 품질”을 올리는 단계다.

### 4.1 Alpha Diagnostics

이미지의 alpha 상태와 sprite safety를 분석한다.

추가 check:

```text
- hasAlpha
- transparentPixelRatio
- nonTransparentBoundingBox
- edgeAlphaBleedRisk
- emptyFrameDetected
- oversizedCanvasDetected
- subjectTooSmallRisk
```

예상 output:

```json
{
  "alpha": {
    "hasAlpha": true,
    "transparentPixelRatio": 0.72,
    "nonTransparentBounds": { "x": 12, "y": 8, "w": 73, "h": 82 },
    "edgeBleedRisk": "low"
  }
}
```

왜 중요한가:

- agent가 이미지를 직접 vision model에 넣지 않고도 상태를 알 수 있다.
- token 사용량을 줄인다.
- 실패 원인을 deterministic하게 설명할 수 있다.

---

### 4.2 Frame Grid Detector

sprite frame set의 frame size와 layout을 추정한다.

명령:

```bash
openrender detect-frames ./tmp/slime.png --json
```

예상 output:

```json
{
  "ok": true,
  "suggested": {
    "layout": "strip",
    "frameWidth": 32,
    "frameHeight": 32,
    "frameCount": 4
  },
  "confidence": 0.83
}
```

주의:

- LLM에게 좌표를 추정하게 하지 않는다.
- 이미지 처리와 grid heuristic으로 추정한다.
- confidence가 낮으면 agent에게 명확한 nextAction을 반환한다.

---

### 4.3 Sprite Invariant Checks

sprite frame set에 아래 invariant를 추가한다.

```text
- frameCountMatch
- frameSizeMatch
- imageWidthDivisible
- imageHeightDivisible
- emptyFrame
- duplicateFrameApprox
- frameBoundsJitter
- alphaConsistency
```

실패 output 예시:

```json
{
  "ok": false,
  "code": "FRAME_SIZE_MISMATCH",
  "message": "Image width is not divisible by frameWidth.",
  "expected": { "frameWidth": 64 },
  "actual": { "imageWidth": 370 },
  "nextActions": [
    "Run detect-frames to infer frame size.",
    "Retry with --frame-width 74.",
    "Use transparent_sprite if this is not a sprite sheet."
  ]
}
```

왜 중요한가:

- agent가 실패 원인을 긴 로그에서 추론하지 않아도 된다.
- 다음 command가 구조화된다.
- community fixture를 만들기 쉽다.

---

### 4.4 Frame Preview Sheet

report에 frame index overlay preview를 생성한다.

파일:

```text
.openrender/runs/{runId}/preview_frames.png
```

내용:

```text
- 각 frame index 표시
- frame boundary 표시
- transparent background checkerboard
- optional bbox overlay
```

용도:

- 사람이 quick glance로 확인.
- agent가 필요할 때만 이미지 preview를 참조.
- report 품질 향상.

---

### 4.5 Deterministic Normalization Presets

명령:

```bash
openrender normalize ./tmp/raw.png --preset transparent-sprite --json
openrender normalize ./tmp/raw.png --preset ui-icon --json
openrender normalize ./tmp/raw.png --preset sprite-strip --frame-width 64 --frame-height 64 --json
```

preset 후보:

```text
transparent-sprite
ui-icon
sprite-strip
sprite-grid
```

각 preset은 내부적으로 다음을 정의한다.

```text
- target canvas policy
- crop policy
- padding policy
- alpha policy
- output naming convention
```

### 4.6 2026-05-02 구현 체크포인트

현재 repo의 0.3.1 구현은 P0/P1 기준으로 아래 표면을 포함한다.

```text
- openrender schema contract|output|report|install-plan|pack-manifest
- openrender plan sprite
- openrender explain
- openrender diff
- golden fixtures under fixtures/
- README compatibility matrix
- alpha diagnostics
- openrender detect-frames
- sprite invariant checks
- frame preview sheet: .openrender/runs/{runId}/preview_frames.png
- openrender normalize presets
- Phaser / Godot / LOVE2D helper 강화
- built-in local core pack metadata: pack list, pack inspect, recipe list
```

0.3.1은 여전히 remote pack sync, billing, account, telemetry, hosted worker, runtime engine smoke를 구현하지 않는다.

---

## 5. 기능 로드맵 P1/P2 — Engine Adapter 확장

### 5.1 Phaser Adapter 강화

Phaser는 loader를 통해 images, texture atlases, sprite sheets, fonts, audio, JSON 등 다양한 외부 asset을 로드한다. sprite sheet는 `frameWidth`와 `frameHeight` 같은 frame config를 통해 로드할 수 있다.

추가 기능:

```text
- Phaser preload helper 생성
- animation registration helper 생성
- Arcade Physics body hint 출력
- scene integration snippet
- Vite public path validation
- multiple spritesheet load helper
```

명령 예시:

```bash
openrender compile sprite \
  --target phaser \
  --from hero.png \
  --id hero \
  --install \
  --emit preload,animation \
  --json
```

출력 후보:

```text
public/assets/openrender/hero.png
src/openrender/phaser/hero.preload.ts
src/openrender/phaser/hero.animation.ts
```

---

### 5.2 Godot Adapter 강화

Godot의 AnimatedSprite2D는 여러 texture를 animation frame으로 사용할 수 있으며, animation은 SpriteFrames resource를 통해 관리한다.

추가 기능:

```text
- SpriteFrames helper 강화
- .tres generation 실험
- scene patch plan만 생성
- 실제 scene patch는 opt-in
- res:// path validator
- AnimatedSprite2D usage snippet
```

0.3.x 주의:

```text
- .import 파일 생성 금지
- .godot/ 파일 생성 금지
- Godot editor cache 조작 금지
- scene 자동 patch는 기본 off
```

명령 예시:

```bash
openrender compile sprite \
  --target godot \
  --from slime.png \
  --id enemy.slime \
  --install \
  --json
```

---

### 5.3 LOVE2D Adapter 강화

LOVE2D의 `love.graphics.newQuad`는 texture의 일부 영역을 그리기 위한 객체이며, sprite sheet와 atlas에서 특정 frame을 그릴 때 유용하다.

추가 기능:

```text
- love.graphics.newQuad frame table 생성
- Lua module export
- love.load / love.draw snippet
- anim8-compatible helper optional
- project-relative asset path validation
```

명령 예시:

```bash
openrender compile sprite \
  --target love2d \
  --from slime.png \
  --id enemy.slime \
  --install \
  --json
```

출력 후보:

```text
assets/openrender/enemy_slime.png
openrender/animations/enemy_slime.lua
openrender/openrender_assets.lua
```

---

### 5.4 PixiJS Adapter 추가

PixiJS는 웹 기반 2D rendering에 강하고 agentic web game workflow와 잘 맞는다. PixiJS는 texture와 spritesheet JSON을 loader에 넘겨 사용할 수 있다.

P2 목표:

```text
- Pixi project detection
- PNG + JSON spritesheet manifest
- Assets.load helper
- AnimatedSprite helper
- Vite public path support
```

출력 후보:

```text
public/assets/openrender/{asset}.png
public/assets/openrender/{asset}.json
src/openrender/pixi/{asset}.ts
```

명령 예시:

```bash
openrender init --target pixi --json
openrender compile sprite --target pixi --from hero.png --id hero --install --json
```

---

### 5.5 Plain Canvas Adapter 추가

Canvas adapter는 가장 단순한 웹 게임과 agentic prototypes에 적합하다.

P2 목표:

```text
- HTML Canvas helper
- drawFrame(ctx, image, frameIndex, x, y)
- loadImageAsset(path)
- TypeScript helper generation
- Vite public path support
```

출력 후보:

```text
public/assets/openrender/{asset}.png
src/openrender/canvas/{asset}.ts
```

왜 중요한가:

- engine 없이 웹 게임을 만드는 사람도 쓸 수 있다.
- Phaser/Pixi보다 진입 장벽이 낮다.
- agentic coding demo에 좋다.

---

## 6. 기능 로드맵 P2 — Thin MCP / Agent Pack

0.3.0에서는 hosted/full server 구현을 제품 범위에 넣지 않았지만, 커뮤니티 성장 관점에서는 local thin MCP가 매우 중요하다.

### 6.1 MCP Tools

초기 MCP tool은 적게 시작한다.

```text
openrender_scan
openrender_plan
openrender_compile
openrender_install
openrender_verify
openrender_rollback
openrender_report
openrender_explain
```

원칙:

```text
- 각 tool은 로컬 CLI를 호출한다.
- output은 JSON만 반환한다.
- 이미지나 repo 전체를 model context에 넣지 않는다.
- 필요한 요약만 agent에게 반환한다.
```

### 6.2 MCP Prompts

reusable prompt template을 제공한다.

예시:

```text
"Convert this raw asset into a Phaser-ready sprite."
"Install this generated image into a Godot project safely."
"Diagnose why this sprite frame set failed verification."
"Use openRender to prepare a LOVE2D Quad helper from this sprite sheet."
```

### 6.3 MCP Resources

report와 schema를 MCP resource로 노출한다.

```text
openrender://schema/contract
openrender://schema/report
openrender://schema/run-output
openrender://runs/latest
openrender://reports/{runId}
```

### 6.4 `openrender agent init`

agent별 설정을 생성한다.

명령:

```bash
openrender agent init --codex
openrender agent init --cursor
openrender agent init --claude
```

생성 후보:

```text
AGENTS.md
.openrender/agent-recipes.json
.codex/config.toml snippet
.cursor/rules/openrender.md
.claude/openrender.md
```

예상 AGENTS.md 일부:

```md
When handling generated game assets, prefer openRender for media-to-engine handoff.
Use `openrender plan` before writing files.
Use `openrender compile --install --json` for deterministic asset installation.
Use `openrender verify --json` after installation.
Do not write one-off image processing scripts unless openRender cannot handle the asset type.
```

---

## 7. 기능 로드맵 P2/P3 — 커뮤니티 기여 구조

### 7.1 Adapter SDK

새 엔진 adapter를 쉽게 만들 수 있게 한다.

명령:

```bash
openrender adapter create --name kaboom
```

생성 구조:

```text
packages/adapters/kaboom/
  index.ts
  descriptor.ts
  detect.ts
  install-plan.ts
  codegen.ts
  verify.ts
  fixtures/
  README.md
```

인터페이스 후보:

```ts
interface OpenRenderAdapter {
  detect(project: ProjectContext): DetectionResult;
  describe(contract: MediaContract): EngineAssetDescriptor;
  plan(contract: MediaContract): InstallPlan;
  generateHelper(descriptor: EngineAssetDescriptor): GeneratedFile[];
  verify(run: RunRecord): VerificationResult;
}
```

목표:

- Pixi, Canvas, Kaboom, MelonJS, PlayCanvas, Three.js, Babylon.js, Bevy, Defold 같은 adapter 확장 가능.
- contributor가 framework별로 독립 기여 가능.
- adapter PR의 acceptance criteria를 명확히 설정.

---

### 7.2 Recipe System

adapter보다 작은 단위의 기여를 가능하게 한다.

구조:

```text
recipes/
  phaser/
    vite-basic-sprite.yaml
    arcade-physics-sprite.yaml
    animation-helper.yaml

  godot/
    animated-sprite2d-helper.yaml
    spriteframes-basic.yaml

  love2d/
    quad-animation.yaml
    anim8-compatible.yaml
```

recipe 예시:

```yaml
id: phaser.vite.sprite.basic
target: phaser
framework: vite
assetTypes:
  - visual.transparent_sprite
  - visual.sprite_frame_set
outputs:
  preloadHelper: true
  animationHelper: true
agentSummaryTemplate: >
  Installed {{id}} as a Phaser asset. Use key {{assetKey}} in your scene.
```

목표:

- TypeScript 코드를 몰라도 recipe PR 가능.
- agent prompt와 output summary를 표준화.
- 유료 pack 후보의 기반을 만든다.

---

### 7.3 Fixture Capture

사용자가 실패 케이스를 fixture로 제출할 수 있게 한다.

명령:

```bash
openrender fixture capture --name godot-slime-strip
```

출력:

```text
fixtures/community/godot-slime-strip/
  input.png
  openrender.config.json
  expected.run.json
  expected.report.json
  README.md
```

목적:

- issue를 재현 가능한 test case로 만든다.
- community corpus를 구축한다.
- agent handoff failure pattern을 축적한다.

---

### 7.4 Adapter Acceptance Criteria

새 adapter PR은 다음 조건을 만족해야 한다.

```text
- project detection
- init defaults
- compile transparent_sprite
- compile sprite_frame_set
- install plan
- helper generation
- verify
- rollback
- at least 2 fixtures
- README quickstart
- compatibility matrix update
```

이 기준이 있어야 adapter ecosystem이 유지된다.

---

## 8. 기능 로드맵 P3 — Report와 Preview 강화

### 8.1 Local Report Gallery

hosted playground가 아니라 로컬 report gallery를 제공한다.

명령:

```bash
openrender reports serve
```

로컬 URL:

```text
http://localhost:3579
```

보여줄 내용:

```text
- run 목록
- input/output 이미지
- frame preview
- file diff
- verification checks
- generated helper code
- rollback command
```

주의:

```text
- network upload 없음
- telemetry 없음
- report는 로컬에서만 열림
```

---

### 8.2 Report Export

수동 export 기능.

명령:

```bash
openrender report export <runId> --format html
openrender report export <runId> --format json
```

목적:

- GitHub issue에 첨부.
- Discord/Discussion에서 디버깅.
- 커뮤니티 showcase.

---

### 8.3 Agent-safe Failure Messages

실패 메시지는 agent가 다음 행동을 결정할 수 있어야 한다.

좋은 실패 output 기준:

```json
{
  "ok": false,
  "code": "LOAD_PATH_INVALID_FOR_TARGET",
  "message": "The generated load path is not valid for LOVE2D project-relative asset loading.",
  "nextActions": [
    "Run openrender scan --json to confirm the project target.",
    "Retry with --target love2d.",
    "Check openrender.config.json assetRoot."
  ]
}
```

핵심:

- 다음 명령 제안.
- 실패 원인 구조화.
- 긴 로그 최소화.
- 이미지/파일 전체 context를 agent에게 넘기지 않음.

---

## 9. 기능 로드맵 P4 — 장기 후보

P4는 커뮤니티 사용이 충분히 생긴 뒤 고려한다.

### 9.1 Audio Handoff

지원 타입:

```text
audio.sound_effect
audio.music_loop
```

로컬 처리:

```text
- wav/ogg/mp3 normalization
- duration check
- loop metadata
- Phaser audio preload helper
- LOVE2D audio helper
- Godot audio path helper
```

주의:

```text
- 모델 호출 없음
- generated audio를 engine-ready로 handoff하는 것만 담당
```

---

### 9.2 Tileset / Atlas

지원 타입:

```text
visual.tileset
visual.atlas
```

기능:

```text
- grid validation
- atlas JSON generation
- Phaser atlas helper
- Pixi spritesheet JSON
- LOVE2D Quad atlas
- Canvas draw helper
```

---

### 9.3 UI Asset Helpers

지원 타입:

```text
visual.ui_button
visual.ui_panel
visual.icon_set
```

기능:

```text
- button state naming
- hover/pressed/disabled variants
- icon set manifest
- Phaser UI helper
- Canvas helper
```

---

### 9.4 Runtime Smoke Test

장기적으로 필요하지만 0.3.x에서는 static verification이 우선이다.

후보:

```bash
openrender smoke --target phaser
openrender smoke --target love2d
openrender smoke --target godot
```

목표:

- Phaser는 browser/headless smoke.
- LOVE2D는 runtime smoke.
- Godot은 headless/editor smoke.

주의:

- 복잡도가 높으므로 core adoption 이후.

---

## 10. 오픈소스 Growth 전략

### 10.1 Repo Readiness

필수 문서:

```text
README.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
ROADMAP.md
ADAPTER_AUTHORING.md
RECIPES.md
AGENT_USAGE.md
MCP.md
FIXTURE_GUIDE.md
```

README 첫 화면 예시:

```md
# openRender

Local-first media-to-engine compiler for AI coding agents.

```bash
npx openrender init --target phaser
npx openrender compile sprite --target phaser --from ./hero.png --id hero --install --json
```

No account. No cloud. No telemetry. Just deterministic media-to-engine handoff.
```

필수 README 요소:

```text
- 10초 설명
- 1분 quickstart
- before/after GIF
- supported targets matrix
- Codex/Cursor/Claude usage
- fixture contribution guide
- adapter contribution guide
```

---

### 10.2 Issue Templates

템플릿:

```text
Bug Report
Adapter Request
Fixture Contribution
Agent Workflow Issue
Engine Integration Request
Documentation Issue
```

각 issue는 다음을 요구해야 한다.

```text
- target engine
- openrender version
- command run
- JSON output
- input fixture 가능 여부
- expected result
- actual result
```

---

### 10.3 Labels

권장 label:

```text
good first issue
adapter
recipe
fixture
docs
agent-output
phaser
godot
love2d
pixi
canvas
mcp
report
verification
```

초기 good first issue는 core logic보다 docs/fixtures/recipes에 집중한다.

예:

```text
Add a LOVE2D fixture for a 4-frame idle strip
Improve FRAME_SIZE_MISMATCH failure message
Add Phaser scene snippet example
Add Godot SpriteFrames helper example
Add Canvas adapter draft README
```

---

## 11. 공식 Example 프로젝트

### 11.1 Phaser Example

Repo:

```text
examples/agent-phaser-platformer
```

시나리오:

```text
1. raw hero.png 준비
2. openrender compile/install
3. Phaser preload helper 생성
4. animation helper import
5. sprite가 게임 화면에 표시
```

필수 콘텐츠:

```text
- README
- before/after GIF
- Codex prompt
- command transcript
- generated report screenshot
```

---

### 11.2 Godot Example

Repo:

```text
examples/agent-godot-slime
```

시나리오:

```text
1. raw slime sprite sheet 준비
2. openrender compile/install
3. res:// path descriptor 생성
4. SpriteFrames helper 생성
5. AnimatedSprite2D 사용 안내
```

주의:

```text
- .import 생성하지 않음
- Godot editor를 대체하지 않음
- helper와 path handoff가 목적
```

---

### 11.3 LOVE2D Example

Repo:

```text
examples/agent-love2d-quad
```

시나리오:

```text
1. raw sprite strip 준비
2. openrender compile/install
3. Lua helper module 생성
4. love.graphics.newQuad 기반 frame table 사용
```

---

### 11.4 Pixi/Canvas Example 후보

P2 이후:

```text
examples/agent-pixi-spritesheet
examples/agent-canvas-mini-game
```

---

## 12. Agent Recipe 배포 전략

### 12.1 Codex Recipe

문서:

```text
docs/agents/codex.md
```

내용:

```text
- Codex MCP 설정
- openrender agent init --codex
- example prompts
- JSON output 해석 방법
- troubleshooting
```

예시 prompt:

```text
Use openRender to convert ./tmp/hero.png into a Phaser-ready sprite and install it safely. Do not write a custom image processing script unless openRender fails.
```

### 12.2 Cursor Recipe

문서:

```text
docs/agents/cursor.md
```

내용:

```text
- project rules
- openRender commands
- generated helper import convention
- fixture debugging
```

### 12.3 Claude Code Recipe

문서:

```text
docs/agents/claude-code.md
```

내용:

```text
- local CLI usage
- JSON-first workflow
- report/explain usage
```

---

## 13. 콘텐츠 Growth 전략

### 13.1 콘텐츠 핵심 메시지

```text
AI agents can make images.
openRender makes them usable by your game project.
```

한국어:

```text
AI agent는 이미지를 만들 수 있다.
openRender는 그 이미지를 게임 프로젝트가 먹을 수 있게 만든다.
```

### 13.2 반복 콘텐츠 포맷

#### Agent Asset Fail 시리즈

```text
Agent Asset Fail #1:
Codex generated a raw sprite, but Phaser couldn't use it.
openRender fixed the handoff in one command.
```

구성:

```text
- raw generated asset
- command
- generated helper
- game screenshot
- compact report
```

#### One Command Handoff 시리즈

```text
raw sprite → openrender compile/install → engine helper
```

#### No Cloud / No Account 시리즈

```text
No account.
No upload.
No telemetry.
Local media-to-engine handoff.
```

### 13.3 채널

```text
GitHub
X / Twitter
Reddit r/gamedev
Reddit r/phaser
Godot community
LOVE2D forums
Hacker News Show HN
YouTube Shorts
TikTok devlog
Discord
Game jam communities
```

---

## 14. 커뮤니티 운영

### 14.1 Discord 구조

추천 채널:

```text
#announcements
#showcase
#help
#agent-workflows
#phaser
#godot
#love2d
#pixi
#adapter-dev
#fixture-lab
#roadmap
```

### 14.2 GitHub Discussions 구조

```text
Show and tell
Adapter requests
Agent recipes
Troubleshooting
Roadmap proposals
Fixture submissions
```

### 14.3 Weekly Handoff Challenge

매주 하나의 작은 challenge를 운영한다.

예시:

```text
Week 1: raw slime sprite를 Godot-ready helper로 만들기
Week 2: LOVE2D Quad helper fixture 추가하기
Week 3: Phaser animation helper 개선하기
Week 4: PixiJS adapter fixture 만들기
```

목표:

- fixture contribution 유도.
- 실제 실패 케이스 수집.
- 커뮤니티 학습 효과.
- contributor spotlight 소재 확보.

### 14.4 Contributor Spotlight

작은 PR도 공개적으로 인정한다.

예:

```text
Thanks @username for adding the first LOVE2D idle strip fixture.
Thanks @username for improving the Phaser frame mismatch message.
```

오픈소스 커뮤니티는 기여자가 자기 기여가 보인다고 느끼는 것이 중요하다.

---

## 15. Engine 커뮤니티별 접근 전략

### 15.1 Phaser

메시지:

```text
Generated image → Phaser loader/helper in one command.
```

접근:

```text
- Phaser examples에 맞춘 demos
- Vite + Phaser template
- sprite sheet loader helper
- animation helper
```

### 15.2 Godot

메시지:

```text
openRender does not replace the Godot editor.
It generates safe local assets and helper scripts for AI agents.
```

접근:

```text
- .import를 건드리지 않는다는 점 강조
- SpriteFrames helper 중심
- res:// path descriptor 강조
```

### 15.3 LOVE2D

메시지:

```text
Generated sprite sheet → Quad helper module.
```

접근:

```text
- love.graphics.newQuad helper
- Lua module output
- 단순하고 hackable한 workflow 강조
```

### 15.4 PixiJS / Canvas

메시지:

```text
Agentic web game asset handoff for browser-first games.
```

접근:

```text
- Vite-friendly examples
- JSON manifest
- TypeScript helper
- lightweight preview
```

---

## 16. Adapter Bounty와 Ecosystem Expansion

초기 후보:

```text
PixiJS adapter
Plain Canvas adapter
Kaboom adapter
MelonJS adapter
PlayCanvas 2D texture helper
Three.js sprite helper
Babylon.js sprite helper
Defold adapter
Bevy 2D adapter
```

각 bounty의 acceptance criteria:

```text
- project detection
- init defaults
- transparent_sprite compile/install
- sprite_frame_set compile/install
- helper generation
- verify
- rollback
- 2 fixtures
- README quickstart
- compatibility matrix update
```

초기에는 금전 bounty보다:

```text
- contributor spotlight
- roadmap priority
- maintainer review
- demo inclusion
```

을 제공한다.

---

## 17. Handoff Corpus

openRender는 모델 benchmark보다 **handoff corpus**가 더 중요하다.

구조:

```text
handoff-corpus/
  phaser-vite-public-path/
  phaser-malformed-strip/
  godot-res-path/
  godot-spriteframes-helper/
  love2d-quad-sheet/
  love2d-project-relative-path/
  alpha-edge-case/
  oversized-canvas/
```

각 case:

```text
input media
contract
target project
expected install plan
expected report
expected failure or success
agent prompt
notes
```

목표:

- agent가 자주 실패하는 asset handoff 케이스를 표준화한다.
- adapter와 recipe 개선의 근거가 된다.
- community contribution이 테스트 자산으로 남는다.

---

## 18. Growth KPI

### 18.1 0~30일

```text
- GitHub stars 100
- npm weekly downloads 200
- 실제 example project 3개
- 외부 issue 10개
- 외부 contributor PR 3개
- Discord/Discussion 참여자 30명
- fixture contribution 5개
```

### 18.2 30~60일

```text
- GitHub stars 500
- npm weekly downloads 1,000
- external fixtures 20개
- adapter contribution 1개
- Codex/Cursor recipe 사용 사례 10개
- “direct Codex script 대신 openRender 사용” 피드백 5개
```

### 18.3 60~90일

```text
- GitHub stars 1,500
- npm weekly downloads 5,000
- thin MCP 사용 사례 20개
- Pixi/Canvas adapter community PR
- Show HN 또는 major community post 1회
- game jam partnership 1회
```

### 18.4 가장 중요한 지표

stars보다 중요한 지표:

```text
- 반복 사용
- fixture contribution
- adapter PR
- agent recipe adoption
- 실제 game project에 설치된 사례
- report export 공유 사례
```

---

## 19. 90일 실행 계획

### Week 1~2: Repo Readiness

```text
- README 재작성
- CONTRIBUTING / ROADMAP / ADAPTER_AUTHORING 작성
- RECIPES.md 작성
- AGENT_USAGE.md 작성
- JSON schema 초안 추가
- fixture structure 정리
- good first issue 20개 생성
- compatibility matrix 추가
```

### Week 3~4: Demo Push

```text
- Phaser demo repo
- Godot demo repo
- LOVE2D demo repo
- before/after GIF 제작
- “Codex uses openRender” 시나리오 문서
- 첫 블로그: Why AI agents need media-to-engine handoff
```

### Week 5~6: Agent Integration

```text
- openrender explain
- agentSummary output
- openrender agent init 초안
- thin MCP prototype
- Codex setup guide
- Cursor/Claude Code recipe 초안
```

### Week 7~8: Contribution Surface

```text
- Adapter SDK draft
- Recipe system draft
- fixture capture command
- first Weekly Handoff Challenge
- Discord/GitHub Discussions 오픈
```

### Week 9~12: Ecosystem Expansion

```text
- PixiJS adapter alpha
- Canvas adapter alpha
- Handoff corpus 공개
- Show HN / Reddit / Godot / Phaser community post
- game jam template 배포
```

---

## 20. 지금 당장 추가할 기능 TOP 15

우선순위:

```text
1. openrender plan
2. openrender explain
3. 공식 JSON schema
4. agentSummary field
5. fixture system
6. fixture capture
7. compatibility matrix
8. Phaser helper 강화
9. Godot SpriteFrames helper 강화
10. LOVE2D Quad helper 강화
11. openrender diff
12. openrender agent init
13. thin MCP server
14. PixiJS adapter alpha
15. Canvas adapter alpha
```

---

## 21. Risk Register

### Risk 1. 기능이 너무 넓어짐

증상:

```text
Pixi, Canvas, audio, atlas, UI, MCP를 동시에 하려 함.
```

대응:

```text
P0/P1은 Phaser/Godot/LOVE2D core와 report/fixture에 집중.
```

### Risk 2. 단순 이미지 처리 CLI로 보임

증상:

```text
openRender가 crop/padding tool처럼 보임.
```

대응:

```text
media-to-engine handoff, agent-safe JSON, install/verify/rollback을 계속 강조.
```

### Risk 3. Codex가 흡수함

증상:

```text
agent가 직접 스크립트로 해결.
```

대응:

```text
openRender는 Codex가 호출하는 deterministic local tool로 포지셔닝.
thin MCP와 agent recipes 강화.
```

### Risk 4. Community contribution이 어렵다

증상:

```text
adapter 작성 난도가 높음.
```

대응:

```text
Adapter SDK, recipe system, fixture capture, good first issue 확대.
```

### Risk 5. Runtime smoke test로 복잡해짐

증상:

```text
Godot/LOVE2D/Phaser runtime까지 모두 실행하려 함.
```

대응:

```text
0.3.x는 static verification과 helper generation만.
runtime smoke는 P4로 유지.
```

### Risk 6. 오픈소스인데 수익화 고민이 앞섬

증상:

```text
license, billing, paid pack을 너무 빨리 붙임.
```

대응:

```text
0.3.x는 무료 core와 커뮤니티 성장만.
수익화는 0.4 이후.
```

---

## 22. 문서와 메시지 가이드

### 22.1 쓰면 좋은 표현

```text
local-first media-to-engine compiler
agent-safe JSON output
deterministic asset handoff
install plan
verification report
rollback
no account, no cloud, no telemetry
AI agents make media; openRender makes it usable by games
```

### 22.2 피해야 할 표현

```text
AI asset generator
image model router
hosted asset API
game asset marketplace
all-in-one game engine
automatic Godot/Unity replacement
```

---

## 23. 참고 링크

- OpenAI Codex MCP documentation: https://developers.openai.com/codex/mcp
- Phaser Loader documentation: https://docs.phaser.io/phaser/concepts/loader
- Phaser spritesheet loading example: https://phaser.io/examples/v3.85.0/loader/sprite-sheet/view/load-sprite-sheet-from-object-array
- Godot AnimatedSprite2D documentation: https://docs.godotengine.org/en/stable/classes/class_animatedsprite2d.html
- Godot SpriteFrames documentation: https://docs.godotengine.org/en/stable/classes/class_spriteframes.html
- LOVE2D `love.graphics.newQuad`: https://love2d.org/wiki/love.graphics.newQuad
- MCP Prompts specification: https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
- MCP Resources specification: https://modelcontextprotocol.io/specification/2025-06-18/server/resources
- Open Source Guide — Building Community: https://opensource.guide/building-community/

---

## 24. 최종 기준

openRender의 현재 목표는 수익화가 아니다.

현재 목표는:

> AI agent가 게임 에셋을 프로젝트에 붙일 때, 매번 임시 스크립트를 만들지 않고 `openrender`를 호출하게 만드는 것.

따라서 0.3.x의 성공은 다음으로 판단한다.

```text
- local CLI가 안정적으로 작동한다.
- JSON output이 agent-safe하다.
- Phaser/Godot/LOVE2D에서 실제 handoff가 된다.
- fixture와 adapter 기여가 쉬워진다.
- thin MCP와 agent recipes로 Codex/Cursor/Claude Code에서 쉽게 호출된다.
- 커뮤니티가 실패 케이스를 fixture로 제출하기 시작한다.
```

한 줄로 정리하면:

> openRender는 오픈소스 이미지 처리 CLI가 아니라, agentic game development의 media-to-engine handoff 표준이 되어야 한다.
