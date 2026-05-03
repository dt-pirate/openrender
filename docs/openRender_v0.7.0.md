# [v0.7.0 기준 문서] openRender - Agent Token Saver + Local-first Developer Kit

## 1. 문서 범위

| 항목 | 기준 |
|---|---|
| 기준 문서 | 0.7.0 Agent Token Saver |
| 작성일 | 2026-05-02 |
| 최신 갱신 | 2026-05-03 |
| 제품명 | openRender |
| CLI | `openrender` |
| 현재 문서 기준 | 0.7.0 Agent Token Saver |
| 기반 구현 버전 | 0.6.1 Developer Kit |
| 현재 source 표면 | compact agent output, read-only wire-map |
| 주 사용자 | 로컬 게임 프로젝트에서 작업하는 AI coding agent와 개인 개발자 |
| 지원 엔진 | Phaser, Godot 4, LOVE2D, PixiJS, Plain Canvas |
| 지원 미디어 | sprite image handoff, P4 audio/atlas/UI metadata contracts |
| 실행 원칙 | local-first, JSON-first, no account/billing/telemetry/model provider call |
| 코드 수정 경계 | openRender는 game code를 자동 수정하지 않고 연결 후보만 반환한다 |

이 문서는 openRender의 현재 개발 기준이다. 0.7.0 Agent Token Saver 기준은 0.6.1 Developer Kit의 local-first 구현 위에 적용된 agent-facing 토큰 절감 출력 표면을 함께 정리한다.

상세한 제품 방향이나 장기 전략은 공개 Docs의 핵심 설명에 노출하지 않는다. 공개 문서는 사용자가 지금 실행할 수 있는 CLI, JSON output, local report, compact view, wire-map, verification, rollback 기준을 우선한다.

---

## 2. 제품 정의

openRender는 이미지 생성기, prompt playground, hosted asset API, marketplace, game engine이 아니다.

openRender는 다음 역할에 집중한다.

> AI coding agent가 이미 보유한 로컬 미디어 파일을 게임 엔진에서 사용할 수 있는 프로젝트 파일, helper code, install plan, verification result, local report, rollback 단위로 바꾸는 local-first media-to-engine compiler.

Agent 관점의 핵심 가치는 다음이다.

- 긴 로그 대신 짧은 상태 요약을 받는다.
- 전체 게임 코드 대신 asset을 연결할 후보 위치를 받는다.
- 긴 JSON 배열 대신 `{ columns, rows }` table 형태의 compact output을 받을 수 있다.
- full JSON report와 local HTML report는 audit trail로 유지한다.

---

## 3. 현재 지원 범위

### 3.1 지원 엔진

| target | 감지 기준 | 설치 산출물 |
|---|---|---|
| `phaser` | Vite + Phaser dependency 또는 Phaser scene/code | `public/assets/`, `src/assets/openrender-manifest.ts`, animation helper |
| `godot` | `project.godot` | `assets/openrender/`, `scripts/openrender/openrender_assets.gd`, animation helper |
| `love2d` | `main.lua` 또는 `conf.lua` | `assets/openrender/`, `openrender/openrender_assets.lua`, animation helper |
| `pixi` | Vite + Pixi dependency 또는 Pixi app code | `public/assets/openrender/`, Pixi spritesheet JSON, helper |
| `canvas` | Vite project 또는 Canvas render code | `public/assets/openrender/`, manifest, draw helper |

### 3.2 지원 미디어

- `visual.transparent_sprite`
- `visual.sprite_frame_set`
- P4 metadata contract: audio, atlas/tileset, UI asset metadata

Video, scene, 3D contract는 현재 local workflow에 포함하지 않는다.

### 3.3 로컬 경계

- 계정, 결제, license enforcement, telemetry, cloud sync를 요구하지 않는다.
- model provider call 또는 BYOK generation integration을 수행하지 않는다.
- Godot `.import` 또는 `.godot/` cache를 만들지 않는다.
- LOVE2D `.love` archive를 만들거나 runtime을 실행하지 않는다.
- Phaser/Godot/LOVE2D/PixiJS/Canvas game code를 자동 패치하지 않는다.

---

## 4. CLI 기준

### 4.1 기본 workflow

```bash
openrender init --target phaser
openrender context --json
openrender plan sprite ./asset.png --target phaser --json
openrender compile sprite ./asset.png --target phaser --install --json
openrender verify --run latest --json
openrender report --run latest --json
openrender explain --run latest --json
openrender diff --run latest --json
```

`phaser` 대신 `godot`, `love2d`, `pixi`, `canvas`를 사용할 수 있다.

### 4.2 Compact agent output

Agent가 전체 JSON이 아니라 다음 행동에 필요한 핵심만 필요할 때는 `--compact`를 사용한다.

```bash
openrender context --json --compact
openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
```

Compact output 기준:

- `ok`, `target`, `runId`, `paths`, `latestRun`, `nextActions` 같은 필수 필드는 유지한다.
- 긴 file/check list는 `{ columns, rows }` table로 표현한다.
- 실패 원인, rollback 가능 여부, 다음 행동은 빠지지 않아야 한다.
- full JSON report와 local HTML report를 대체하지 않는다.

### 4.3 Read-only wire-map

Agent가 생성된 helper나 asset manifest를 어디에 연결할지 알아야 할 때는 `context --wire-map`을 사용한다.

