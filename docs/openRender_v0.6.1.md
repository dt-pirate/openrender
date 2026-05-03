# [v0.6.1 기준 문서] openRender — Local-first Agent Token Saver + Developer Kit

## 문서 범위

| 항목 | 결정 |
|---|---|
| 기준 문서 | `docs/openRender_v0.6.1.md` |
| 이전 기준 | 0.3.0 로컬 기준 문서는 제거됨 |
| 작성일 | 2026-05-02 |
| 상태 | 0.3.1 전략 기준 위에 0.6.1 구현 상태를 반영한 로컬 기준 문서 |
| 제품명 | openRender |
| CLI | `openrender` |
| 주 사용자 | 로컬 게임 프로젝트에서 작업하는 AI coding agent와 agent를 사용하는 개인 개발자 |
| 현재 구현 버전 | 0.6.1 Developer Kit |
| 현재 핵심 범위 | local-first media-to-engine compiler + adapter registry + recipe/fixture/report/MCP/P4 metadata substrate |
| 제품 원칙 | compile 자체는 무료 local core, 수익화는 recipe/agent pack, update access, support, hosted worker/OEM에서 발생 |
| 지원 엔진 | Phaser, Godot 4, LOVE2D, PixiJS, Plain Canvas |
| 지원 미디어 | sprite image handoff + audio/atlas/UI metadata contracts |
| 실행 표면 | 로컬 CLI, JSON-first output, `context`, `install-agent`, local report, local MCP metadata |
| 0.6.1 신규 초점 | LLM-optimized context handoff, safe agent instruction install, PixiJS/Canvas adapter, thin MCP metadata package, adapter scaffold, fixture capture, report gallery/export, P4 media metadata, runtime smoke availability checks |
| 로컬 코어 경계 | 계정/결제/텔레메트리/클라우드 API/호스팅 플레이그라운드/model provider call 없이 동작하는 local image handoff |

> 이 문서의 초기 전략 서술은 0.3.1 기준을 보존한다. 구현 상태, 지원 범위, 완료 기준, roadmap은 현재 0.6.1 Developer Kit 상태로 갱신한다.

이 문서는 `openRender 0.3.0`의 local-first compiler 범위를 유지하면서, 0.3.1에서 필요한 **수익화와 서빙 구조의 기준**을 추가한다.

0.3.1의 핵심 변화는 다음이다.

```text
0.3.0: local-first media-to-engine compiler를 증명한다.
0.3.1: compile 자체를 과금하지 않고, agent token 절감형 package/recipe 전략을 정한다.
```

---

## 0. 전략 요약

openRender는 이미지 생성기, hosted asset API, prompt playground, marketplace, credit-based SaaS가 아니다.

openRender는 다음 역할에 집중한다.

> AI coding agent가 이미 생성한 로컬 미디어 파일을 게임 엔진에서 바로 사용할 수 있는 프로젝트 에셋, helper code, install plan, verification result, local report, rollback 단위로 바꾸는 local-first media-to-engine compiler.

0.3.1의 전략적 정의는 다음이다.

> openRender는 AI agent가 에셋 handoff를 직접 해결하느라 쓰는 토큰, 임시 스크립트, 반복 디버깅을 줄이는 local package + recipe pack 생태계다.

### 0.1 절대 하지 않는 것

0.3.1 기준으로 아래 방식은 제품 전략에서 제외한다.

```text
- compile 실행 횟수 과금
- install 실행 횟수 과금
- 이미지 개수 과금
- API 호출량 과금
- credit wallet / top-up 기반 개인 개발자 과금
- hosted playground 중심 제품
- model provider resale 중심 제품
- local core에 강한 DRM 적용
```

### 0.2 수익화의 기본 원칙

openRender의 무료 core는 로컬에서 동작한다. 사용자의 로컬 PC에서 compile과 install이 가능하므로, 이 자체를 서버로 끌고 가서 과금하지 않는다.

수익화는 아래에서 발생한다.

```text
1. Agent Pack: Codex/Cursor/Claude Code가 적은 토큰으로 호출할 수 있는 MCP/schema/prompt/repair recipe pack.
2. Engine Pro Recipe Pack: Phaser/Godot/LOVE2D/Pixi 등 엔진별 고급 adapter와 helper recipe.
3. Update Access: 최신 framework convention, helper template, agent-safe JSON schema 업데이트.
4. Support / Studio Pack: 반복 사용자와 소규모 팀을 위한 지원, report template, pack bundle.
5. Hosted Worker: 나중에 선택적으로 제공하는 repo/asset polish worker.
6. OEM / Platform License: AI game builder, agentic IDE, 교육 플랫폼에 내장되는 embedded openRender.
```

한 줄 기준:

> compile은 로컬에서 무료로 돌리고, 돈은 agent token을 줄이는 pack/update/support/OEM에서 받는다.

---

## 1. 제품 포지셔닝

### 1.1 이름과 표면

```text
Brand: openRender
CLI: openrender
Config: openrender.config.json
Local state: .openrender/
NPM scope: @openrender/*
Recipe cache: .openrender/recipes/ 또는 ~/.openrender/recipes/
Pack cache: ~/.openrender/packs/
```

### 1.2 한 줄 정의

> openRender는 AI agent가 생성한 미디어를 게임 엔진에서 바로 쓸 수 있는 프로젝트 구성요소로 바꾸는 로컬 인프라다.

0.3.1 확장 정의:

> openRender는 Codex/Cursor/Claude Code 같은 AI coding agent가 에셋 handoff에 쓰는 불필요한 토큰과 임시 스크립트를 줄이기 위한 local-first compiler와 recipe pack 시스템이다.

영문 보조 설명:

> openRender is a local-first media-to-engine compiler and recipe system that helps AI coding agents avoid repeated token-heavy asset handoff work.

### 1.3 제품이 아닌 것

openRender는 아래가 아니다.

```text
- AI image generation app
- prompt playground
- hosted game asset API
- image model router
- asset marketplace
- credit-based image generation SaaS
- Godot/Unity editor replacement
- full game engine
```

---

## 2. 문제 정의

AI coding agent는 코드를 작성하고, 이미지를 생성하거나 전달받을 수 있다. 그러나 raw generated media는 게임 프로젝트에 바로 들어가기 어렵다.

반복적으로 발생하는 문제는 다음과 같다.

- raw image는 crop, padding, alpha cleanup, PNG normalization이 필요하다.
- sprite frame set은 frame count, frame size, strip/grid 구조 검증이 필요하다.
- 엔진마다 asset path, load path, helper code 관례가 다르다.
- agent가 매번 일회성 이미지 처리 script를 만들어 같은 문제를 다시 푼다.
- agent가 프로젝트 구조를 반복해서 읽으며 토큰을 소모한다.
- 에셋 설치 실패를 디버깅하기 위해 로그, 이미지, 코드 context를 다시 agent에게 넣는다.
- 생성 파일은 structured run record 없이는 audit하기 어렵다.
- agent가 asset과 helper file을 쓴 뒤 rollback 기준이 불명확하다.

openRender는 media-to-engine handoff를 표준화한다. agent는 임시 이미지 처리 스크립트가 아니라 게임 통합과 gameplay code에 context를 써야 한다.

### 2.1 0.3.1의 핵심 경제 논리

기존의 약한 논리:

```text
openRender workflow를 쓰면 편하다.
```

0.3.1의 기준 논리:

```text
openRender를 쓰면 AI coding agent가 직접 이미지 처리 스크립트 작성, 프레임 검증, 엔진 helper 생성, 설치 디버깅에 쓰는 토큰과 반복 횟수를 줄인다.
```

즉 openRender의 유료 pack은 workflow 자체가 아니라 **agent token 절감과 반복 실패 감소**에 가치를 둔다.

---

## 3. 사용자

### 3.1 주 사용자

```text
로컬 게임 repository 안에서 작업하는 AI coding agent
```

예시는 다음과 같다.

- Phaser prototype을 수정하는 Codex.
- Godot 4 또는 LOVE2D 프로젝트에 asset을 설치하는 Cursor 또는 Claude Code.
- 생성된 sprite를 안전하게 설치해 달라고 agent에게 요청하는 solo developer.

### 3.2 사람 사용자

사람도 CLI를 직접 사용할 수 있다. 다만 0.3.1은 agent-first product surface를 우선한다.

사람 사용자를 위한 기준:

- command는 `--json`을 지원해야 한다.
- 사람도 읽을 수 있는 summary output을 제공할 수 있다.
- dry-run은 생성 및 설치 예정 파일을 보여줘야 한다.
- 실패 output은 다음에 실행할 명령을 제안해야 한다.
- report는 로컬에서 열람 가능해야 한다.
- install은 rollback 가능해야 한다.

### 3.3 경제적 구매자

0.3.1에서 구매자를 다음처럼 구분한다.

| 구분 | 돈을 낼 가능성 | 구매 이유 |
|---|---:|---|
| 개인 agentic 개발자 | 낮음~중간 | 직접 만들 수 있지만 매번 만들기 싫을 때, 저가 pack 구매 가능 |
| 반복 prototype 개발자 | 중간 | 여러 프로젝트에서 agent token과 디버깅 반복을 줄이고 싶음 |
| 소규모 팀 | 중간 | 팀 내 asset handoff convention과 report/rollback 표준화 |
| AI game builder / 교육 플랫폼 / IDE | 높음 | 사용자 성공률과 agent cost를 줄이는 embedded compiler 필요 |

---

## 4. 현재 지원 범위

### 4.1 엔진

현재 0.6.1 Developer Kit의 engine support는 다음과 같다.

| 엔진 | 현재 상태 | 설명 |
|---|---:|---|
| Phaser | 지원 | Vite + Phaser workflow, manifest/helper, static verification 지원. |
| Godot 4 | 지원 | 기본 이미지 에셋 설치와 GDScript helper 생성 지원. |
| LOVE2D | 지원 | 기본 이미지 에셋 설치와 Lua manifest/helper 생성 지원. |
| PixiJS | 지원 | Vite public path, PNG, spritesheet JSON, Assets.load/AnimatedSprite helper 지원. |
| Canvas | 지원 | Vite public path, PNG, TypeScript load/draw helper 지원. |
| Unity | 미지원 | 복잡도가 높아 초기 범위 밖. |

### 4.2 미디어 타입

현재 compile/install 대상 media contract type은 다음 두 가지다.

```text
visual.transparent_sprite
visual.sprite_frame_set
```

0.6.1에서 schema-backed metadata surface로 제공하는 P4 타입:

```text
audio.sound_effect
audio.music_loop
visual.tileset
visual.atlas
visual.ui_button
visual.ui_panel
visual.icon_set
```

P4 타입은 deterministic metadata, helper path hints, runtime smoke availability check의 대상이다. 실제 audio synthesis, atlas packing engine runtime execution, hosted generation은 openRender local core의 기본 범위가 아니다.

### 4.3 프로젝트 감지