```bash
openrender context --json --wire-map
```

Wire-map 기준:

- 파일을 읽어서 후보 위치만 반환한다.
- game code를 쓰거나 수정하지 않는다.
- 후보가 없으면 빈 후보와 이유를 반환한다.

엔진별 후보:

| target | 후보 위치 |
|---|---|
| Phaser | scene file, `preload`, `create`, `extends Phaser.Scene`, `new Phaser.Game` |
| Godot | `project.godot`, `scripts/`, `.gd`, `.tscn`, `_ready`, node/script 연결 후보 |
| LOVE2D | `main.lua`, `conf.lua`, `love.load`, `love.draw`, `love.update` |
| PixiJS | Vite entry, `Application`, `Assets.load`, `Sprite`, render/init 함수 |
| Canvas | Vite entry, `canvas`, `getContext("2d")`, draw/render/init 함수 |

---

## 5. JSON-first 출력 규칙

openRender의 agent-facing 출력은 JSON-first다.

공식 agent 출력에서 사람이 보기 좋은 표가 필요하면 Markdown 표 대신 다음 형태를 사용한다.

```json
{
  "columns": ["path", "kind", "status"],
  "rows": [
    ["public/assets/openrender/hero.png", "asset", "created"]
  ]
}
```

이 방식은 반복 key를 줄이면서도 agent가 안정적으로 파싱할 수 있다.

---

## 6. Report와 rollback

각 install run은 `.openrender/` 아래에 로컬 실행 기록을 남긴다.

대표 산출물:

- `.openrender/reports/latest.json`
- `.openrender/reports/latest.html`
- `.openrender/runs/{runId}/`
- `.openrender/snapshots/`

Report에는 다음 정보가 포함되어야 한다.

- run id
- target
- source image
- artifact path
- installed files
- generated helper files
- verification result
- report/export/gallery path
- rollback command
- agent summary
- next actions

Rollback은 openRender install이 관리한 파일만 되돌린다. 별도로 수정된 game code는 rollback하지 않는다.

---

## 7. MCP와 agent instructions

현재 MCP 표면은 local JSON-only metadata package다.

포함 기준:

- supported target metadata
- `context`
- `install-agent`
- agent prompt/resource/tool metadata

`install-agent --platform all --dry-run --json`은 Codex, Cursor, Claude instruction file plan을 실제 쓰기 전에 보여준다.

---

## 8. 구현 상태

| 영역 | 상태 |
|---|---|
| version bump | 완료 |
| Phaser adapter | 지원 |
| Godot adapter | 지원 |
| LOVE2D adapter | 지원 |
| PixiJS adapter | 지원 |
| Canvas adapter | 지원 |
| adapter registry | 구현 |
| local report/export/gallery | 구현 |
| rollback | 구현 |
| pack manifest schema | 구현 |
| recipe listing/validation | 구현 |
| context command | 구현 |
| compact context output | 구현 |
| read-only wire-map | 구현 |
| compact verify/report/explain/diff | 구현 |
| install-agent command | 구현 |
| fixture capture | 구현 |
| golden fixtures | target별 최소 2개 |
| MCP metadata package | 구현 |
| P4 media schema | audio, atlas/tileset, UI metadata 구현 |
| runtime smoke availability | runtime 미설치 시 `not_available` JSON 반환 |
| account/billing/license enforcement | 구현하지 않음 |
| cloud sync | 구현하지 않음 |
| automatic game code patching | 구현하지 않음 |

---

## 9. Version History

상세 배포 이력은 `RELEASES.md`와 공개 Release History 페이지에서 관리한다.

- 0.4.0: adapter registry, PixiJS, Canvas, MCP metadata, agent init, recipe substrate.
- 0.5.0: adapter scaffold, fixture capture, report export/gallery, stronger failure guidance.
- 0.6.1: P4 media metadata contracts, runtime smoke availability checks, expanded QA coverage.
- 0.7.0: compact agent output, read-only wire-map, compact table output for verify/report/explain/diff.

Docs에서 버전 히스토리를 갱신할 때는 다음 파일을 함께 확인한다.

- `RELEASES.md`
- 공개 Release History
- `ROADMAP.md`
- Release Checklist

---

## 10. 완료 기준

- README와 다국어 README가 compact output과 wire-map을 설명한다.
- Docs의 CLI reference, quickstart, agent usage, LLM reference가 `--compact`와 `--wire-map`을 포함한다.
- Release history가 현재 구현된 agent-facing 출력 표면을 포함한다.
- Public page copy가 현재 구현 범위 중심으로 유지된다.
- `context --json --compact`가 짧은 project handoff를 반환한다.
- `context --json --wire-map`이 game code를 수정하지 않고 연결 후보만 반환한다.
- `verify/report/explain/diff --compact`가 compact JSON table을 반환한다.
- `pnpm typecheck`, `pnpm test`, golden fixture가 통과한다.

---

## 11. 최종 기준

openRender는 로컬 게임 프로젝트 안에서 에셋 설치, 검증, 리포트, rollback, compact handoff, read-only 연결 후보 확인을 제공한다.

현재 local core의 기준은 다음이다.

```text
Core compile is local.
Agent-facing output is JSON-first.
Compact mode shortens repeated lists into tables.
Wire-map reports candidate connection points without editing game code.
Full report/export/gallery output remains available as the audit trail.
```