0.3.1은 다음을 감지해야 한다.

- `package.json` dependency 기반 Vite + Phaser 프로젝트.
- `project.godot` 기반 Godot 프로젝트.
- `main.lua` 또는 `conf.lua` 기반 LOVE2D 프로젝트.
- JavaScript 프로젝트의 package manager.
- `.openrender/`와 `openrender.config.json` 상태.
- recipe/pack cache 존재 여부.

### 4.4 로컬 코어 경계

아래 항목은 로컬 Developer Kit의 제품 경계다.

- local core는 account, login, license, billing, wallet, entitlement check 없이 동작한다.
- compile/install/report는 cloud compile API나 hosted playground를 요구하지 않는다.
- model provider call, BYOK generation integration, telemetry는 local handoff 경로에 포함하지 않는다.
- MCP는 hosted sync/account flow가 아니라 local JSON-only metadata package로 제공한다.
- Phaser, Godot, LOVE2D, PixiJS, Canvas scene/runtime wiring은 agent 또는 개발자가 명시적으로 수행한다.
- Godot `.import` 파일, LOVE2D `.love` archive, runtime 내부 smoke execution은 local image handoff 범위 밖이다.
- video, 3D, advanced matting, segmentation은 현재 이미지 handoff 범위 밖이다. audio/atlas/UI는 P4 metadata contract로 제공한다.

0.3.1은 monetization architecture를 정의하지만, 아직 결제 시스템을 구현하지 않는다.

---

## 5. Engine Adapter 정책

### 5.1 공통 책임

모든 engine adapter는 다음 정보를 제공해야 한다.

- asset descriptor.
- engine load path.
- install plan.
- optional manifest/helper source.
- report에 쓰기 쉬운 output field.
- agent가 다음 code patch를 수행할 수 있는 compact hint.

공통 descriptor 형태는 아래 기준을 따른다.

```ts
interface EngineAssetDescriptor {
  id: string;
  engine: "phaser" | "godot" | "love2d";
  type: "transparent_sprite" | "sprite_frame_set";
  assetPath: string;
  loadPath: string;
  manifestPath: string | null;
  codegenPath: string | null;
  agentHints?: {
    loadSnippet?: string;
    usageSnippet?: string;
    nextActions?: string[];
  };
}
```

Phaser adapter는 기존 호환성을 위해 `publicUrl`을 `loadPath` alias로 계속 노출할 수 있다.

### 5.2 Phaser Adapter

기본 Phaser output:

```text
assetRoot: public/assets
sourceRoot: src
assetPath: public/assets/{asset}.png
loadPath: /assets/{asset}.png
manifestPath: src/assets/openrender-manifest.ts
codegenPath: src/openrender/animations/{asset}.ts
```

Phaser helper는 agent가 scene code에서 직접 import하거나 key/path를 복사해 사용할 수 있어야 한다.

Phaser command 예시:

```bash
openrender init --target phaser --json
openrender compile sprite --target phaser --from ./tmp/hero.png --id hero --install --json
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

Godot adapter의 0.3.1 기준은 다음과 같다.

- `project.godot`가 있으면 Godot 프로젝트로 scan한다.
- `init --target godot`은 Godot용 default config를 쓴다.
- image artifact는 `res://` load path를 기준으로 descriptor를 만든다.
- sprite frame set은 `SpriteFrames` 생성을 돕는 GDScript helper를 만든다.
- `.import`와 `.godot/` 파일은 생성하지 않는다.
- Godot editor import cache에 의존하지 않고 로컬 파일 구조와 load path shape만 검증한다.

Godot command 예시:

```bash
openrender init --target godot --json
openrender compile sprite --target godot --from ./tmp/enemy.png --id enemy --install --json
openrender verify --json
openrender rollback <runId> --json
```

### 5.4 LOVE2D Adapter

기본 LOVE2D output:

```text
assetRoot: assets/openrender
sourceRoot: openrender
assetPath: assets/openrender/{asset}.png
loadPath: assets/openrender/{asset}.png
manifestPath: openrender/openrender_assets.lua
codegenPath: openrender/animations/{asset}.lua
```

LOVE2D adapter의 0.3.1 기준은 다음과 같다.

- `main.lua` 또는 `conf.lua`가 있으면 LOVE2D 프로젝트로 scan한다.
- `init --target love2d`는 LOVE2D용 default config를 쓴다.
- image artifact는 LOVE2D project-relative path를 기준으로 descriptor를 만든다.
- sprite frame set은 `love.graphics.newQuad` 사용을 돕는 Lua helper module을 만든다.
- `.love` archive를 만들거나 LOVE2D runtime을 실행하지 않는다.
- 로컬 파일 구조와 project-relative load path shape만 검증한다.

LOVE2D command 예시:

```bash
openrender init --target love2d --json
openrender compile sprite --target love2d --input ./tmp/slime.png --id enemy.slime --install --json
openrender verify --json
openrender rollback <runId> --json
```

---

## 6. CLI 계약

### 6.1 핵심 명령

0.3.1의 CLI는 아래 명령을 기준으로 한다.

```text
openrender --version
openrender init --target phaser|godot|love2d --json
openrender scan --json
openrender schema contract|output|report|install-plan|pack-manifest
openrender pack list --json
openrender pack inspect core --json
openrender recipe list --json
openrender plan sprite --target phaser|godot|love2d --from|--input <png> --id <id> --json
openrender detect-frames <png> --json
openrender normalize <png> --preset transparent-sprite|ui-icon|sprite-strip|sprite-grid --json
openrender compile sprite --target phaser|godot|love2d --from|--input <png> --id <id> --install --json
openrender verify --json
openrender report <runId> --json
openrender explain <runId> --json
openrender diff <runId> --json
openrender rollback <runId> --json
openrender doctor --json
```

### 6.2 Pack 관련 명령

0.3.1은 실제 유료 pack 서버를 구현하지 않는다. 다만 pack architecture의 substrate를 CLI에 반영한다.

0.3.1에서 구현된 최소 명령:

```text
openrender pack list --json
openrender pack inspect <packId> --json
openrender recipe list --json
```

0.3.1에서는 built-in `core` pack metadata와 core recipe 목록만 로컬에서 노출한다. 원격 pack registry, 유료 pack sync, entitlement 확인은 구현하지 않는다.

0.3.1에서 선택적으로 stub만 둘 수 있는 명령:

```text
openrender pack sync --json
openrender login --json
openrender license refresh --json
```

stub 기준:

- network call을 하지 않는다.
- 명확히 `not_implemented_in_0_3_1`을 반환한다.
- 사용자가 compile core에 계정이 필요하다고 오해하지 않게 한다.

예시 실패 output:

```json
{
  "ok": false,
  "code": "not_implemented_in_0_3_1",
  "message": "Remote pack sync is planned for a later release. openRender core works locally without login.",
  "nextActions": [
    "Use built-in core recipes",
    "Run openrender pack list --json"
  ]
}
```

### 6.3 Target과 Framework 규칙

0.3.1의 target/framework 조합은 명확해야 한다.

| target | framework | 상태 |
|---|---|---|
| `phaser` | `vite` | 지원 |
| `godot` | `godot` | 지원 |
| `love2d` | `love2d` | 지원 |
| `phaser` | `godot` | 거부 |
| `godot` | `vite` | 거부 |
| `love2d` | `vite` | 거부 |
| `love2d` | `godot` | 거부 |

### 6.4 JSON-first Output

agent가 호출하는 command는 사람이 읽는 문장보다 structured field를 우선해야 한다.

좋은 output 기준:

- `ok`, `runId`, `target`, `engine`, `artifact`, `installPlan`, `verification`, `reportPath`, `rollbackHint`를 명확히 둔다.
- 실패 시 `ok: false`, `code`, `message`, `nextActions`를 제공한다.
- 파일 경로는 project-relative path를 기본으로 하되 report에서는 absolute path도 필요하면 제공한다.
- agent에게 긴 자연어 대신 compact JSON summary를 제공한다.
- 이미지 자체를 agent context에 넣는 대신, 이미지 invariant와 file outputs만 반환한다.

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
- LOVE2D는 `love.graphics.newQuad` 기반 Lua helper module을 만들 수 있다.

### 7.3 Agent Token Saving Contract

0.3.1은 compile output에 token-saving 목적의 compact context를 포함할 수 있다.

```json
{
  "agentSummary": {
    "whatChanged": "Installed sprite_frame_set hero.idle for phaser",
    "filesWritten": 3,
    "nextCodeAction": "Import generated helper from src/openrender/animations/hero.ts",
    "imageInspectionNeeded": false
  }
}
```

원칙:

- agent가 repo 전체를 다시 읽지 않아도 다음 action을 이해할 수 있어야 한다.
- agent가 이미지를 다시 vision context로 넣지 않아도 기본 성공/실패를 판단할 수 있어야 한다.
- detailed report는 local HTML/JSON에 남기고, CLI JSON은 compact해야 한다.

---

## 8. Pack / Recipe Architecture

### 8.1 Pack 개념

Pack은 openRender core 위에 얹히는 recipe, schema, helper template, adapter convention 묶음이다.

Pack의 목적:

```text
- AI agent가 긴 prompt 없이 짧은 tool call로 asset handoff를 수행하게 한다.
- 엔진별 install/helper convention을 최신 상태로 유지한다.
- 고급 repair/validation/agent report template을 제공한다.
- 무료 core와 유료 extension의 경계를 명확히 한다.
```

### 8.2 Pack 종류

| Pack | 상태 | 설명 |
|---|---:|---|
| `core` | 무료 / 기본 포함 | 기본 Phaser/Godot/LOVE2D compile/install/verify |
| `agent-core` | 0.3.1에서는 문서/로컬 template 후보 | MCP schema, compact JSON recipe, Codex/Cursor/Claude Code instructions |
| `phaser-pro` | 유료 후보 | richer Phaser helper, animation snippets, Vite conventions |
| `godot-pro` | 유료 후보 | scene patch hint, SpriteFrames helper 강화, res path guide |
| `love2d-pro` | 유료 후보 | Lua helper 강화, draw/update usage snippets |
| `studio` | 유료 후보 | 모든 pack, report templates, support-oriented recipes |
| `oem` | 계약 후보 | partner-specific adapter와 private support |

### 8.3 Pack Manifest Schema

0.3.1은 pack manifest schema를 정의한다.

```json
{
  "id": "phaser-pro",
  "name": "Phaser Pro Recipe Pack",
  "version": "0.3.1",
  "channel": "stable",
  "requiresOpenRender": ">=0.3.1 <0.4.0",
  "license": "paid_candidate",
  "engines": ["phaser"],
  "features": [
    "animation-helper-template",
    "vite-path-hints",
    "compact-agent-report"
  ],
  "recipes": [
    "recipes/phaser/sprite-frame-set.recipe.json"
  ],
  "templates": [
    "templates/phaser/animation-helper.ts.hbs"
  ]
}
```

0.3.1에서 `license` 값은 실제 결제 enforcement가 아니라 future boundary를 나타낸다.

허용 값:

```text
free
paid_candidate
oem_candidate
internal
```

### 8.4 Recipe Schema

Recipe는 특정 target, media contract, output helper에 대한 규칙이다.

```json
{
  "id": "phaser.sprite_frame_set.vite.basic",
  "packId": "core",
  "target": "phaser",
  "mediaType": "visual.sprite_frame_set",
  "inputs": {
    "required": ["id", "input", "frameWidth", "frameHeight", "frameCount"]
  },
  "outputs": {
    "assetPath": "public/assets/{id}.png",
    "codegenPath": "src/openrender/animations/{id}.ts"
  },
  "agentHints": {
    "summaryTemplate": "Installed {id} as Phaser sprite sheet.",
    "nextActionTemplate": "Import generated animation helper from {codegenPath}."
  }
}
```

---

## 9. Monetization Strategy

### 9.1 핵심 원칙

openRender는 local compile 자체에 돈을 받지 않는다.

수익화는 다음 기준을 따른다.

```text
- Free core로 표준화를 먼저 만든다.
- 유료 pack은 agent token 절감, 최신 recipe, 고급 helper, 지원에 돈을 받는다.
- 사용량 기반 compile 과금은 하지 않는다.
- 개인 개발자에게 복잡한 credit/wallet을 제공하지 않는다.
- 서버는 compile 서버가 아니라 license/pack/update 서버다.
- Hosted worker와 OEM은 후속 수익화다.
```

### 9.2 추천 상품 구조

| 상품 | 가격 후보 | 대상 | 핵심 가치 |
|---|---:|---|---|
| openRender Core | 무료 | 모든 사용자 | local compiler, basic adapter, no account |
| openRender Agent Pack | $9/mo 또는 $49/yr | agentic 개인 개발자 | MCP/schema/instruction/compact report recipe |
| Engine Pro Packs | $49/yr per pack 또는 bundle | 반복 사용자 | 엔진별 고급 adapter와 helper recipe |
| openRender Studio | $19~$29/mo | 소규모 팀/반복 개발자 | 모든 pack, update access, support-oriented templates |
| Hosted Worker | $19/run 또는 $49/project/mo | 나중에 | repo/asset polish 작업 위임 |
| OEM / Platform | 계약 | AI game builder/IDE/교육 플랫폼 | embedded compiler, custom adapter, SLA |

### 9.3 구매 명분

나쁜 구매 명분:

```text
openRender workflow를 쓸 수 있다.
```

좋은 구매 명분:

```text
AI coding agent가 직접 이미지 처리 스크립트를 만들고 실패하고 다시 디버깅하는 토큰 낭비를 줄인다.
```

실제 사용자 문구:

> openRender Agent Pack helps your coding agent avoid repeated token-heavy asset handoff work.

한국어 문구:

> openRender Agent Pack은 Codex/Cursor/Claude Code가 에셋을 게임 프로젝트에 붙이기 위해 반복적으로 쓰는 토큰, 임시 스크립트, 디버깅 루프를 줄입니다.

### 9.4 무료 core와 유료 pack의 경계

무료 core에 포함:

```text
- CLI
- local project scan
- basic transparent_sprite compile
- basic sprite_frame_set compile
- basic Phaser/Godot/LOVE2D install plan
- basic helper generation
- verify
- local report
- rollback
- no network
```

유료 pack 후보:

```text
- Codex/Cursor/Claude Code optimized instructions
- MCP tool schema pack
- compact agent report templates
- advanced engine helper templates
- richer repair recipes
- style/profile conventions
- latest framework recipe updates
- support bundle template enhancements
```

### 9.5 가격 강제 정책

0.3.1에서 실제 가격 enforcement는 구현하지 않는다.

향후 enforcement 원칙:

```text
- core는 완전히 무료로 유지한다.
- paid pack은 license/entitlement가 있어야 sync/update 가능하다.
- 이미 받은 pack은 즉시 차단하지 않는다.
- subscription 종료 시 새 업데이트, 새 pack, support, hosted worker만 제한한다.
- 강한 DRM을 지양한다.
```

---

## 10. Serving / License / Update Architecture

### 10.1 서버의 역할

openRender 서버는 compile 서버가 아니다.

향후 서버 역할:

```text
- license refresh
- pack registry
- pack download
- update channel
- Codex/MCP plugin manifest distribution
- optional report sync
- optional hosted worker
- OEM API
```

compile, install, verify는 로컬에서 실행한다.

### 10.2 Future API Surface

0.3.1에서는 구현하지 않는다. 0.4 이후 후보다.

```text
GET  /v1/packs
GET  /v1/packs/:id
GET  /v1/packs/:id/download
POST /v1/license/activate
POST /v1/license/refresh
GET  /v1/plugins/codex/manifest
POST /v1/reports/sync            optional
POST /v1/worker/runs             later
```

### 10.3 License Entitlement Shape

```json
{
  "subject": "user_or_license_key_hash",
  "plan": "agent_pack",
  "features": [
    "agent-core",
    "phaser-pro",
    "godot-pro"
  ],
  "validUntil": "2026-06-01T00:00:00Z",
  "offlineGraceDays": 14,
  "issuedAt": "2026-05-02T00:00:00Z"
}
```

### 10.4 Local Cache Policy

```text
~/.openrender/license.json
~/.openrender/packs/{packId}/{version}/
~/.openrender/recipes/
```

원칙:

- license token은 로컬에 저장한다.
- pack cache는 offline 사용 가능해야 한다.
- core는 license 없이 작동한다.
- license failure가 프로젝트 파일을 잠그면 안 된다.

### 10.5 Payment Provider 후보

초기 B2C 결제는 Merchant of Record를 우선 검토한다.

후보:

```text
- Lemon Squeezy: digital products, subscriptions, license keys, MoR 운영에 적합.
- Paddle: SaaS/apps MoR, tax/compliance/offloading에 적합.
```

운영 원칙:

- 0.3.1에서는 결제 미구현.
- 0.4 이후 license key / subscription webhook / entitlement server를 검토.
- 카드 관리, 세금, 환불, chargeback, subscription portal은 직접 만들지 않는다.

---

## 11. MCP / Codex / Agent Integration

### 11.1 0.6.1 구현 원칙

0.6.1은 hosted sync나 account flow가 아니라, 로컬 CLI와 local JSON-only MCP metadata package를 agent handoff 표면으로 둔다. 핵심은 agent가 넓게 파일을 읽기 전에 필요한 최소 문맥을 받고, install 전에 overwrite 위험을 확인하며, 설치 후 검증/리포트/롤백 경계를 남기는 것이다.

Agent-facing tool은 다음 특징을 가져야 한다.

```text
- 짧은 tool name
- compact JSON input
- compact JSON output
- 이미지 payload를 agent context에 넣지 않음
- failure code와 nextActions 제공
- local report path 제공
- manifest/helper overwrite risk 제공
```

### 11.2 구현된 agent command / MCP tool 기준

```text
openrender context --json
openrender scan --json
openrender doctor --json
openrender install-agent --platform codex|cursor|claude|all --dry-run --json
openrender plan sprite ... --json
openrender compile sprite ... --dry-run --json
openrender install --run latest --json
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
openrender rollback --run latest --json
```

예시:

```json
{
  "tool": "openrender_context",
  "arguments": {
    "cwd": "/path/to/game-project"
  }
}
```

`context --json` 결과는 target, path, latest run, overwrite risk, recommended nextActions를 제공한다. `install-agent --dry-run --json`은 `AGENTS.md`, `.cursor/rules/openrender.md`, `.claude/openrender.md` 작성 계획을 먼저 보여주며, 기존 파일은 `--force` 없이는 덮어쓰지 않는다.

### 11.3 Install / Manifest Behavior

agent는 install 전에 반드시 `compile sprite --dry-run --json`을 실행하고 `installPlan.files`를 확인한다.

기본 install은 기존 대상 파일을 덮어쓰지 않는다. manifest나 helper file이 이미 있으면 openRender는 중단하고, 사용자가 덮어쓰기를 허용한 경우에만 `--force`를 사용한다.

현재 Developer Kit에서 생성 manifest는 현재 compile 결과로 작성된다. 이전 manifest entry와 자동 병합되지 않는다. 여러 asset을 설치할 때는 의도한 asset set에서 manifest를 다시 생성하거나, run을 분리해서 관리하거나, `--force` 전에 manifest overwrite가 맞는지 확인해야 한다.

`rollback --run latest --json`은 특정 openRender install plan이 쓴 파일만 되돌린다. agent가 별도로 수정한 game code는 rollback 대상이 아니다.

### 11.4 Agent Output Example

```json
{
  "ok": true,
  "runId": "orun_01HX...",
  "target": "phaser",
  "engine": "phaser",
  "artifact": {
    "path": "public/assets/hero.idle.png",
    "loadPath": "/assets/hero.idle.png"
  },
  "filesWritten": [
    "public/assets/hero.idle.png",
    "src/openrender/animations/hero.idle.ts"
  ],
  "verification": {
    "status": "passed",
    "checks": ["png_valid", "frame_grid_valid", "helper_written"]
  },
  "agentSummary": {
    "nextCodeAction": "Import animation helper from src/openrender/animations/hero.idle.ts",
    "imageInspectionNeeded": false
  },
  "reportPath": ".openrender/reports/orun_01HX.html",
  "rollbackHint": "openrender rollback orun_01HX --json"
}
```

---

## 12. Repository 구조 기준

0.3.1 기준 monorepo package 역할은 다음과 같다.

```text
packages/core
  config, scan, validation, shared types

packages/cli
  agent-facing command surface, schema printing, built-in pack/recipe metadata

packages/adapters/phaser
  Phaser descriptor, install plan, helper generation

packages/adapters/godot
  Godot descriptor, install plan, GDScript helper generation

packages/adapters/love2d
  LOVE2D descriptor, install plan, Lua helper generation

packages/doctor
  local environment/project diagnostics

packages/reporter
  local report generation

packages/harness-visual
  image artifact inspection and preview support

packages/packs
  future external pack manifest and recipe registry

packages/agent-contracts
  future MCP/tool schemas, compact JSON examples, agent instruction templates
```

`packages/packs`와 `packages/agent-contracts`는 0.4 이후 별도 package 후보이며, 0.3.1의 built-in core pack metadata는 CLI 내부와 `schemas/pack-manifest.schema.json`에 둔다.

---

## 13. Verification과 Report

### 13.1 Verification

0.3.1 verification은 엔진 내부 실행을 증명하지 않는다. 대신 agent handoff에 필요한 로컬 invariant를 검증한다.

- artifact file exists.
- artifact is valid PNG.
- installed asset exists.
- manifest/helper file exists when planned.
- load path shape is engine-correct.
- rollback snapshot exists when install happened.
- agent output summary includes next action when codegen exists.

Godot의 경우 `res://assets/openrender/...` 형태를 검증한다. LOVE2D의 경우 `assets/openrender/...` project-relative path 형태를 검증한다. `.import` 생성, Godot editor cache 검증, `.love` archive 생성, LOVE2D runtime 실행은 0.3.1 범위 밖이다.

### 13.2 Report

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
- agent token-saving summary.
- pack/recipe used.

Godot report에는 `.import`를 생성하지 않는다는 note가 들어가야 한다. LOVE2D report에는 source PNG assets와 Lua helper module만 설치하며 runtime load는 `love.graphics.newImage`로 처리한다는 note가 들어가야 한다.

---

## 14. Safety와 Privacy

0.3.1은 local-first tool이므로 다음 원칙을 따른다.

- 기본 동작에서 network call을 하지 않는다.
- account, billing, telemetry를 요구하지 않는다.
- model provider API를 호출하지 않는다.
- 입력 이미지는 로컬 파일로만 처리한다.
- 생성 파일은 install plan과 snapshot을 통해 추적한다.
- rollback 가능한 변경만 openRender install 단위로 관리한다.
- paid pack architecture를 문서화하더라도, 0.3.1 core 사용에는 login이 필요하지 않다.

제품 설명 문구:

> openRender 0.3.1은 hosted platform이 아니라 agent가 로컬 프로젝트 안에서 안전하게 호출하는 compiler layer다. 첫 유료화 전략도 로컬 compile을 과금하는 방식이 아니라, agent token 절감에 도움이 되는 recipe/update/support pack을 제공하는 방식으로 설계한다.

---

## 15. 현재 완료 기준

현재 0.6.1 Developer Kit은 아래 기준을 충족해야 완료로 본다.

### 15.1 local-first compiler 기준

- `openrender --version`이 `0.6.1`을 반환한다.
- package metadata가 `0.6.1`으로 정렬되어 있다.
- `scan`이 Phaser, Godot, LOVE2D, PixiJS, Canvas 프로젝트를 구분한다.
- `context --json`이 target/path/latest run/overwrite risk/recommended nextActions를 제공한다.
- `init --target phaser`가 Phaser/Vite config를 만든다.
- `init --target godot`이 Godot config를 만든다.
- `init --target love2d`가 LOVE2D config를 만든다.
- `init --target pixi`가 PixiJS/Vite config를 만든다.
- `init --target canvas`가 plain Canvas/Vite config를 만든다.
- `compile sprite --target phaser --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `compile sprite --target godot --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `compile sprite --target love2d --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `compile sprite --target pixi --install`이 asset, manifest/spritesheet/helper, report, snapshot을 만든다.
- `compile sprite --target canvas --install`이 asset, manifest/helper, report, snapshot을 만든다.
- `compile sprite` output이 `agentSummary`와 built-in core `recipe` metadata를 포함한다.
- sprite frame set report가 `.openrender/runs/{runId}/preview_frames.png` frame preview sheet를 제공한다.
- `verify`가 다섯 target에서 통과한다.
- `rollback`이 설치 파일을 되돌린다.
- Godot workflow가 `.import`와 `.godot/`을 만들지 않는다.
- LOVE2D workflow가 `.love` archive를 만들거나 runtime을 실행하지 않는다.
- `pnpm typecheck`와 `pnpm test`가 통과한다.

### 15.2 Developer Kit 완료 기준

- README가 openRender를 local-first agent token saver / media-to-engine compiler로 설명한다.
- README가 compile usage billing, API billing, credit wallet이 없음을 명확히 한다.
- `openrender pack list --json`이 built-in core pack을 반환한다.
- `openrender recipe list --json`이 core recipes를 반환한다.
- pack manifest schema가 `schemas/pack-manifest.schema.json`과 `openrender schema pack-manifest`에 정의되어 있다.
- P4 media schema가 `schemas/media-p4.schema.json`과 `openrender schema media-p4`에 정의되어 있다.
- compile output에 compact `agentSummary`가 포함된다.
- report에 `pack/recipe used`와 `agent token-saving summary`가 포함된다.
- `openrender report export`가 local HTML/JSON export를 제공한다.
- `openrender reports serve`가 local-only report gallery metadata를 제공한다.
- `openrender fixture capture`가 sanitized fixture metadata를 만든다.
- built-in adapter마다 최소 두 개의 golden fixture가 존재한다.
- `@openrender/mcp-server`가 local JSON-only tool/resource/prompt metadata를 제공한다.
- MCP tool metadata가 `context`와 `install-agent`를 포함한다.
- `install-agent --platform all --dry-run --json`이 Codex/Cursor/Claude instruction file plan을 쓰기 전에 보여준다.
- `docs/LLM-OPTIMIZED-REFERENCE.md`가 agent용 compact handoff 기준으로 존재한다.
- runtime smoke command는 runtime이 없을 때 clear `not_available` JSON을 반환한다.
- docs에 `Free Core`, `Agent Pack`, `Engine Pro Packs`, `Hosted Worker`, `OEM` 수익화 후보가 명확히 정리되어 있다.
- docs에 “server is not a compile server; server is future license/pack/update/OEM server” 원칙이 들어간다.
- `openrender login` 또는 `openrender pack sync`가 존재한다면, 명확한 future-surface JSON을 반환한다.
- 문서가 local-first/no-account/no-telemetry 원칙을 침해하지 않는다.

---

## 16. 현재 구현 상태 기준

현재 구현은 0.6.1 Developer Kit 기준이다.

| 영역 | 현재 기준 |
|---|---|
| version bump | 완료 |
| Phaser adapter | 지원 |
| Godot adapter | 지원 |
| LOVE2D adapter | 지원 |
| PixiJS adapter | 지원 |
| Canvas adapter | 지원 |
| adapter registry | 구현 |
| local report | report/export/gallery metadata까지 구현 |
| rollback | 유지 |
| pack manifest schema | 구현 |
| recipe listing/validation | 구현 |
| context command | 구현 |
| install-agent command | 구현 |
| fixture capture | 구현 |
| golden fixtures | target별 최소 2개 |
| MCP server package | context/install-agent 포함 local JSON-only metadata package 구현 |
| P4 media schema | audio, atlas/tileset, UI metadata 구현 |
| runtime smoke | runtime 미설치 시 `not_available` JSON 반환 |
| hosted/cloud sync | 범위 밖 |
| account/billing/license enforcement | 범위 밖 |
| paid pack actual distribution | 범위 밖 |

주의할 점:

- “지원”은 로컬 파일 설치와 helper generation 기준이다.
- Godot editor를 실제로 열어 import cache를 생성하거나 scene에 자동 연결하는 기능은 0.3.1 지원 범위가 아니다.
- LOVE2D runtime을 실제로 실행하거나 `.love` archive를 생성하는 기능은 0.3.1 지원 범위가 아니다.
- MCP는 hosted sync나 account flow가 아니라 local JSON-only package로 구현되어 있다.
- monetization architecture는 문서와 pack boundary를 정하는 것이며, 실제 결제/라이선스 서버 구현이 아니다.

---

## 17. Roadmap

### 17.1 완료된 Developer Kit 단계

- 0.4.0: adapter registry, PixiJS, Canvas, MCP metadata, agent init, recipe substrate.
- 0.5.0: adapter scaffold, fixture capture, report export/gallery, stronger failure guidance.
- 0.6.1: P4 media metadata contracts, runtime smoke availability checks, expanded QA coverage.

### 17.2 다음 후보

- Godot scene patch helper.
- true runtime execution smoke for installed Godot/LOVE2D environments.
- official external example repositories.
- Agent Pack private beta.
- Engine Pro Pack private beta.
- license/entitlement server.
- signed pack bundle download.
- Lemon Squeezy/Paddle-based license key workflow.
- optional remote report sync.

### 17.3 0.5.x 후보

- hosted worker.
- OEM adapter API.
- partner SDK.
- audio sound effect workflow.
- remote artifact registry optional mode.
- provider integration은 별도 명시적 opt-in으로만 검토.

---

## 18. Risk Register

| 리스크 | 설명 | 대응 |
|---|---|---|
| 사용자가 직접 만든다 | agent가 비슷한 script를 직접 만들 수 있음 | core를 무료로 풀어 표준 도구가 되게 함 |
| 유료 pack 복제 | recipe pack은 완벽한 DRM이 어려움 | 저가, 업데이트, 지원, 편의 중심으로 과금 |
| Codex가 기능 흡수 | 이미지 확인/간단 변환은 agent가 잘하게 됨 | deterministic adapter, install/rollback/report, compact tool schema에 집중 |
| B2C ARPU 낮음 | 개인 개발자 결제액이 낮음 | B2C는 adoption, 큰 수익은 OEM/Platform |
| 수익화가 너무 늦음 | 무료 core만 쓰고 돈 안 냄 | 0.4에서 Agent Pack, Engine Pro Pack을 빠르게 실험 |
| 과금이 devtool 친화적이지 않음 | 강한 DRM과 사용량 과금은 반감 유발 | update access와 support에 과금, compile 자체는 무료 |

---

## 19. 최종 기준

openRender 0.3.1의 목표는 넓은 플랫폼이나 유료 SaaS가 되는 것이 아니다.

목표는 AI agent가 로컬 게임 프로젝트 안에서 생성 이미지를 안전하게 설치하고, 엔진별 path/helper를 얻고, 검증하고, report를 남기고, 필요하면 rollback할 수 있게 만드는 0.3.0 기준을 유지하면서, 앞으로의 수익화가 **로컬 compile 과금이 아니라 agent token 절감형 recipe/pack/update/OEM 전략**임을 명확히 하는 것이다.

0.3.1에서 openRender는 다음 기준을 따른다.

```text
Core compile is local and free.
Server is not a compile server.
Server is only future license / pack / update / OEM infrastructure.
Paid value comes from reducing agent token waste and repeated throwaway scripts.
```

한국어 기준:

> openRender는 로컬 compile 자체에 돈을 받지 않는다. openRender는 AI coding agent가 에셋 handoff를 해결하느라 쓰는 토큰과 반복 디버깅을 줄이는 recipe pack, agent pack, update access, support, OEM 구조로 수익화한다.

---

## 20. External Reference Notes

이 문서의 수익화/agent 전략은 아래 공개 문서의 방향성을 고려한다.

- OpenAI Codex MCP documentation: Codex supports MCP servers in CLI and IDE extension.
- OpenAI Codex pricing / rate card: Codex usage increasingly maps to input, cached input, and output token consumption.
- OpenAI API pricing: model/tool usage is token-priced, and agent loops can accumulate cost.
- Lemon Squeezy licensing documentation: subscription products can issue license keys and keep keys active while subscription is active.
- Paddle Merchant of Record documentation: MoR products can offload payment, tax, compliance, refund/chargeback operations.

These references do not create 0.3.1 implementation requirements. They inform the future monetization architecture only.
