(function () {
  const languages = [
    ["en", "English", "English"],
    ["zh", "中文", "Chinese"],
    ["ja", "日本語", "Japanese"],
    ["ko", "한국어", "Korean"],
    ["es", "Español", "Spanish"]
  ];

  const storageKey = "openrender.locale";

  const dictionary = {
    zh: {
      "Documentation": "文档",
      "Start": "开始",
      "Docs": "文档",
      "Overview": "概览",
      "Quickstart": "快速开始",
      "Release History": "发布历史",
      "Reference": "参考",
      "CLI Reference": "CLI 参考",
      "Contracts": "契约",
      "Agent Usage": "Agent 用法",
      "Troubleshooting": "故障排除",
      "Boundaries": "边界",
      "Privacy Policy": "隐私政策",
      "Terms & Conditions": "条款与条件",
      "openRender docs": "openRender 文档",
      "official document": "官方文档",
      "Skip to main content": "跳到主要内容",
      "Read the technical scope": "查看技术范围",
      "Copy": "复制",

      "Token saver for AI game development.": "面向 AI 游戏开发的 token 节省器。",
      "openRender helps AI agents spend fewer tokens turning generated game art into working project files. It packages images with engine-ready paths, helper code, checks, reports, and rollback records, so agents can stop guessing and start building.": "openRender 帮助 AI agents 用更少 token 将生成的游戏美术变成可工作的项目文件。它把图片打包为 engine-ready paths、helper code、checks、reports 和 rollback records，让 agents 少猜测，直接构建。",
      "Local by default": "默认本地",
      "Agent-readable JSON": "Agent 可读 JSON",
      "Report and rollback": "报告与回滚",
      "Asset handoff map": "Asset 交接图",
      "one source image to verified project files": "一张源图到可验证的项目文件",
      "verified": "已验证",
      "Source media": "源媒体",
      "local generated image or sprite sheet": "本地生成图片或 sprite sheet",
      "Contract": "契约",
      "dimensions, frames, IDs, install intent": "尺寸、帧、ID、安装意图",
      "Adapter": "适配器",
      "project paths, manifest, helper shape": "项目路径、manifest、helper 形态",
      "Package": "包",
      "files written with snapshots": "带 snapshot 写入的文件",
      "Proof": "证据",
      "verify, report, rollback handle": "verify、report、rollback handle",
      "What agents save with openRender": "openRender 帮 agent 节省什么",
      "openRender turns a noisy asset handoff into compact, repeatable project evidence. Agents read less context, make fewer guesses, and leave a safer trail for the next iteration.": "openRender 将混乱的 asset handoff 变成紧凑、可重复的项目证据。Agents 读取更少上下文，减少猜测，并为下一次迭代留下更安全的轨迹。",
      "Token efficiency": "Token 效率",
      "Est. 56%": "估算 56%",
      "fewer handoff tokens": "更少 handoff tokens",
      "Agents read compact JSON contracts instead of re-describing frame geometry, load paths, helper files, reports, and recovery steps.": "Agents 读取紧凑的 JSON contracts，而不是重新描述 frame geometry、load paths、helper files、reports 和 recovery steps。",
      "Local estimate: 188-token manual handoff brief vs 83-token openRender summary, using chars/4 token approximation.": "本地估算：188-token manual handoff brief 对比 83-token openRender summary，按 chars/4 近似计算。",
      "Decision reduction": "减少决策",
      "9 steps": "9 步",
      "automated in one loop": "在一个循环中自动化",
      "Scan, frame detection, contract validation, output planning, helper generation, install, verify, report, and rollback are handled as one repeatable handoff path.": "Scan、frame detection、contract validation、output planning、helper generation、install、verify、report 和 rollback 被处理为一条可重复的 handoff path。",
      "Counted from the implemented local workflow surface, not from a fixed number of supported engines.": "该数字来自已实现的 local workflow surface，而不是固定的引擎支持数量。",
      "Recovery confidence": "恢复可信度",
      "1 run ID": "1 个 run ID",
      "to verify, report, or rollback": "用于 verify、report 或 rollback",
      "Each install leaves proof: generated files, checks, preview sheets, report output, diff context, and a rollback command for recovery.": "每次 install 都留下证据：generated files、checks、preview sheets、report output、diff context，以及用于恢复的 rollback command。",
      "Failure paths become short next actions instead of another long debugging thread.": "失败路径会变成简短的 next actions，而不是另一段漫长的 debugging thread。",
      "Handoff core": "交接核心",
      "openRender is built around repeatable local surfaces: understand the project, diagnose the image, compile the media package, install it safely, and leave proof for the next agent or developer.": "openRender 围绕可重复的本地 surface 构建：理解项目、诊断图片、编译 media package、安全安装，并为下一个 agent 或 developer 留下证据。",
      "Project layer": "项目层",
      "Adapter-shaped project output": "Adapter-shaped project output",
      "Media layer": "媒体层",
      "Declared source assets and frame contracts": "声明式 source assets 与 frame contracts",
      "Proof layer": "证据层",
      "Artifacts, reports, snapshots, rollback state": "Artifacts、reports、snapshots、rollback state",
      "Agent layer": "Agent 层",
      "Schemas, plans, summaries, recipes": "Schemas、plans、summaries、recipes",
      "Project scan and doctor": "Project scan 与 doctor",
      "Detect target shape, validate local state, and surface setup issues before writing files.": "在写入文件前检测目标形态、验证本地状态，并暴露 setup issues。",
      "Image diagnostics": "图片诊断",
      "Analyze alpha, infer frame geometry, run sprite invariants, and apply deterministic presets.": "分析 alpha、推断 frame geometry、运行 sprite invariants，并应用 deterministic presets。",
      "Sprite compile": "Sprite compile",
      "Turn local PNGs and sprite sheets into deterministic artifacts with compact agent summaries.": "将本地 PNG 与 sprite sheets 转换为带 compact agent summaries 的 deterministic artifacts。",
      "Project adapters": "项目适配器",
      "Route Phaser, Godot, LOVE2D, PixiJS, and Canvas through the same adapter registry contract.": "让 Phaser、Godot、LOVE2D、PixiJS 和 Canvas 通过同一个 adapter registry contract。",
      "Safe install plans": "安全安装计划",
      "Preview writes first, refuse accidental overwrites by default, and snapshot files before install.": "先预览写入，默认拒绝意外 overwrite，并在 install 前 snapshot files。",
      "Reports and previews": "报告与预览",
      "Write local reports, visual overlays, frame preview sheets, explicit exports, gallery metadata, and next actions.": "写入 local reports、visual overlays、frame preview sheets、explicit exports、gallery metadata 与 next actions。",
      "Verify and rollback": "验证与回滚",
      "Check installed outputs and undo only the files written by the selected openRender run.": "检查已安装输出，并只撤销所选 openRender run 写入的文件。",
      "Schemas and fixtures": "Schemas 与 fixtures",
      "Ship official schemas, P4 media metadata, built-in recipes, compatibility status, and golden adapter fixtures.": "提供 official schemas、P4 media metadata、built-in recipes、compatibility status 与 golden adapter fixtures。",
      "Agent handoff": "Agent 交接",
      "Leave each run with structured outputs, summaries, recipes, and next actions another agent or developer can continue from.": "让每个 run 都留下 structured outputs、summaries、recipes 与 next actions，供另一个 agent 或 developer 接续。",
      "The missing layer after generation": "生成之后缺少的一层",
      "Image generation creates pixels. Game projects need dependable file contracts, load paths, helper code, inspection, and recovery.": "图像生成创建的是 pixels。游戏项目还需要可靠的 file contracts、load paths、helper code、inspection 与 recovery。",
      "Raw outputs are ambiguous": "Raw outputs 含义不明确",
      "Agents need to infer frame counts, naming, crop boundaries, and where files should live.": "Agents 需要推断 frame counts、naming、crop boundaries 以及文件应该放在哪里。",
      "One-off scripts drift": "一次性 scripts 容易漂移",
      "Every project handoff can become a new custom convention unless the asset package is standardized.": "如果 asset package 没有标准化，每个 project handoff 都可能变成新的 custom convention。",
      "Recovery is usually unclear": "恢复路径通常不清楚",
      "Without snapshots and reports, a failed handoff can leave generated files scattered across the project.": "没有 snapshots 和 reports，失败的 handoff 可能把 generated files 分散留在项目中。",
      "Before": "之前",
      "After": "之后",
      "Loose image file": "松散的图片文件",
      "Useful pixels, but no project contract.": "有用的 pixels，但没有 project contract。",
      "Declared media contract": "声明式 media contract",
      "IDs, frame geometry, output plan, and validation.": "IDs、frame geometry、output plan 与 validation。",
      "Manual placement": "手动放置",
      "Agent guesses paths and helper code.": "Agent 猜测 paths 与 helper code。",
      "Adapter package": "Adapter package",
      "Project-shaped files generated from one contract.": "从一个 contract 生成符合项目形态的文件。",
      "No audit trail": "没有 audit trail",
      "Difficult to review or safely unwind.": "难以 review 或安全 unwind。",
      "Every install leaves proof and a recovery path.": "每次 install 都留下证据与 recovery path。",
      "A run becomes a reviewable package": "一个 run 变成可 review 的 package",
      "openRender outputs are visible by design. An agent can cite paths, a developer can inspect files, and rollback stays scoped to the install.": "openRender output 默认可见。Agent 可以引用 paths，developer 可以检查 files，rollback 也限定在该 install 范围内。",
      "Designed for repeatable agent work": "为可重复的 agent work 设计",
      "The value is not just moving a file. It is giving agents a stable handoff protocol that can be reused across projects and sessions.": "价值不只是移动文件，而是给 agents 一个能跨项目和会话复用的稳定 handoff protocol。",
      "Compiler core": "Compiler core",
      "Turns media into a deterministic package with structured output for agents.": "将 media 变成带 structured output 的 deterministic package。",
      "Adapter layer": "Adapter layer",
      "Separates project conventions from the media contract so support can expand cleanly.": "将 project conventions 与 media contract 分离，让 support 能干净扩展。",
      "Recipe-ready": "Recipe-ready",
      "Captures repeated repair rules and handoff patterns without making local compile metered.": "捕获重复的 repair rules 与 handoff patterns，但不让 local compile 变成 metered。",
      "Focused scope, larger surface area later": "先聚焦范围，之后扩展更大 surface area",
      "Start with reliable image handoff. Expand only when the same contract, report, and rollback model can make richer media safer for agents.": "从可靠 image handoff 开始。只有当同一个 contract、report 与 rollback model 能让更丰富 media 对 agents 更安全时再扩展。",
      "Included": "包含",
      "Image assets, sprite frame sets, Phaser/Godot/LOVE2D/PixiJS/Canvas project files, local reports, fixtures, recipes, MCP metadata, verification, and rollback.": "Image assets、sprite frame sets、Phaser/Godot/LOVE2D/PixiJS/Canvas project files、local reports、fixtures、recipes、MCP metadata、verification 与 rollback。",
      "Boundary": "边界",
      "Generation happens before openRender. The handoff begins once a source media file exists.": "Generation 发生在 openRender 之前。一旦 source media file 存在，handoff 才开始。",
      "A media-to-engine compiler that an AI agent or human developer can run inside a project.": "一个 AI agent 或 human developer 可以在项目内运行的 media-to-engine compiler。",

      "0.6.1 Developer Kit": "0.6.1 开发者工具包",
      "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "面向 Phaser、Godot、LOVE2D、PixiJS 和 Canvas 的 local-first asset handoff，包含 reports、fixtures、recipes、MCP metadata 与 P4 media metadata。",
      "What It Is": "它是什么",
      "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1 将本地 media-to-engine compiler 保持为 free core，并围绕 deterministic adapter output、recipes、fixtures、report export、local gallery metadata、MCP metadata 与 P4 media metadata contracts 扩展 Developer Kit surface。",
      "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "Compiler 接收已有本地图片，并生成 compiled PNG output、install plans、helper files、verification results、frame preview sheets、local reports 与 rollback records。",
      "Field": "字段",
      "Decision": "决策",
      "Product": "产品",
      "Primary user": "主要用户",
      "AI coding agents working inside local game projects": "在本地游戏项目中工作的 AI coding agents",
      "Reference doc": "参考文档",
      "with 0.6.1 implementation status": "包含 0.6.1 实现状态",
      "Adapter model": "适配器模型",
      "Project-specific asset paths, manifests, and helper files": "项目专属 asset paths、manifests 与 helper files",
      "Strategy focus": "策略重点",
      "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "通过 schemas、compact summaries、recipes、packs、updates、support 与 future OEM distribution 节省 agent token",
      "Supported targets": "支持目标",
      "Supported media": "支持媒体",
      "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "Sprite image handoff，加上 audio、atlas/tileset 与 UI contracts 的 deterministic metadata",
      "Local state": "本地状态",
      "Excluded": "不包含",
      "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "Accounts、billing、cloud API、hosted workers、telemetry、model calls、remote sync、默认 runtime execution、video、3D",
      "The Problem": "问题",
      "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "AI agents 能写游戏代码并接收 generated images，但 raw generated media 很少能直接放进 playable project。它需要 normalization、frame validation、project-specific paths、helper code、preview、report 与 rollback boundary。",
      "How openRender Helps": "openRender 如何帮助",
      "Adapter Support": "Adapter 支持",
      "Asset paths:": "Asset paths:",
      "place compiled media where the target project can load it.": "把 compiled media 放到目标项目可加载的位置。",
      "Manifest files:": "Manifest files:",
      "expose stable IDs, dimensions, frame metadata, and load paths.": "暴露 stable IDs、dimensions、frame metadata 与 load paths。",
      "Helper files:": "Helper files:",
      "provide project-facing code for sprite frame sets and animation setup.": "为 sprite frame sets 与 animation setup 提供 project-facing code。",
      "Implemented 0.6.1 Surfaces": "已实现的 0.6.1 Surfaces",
      "Agent-safe CLI:": "Agent-safe CLI:",
      ", and JSON-first output.": "以及 JSON-first output。",
      "Adapter registry:": "Adapter registry:",
      "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser、Godot、LOVE2D、PixiJS 和 Canvas 共享 contract validation、install plans、helper generation、verification 与 fixture coverage。",
      "Image handoff quality:": "Image handoff quality:",
      "alpha diagnostics,": "alpha diagnostics,",
      ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": "、sprite invariants、normalize presets、frame preview sheets、Pixi spritesheet JSON 与 Canvas draw helpers。",
      "Contributor base:": "Contributor base:",
      "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "tracked schemas、recipe validation、adapter scaffolding、fixture capture、compatibility matrix，以及每个 built-in target 至少两个 golden fixtures。",
      "Report system:": "Report system:",
      "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "local reports、explicit report export、local gallery metadata、verification details、helper code、diffs 与 rollback commands。",
      "Agent/MCP surface:": "Agent/MCP surface:",
      "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "一个 local JSON-only MCP metadata package，包含 supported targets 的 tools、resources 与 prompts。",
      "P4 media metadata:": "P4 media metadata:",
      "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "schema-backed audio、atlas/tileset、UI asset metadata 与 runtime smoke availability checks。",
      "Pack Strategy": "Pack 策略",
      "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1 不对 local compile/install usage 收费。Monetization 方向仍是 paid recipe 与 agent packs、update access、support bundles、作为 opt-in future path 的 hosted workers，以及 OEM/platform licensing。",
      "Safety And Privacy": "安全与隐私",
      "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender 不是 hosted platform。默认 workflow 留在目标项目内，避免 network calls，不需要 account，并记录 installed files，以便 openRender change 可 rollback。",

      "Run From Source": "从源码运行",
      "Common Flow": "通用流程",
      "Recipe Direction": "Recipe 方向",
      "Reports And Rollback": "报告与回滚",
      "Use one workflow for every supported engine: initialize, plan, dry-run, install, verify, report, explain, diff, rollback, and reuse recipe context.": "对每个 supported engine 使用同一 workflow：initialize、plan、dry-run、install、verify、report、explain、diff、rollback，并复用 recipe context。",
      "Before packages are published, run the built CLI from the target game project root:": "在 packages 发布前，从目标游戏项目 root 运行已构建的 CLI：",
      "Every engine follows the same safety loop:": "每个 engine 都遵循同一个 safety loop：",
      "Use phaser, godot, or love2d as the target engine.": "将 phaser、godot 或 love2d 作为 target engine。",
      "Phaser output": "Phaser 输出",
      "Godot output": "Godot 输出",
      "LOVE2D output": "LOVE2D 输出",
      "After the dry-run plan looks correct, rerun with --install.": "dry-run plan 看起来正确后，用 --install 重新运行。",
      "Rollback only reverts files managed by the openRender install. It does not revert separate game code edits made by an agent.": "Rollback 只还原 openRender install 管理的文件，不还原 agent 单独修改的游戏代码。",

      "Current Version": "当前版本",
      "Version milestones and implemented Developer Kit surfaces. Last updated: 2026-05-03.": "版本里程碑与已实现的 Developer Kit surfaces。最后更新：2026-05-03。",
      "The current source-of-truth version is the package metadata in package.json and the CLI version returned by openrender --version. Release dates are added when tagged GitHub releases are published.": "当前 source-of-truth version 来自 package.json 的 package metadata 与 openrender --version 返回的 CLI version。Release dates 会在 tagged GitHub releases 发布时添加。",
      "0.6.1 is the current local-first Developer Kit version.": "0.6.1 是当前 local-first Developer Kit version。",
      "0.5.0 Developer Kit Milestone": "0.5.0 Developer Kit 里程碑",
      "0.4.0 Developer Kit Milestone": "0.4.0 Developer Kit 里程碑",
      "Strategy Baseline": "策略基线",
      "Release Checklist": "发布检查清单",
      "The Developer Kit keeps local compile/install usage as the free core. Optional hosted workers, remote pack distribution, license/update infrastructure, support bundles, and OEM/platform licensing are future surfaces, not local core requirements.": "Developer Kit 将 local compile/install usage 保持为 free core。Optional hosted workers、remote pack distribution、license/update infrastructure、support bundles 与 OEM/platform licensing 是 future surfaces，不是 local core requirements。",

      "Supported": "支持",
      "Rejected": "拒绝",
      "Targets": "目标",
      "JSON-first Contract": "JSON-first 契约",
      "Image Handoff Commands": "Image Handoff 命令",
      "Pack And Recipe Commands": "Pack 与 Recipe 命令",
      "Not Implemented As Commands": "未作为命令实现",
      "Media Contract Types": "Media Contract 类型",
      "Engine Asset Descriptor": "Engine Asset Descriptor",
      "Compile Output Fields": "Compile 输出字段",
      "Built-in Pack Manifest": "Built-in Pack Manifest",
      "Phaser Output Shape": "Phaser 输出形态",
      "Godot Output Shape": "Godot 输出形态",
      "LOVE2D Output Shape": "LOVE2D 输出形态",
      "Positioning": "定位",
      "Current Truth": "当前事实",
      "Page Style": "页面风格",
      "Recommended Content Order": "推荐内容顺序",
      "Supported media: image assets only.": "支持媒体：仅 image assets。",
      "Supported engines: Vite + Phaser, Godot 4, and LOVE2D.": "支持引擎：Vite + Phaser、Godot 4 与 LOVE2D。",
      "Supported": "支持",
      "Intentionally Out Of Scope": "明确超出范围",
      "Runtime Boundary": "Runtime 边界",
      "Privacy Policy": "隐私政策",
      "What openRender Processes": "openRender 处理什么",
      "Data Collection": "数据收集",
      "Local Reports": "本地报告",
      "Contact": "联系",
      "Use Of openRender": "openRender 的使用",
      "Generated Media": "生成媒体",
      "Local Project Changes": "本地项目更改",
      "License And Warranty": "许可证与担保",
      "Changes": "变更"
    },

    ja: {},
    ko: {},
    es: {}
  };

  Object.assign(dictionary.ko, {
    "Documentation": "문서",
    "Start": "시작",
    "Docs": "문서",
    "Overview": "개요",
    "Quickstart": "빠른 시작",
    "Release History": "릴리스 기록",
    "Reference": "레퍼런스",
    "CLI Reference": "CLI 레퍼런스",
    "Contracts": "계약",
    "Agent Usage": "Agent 사용",
    "Troubleshooting": "문제 해결",
    "Boundaries": "경계",
    "Privacy Policy": "개인정보 처리방침",
    "Terms & Conditions": "이용약관",
    "openRender docs": "openRender 문서",
    "official document": "공식 문서",
    "Skip to main content": "본문으로 건너뛰기",
    "Read the technical scope": "기술 범위 보기",
    "Copy": "복사",
    "Token saver for AI game development.": "AI 게임 개발을 위한 토큰 절감 도구.",
    "openRender helps AI agents spend fewer tokens turning generated game art into working project files. It packages images with engine-ready paths, helper code, checks, reports, and rollback records, so agents can stop guessing and start building.": "openRender는 AI 에이전트가 생성된 게임 아트를 실제 프로젝트 파일로 바꿀 때 쓰는 토큰을 줄여줍니다. 이미지를 엔진에서 바로 쓸 수 있는 경로, 헬퍼 코드, 검사 결과, 리포트, 롤백 기록으로 묶어 에이전트가 추측을 줄이고 바로 개발을 이어가게 합니다.",
    "Local by default": "기본 로컬 실행",
    "Agent-readable JSON": "에이전트가 읽기 쉬운 JSON",
    "Report and rollback": "리포트와 롤백",
    "Asset handoff map": "애셋 인계 지도",
    "one source image to verified project files": "하나의 소스 이미지를 검증 가능한 프로젝트 파일로",
    "verified": "검증됨",
    "Source media": "소스 미디어",
    "local generated image or sprite sheet": "로컬 생성 이미지 또는 스프라이트 시트",
    "Contract": "계약",
    "dimensions, frames, IDs, install intent": "크기, 프레임, ID, 설치 의도",
    "Adapter": "어댑터",
    "project paths, manifest, helper shape": "프로젝트 경로, 매니페스트, 헬퍼 구조",
    "Package": "패키지",
    "files written with snapshots": "스냅샷과 함께 기록되는 파일",
    "Proof": "증거",
    "verify, report, rollback handle": "검증, 리포트, 롤백 핸들",
    "What agents save with openRender": "openRender가 에이전트에게 줄여주는 것",
    "openRender turns a noisy asset handoff into compact, repeatable project evidence. Agents read less context, make fewer guesses, and leave a safer trail for the next iteration.": "openRender는 산만한 애셋 인계를 작고 반복 가능한 프로젝트 증거로 바꿉니다. 에이전트는 더 적은 맥락을 읽고, 덜 추측하며, 다음 반복을 위한 안전한 흔적을 남깁니다.",
    "Token efficiency": "토큰 효율",
    "Est. 56%": "추정 56%",
    "fewer handoff tokens": "인계 토큰 절감",
    "Agents read compact JSON contracts instead of re-describing frame geometry, load paths, helper files, reports, and recovery steps.": "에이전트는 프레임 구조, 로드 경로, 헬퍼 파일, 리포트, 복구 단계를 다시 설명하지 않고 압축된 JSON 계약을 읽습니다.",
    "Local estimate: 188-token manual handoff brief vs 83-token openRender summary, using chars/4 token approximation.": "로컬 추산: 문자 4개를 토큰 1개로 보는 근사 기준으로, 수동 인계 요약 188토큰 대비 openRender 요약 83토큰입니다.",
    "Decision reduction": "의사결정 감소",
    "9 steps": "9단계",
    "automated in one loop": "한 번의 루프로 자동화",
    "Scan, frame detection, contract validation, output planning, helper generation, install, verify, report, and rollback are handled as one repeatable handoff path.": "스캔, 프레임 감지, 계약 검증, 출력 계획, 헬퍼 생성, 설치, 검증, 리포트, 롤백이 하나의 반복 가능한 인계 경로로 처리됩니다.",
    "Counted from the implemented local workflow surface, not from a fixed number of supported engines.": "고정된 지원 엔진 수가 아니라 구현된 로컬 워크플로 범위를 기준으로 계산했습니다.",
    "Recovery confidence": "복구 신뢰도",
    "1 run ID": "run ID 1개",
    "to verify, report, or rollback": "검증, 리포트, 롤백까지",
    "Each install leaves proof: generated files, checks, preview sheets, report output, diff context, and a rollback command for recovery.": "각 설치는 생성 파일, 검사 결과, 프리뷰 시트, 리포트 출력, 차이점 맥락, 복구용 롤백 명령을 증거로 남깁니다.",
    "Failure paths become short next actions instead of another long debugging thread.": "실패 경로는 긴 디버깅 대화가 아니라 짧은 다음 작업으로 정리됩니다.",
    "Handoff core": "핸드오프 핵심",
    "openRender is built around repeatable local surfaces: understand the project, diagnose the image, compile the media package, install it safely, and leave proof for the next agent or developer.": "openRender는 반복 가능한 로컬 작업면을 중심으로 구성됩니다. 프로젝트를 이해하고, 이미지를 진단하고, 미디어 패키지를 컴파일하고, 안전하게 설치하며, 다음 에이전트나 개발자를 위한 증거를 남깁니다.",
    "Project layer": "프로젝트 계층",
    "Adapter-shaped project output": "어댑터 형태의 프로젝트 출력",
    "Media layer": "미디어 계층",
    "Declared source assets and frame contracts": "선언된 소스 애셋과 프레임 계약",
    "Proof layer": "증거 계층",
    "Artifacts, reports, snapshots, rollback state": "산출물, 리포트, 스냅샷, 롤백 상태",
    "Agent layer": "에이전트 계층",
    "Schemas, plans, summaries, recipes": "스키마, 계획, 요약, 레시피",
    "Project scan and doctor": "프로젝트 스캔과 진단",
    "Detect target shape, validate local state, and surface setup issues before writing files.": "파일을 쓰기 전에 대상 구조를 감지하고, 로컬 상태를 검증하며, 설정 문제를 드러냅니다.",
    "Image diagnostics": "이미지 진단",
    "Analyze alpha, infer frame geometry, run sprite invariants, and apply deterministic presets.": "알파 채널을 분석하고, 프레임 구조를 추론하고, 스프라이트 불변 조건을 검사하며, 결정적 프리셋을 적용합니다.",
    "Sprite compile": "스프라이트 컴파일",
    "Turn local PNGs and sprite sheets into deterministic artifacts with compact agent summaries.": "로컬 PNG와 스프라이트 시트를 압축된 에이전트 요약이 포함된 결정적 산출물로 바꿉니다.",
    "Project adapters": "프로젝트 어댑터",
    "Route Phaser, Godot, LOVE2D, PixiJS, and Canvas through the same adapter registry contract.": "Phaser, Godot, LOVE2D, PixiJS, Canvas를 같은 어댑터 레지스트리 계약으로 라우팅합니다.",
    "Safe install plans": "안전한 설치 계획",
    "Preview writes first, refuse accidental overwrites by default, and snapshot files before install.": "먼저 기록될 파일을 미리 보여주고, 의도치 않은 덮어쓰기를 기본적으로 거부하며, 설치 전에 파일 스냅샷을 남깁니다.",
    "Reports and previews": "리포트와 프리뷰",
    "Write local reports, visual overlays, frame preview sheets, explicit exports, gallery metadata, and next actions.": "로컬 리포트, 시각 오버레이, 프레임 미리보기 시트, 명시적 내보내기, 갤러리 메타데이터, 다음 작업을 기록합니다.",
    "Verify and rollback": "검증과 롤백",
    "Check installed outputs and undo only the files written by the selected openRender run.": "설치된 출력을 확인하고 선택한 openRender 실행이 쓴 파일만 되돌립니다.",
    "Schemas and fixtures": "스키마와 고정 테스트 자료",
    "Ship official schemas, P4 media metadata, built-in recipes, compatibility status, and golden adapter fixtures.": "공식 스키마, P4 미디어 메타데이터, 내장 레시피, 호환성 상태, 기준 어댑터 테스트 자료를 제공합니다.",
    "Agent handoff": "에이전트 인계",
    "Leave each run with structured outputs, summaries, recipes, and next actions another agent or developer can continue from.": "각 실행에 구조화된 출력, 요약, 레시피, 다음 작업을 남겨 다른 에이전트나 개발자가 이어갈 수 있게 합니다.",
    "The missing layer after generation": "생성 이후에 빠져 있는 계층",
    "Image generation creates pixels. Game projects need dependable file contracts, load paths, helper code, inspection, and recovery.": "이미지 생성은 픽셀을 만듭니다. 게임 프로젝트에는 신뢰할 수 있는 파일 계약, 로드 경로, 헬퍼 코드, 검사, 복구가 필요합니다.",
    "Raw outputs are ambiguous": "원본 출력은 모호합니다",
    "Agents need to infer frame counts, naming, crop boundaries, and where files should live.": "에이전트는 프레임 수, 이름, 크롭 경계, 파일이 들어갈 위치를 추론해야 합니다.",
    "One-off scripts drift": "일회성 스크립트는 쉽게 흔들립니다",
    "Every project handoff can become a new custom convention unless the asset package is standardized.": "애셋 패키지가 표준화되지 않으면 모든 프로젝트 인계가 새로운 임시 규칙이 될 수 있습니다.",
    "Recovery is usually unclear": "복구는 보통 불명확합니다",
    "Without snapshots and reports, a failed handoff can leave generated files scattered across the project.": "스냅샷과 리포트가 없으면 실패한 인계가 생성 파일을 프로젝트 곳곳에 흩어 놓을 수 있습니다.",
    "Before": "이전",
    "After": "이후",
    "Loose image file": "느슨한 이미지 파일",
    "Useful pixels, but no project contract.": "쓸 수 있는 픽셀은 있지만 프로젝트 계약은 없습니다.",
    "Declared media contract": "선언된 미디어 계약",
    "IDs, frame geometry, output plan, and validation.": "ID, 프레임 구조, 출력 계획, 검증.",
    "Manual placement": "수동 배치",
    "Agent guesses paths and helper code.": "에이전트가 경로와 헬퍼 코드를 추측합니다.",
    "Adapter package": "어댑터 패키지",
    "Project-shaped files generated from one contract.": "하나의 계약에서 프로젝트 형태의 파일이 생성됩니다.",
    "No audit trail": "감사 흔적 없음",
    "Difficult to review or safely unwind.": "검토하거나 안전하게 되돌리기 어렵습니다.",
    "Every install leaves proof and a recovery path.": "모든 설치는 증거와 복구 경로를 남깁니다.",
    "A run becomes a reviewable package": "실행 하나가 검토 가능한 패키지가 됩니다",
    "openRender outputs are visible by design. An agent can cite paths, a developer can inspect files, and rollback stays scoped to the install.": "openRender 출력은 의도적으로 확인하기 쉽게 설계되어 있습니다. 에이전트는 경로를 인용할 수 있고, 개발자는 파일을 검사할 수 있으며, 롤백은 설치 범위에 머뭅니다.",
    "Designed for repeatable agent work": "반복 가능한 에이전트 작업을 위해 설계",
    "The value is not just moving a file. It is giving agents a stable handoff protocol that can be reused across projects and sessions.": "가치는 단순히 파일을 옮기는 것이 아닙니다. 에이전트에게 프로젝트와 세션을 넘어 재사용 가능한 안정적인 인계 프로토콜을 주는 것입니다.",
    "Compiler core": "컴파일러 핵심",
    "Turns media into a deterministic package with structured output for agents.": "미디어를 에이전트용 구조화 출력이 포함된 결정적 패키지로 바꿉니다.",
    "Adapter layer": "어댑터 계층",
    "Separates project conventions from the media contract so support can expand cleanly.": "프로젝트 규칙을 미디어 계약에서 분리해 지원 범위를 깔끔하게 확장할 수 있게 합니다.",
    "Recipe-ready": "레시피 준비",
    "Captures repeated repair rules and handoff patterns without making local compile metered.": "로컬 컴파일을 과금 대상으로 만들지 않으면서 반복되는 복구 규칙과 인계 패턴을 포착합니다.",
    "Focused scope, larger surface area later": "먼저 집중된 범위, 이후 더 넓은 기능면",
    "Start with reliable image handoff. Expand only when the same contract, report, and rollback model can make richer media safer for agents.": "신뢰 가능한 이미지 인계부터 시작합니다. 같은 계약, 리포트, 롤백 모델이 더 풍부한 미디어를 에이전트에게 더 안전하게 만들 수 있을 때만 확장합니다.",
    "Included": "포함",
    "Image assets, sprite frame sets, Phaser/Godot/LOVE2D/PixiJS/Canvas project files, local reports, fixtures, recipes, MCP metadata, verification, and rollback.": "이미지 애셋, 스프라이트 프레임 세트, Phaser/Godot/LOVE2D/PixiJS/Canvas 프로젝트 파일, 로컬 리포트, 고정 테스트 자료, 레시피, MCP 메타데이터, 검증, 롤백.",
    "Boundary": "경계",
    "Generation happens before openRender. The handoff begins once a source media file exists.": "생성은 openRender 이전에 일어납니다. 소스 미디어 파일이 존재하는 순간 인계가 시작됩니다.",
    "A media-to-engine compiler that an AI agent or human developer can run inside a project.": "AI 에이전트나 사람 개발자가 프로젝트 안에서 실행할 수 있는 미디어-엔진 컴파일러.",

    "0.6.1 Developer Kit": "0.6.1 개발자 키트",
    "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "Phaser, Godot, LOVE2D, PixiJS, Canvas를 위한 로컬 우선 애셋 인계입니다. 리포트, 검증용 고정 테스트 자료, 레시피, MCP 메타데이터, P4 미디어 메타데이터를 포함합니다.",
    "What It Is": "무엇인가",
    "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1은 로컬 미디어를 엔진용 파일로 바꾸는 컴파일러를 무료 핵심 기능으로 유지하면서, 결정적인 어댑터 출력, 레시피, 검증용 고정 테스트 자료, 리포트 내보내기, 로컬 갤러리 메타데이터, MCP 메타데이터, P4 미디어 메타데이터 계약을 중심으로 개발자 키트의 범위를 확장합니다.",
    "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "컴파일러는 기존 로컬 이미지를 받아 컴파일된 PNG 출력, 설치 계획, 헬퍼 파일, 검증 결과, 프레임 미리보기 시트, 로컬 리포트, 롤백 기록을 생성합니다.",
    "Field": "항목",
    "Decision": "결정",
    "Product": "제품",
    "Primary user": "주요 사용자",
    "AI coding agents working inside local game projects": "로컬 게임 프로젝트 안에서 작업하는 AI 코딩 에이전트",
    "Reference doc": "참조 문서",
    "with 0.6.1 implementation status": "0.6.1 구현 상태 포함",
    "Adapter model": "어댑터 모델",
    "Project-specific asset paths, manifests, and helper files": "프로젝트별 애셋 경로, 매니페스트, 헬퍼 파일",
    "Strategy focus": "전략 초점",
    "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "스키마, 압축 요약, 레시피, 팩, 업데이트, 지원, 향후 OEM 배포를 통한 에이전트 토큰 절감",
    "Supported targets": "지원 대상",
    "Supported media": "지원 미디어",
    "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "스프라이트 이미지 인계와 오디오, 아틀라스/타일셋, UI 계약을 위한 결정적 메타데이터",
    "Local state": "로컬 상태",
    "Excluded": "제외",
    "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "계정, 결제, 클라우드 API, 호스팅 워커, 텔레메트리, 모델 호출, 원격 동기화, 기본 런타임 실행, 비디오, 3D",
    "The Problem": "문제",
    "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "AI 에이전트는 게임 코드를 작성하고 생성 이미지를 받을 수 있지만, 원본 생성 미디어가 플레이 가능한 프로젝트에 깔끔하게 들어가는 경우는 드뭅니다. 정규화, 프레임 검증, 프로젝트별 경로, 헬퍼 코드, 미리보기, 리포트, 롤백 경계가 필요합니다.",
    "How openRender Helps": "openRender가 돕는 방식",
    "Adapter Support": "어댑터 지원",
    "Asset paths:": "애셋 경로:",
    "place compiled media where the target project can load it.": "대상 프로젝트가 불러올 수 있는 위치에 컴파일된 미디어를 배치합니다.",
    "Manifest files:": "매니페스트 파일:",
    "expose stable IDs, dimensions, frame metadata, and load paths.": "안정적인 ID, 크기, 프레임 메타데이터, 로드 경로를 노출합니다.",
    "Helper files:": "헬퍼 파일:",
    "provide project-facing code for sprite frame sets and animation setup.": "스프라이트 프레임 세트와 애니메이션 설정을 위한 프로젝트용 코드를 제공합니다.",
    "Implemented 0.6.1 Surfaces": "구현된 0.6.1 기능 범위",
    "Agent-safe CLI:": "에이전트 안전 CLI:",
    ", and JSON-first output.": "및 JSON 우선 출력입니다.",
    "Adapter registry:": "어댑터 레지스트리:",
    "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser, Godot, LOVE2D, PixiJS, Canvas는 계약 검증, 설치 계획, 헬퍼 생성, 검증, 고정 테스트 자료 적용 범위를 공유합니다.",
    "Image handoff quality:": "이미지 인계 품질:",
    "alpha diagnostics,": "알파 채널 진단,",
    ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": ", 스프라이트 불변 조건, 정규화 프리셋, 프레임 미리보기 시트, Pixi 스프라이트시트 JSON, Canvas 그리기 헬퍼.",
    "Contributor base:": "기여자 기반:",
    "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "추적되는 스키마, 레시피 검증, 어댑터 템플릿 생성, 고정 테스트 자료 캡처, 호환성 매트릭스, 내장 대상별 최소 두 개의 기준 테스트 자료.",
    "Report system:": "리포트 시스템:",
    "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "로컬 리포트, 명시적 리포트 내보내기, 로컬 갤러리 메타데이터, 검증 상세, 헬퍼 코드, 차이점, 롤백 명령.",
    "Agent/MCP surface:": "Agent/MCP 기능 범위:",
    "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "지원 대상용 도구, 리소스, 프롬프트를 담은 로컬 JSON 전용 MCP 메타데이터 패키지입니다.",
    "P4 media metadata:": "P4 미디어 메타데이터:",
    "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "스키마 기반 오디오, 아틀라스/타일셋, UI 애셋 메타데이터, 런타임 간이 검사 가용성 확인.",
    "Pack Strategy": "팩 전략",
    "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1은 로컬 컴파일/설치 사용에 과금하지 않습니다. 수익화 방향은 유료 레시피와 에이전트 팩, 업데이트 접근권, 지원 번들, 선택형 미래 경로로서의 호스팅 워커, OEM/플랫폼 라이선싱입니다.",
    "Safety And Privacy": "안전과 개인정보",
    "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender는 호스팅 플랫폼이 아닙니다. 기본 워크플로는 대상 프로젝트 안에 머물고, 네트워크 호출을 피하며, 계정을 요구하지 않고, openRender 변경 사항을 롤백할 수 있도록 설치된 파일을 기록합니다.",

    "Run From Source": "소스에서 실행",
    "Common Flow": "공통 흐름",
    "Recipe Direction": "Recipe 방향",
    "Reports And Rollback": "리포트와 롤백",
    "Use one workflow for every supported engine: initialize, plan, dry-run, install, verify, report, explain, diff, rollback, and reuse recipe context.": "모든 supported engine에 하나의 workflow를 사용합니다: initialize, plan, dry-run, install, verify, report, explain, diff, rollback, 그리고 recipe context 재사용.",
    "The 0.3.1 direction keeps this local loop as the free core and uses recipes or packs only to reduce repeated agent context, helper drift, and repair work.": "0.3.1 방향은 이 local loop를 free core로 유지하고, recipes 또는 packs는 repeated agent context, helper drift, repair work를 줄이는 데만 사용합니다.",
    "Before packages are published, run the built CLI from the target game project root:": "packages가 배포되기 전에는 target game project root에서 built CLI를 실행합니다:",
    "Every engine follows the same safety loop:": "모든 engine은 같은 safety loop를 따릅니다:",
    "Use phaser, godot, or love2d as the target engine.": "target engine으로 phaser, godot 또는 love2d를 사용합니다.",
    "Phaser output": "Phaser output",
    "Godot output": "Godot output",
    "LOVE2D output": "LOVE2D output",
    "After the dry-run plan looks correct, rerun with --install.": "dry-run plan이 맞아 보이면 --install로 다시 실행합니다.",
    "Rollback only reverts files managed by the openRender install. It does not revert separate game code edits made by an agent.": "Rollback은 openRender install이 관리한 파일만 되돌립니다. agent가 별도로 수정한 게임 코드 edits는 되돌리지 않습니다.",

    "Current Version": "현재 버전",
    "Version milestones and implemented Developer Kit surfaces. Last updated: 2026-05-03.": "버전 마일스톤과 구현된 Developer Kit surfaces입니다. 마지막 업데이트: 2026-05-03.",
    "The current source-of-truth version is the package metadata in package.json and the CLI version returned by openrender --version. Release dates are added when tagged GitHub releases are published.": "현재 source-of-truth version은 package.json의 package metadata와 openrender --version이 반환하는 CLI version입니다. tagged GitHub releases가 게시되면 release dates가 추가됩니다.",
    "0.6.1 is the current local-first Developer Kit version.": "0.6.1은 현재 local-first Developer Kit version입니다.",
    "0.5.0 Developer Kit Milestone": "0.5.0 Developer Kit 마일스톤",
    "0.4.0 Developer Kit Milestone": "0.4.0 Developer Kit 마일스톤",
    "Strategy Baseline": "전략 기준",
    "Release Checklist": "릴리스 체크리스트",
    "The Developer Kit keeps local compile/install usage as the free core. Optional hosted workers, remote pack distribution, license/update infrastructure, support bundles, and OEM/platform licensing are future surfaces, not local core requirements.": "Developer Kit은 local compile/install usage를 free core로 유지합니다. Optional hosted workers, remote pack distribution, license/update infrastructure, support bundles, OEM/platform licensing은 future surfaces이며 local core requirements가 아닙니다.",

    "Supported": "지원",
    "Rejected": "거부",
    "Targets": "대상",
    "JSON-first Contract": "JSON-first 계약",
    "Image Handoff Commands": "Image Handoff 명령",
    "Pack And Recipe Commands": "Pack과 Recipe 명령",
    "Not Implemented As Commands": "명령으로 구현되지 않음",
    "Media Contract Types": "Media Contract Types",
    "Engine Asset Descriptor": "Engine Asset Descriptor",
    "Compile Output Fields": "Compile Output Fields",
    "Built-in Pack Manifest": "Built-in Pack Manifest",
    "Phaser Output Shape": "Phaser Output Shape",
    "Godot Output Shape": "Godot Output Shape",
    "LOVE2D Output Shape": "LOVE2D Output Shape",
    "Positioning": "포지셔닝",
    "Current Truth": "현재 사실",
    "Page Style": "페이지 스타일",
    "Recommended Content Order": "권장 콘텐츠 순서",
    "Supported media: image assets only.": "지원 미디어: image assets only.",
    "Supported engines: Vite + Phaser, Godot 4, and LOVE2D.": "지원 엔진: Vite + Phaser, Godot 4, LOVE2D.",
    "Intentionally Out Of Scope": "의도적으로 제외",
    "Runtime Boundary": "Runtime 경계",
    "What openRender Processes": "openRender가 처리하는 것",
    "Data Collection": "데이터 수집",
    "Local Reports": "로컬 리포트",
    "Contact": "문의",
    "Use Of openRender": "openRender 사용",
    "Generated Media": "생성된 미디어",
    "Local Project Changes": "로컬 프로젝트 변경",
    "License And Warranty": "라이선스와 보증",
    "Changes": "변경 사항"
  });

  Object.assign(dictionary.ja, {
    "Documentation": "ドキュメント",
    "Start": "開始",
    "Docs": "ドキュメント",
    "Overview": "概要",
    "Quickstart": "クイックスタート",
    "Release History": "リリース履歴",
    "Reference": "リファレンス",
    "CLI Reference": "CLI リファレンス",
    "Contracts": "コントラクト",
    "Agent Usage": "エージェント利用",
    "Troubleshooting": "トラブルシューティング",
    "Boundaries": "境界",
    "Privacy Policy": "プライバシーポリシー",
    "Terms & Conditions": "利用規約",
    "openRender docs": "openRender ドキュメント",
    "official document": "公式ドキュメント",
    "Skip to main content": "メインコンテンツへ移動",
    "Read the technical scope": "技術スコープを見る",
    "Copy": "コピー",
    "Token saver for AI game development.": "AI ゲーム開発のためのトークン節約ツール。",
    "What agents save with openRender": "openRender で agents が節約できるもの",
    "Handoff core": "受け渡しコア",
    "The missing layer after generation": "生成後に足りない層",
    "0.6.1 Developer Kit": "0.6.1 開発者キット",
    "What It Is": "これは何か",
    "The Problem": "課題",
    "How openRender Helps": "openRender が役立つ方法",
    "Pack Strategy": "Pack 戦略",
    "Safety And Privacy": "安全性とプライバシー",
    "Run From Source": "ソースから実行",
    "Common Flow": "共通フロー",
    "Recipe Direction": "Recipe の方向性",
    "Reports And Rollback": "レポートとロールバック",
    "Current Version": "現在のバージョン",
    "Release Checklist": "リリースチェックリスト",
    "Strategy Baseline": "戦略ベースライン",
    "Supported": "対応",
    "Rejected": "拒否",
    "Positioning": "ポジショニング",
    "Current Truth": "現在の事実",
    "Page Style": "ページスタイル",
    "Recommended Content Order": "推奨コンテンツ順序",
    "Intentionally Out Of Scope": "意図的な対象外",
    "Runtime Boundary": "Runtime 境界",
    "What openRender Processes": "openRender が処理するもの",
    "Data Collection": "データ収集",
    "Local Reports": "ローカルレポート",
    "Contact": "連絡先",
    "Use Of openRender": "openRender の利用",
    "Generated Media": "生成メディア",
    "Local Project Changes": "ローカルプロジェクト変更",
    "License And Warranty": "ライセンスと保証",
    "Changes": "変更"
  });

  Object.assign(dictionary.es, {
    "Documentation": "Documentación",
    "Start": "Inicio",
    "Docs": "Docs",
    "Overview": "Resumen",
    "Quickstart": "Inicio rápido",
    "Release History": "Historial de releases",
    "Reference": "Referencia",
    "CLI Reference": "Referencia CLI",
    "Contracts": "Contratos",
    "Agent Usage": "Uso con agents",
    "Troubleshooting": "Solución de problemas",
    "Boundaries": "Límites",
    "Privacy Policy": "Política de privacidad",
    "Terms & Conditions": "Términos y condiciones",
    "openRender docs": "Docs de openRender",
    "official document": "documento oficial",
    "Skip to main content": "Saltar al contenido principal",
    "Read the technical scope": "Leer el alcance técnico",
    "Copy": "Copiar",
    "Token saver for AI game development.": "Economizador de tokens para desarrollo de juegos con IA.",
    "What agents save with openRender": "Lo que los agents ahorran con openRender",
    "Handoff core": "Núcleo del handoff",
    "The missing layer after generation": "La capa que falta después de generar",
    "0.6.1 Developer Kit": "Kit para desarrolladores 0.6.1",
    "What It Is": "Qué es",
    "The Problem": "El problema",
    "How openRender Helps": "Cómo ayuda openRender",
    "Pack Strategy": "Estrategia de packs",
    "Safety And Privacy": "Seguridad y privacidad",
    "Run From Source": "Ejecutar desde el código fuente",
    "Common Flow": "Flujo común",
    "Recipe Direction": "Dirección de recipes",
    "Reports And Rollback": "Reportes y rollback",
    "Current Version": "Versión actual",
    "Release Checklist": "Checklist de release",
    "Strategy Baseline": "Base estratégica",
    "Supported": "Soportado",
    "Rejected": "Rechazado",
    "Positioning": "Posicionamiento",
    "Current Truth": "Estado actual",
    "Page Style": "Estilo de página",
    "Recommended Content Order": "Orden recomendado del contenido",
    "Intentionally Out Of Scope": "Fuera de alcance intencionalmente",
    "Runtime Boundary": "Límite de runtime",
    "What openRender Processes": "Qué procesa openRender",
    "Data Collection": "Recolección de datos",
    "Local Reports": "Reportes locales",
    "Contact": "Contacto",
    "Use Of openRender": "Uso de openRender",
    "Generated Media": "Media generado",
    "Local Project Changes": "Cambios en el proyecto local",
    "License And Warranty": "Licencia y garantía",
    "Changes": "Cambios"
  });

  Object.assign(dictionary.zh, {
    "0.6.1 Developer Kit - openRender Docs": "0.6.1 开发者工具包 - openRender 文档",
    "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "面向 Phaser、Godot、LOVE2D、PixiJS 和 Canvas 的本地优先资产交接，包含报告、验证夹具、配方、MCP 元数据和 P4 媒体元数据。",
    "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1 将本地媒体转引擎编译器保留为免费核心，并围绕确定性的适配器输出、配方、验证夹具、报告导出、本地图库元数据、MCP 元数据和 P4 媒体元数据契约扩展开发者工具包。",
    "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "编译器接收已有的本地图片，并生成编译后的 PNG 输出、安装计划、辅助文件、验证结果、帧预览表、本地报告和回滚记录。",
    "AI coding agents working inside local game projects": "在本地游戏项目中工作的 AI 编程代理",
    "Project-specific asset paths, manifests, and helper files": "项目专属的资产路径、清单和辅助文件",
    "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "通过模式、紧凑摘要、配方、包、更新、支持和未来 OEM 分发节省代理 token",
    "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "精灵图片交接，以及音频、图集/图块集和 UI 契约的确定性元数据",
    "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "账户、计费、云 API、托管工作器、遥测、模型调用、远程同步、默认运行时执行、视频、3D",
    "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "AI 代理可以编写游戏代码并接收生成图片，但原始生成媒体很少能直接干净地进入可玩的项目。它需要规范化、帧验证、项目专属路径、辅助代码、预览、报告和回滚边界。",
    "Asset paths:": "资产路径：",
    "place compiled media where the target project can load it.": "将编译后的媒体放在目标项目能够加载的位置。",
    "Manifest files:": "清单文件：",
    "expose stable IDs, dimensions, frame metadata, and load paths.": "暴露稳定 ID、尺寸、帧元数据和加载路径。",
    "Helper files:": "辅助文件：",
    "provide project-facing code for sprite frame sets and animation setup.": "为精灵帧集合和动画设置提供面向项目的代码。",
    "Implemented 0.6.1 Surfaces": "已实现的 0.6.1 能力面",
    "Agent-safe CLI:": "代理安全 CLI：",
    ", and JSON-first output.": "，以及 JSON 优先输出。",
    "Adapter registry:": "适配器注册表：",
    "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser、Godot、LOVE2D、PixiJS 和 Canvas 共享契约验证、安装计划、辅助代码生成、验证和夹具覆盖。",
    "Image handoff quality:": "图片交接质量：",
    "alpha diagnostics,": "透明通道诊断、",
    ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": "、精灵不变量、规范化预设、帧预览表、Pixi 精灵表 JSON 和 Canvas 绘制辅助函数。",
    "Contributor base:": "贡献者基础：",
    "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "已跟踪的模式、配方验证、适配器脚手架、夹具采集、兼容性矩阵，以及每个内置目标至少两个基准夹具。",
    "Report system:": "报告系统：",
    "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "本地报告、显式报告导出、本地图库元数据、验证详情、辅助代码、差异和回滚命令。",
    "Agent/MCP surface:": "Agent/MCP 能力面：",
    "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "一个本地 JSON 专用 MCP 元数据包，为支持目标提供工具、资源和提示词。",
    "P4 media metadata:": "P4 媒体元数据：",
    "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "基于模式的音频、图集/图块集、UI 资产元数据和运行时冒烟可用性检查。",
    "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1 不对本地编译/安装使用收费。商业化方向仍是付费配方与代理包、更新访问、支持包、作为可选未来路径的托管工作器，以及 OEM/平台授权。",
    "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender 不是托管平台。默认工作流留在目标项目内，避免网络调用，不需要账户，并记录已安装文件，让 openRender 的更改可以回滚。"
  });

  Object.assign(dictionary.ko, {
    "0.6.1 Developer Kit - openRender Docs": "0.6.1 개발자 키트 - openRender 문서",
    "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "Phaser, Godot, LOVE2D, PixiJS, Canvas를 위한 로컬 우선 애셋 인계입니다. 리포트, 검증용 고정 테스트 자료, 레시피, MCP 메타데이터, P4 미디어 메타데이터를 포함합니다.",
    "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1은 로컬 미디어를 엔진용 파일로 바꾸는 컴파일러를 무료 핵심 기능으로 유지하면서, 결정적인 어댑터 출력, 레시피, 검증용 고정 테스트 자료, 리포트 내보내기, 로컬 갤러리 메타데이터, MCP 메타데이터, P4 미디어 메타데이터 계약을 중심으로 개발자 키트의 범위를 확장합니다.",
    "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "컴파일러는 기존 로컬 이미지를 받아 컴파일된 PNG 출력, 설치 계획, 헬퍼 파일, 검증 결과, 프레임 미리보기 시트, 로컬 리포트, 롤백 기록을 생성합니다.",
    "AI coding agents working inside local game projects": "로컬 게임 프로젝트 안에서 작업하는 AI 코딩 에이전트",
    "Project-specific asset paths, manifests, and helper files": "프로젝트별 애셋 경로, 매니페스트, 헬퍼 파일",
    "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "스키마, 압축 요약, 레시피, 팩, 업데이트, 지원, 향후 OEM 배포를 통한 에이전트 토큰 절감",
    "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "스프라이트 이미지 인계와 오디오, 아틀라스/타일셋, UI 계약을 위한 결정적 메타데이터",
    "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "계정, 결제, 클라우드 API, 호스팅 워커, 텔레메트리, 모델 호출, 원격 동기화, 기본 런타임 실행, 비디오, 3D",
    "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "AI 에이전트는 게임 코드를 작성하고 생성 이미지를 받을 수 있지만, 원본 생성 미디어가 플레이 가능한 프로젝트에 깔끔하게 들어가는 경우는 드뭅니다. 정규화, 프레임 검증, 프로젝트별 경로, 헬퍼 코드, 미리보기, 리포트, 롤백 경계가 필요합니다.",
    "Asset paths:": "애셋 경로:",
    "place compiled media where the target project can load it.": "대상 프로젝트가 불러올 수 있는 위치에 컴파일된 미디어를 배치합니다.",
    "Manifest files:": "매니페스트 파일:",
    "expose stable IDs, dimensions, frame metadata, and load paths.": "안정적인 ID, 크기, 프레임 메타데이터, 로드 경로를 노출합니다.",
    "Helper files:": "헬퍼 파일:",
    "provide project-facing code for sprite frame sets and animation setup.": "스프라이트 프레임 세트와 애니메이션 설정을 위한 프로젝트용 코드를 제공합니다.",
    "Implemented 0.6.1 Surfaces": "구현된 0.6.1 기능 범위",
    "Agent-safe CLI:": "에이전트 안전 CLI:",
    ", and JSON-first output.": " 및 JSON 우선 출력입니다.",
    "Adapter registry:": "어댑터 레지스트리:",
    "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser, Godot, LOVE2D, PixiJS, Canvas는 계약 검증, 설치 계획, 헬퍼 생성, 검증, 고정 테스트 자료 적용 범위를 공유합니다.",
    "Image handoff quality:": "이미지 인계 품질:",
    "alpha diagnostics,": "알파 채널 진단,",
    ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": ", 스프라이트 불변 조건, 정규화 프리셋, 프레임 미리보기 시트, Pixi 스프라이트시트 JSON, Canvas 그리기 헬퍼.",
    "Contributor base:": "기여자 기반:",
    "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "추적되는 스키마, 레시피 검증, 어댑터 템플릿 생성, 고정 테스트 자료 캡처, 호환성 매트릭스, 내장 대상별 최소 두 개의 기준 테스트 자료.",
    "Report system:": "리포트 시스템:",
    "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "로컬 리포트, 명시적 리포트 내보내기, 로컬 갤러리 메타데이터, 검증 상세, 헬퍼 코드, 차이점, 롤백 명령.",
    "Agent/MCP surface:": "Agent/MCP 기능 범위:",
    "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "지원 대상용 도구, 리소스, 프롬프트를 담은 로컬 JSON 전용 MCP 메타데이터 패키지입니다.",
    "P4 media metadata:": "P4 미디어 메타데이터:",
    "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "스키마 기반 오디오, 아틀라스/타일셋, UI 애셋 메타데이터, 런타임 간이 검사 가용성 확인.",
    "Pack Strategy": "팩 전략",
    "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1은 로컬 컴파일/설치 사용에 과금하지 않습니다. 수익화 방향은 유료 레시피와 에이전트 팩, 업데이트 접근권, 지원 번들, 선택형 미래 경로로서의 호스팅 워커, OEM/플랫폼 라이선싱입니다.",
    "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender는 호스팅 플랫폼이 아닙니다. 기본 워크플로는 대상 프로젝트 안에 머물고, 네트워크 호출을 피하며, 계정을 요구하지 않고, openRender 변경 사항을 롤백할 수 있도록 설치된 파일을 기록합니다."
  });

  Object.assign(dictionary.ja, {
    "0.6.1 Developer Kit - openRender Docs": "0.6.1 開発者キット - openRender ドキュメント",
    "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "Phaser、Godot、LOVE2D、PixiJS、Canvas 向けのローカル優先アセット受け渡しです。レポート、検証用フィクスチャ、レシピ、MCP メタデータ、P4 メディアメタデータを含みます。",
    "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1 はローカルのメディアからエンジンへのコンパイラを無料コアとして維持し、決定的なアダプター出力、レシピ、検証用フィクスチャ、レポート書き出し、ローカルギャラリーメタデータ、MCP メタデータ、P4 メディアメタデータ契約を中心に開発者キットの範囲を広げます。",
    "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "コンパイラは既存のローカル画像を受け取り、コンパイル済み PNG 出力、インストール計画、ヘルパーファイル、検証結果、フレームプレビューシート、ローカルレポート、ロールバック記録を生成します。",
    "AI coding agents working inside local game projects": "ローカルゲームプロジェクト内で作業する AI コーディングエージェント",
    "Project-specific asset paths, manifests, and helper files": "プロジェクト固有のアセットパス、マニフェスト、ヘルパーファイル",
    "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "スキーマ、コンパクトな要約、レシピ、パック、更新、サポート、将来の OEM 配布によるエージェントトークンの節約",
    "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "スプライト画像の受け渡しと、音声、アトラス/タイルセット、UI 契約向けの決定的メタデータ",
    "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "アカウント、課金、クラウド API、ホスト型ワーカー、テレメトリ、モデル呼び出し、リモート同期、デフォルトのランタイム実行、動画、3D",
    "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "AI エージェントはゲームコードを書き、生成画像を受け取れますが、生成された生のメディアがプレイ可能なプロジェクトにそのままきれいに入ることはほとんどありません。正規化、フレーム検証、プロジェクト固有のパス、ヘルパーコード、プレビュー、レポート、ロールバック境界が必要です。",
    "Asset paths:": "アセットパス:",
    "place compiled media where the target project can load it.": "対象プロジェクトが読み込める場所にコンパイル済みメディアを配置します。",
    "Manifest files:": "マニフェストファイル:",
    "expose stable IDs, dimensions, frame metadata, and load paths.": "安定した ID、サイズ、フレームメタデータ、読み込みパスを公開します。",
    "Helper files:": "ヘルパーファイル:",
    "provide project-facing code for sprite frame sets and animation setup.": "スプライトフレームセットとアニメーション設定用のプロジェクト向けコードを提供します。",
    "Implemented 0.6.1 Surfaces": "実装済み 0.6.1 機能範囲",
    "Agent-safe CLI:": "エージェント安全 CLI:",
    ", and JSON-first output.": "と JSON 優先出力です。",
    "Adapter registry:": "アダプターレジストリ:",
    "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser、Godot、LOVE2D、PixiJS、Canvas は契約検証、インストール計画、ヘルパー生成、検証、フィクスチャ範囲を共有します。",
    "Image handoff quality:": "画像受け渡し品質:",
    "alpha diagnostics,": "アルファチャンネル診断、",
    ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": "、スプライト不変条件、正規化プリセット、フレームプレビューシート、Pixi スプライトシート JSON、Canvas 描画ヘルパー。",
    "Contributor base:": "コントリビューター基盤:",
    "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "追跡済みスキーマ、レシピ検証、アダプターのひな形生成、フィクスチャ取得、互換性マトリクス、内蔵ターゲットごとに少なくとも 2 つの基準フィクスチャ。",
    "Report system:": "レポートシステム:",
    "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "ローカルレポート、明示的なレポート書き出し、ローカルギャラリーメタデータ、検証詳細、ヘルパーコード、差分、ロールバックコマンド。",
    "Agent/MCP surface:": "Agent/MCP 機能面:",
    "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "対応ターゲット向けのツール、リソース、プロンプトを含むローカル JSON 専用 MCP メタデータパッケージです。",
    "P4 media metadata:": "P4 メディアメタデータ:",
    "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "スキーマに基づく音声、アトラス/タイルセット、UI アセットメタデータ、ランタイム簡易検査の可用性確認。",
    "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1 はローカルのコンパイル/インストール利用に課金しません。収益化の方向性は有料レシピとエージェントパック、更新アクセス、サポートバンドル、任意の将来経路としてのホスト型ワーカー、OEM/プラットフォームライセンスです。",
    "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender はホスト型プラットフォームではありません。既定のワークフローは対象プロジェクト内に留まり、ネットワーク呼び出しを避け、アカウントを要求せず、openRender の変更をロールバックできるようインストール済みファイルを記録します。"
  });

  Object.assign(dictionary.es, {
    "0.6.1 Developer Kit - openRender Docs": "Kit para desarrolladores 0.6.1 - Docs de openRender",
    "Local-first asset handoff for Phaser, Godot, LOVE2D, PixiJS, and Canvas with reports, fixtures, recipes, MCP metadata, and P4 media metadata.": "Entrega local de activos para Phaser, Godot, LOVE2D, PixiJS y Canvas con reportes, datos de prueba fijos, recetas, metadatos MCP y metadatos multimedia P4.",
    "openRender 0.6.1 keeps the local media-to-engine compiler as the free core and expands the Developer Kit surface around deterministic adapter output, recipes, fixtures, report export, local gallery metadata, MCP metadata, and P4 media metadata contracts.": "openRender 0.6.1 mantiene como núcleo gratuito el compilador local de medios a engine y amplía el kit para desarrolladores alrededor de salidas determinísticas de adaptadores, recetas, datos de prueba fijos, exportación de reportes, metadatos de galería local, metadatos MCP y contratos de metadatos multimedia P4.",
    "The compiler takes an existing local image and produces compiled PNG output, install plans, helper files, verification results, frame preview sheets, local reports, and rollback records.": "El compilador toma una imagen local existente y produce salida PNG compilada, planes de instalación, archivos auxiliares, resultados de verificación, hojas de vista previa de frames, reportes locales y registros de reversión.",
    "AI coding agents working inside local game projects": "Agentes de codificación con IA que trabajan dentro de proyectos locales de juegos",
    "Project-specific asset paths, manifests, and helper files": "Rutas de activos, manifiestos y archivos auxiliares específicos del proyecto",
    "Agent token savings through schemas, compact summaries, recipes, packs, updates, support, and future OEM distribution": "Ahorro de tokens para agentes mediante esquemas, resúmenes compactos, recetas, packs, actualizaciones, soporte y futura distribución OEM",
    "Sprite image handoff plus deterministic metadata for audio, atlas/tileset, and UI contracts": "Entrega de imágenes sprite más metadatos determinísticos para audio, atlas/tileset y contratos de UI",
    "Accounts, billing, cloud API, hosted workers, telemetry, model calls, remote sync, runtime execution by default, video, 3D": "Cuentas, facturación, API en la nube, trabajadores alojados, telemetría, llamadas a modelos, sincronización remota, ejecución runtime por defecto, video, 3D",
    "AI agents can write game code and receive generated images, but raw generated media rarely drops cleanly into a playable project. It needs normalization, frame validation, project-specific paths, helper code, preview, report, and a rollback boundary.": "Los agentes de IA pueden escribir código de juego y recibir imágenes generadas, pero los medios generados en bruto rara vez entran limpiamente en un proyecto jugable. Necesitan normalización, validación de frames, rutas específicas del proyecto, código auxiliar, vista previa, reporte y un límite de reversión.",
    "Asset paths:": "Rutas de assets:",
    "place compiled media where the target project can load it.": "colocan los medios compilados donde el proyecto objetivo puede cargarlos.",
    "Manifest files:": "Archivos de manifiesto:",
    "expose stable IDs, dimensions, frame metadata, and load paths.": "exponen IDs estables, dimensiones, metadatos de frames y rutas de carga.",
    "Helper files:": "Archivos auxiliares:",
    "provide project-facing code for sprite frame sets and animation setup.": "proporcionan código orientado al proyecto para conjuntos de frames sprite y configuración de animaciones.",
    "Implemented 0.6.1 Surfaces": "Superficies 0.6.1 implementadas",
    "Agent-safe CLI:": "CLI segura para agentes:",
    ", and JSON-first output.": "y salida prioritaria en JSON.",
    "Adapter registry:": "Registro de adaptadores:",
    "Phaser, Godot, LOVE2D, PixiJS, and Canvas share contract validation, install plans, helper generation, verification, and fixture coverage.": "Phaser, Godot, LOVE2D, PixiJS y Canvas comparten validación de contratos, planes de instalación, generación de auxiliares, verificación y cobertura de datos de prueba.",
    "Image handoff quality:": "Calidad de entrega de imágenes:",
    "alpha diagnostics,": "diagnósticos de canal alfa,",
    ", sprite invariants, normalize presets, frame preview sheets, Pixi spritesheet JSON, and Canvas draw helpers.": ", invariantes de sprites, presets de normalización, hojas de vista previa de frames, JSON de spritesheet Pixi y auxiliares de dibujo Canvas.",
    "Contributor base:": "Base para contribuidores:",
    "tracked schemas, recipe validation, adapter scaffolding, fixture capture, compatibility matrix, and at least two golden fixtures per built-in target.": "esquemas versionados, validación de recetas, scaffolding de adaptadores, captura de datos de prueba, matriz de compatibilidad y al menos dos datos de prueba base por objetivo integrado.",
    "Report system:": "Sistema de reportes:",
    "local reports, explicit report export, local gallery metadata, verification details, helper code, diffs, and rollback commands.": "reportes locales, exportación explícita de reportes, metadatos de galería local, detalles de verificación, código auxiliar, diferencias y comandos de reversión.",
    "Agent/MCP surface:": "Superficie Agent/MCP:",
    "a local JSON-only MCP metadata package with tools, resources, and prompts for supported targets.": "un paquete local de metadatos MCP solo JSON con herramientas, recursos y prompts para objetivos soportados.",
    "P4 media metadata:": "Metadatos multimedia P4:",
    "schema-backed audio, atlas/tileset, UI asset metadata and runtime smoke availability checks.": "audio respaldado por esquema, atlas/tileset, metadatos de activos de UI y comprobaciones de disponibilidad de pruebas rápidas de runtime.",
    "0.6.1 does not charge for local compile/install usage. The monetization direction remains paid recipe and agent packs, update access, support bundles, hosted workers as an opt-in future path, and OEM/platform licensing.": "0.6.1 no cobra por el uso local de compilación/instalación. La dirección de monetización sigue siendo recetas y packs de agentes de pago, acceso a actualizaciones, paquetes de soporte, trabajadores alojados como ruta futura opcional y licencias OEM/plataforma.",
    "openRender is not a hosted platform. The default workflow stays inside the target project, avoids network calls, does not require an account, and records installed files so the openRender change can be rolled back.": "openRender no es una plataforma alojada. El flujo de trabajo por defecto permanece dentro del proyecto objetivo, evita llamadas de red, no requiere cuenta y registra los archivos instalados para que el cambio de openRender pueda revertirse."
  });

  Object.assign(dictionary.ko, {
    "Agent Usage - openRender Docs": "Agent 사용 - openRender 문서",
    "Guidance for coding agents using openRender inside local Phaser, Godot, LOVE2D, PixiJS, or Canvas projects, with the 0.3.1 token-saving recipe direction in mind.": "로컬 Phaser, Godot, LOVE2D 프로젝트 안에서 openRender를 사용하는 코딩 에이전트를 위한 안내입니다. 0.3.1의 토큰 절감 레시피 방향을 기준으로 설명합니다.",
    "Agent Role": "에이전트 역할",
    "openRender is designed for AI coding agents operating inside local game repositories. The agent should use openRender for deterministic media-to-engine handoff, then use the generated paths and helpers while editing game code.": "openRender는 로컬 게임 저장소 안에서 작업하는 AI 코딩 에이전트를 위해 설계되었습니다. 에이전트는 결정적인 미디어-엔진 인계에 openRender를 사용한 뒤, 게임 코드를 편집할 때 생성된 경로와 헬퍼를 사용해야 합니다.",
    "0.3.1 frames openRender as a way to reduce repeated token-heavy handoff work. Agents should prefer compact JSON results, generated helper paths, built-in recipe metadata, and frame preview outputs over re-deriving the same file layout or repair steps in every session.": "0.3.1은 openRender를 반복되는 고토큰 인계 작업을 줄이는 방법으로 정의합니다. 에이전트는 세션마다 같은 파일 구조나 복구 단계를 다시 추론하기보다 압축된 JSON 결과, 생성된 헬퍼 경로, 내장 레시피 메타데이터, 프레임 미리보기 출력을 우선 사용해야 합니다.",
    "Decision Rules": "판단 규칙",
    "Run scan --json before assuming the target project type.": "대상 프로젝트 유형을 추정하기 전에 scan --json을 실행합니다.",
    "Run doctor --json before writing project files in an unfamiliar repo.": "익숙하지 않은 저장소에서 프로젝트 파일을 쓰기 전에 doctor --json을 실행합니다.",
    "Use pack list --json and recipe list --json when compact local recipe metadata helps avoid re-deriving the workflow.": "압축된 로컬 레시피 메타데이터가 워크플로 재추론을 줄이는 데 도움이 되면 pack list --json과 recipe list --json을 사용합니다.",
    "Use plan sprite --json or compile sprite --dry-run --json before --install.": "--install 전에 plan sprite --json 또는 compile sprite --dry-run --json을 사용합니다.",
    "Use detect-frames --json when sprite sheet geometry is unclear.": "스프라이트 시트 구조가 불명확하면 detect-frames --json을 사용합니다.",
    "Do not use --force unless the user accepts overwriting generated destination files.": "사용자가 생성 대상 파일 덮어쓰기를 허용하지 않았다면 --force를 사용하지 않습니다.",
    "After install, run verify --run latest --json.": "설치 후 verify --run latest --json을 실행합니다.",
    "Use report --run latest --json when verification fails or when the user needs an audit trail.": "검증이 실패하거나 사용자가 감사 흔적을 필요로 하면 report --run latest --json을 사용합니다.",
    "Use explain --run latest --json for compact next actions and diff --run latest --json before deciding which generated files to inspect.": "간결한 다음 작업에는 explain --run latest --json을 사용하고, 어떤 생성 파일을 검사할지 정하기 전에 diff --run latest --json을 사용합니다.",
    "Use rollback --run latest --json only for files recorded by openRender install.": "rollback --run latest --json은 openRender 설치가 기록한 파일에만 사용합니다.",
    "Treat built-in pack/recipe guidance as reusable context. It does not replace dry-run, verification, or user approval for overwrite behavior.": "내장 팩/레시피 안내는 재사용 가능한 맥락으로 취급합니다. 드라이런, 검증, 덮어쓰기 동작에 대한 사용자 승인을 대체하지 않습니다.",
    "Agent Prompt Example": "에이전트 프롬프트 예시",

    "CLI Reference - openRender Docs": "CLI 레퍼런스 - openRender 문서",
    "Current local CLI command surface for Phaser, Godot, and LOVE2D image asset workflows.": "Phaser, Godot, LOVE2D 이미지 애셋 워크플로를 위한 현재 로컬 CLI 명령 범위입니다.",
    "Implemented Commands": "구현된 명령",
    "Target": "대상",
    "Framework": "프레임워크",
    "Status": "상태",
    "Agent-facing commands should expose stable fields such as ok, runId, target, engine, artifact, installPlan, agentSummary, recipe, verification, reportPath, and rollbackHint.": "에이전트용 명령은 ok, runId, target, engine, artifact, installPlan, agentSummary, recipe, verification, reportPath, rollbackHint 같은 안정적인 필드를 노출해야 합니다.",
    "detect-frames infers frame layout and dimensions before compile. normalize applies deterministic local presets: transparent-sprite, ui-icon, sprite-strip, and sprite-grid.": "detect-frames는 컴파일 전에 프레임 구조와 크기를 추론합니다. normalize는 transparent-sprite, ui-icon, sprite-strip, sprite-grid 같은 결정적 로컬 프리셋을 적용합니다.",
    "Sprite frame set reports include .openrender/runs/{runId}/preview_frames.png when frame slices are available.": "프레임 조각을 만들 수 있으면 스프라이트 프레임 세트 리포트에 .openrender/runs/{runId}/preview_frames.png가 포함됩니다.",
    "Remote pack sync, login, and license refresh return explicit not_implemented_in_0_3_1 responses in this version.": "이 버전에서 원격 팩 동기화, 로그인, 라이선스 갱신은 명시적인 not_implemented_in_0_3_1 응답을 반환합니다.",
    "pack list, pack inspect core, and recipe list expose built-in local core metadata only. Remote pack sync, login, and license refresh return explicit not_implemented_in_0_3_1 responses in this version.": "pack list, pack inspect core, recipe list는 내장 로컬 코어 메타데이터만 노출합니다. 이 버전에서 원격 팩 동기화, 로그인, 라이선스 갱신은 명시적인 not_implemented_in_0_3_1 응답을 반환합니다.",

    "Contracts - openRender Docs": "계약 - openRender 문서",
    "Media and engine handoff contracts used by the local compiler workflow.": "로컬 컴파일러 워크플로에서 사용하는 미디어와 엔진 인계 계약입니다.",
    "Official JSON schemas live in schemas/ and can be printed with openrender schema contract|output|report|install-plan|pack-manifest.": "공식 JSON 스키마는 schemas/에 있으며 openrender schema contract|output|report|install-plan|pack-manifest로 출력할 수 있습니다.",
    "Audio, video, scene, and 3D contract names remain future directions and are not part of the current local workflow.": "오디오, 비디오, 씬, 3D 계약 이름은 향후 방향이며 현재 로컬 워크플로에는 포함되지 않습니다.",
    "Compile JSON includes deterministic handoff fields for agents:": "컴파일 JSON은 에이전트를 위한 결정적 인계 필드를 포함합니다:",
    "The local Developer Kit exposes a built-in core pack. It is metadata only in 0.3.1 and does not require login, billing, sync, telemetry, or hosted workers.": "로컬 개발자 키트는 내장 코어 팩을 노출합니다. 0.3.1에서는 메타데이터만 제공하며 로그인, 결제, 동기화, 텔레메트리, 호스팅 워커를 요구하지 않습니다.",

    "Developer Webpage Design Guide - openRender Docs": "개발자 웹페이지 디자인 가이드 - openRender 문서",
    "Current design and messaging guidance for the developer-facing openRender webpage.": "개발자 대상 openRender 웹페이지의 현재 디자인과 메시징 안내입니다.",
    "The webpage should introduce openRender as local infrastructure for AI agents that turn generated media into engine-ready playable project files while reducing repeated token-heavy handoff work. It should explain the local handoff loop, recipe/pack strategy, and long-term media-to-engine vision before listing current engine support.": "웹페이지는 openRender를 생성 미디어를 엔진에서 바로 쓸 수 있는 플레이 가능한 프로젝트 파일로 바꾸면서 반복적인 고토큰 인계 작업을 줄이는 AI 에이전트용 로컬 인프라로 소개해야 합니다. 현재 엔진 지원을 나열하기 전에 로컬 인계 루프, 레시피/팩 전략, 장기적인 미디어-엔진 비전을 설명해야 합니다.",
    "Reference direction: 0.3.1.": "참조 방향: 0.3.1.",
    "Implemented local compiler core: 0.3.1.": "구현된 로컬 컴파일러 핵심: 0.3.1.",
    "Current agent surfaces: schemas, plan, detect-frames, normalize, explain, diff, frame preview sheets, built-in core pack and recipe metadata.": "현재 에이전트 기능 범위: 스키마, plan, detect-frames, normalize, explain, diff, 프레임 미리보기 시트, 내장 코어 팩과 레시피 메타데이터.",
    "Monetization principle: local compile remains free; paid value comes from recipe packs, agent packs, update access, support, hosted workers, and OEM/platform licensing.": "수익화 원칙: 로컬 컴파일은 무료로 유지하고, 유료 가치는 레시피 팩, 에이전트 팩, 업데이트 접근권, 지원, 호스팅 워커, OEM/플랫폼 라이선싱에서 나옵니다.",
    "Local core boundary: no metered local compile, credit wallet, required hosted playground, model resale, telemetry, cloud orchestration, account, billing, or model provider call in the Developer Kit path.": "제외: 사용량 과금형 로컬 컴파일, 크레딧 지갑, 필수 호스팅 플레이그라운드, 모델 재판매, 텔레메트리, 클라우드 오케스트레이션, 전체 MCP 서버 구현, 오디오/비디오/3D.",
    "Keep the page simple, white, spacious, and developer-tool focused. Use a high-quality wordmark, one clear command surface, and concise sections. Mention pack strategy as direction, not as active pricing or enforcement.": "페이지는 단순하고 흰색 기반이며 여백이 있고 개발자 도구 중심이어야 합니다. 고품질 워드마크, 하나의 명확한 명령 표면, 간결한 섹션을 사용합니다. 팩 전략은 현재 가격 정책이나 강제 기능이 아니라 방향성으로만 언급합니다.",
    "Why generated media is hard to use directly in game engines.": "생성 미디어를 게임 엔진에서 바로 쓰기 어려운 이유.",
    "How the local compiler handoff works.": "로컬 컴파일러 인계가 작동하는 방식.",
    "How recipes and packs reduce repeated agent context.": "레시피와 팩이 반복적인 에이전트 맥락을 줄이는 방식.",
    "What agents get back: files, helpers, JSON, reports, rollback.": "에이전트가 받는 것: 파일, 헬퍼, JSON, 리포트, 롤백.",
    "Current engine support: Phaser, Godot 4, and LOVE2D.": "현재 엔진 지원: Phaser, Godot 4, LOVE2D.",
    "Vision: a broader media-to-engine infrastructure layer.": "비전: 더 넓은 미디어-엔진 인프라 계층.",

    "Boundaries - openRender Docs": "경계 - openRender 문서",
    "What the local workflow supports, and where it intentionally stops.": "로컬 워크플로가 지원하는 것과 의도적으로 멈추는 지점입니다.",
    "Image asset compilation to PNG artifacts.": "이미지 애셋을 PNG 산출물로 컴파일합니다.",
    "Transparent sprite and sprite frame set contracts.": "투명 스프라이트와 스프라이트 프레임 세트 계약.",
    "Official JSON schemas, plan output, explain output, and diff output.": "공식 JSON 스키마, 계획 출력, 설명 출력, 차이 출력.",
    "Alpha diagnostics, frame detection, sprite invariants, normalize presets, and frame preview sheets.": "알파 채널 진단, 프레임 감지, 스프라이트 불변 조건, 정규화 프리셋, 프레임 미리보기 시트.",
    "Built-in local core pack and recipe metadata.": "내장 로컬 코어 팩과 레시피 메타데이터.",
    "Local reports, previews, snapshots, verification, and rollback.": "로컬 리포트, 프리뷰, 스냅샷, 검증, 롤백.",
    "No remote account, billing, license, wallet, or entitlement checks.": "원격 계정, 결제, 라이선스, 지갑, 권한 검사를 하지 않습니다.",
    "No cloud API, hosted worker, report sync, or remote artifact cache.": "클라우드 API, 호스팅 워커, 리포트 동기화, 원격 산출물 캐시가 없습니다.",
    "No model provider call or BYOK generation integration.": "모델 제공자 호출이나 BYOK 생성 연동이 없습니다.",
    "No telemetry.": "텔레메트리가 없습니다.",
    "Local JSON-only MCP metadata is available.": "전체 MCP 서버가 없습니다.",
    "No Phaser, Godot, LOVE2D, PixiJS, or Canvas scene auto-patching.": "Phaser, Godot, LOVE2D 씬 자동 패치를 하지 않습니다.",
    "No LOVE2D .love archive generation or runtime launch.": "LOVE2D .love 아카이브 생성이나 런타임 실행을 하지 않습니다.",
    "Verification checks local handoff invariants. It does not prove Phaser canvas runtime behavior, Godot editor/headless runtime behavior, or LOVE2D runtime behavior.": "검증은 로컬 인계 불변 조건을 확인합니다. Phaser 캔버스 런타임 동작, Godot 에디터/헤드리스 런타임 동작, LOVE2D 런타임 동작을 증명하지는 않습니다.",

    "Quickstart - openRender Docs": "빠른 시작 - openRender 문서",
    "Use one workflow for every supported engine: initialize, plan, dry-run, install, verify, report, explain, diff, rollback, and reuse recipe context.": "모든 지원 엔진에 하나의 워크플로를 사용합니다: 초기화, 계획, 드라이런, 설치, 검증, 리포트, 설명, 차이 확인, 롤백, 레시피 맥락 재사용.",
    "The 0.3.1 direction keeps this local loop as the free core and uses recipes or packs only to reduce repeated agent context, helper drift, and repair work.": "0.3.1 방향은 이 로컬 루프를 무료 핵심 기능으로 유지하고, 레시피나 팩은 반복적인 에이전트 맥락, 헬퍼 드리프트, 복구 작업을 줄이는 데만 사용합니다.",
    "Before packages are published, run the built CLI from the target game project root:": "패키지가 배포되기 전에는 대상 게임 프로젝트 루트에서 빌드된 CLI를 실행합니다:",
    "Every engine follows the same safety loop:": "모든 엔진은 같은 안전 루프를 따릅니다:",
    "Use phaser, godot, or love2d as the target engine.": "phaser, godot, love2d 중 하나를 대상 엔진으로 사용합니다.",
    "The built-in core pack and recipes are available locally with pack list, pack inspect core, and recipe list. They summarize known-good commands, helper conventions, compact repair guidance, and agent instructions. They do not make local compile require login, credits, telemetry, sync, or hosted execution.": "내장 코어 팩과 레시피는 pack list, pack inspect core, recipe list로 로컬에서 사용할 수 있습니다. 검증된 명령, 헬퍼 규칙, 압축된 복구 안내, 에이전트 지침을 요약합니다. 로컬 컴파일에 로그인, 크레딧, 텔레메트리, 동기화, 호스팅 실행을 요구하지 않습니다.",
    "Use Phaser when the project is a Vite + Phaser web game.": "프로젝트가 Vite + Phaser 웹 게임이면 Phaser를 사용합니다.",
    "After the dry-run plan looks correct, rerun with --install.": "드라이런 계획이 맞아 보이면 --install로 다시 실행합니다.",
    "public/assets/: installed PNG assets.": "public/assets/: 설치된 PNG 애셋.",
    "src/assets/openrender-manifest.ts: generated asset manifest.": "src/assets/openrender-manifest.ts: 생성된 애셋 매니페스트.",
    "src/openrender/animations/: generated animation helpers for frame sets.": "src/openrender/animations/: 프레임 세트용 생성 애니메이션 헬퍼.",
    "openRender prepares load paths and helper code. Scene wiring remains an explicit agent or developer step.": "openRender는 로드 경로와 헬퍼 코드를 준비합니다. 씬 연결은 에이전트나 개발자가 명시적으로 수행해야 하는 단계입니다.",
    "Use Godot when the project has project.godot at the project root.": "프로젝트 루트에 project.godot이 있으면 Godot을 사용합니다.",
    "Godot output": "Godot 출력",
    "assets/openrender/: installed PNG assets.": "assets/openrender/: 설치된 PNG 애셋.",
    "scripts/openrender/openrender_assets.gd: generated asset manifest.": "scripts/openrender/openrender_assets.gd: 생성된 애셋 매니페스트.",
    "scripts/openrender/animations/: generated animation helpers for frame sets.": "scripts/openrender/animations/: 프레임 세트용 생성 애니메이션 헬퍼.",
    "openRender does not write .import or .godot/ files. Open or refresh the project in Godot so the editor owns import cache generation.": "openRender는 .import 또는 .godot/ 파일을 쓰지 않습니다. 임포트 캐시 생성은 에디터가 담당하도록 Godot에서 프로젝트를 열거나 새로고침합니다.",
    "Use LOVE2D when the project has main.lua or conf.lua at the project root.": "프로젝트 루트에 main.lua 또는 conf.lua가 있으면 LOVE2D를 사용합니다.",
    "openrender/openrender_assets.lua: generated asset manifest.": "openrender/openrender_assets.lua: 생성된 애셋 매니페스트.",
    "openrender/animations/: generated animation helpers for frame sets.": "openrender/animations/: 프레임 세트용 생성 애니메이션 헬퍼.",
    "openRender does not create .love archives and does not run the LOVE2D runtime during verification. It verifies local file and path invariants only.": "openRender는 .love 아카이브를 만들지 않고 검증 중 LOVE2D 런타임을 실행하지 않습니다. 로컬 파일과 경로 불변 조건만 검증합니다.",
    "Each install writes local run state under .openrender/.": "각 설치는 .openrender/ 아래에 로컬 실행 상태를 기록합니다.",
    ".openrender/reports/latest.html: latest local HTML report.": ".openrender/reports/latest.html: 최신 로컬 HTML 리포트.",
    ".openrender/reports/latest.json: latest machine-readable report.": ".openrender/reports/latest.json: 최신 기계 판독용 리포트.",
    ".openrender/runs/{runId}/preview_frames.png: frame index preview for valid sprite frame sets.": ".openrender/runs/{runId}/preview_frames.png: 유효한 스프라이트 프레임 세트의 프레임 인덱스 미리보기.",
    ".openrender/snapshots/: rollback snapshots for files touched by the install.": ".openrender/snapshots/: 설치가 건드린 파일의 롤백 스냅샷.",
    "Rollback only reverts files managed by the openRender install. It does not revert separate game code edits made by an agent.": "롤백은 openRender 설치가 관리한 파일만 되돌립니다. 에이전트가 별도로 수정한 게임 코드 변경은 되돌리지 않습니다.",

    "Privacy Policy - openRender Docs": "개인정보 처리방침 - openRender 문서",
    "Last updated: May 2, 2026": "마지막 업데이트: 2026년 5월 2일",
    "openRender is a local-first developer tool. The CLI is designed to run inside a user's own project directory and does not require an account, telemetry, cloud sync, or hosted asset upload.": "openRender는 로컬 우선 개발자 도구입니다. CLI는 사용자의 프로젝트 디렉터리 안에서 실행되도록 설계되어 있으며 계정, 텔레메트리, 클라우드 동기화, 호스팅 애셋 업로드를 요구하지 않습니다.",
    "When used locally, openRender may read project files, source image files, and generated run records needed to compile, install, verify, report, and roll back assets.": "로컬에서 사용할 때 openRender는 애셋 컴파일, 설치, 검증, 리포트, 롤백에 필요한 프로젝트 파일, 소스 이미지 파일, 생성된 실행 기록을 읽을 수 있습니다.",
    "These files stay in the local project unless the user chooses to share, publish, or upload them through another tool.": "사용자가 다른 도구로 공유, 게시, 업로드하기로 선택하지 않는 한 이 파일들은 로컬 프로젝트 안에 머뭅니다.",
    "The openRender CLI does not collect analytics, send telemetry, or upload generated assets by default.": "openRender CLI는 기본적으로 분석 정보를 수집하거나 텔레메트리를 보내거나 생성된 애셋을 업로드하지 않습니다.",
    "Static documentation pages may be hosted by a third-party platform. That platform may process standard request logs according to its own policies.": "정적 문서 페이지는 제3자 플랫폼에서 호스팅될 수 있습니다. 해당 플랫폼은 자체 정책에 따라 표준 요청 로그를 처리할 수 있습니다.",
    "openRender writes local reports under .openrender/reports/. These reports are intended for the user and their coding agent. They are not transmitted by openRender.": "openRender는 .openrender/reports/ 아래에 로컬 리포트를 기록합니다. 이 리포트는 사용자와 코딩 에이전트를 위한 것이며 openRender가 전송하지 않습니다.",
    "Use the repository issue tracker for privacy-related questions about the openRender project.": "openRender 프로젝트의 개인정보 관련 질문은 저장소 이슈 트래커를 사용합니다.",

    "Terms & Conditions - openRender Docs": "이용약관 - openRender 문서",
    "These terms describe use of the openRender documentation and local Developer Kit.": "이 약관은 openRender 문서와 로컬 개발자 키트 사용을 설명합니다.",
    "openRender is provided as an open-source local developer tool for compiling generated image assets into engine-ready project files.": "openRender는 생성된 이미지 애셋을 엔진에서 바로 쓸 수 있는 프로젝트 파일로 컴파일하는 오픈소스 로컬 개발자 도구로 제공됩니다.",
    "Users are responsible for reviewing generated files, command output, reports, and any game code changes made with the help of openRender or an AI coding agent.": "사용자는 openRender나 AI 코딩 에이전트의 도움으로 만들어진 생성 파일, 명령 출력, 리포트, 게임 코드 변경 사항을 검토할 책임이 있습니다.",
    "Users are responsible for the rights, licenses, and permissions for source images or other media they provide to openRender.": "사용자는 openRender에 제공하는 소스 이미지나 기타 미디어의 권리, 라이선스, 권한에 책임이 있습니다.",
    "openRender can write files into a target project when install commands are used. Review plan or dry-run output before installing and use rollback for openRender-managed files when needed.": "설치 명령을 사용하면 openRender가 대상 프로젝트에 파일을 쓸 수 있습니다. 설치 전에 계획 또는 드라이런 출력을 검토하고, 필요한 경우 openRender가 관리한 파일에 롤백을 사용합니다.",
    "openRender is distributed under the repository license. Unless required by law or stated separately, the software is provided without warranties or guarantees.": "openRender는 저장소 라이선스에 따라 배포됩니다. 법에서 요구하거나 별도로 명시하지 않는 한 소프트웨어는 보증 없이 제공됩니다.",
    "These terms may be updated as the project evolves. The latest version is published with the project documentation.": "프로젝트가 발전함에 따라 이 약관은 업데이트될 수 있습니다. 최신 버전은 프로젝트 문서와 함께 게시됩니다."
  });

  Object.assign(dictionary.ko, {
    "Release Checklist - openRender Docs": "릴리스 체크리스트 - openRender 문서",
    "Checks for the current 0.3.1 reference direction and the existing local compiler surface.": "현재 0.3.1 참조 방향과 기존 로컬 컴파일러 기능 범위를 확인하는 체크리스트입니다.",
    "README describes openRender as a local-first media-to-engine compiler and agent token saver.": "README가 openRender를 로컬 우선 미디어-엔진 컴파일러이자 에이전트 토큰 절감 도구로 설명합니다.",
    "Docs point to docs/openRender_v0.6.1.md as the active local reference.": "문서가 docs/openRender_v0.6.1.md를 현재 로컬 참조 문서로 가리킵니다.",
    "Local compile/install is described as free core behavior, not a metered hosted service.": "로컬 컴파일/설치는 사용량 과금형 호스팅 서비스가 아니라 무료 핵심 동작으로 설명됩니다.",
    "Recipe packs, agent packs, updates, support, hosted workers, and OEM/platform licensing are framed as future value surfaces.": "레시피 팩, 에이전트 팩, 업데이트, 지원, 호스팅 워커, OEM/플랫폼 라이선싱은 향후 가치 영역으로 설명됩니다.",
    "Phaser, Godot, and LOVE2D adapter packages build.": "Phaser, Godot, LOVE2D 어댑터 패키지가 빌드됩니다.",
    "Schemas, plan, explain, diff, detect-frames, normalize, frame preview sheets, and built-in core pack/recipe metadata are documented.": "스키마, plan, explain, diff, detect-frames, normalize, 프레임 미리보기 시트, 내장 코어 팩/레시피 메타데이터가 문서화되어 있습니다.",
    "README, scope, CLI, and limitation docs mention Phaser, Godot, and LOVE2D support.": "README, 범위, CLI, 제한 문서가 Phaser, Godot, LOVE2D 지원을 언급합니다.",
    "No docs imply required hosted accounts, billing, telemetry, model calls, or cloud orchestration for local core use.": "어떤 문서도 로컬 핵심 사용에 호스팅 계정, 결제, 텔레메트리, 모델 호출, 클라우드 오케스트레이션이 필요하다고 암시하지 않습니다.",
    "Local Verification": "로컬 검증",
    "Smoke Coverage": "간이 검증 범위",
    "Phaser compile/install/verify/report/rollback workflow.": "Phaser 컴파일/설치/검증/리포트/롤백 워크플로.",
    "Godot compile/install/verify/report/rollback workflow.": "Godot 컴파일/설치/검증/리포트/롤백 워크플로.",
    "LOVE2D compile/install/verify/report/rollback workflow.": "LOVE2D 컴파일/설치/검증/리포트/롤백 워크플로.",
    "Godot workflow does not write .import or .godot/.": "Godot 워크플로는 .import 또는 .godot/을 쓰지 않습니다.",
    "LOVE2D workflow does not create .love archives or launch the runtime.": "LOVE2D 워크플로는 .love 아카이브를 만들거나 런타임을 실행하지 않습니다.",
    "Package tarball install smoke check passes before publishing.": "게시 전에 패키지 tarball 설치 간이 검사를 통과합니다.",
    "Built-in pack/recipe commands return local metadata.": "내장 팩/레시피 명령은 로컬 메타데이터를 반환합니다.",
    "Remote pack sync, login, and license refresh return honest JSON and do not imply remote sync is already implemented.": "원격 팩 동기화, 로그인, 라이선스 갱신은 솔직한 JSON을 반환하며 원격 동기화가 이미 구현되었다고 암시하지 않습니다.",
    "Do Not Release If": "다음 경우 릴리스하지 않음",
    "Any command requires credentials, telemetry, billing, cloud sync, or account setup.": "명령 중 하나라도 자격 증명, 텔레메트리, 결제, 클라우드 동기화, 계정 설정을 요구하는 경우.",
    "Local compile/install is presented as usage-metered or credit-wallet driven.": "로컬 컴파일/설치가 사용량 과금형 또는 크레딧 지갑 기반으로 표현되는 경우.",
    "Pack strategy is presented as implemented billing, license enforcement, or hosted compile.": "팩 전략이 구현된 결제, 라이선스 강제, 호스팅 컴파일로 표현되는 경우.",
    "Godot support is described as editor/runtime smoke-tested beyond local file handoff.": "Godot 지원이 로컬 파일 인계를 넘어 에디터/런타임 간이 검증까지 완료된 것처럼 설명되는 경우.",
    "LOVE2D support is described as runtime-launched or archive-packaged beyond local file handoff.": "LOVE2D 지원이 로컬 파일 인계를 넘어 런타임 실행 또는 아카이브 패키징까지 포함하는 것처럼 설명되는 경우.",
    "Docs omit Godot 4 or LOVE2D support.": "문서에서 Godot 4 또는 LOVE2D 지원을 누락한 경우.",

    "Release History - openRender Docs": "릴리스 기록 - openRender 문서",
    "0.6.1 is the current local-first Developer Kit version.": "0.6.1은 현재 로컬 우선 개발자 키트 버전입니다.",
    "P4 media metadata contracts for audio, atlas/tileset, and UI asset metadata.": "오디오, 아틀라스/타일셋, UI 애셋 메타데이터를 위한 P4 미디어 메타데이터 계약.",
    "Runtime smoke availability checks that report whether supported runtimes are present without requiring runtime execution by default.": "기본적으로 런타임 실행을 요구하지 않고 지원 런타임 존재 여부를 보고하는 런타임 간이 검사 가용성 확인.",
    "Expanded QA coverage across CLI, adapters, schemas, reports, fixtures, and local metadata helpers.": "CLI, 어댑터, 스키마, 리포트, 고정 테스트 자료, 로컬 메타데이터 헬퍼 전반으로 확장된 QA 범위.",
    "Local sprite compile, install, verify, report, diff, explain, and rollback.": "로컬 스프라이트 컴파일, 설치, 검증, 리포트, 차이 확인, 설명, 롤백.",
    "Supported image handoff targets: Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, and Canvas + Vite.": "지원 이미지 인계 대상: Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Canvas + Vite.",
    "Local .openrender/ run state with artifacts, reports, previews, snapshots, and rollback records.": "산출물, 리포트, 미리보기, 스냅샷, 롤백 기록을 담는 로컬 .openrender/ 실행 상태.",
    "0.5.0 Developer Kit Milestone": "0.5.0 개발자 키트 마일스톤",
    "Adapter scaffolding for bounded custom adapter creation.": "범위가 제한된 커스텀 어댑터 생성을 위한 어댑터 템플릿 생성.",
    "Fixture capture for reproducible adapter and CLI regression cases.": "재현 가능한 어댑터 및 CLI 회귀 사례를 위한 고정 테스트 자료 캡처.",
    "Report export and local report gallery metadata.": "리포트 내보내기와 로컬 리포트 갤러리 메타데이터.",
    "Stronger failure guidance for agent-facing repair loops.": "에이전트용 복구 루프를 위한 강화된 실패 안내.",
    "0.4.0 Developer Kit Milestone": "0.4.0 개발자 키트 마일스톤",
    "Shared adapter registry surface.": "공유 어댑터 레지스트리 기능 범위.",
    "PixiJS adapter.": "PixiJS 어댑터.",
    "Canvas adapter.": "Canvas 어댑터.",
    "Local JSON-only MCP metadata package.": "로컬 JSON 전용 MCP 메타데이터 패키지.",
    "agent init support.": "agent init 지원.",
    "Built-in recipe substrate for local core workflows.": "로컬 핵심 워크플로를 위한 내장 레시피 기반.",
    "The Developer Kit keeps local compile/install usage as the free core. Optional hosted workers, remote pack distribution, license/update infrastructure, support bundles, and OEM/platform licensing are future surfaces, not local core requirements.": "개발자 키트는 로컬 컴파일/설치 사용을 무료 핵심 기능으로 유지합니다. 선택형 호스팅 워커, 원격 팩 배포, 라이선스/업데이트 인프라, 지원 번들, OEM/플랫폼 라이선싱은 향후 기능 범위이며 로컬 핵심 요구사항이 아닙니다.",
    "Agent-facing JSON workflows remain local-first and do not require account, billing, telemetry, cloud sync, or hosted execution.": "에이전트용 JSON 워크플로는 로컬 우선으로 유지되며 계정, 결제, 텔레메트리, 클라우드 동기화, 호스팅 실행을 요구하지 않습니다.",
    "Release notes describe implemented behavior only.": "릴리스 노트는 구현된 동작만 설명합니다.",

    "Troubleshooting - openRender Docs": "문제 해결 - openRender 문서",
    "Common local workflow issues for Phaser, Godot, and LOVE2D image asset handoff.": "Phaser, Godot, LOVE2D 이미지 애셋 인계에서 자주 발생하는 로컬 워크플로 문제입니다.",
    "For 0.3.1 planning, remember that recipe packs are intended to reduce repeated agent troubleshooting. They should capture fixes like frame mismatch guidance or engine load path rules without changing the local-first safety loop.": "0.3.1 계획 기준으로, 레시피 팩은 반복적인 에이전트 문제 해결을 줄이기 위한 것입니다. 로컬 우선 안전 루프를 바꾸지 않으면서 프레임 불일치 안내나 엔진 로드 경로 규칙 같은 수정 지식을 담아야 합니다.",
    "Scan Does Not Detect Phaser": "스캔이 Phaser를 감지하지 못함",
    "Check that phaser and vite exist in the target package.json.": "대상 package.json에 phaser와 vite가 있는지 확인합니다.",
    "Scan Does Not Detect Godot": "스캔이 Godot을 감지하지 못함",
    "Check that project.godot exists at the project root. Godot editor cache files are not required for openRender detection.": "프로젝트 루트에 project.godot이 있는지 확인합니다. openRender 감지에는 Godot 에디터 캐시 파일이 필요하지 않습니다.",
    "Scan Does Not Detect LOVE2D": "스캔이 LOVE2D를 감지하지 못함",
    "Check that main.lua or conf.lua exists at the project root.": "프로젝트 루트에 main.lua 또는 conf.lua가 있는지 확인합니다.",
    "Frame Count Mismatch": "프레임 수 불일치",
    "For a horizontal strip, image width must equal frameWidth * frames. Run detect-frames --json when geometry is unclear, then adjust --frames, --frame-size, or regenerate the source image.": "가로 스트립에서는 이미지 너비가 frameWidth * frames와 같아야 합니다. 구조가 불명확하면 detect-frames --json을 실행한 뒤 --frames, --frame-size를 조정하거나 소스 이미지를 다시 생성합니다.",
    "Godot Import Metadata Is Missing": "Godot 임포트 메타데이터 누락",
    "openRender does not write .import or .godot/ metadata. Open or refresh the Godot project so the editor owns import cache generation.": "openRender는 .import 또는 .godot/ 메타데이터를 쓰지 않습니다. 임포트 캐시 생성은 에디터가 담당하도록 Godot 프로젝트를 열거나 새로고침합니다.",
    "LOVE2D Runtime Does Not Launch": "LOVE2D 런타임이 실행되지 않음",
    "openRender does not run LOVE2D or create .love archives. Require the generated Lua module from openrender/, load images with love.graphics.newImage, and run LOVE2D through your normal project command.": "openRender는 LOVE2D를 실행하거나 .love 아카이브를 만들지 않습니다. openrender/에서 생성된 Lua 모듈을 require하고, love.graphics.newImage로 이미지를 로드한 뒤, 평소 프로젝트 명령으로 LOVE2D를 실행합니다.",
    "File Overwrite": "파일 덮어쓰기",
    "Install refuses to overwrite destination files unless --force is passed. Use plan sprite --json, dry-run output, and report output before deciding to force an install.": "--force가 전달되지 않으면 설치는 대상 파일 덮어쓰기를 거부합니다. 강제 설치 여부를 결정하기 전에 plan sprite --json, 드라이런 출력, 리포트 출력을 사용합니다.",
    "Pack Sync Or Login Is Not Implemented": "팩 동기화 또는 로그인이 구현되지 않음",
    "0.3.1 includes built-in local pack list, pack inspect core, and recipe list metadata. Remote pack sync, login, and license refresh intentionally return not_implemented_in_0_3_1; local compile/install does not require an account.": "0.3.1에는 내장 로컬 pack list, pack inspect core, recipe list 메타데이터가 포함됩니다. 원격 팩 동기화, 로그인, 라이선스 갱신은 의도적으로 not_implemented_in_0_3_1을 반환하며, 로컬 컴파일/설치는 계정을 요구하지 않습니다."
  });

  const labels = {
    zh: {
      language: "语言选择器",
      primary: "主导航",
      docsNav: "文档导航",
      footer: "openRender 页脚",
      officialDocs: "官方文档",
      home: "openRender 主页"
    },
    ja: {
      language: "言語選択",
      primary: "主要ナビゲーション",
      docsNav: "ドキュメントナビゲーション",
      footer: "openRender フッター",
      officialDocs: "公式ドキュメント",
      home: "openRender ホーム"
    },
    ko: {
      language: "언어 선택",
      primary: "주요 탐색",
      docsNav: "문서 탐색",
      footer: "openRender 푸터",
      officialDocs: "공식 문서",
      home: "openRender 홈"
    },
    es: {
      language: "Selector de idioma",
      primary: "Navegación principal",
      docsNav: "Navegación de documentación",
      footer: "Pie de página de openRender",
      officialDocs: "Documentos oficiales",
      home: "Inicio de openRender"
    }
  };

  const codeBlockTranslations = {
    "local image file\n-> project scan\n-> media contract\n-> deterministic PNG artifact\n-> project install plan\n-> local files with snapshots\n-> verify and report\n-> agent uses generated paths/helpers\n-> rollback remains available": {
      zh: "本地图片文件\n-> 项目扫描\n-> 媒体契约\n-> 确定性 PNG 产物\n-> 项目安装计划\n-> 带快照的本地文件\n-> 验证与报告\n-> 代理使用生成的路径/辅助代码\n-> 回滚保持可用",
      ja: "ローカル画像ファイル\n-> プロジェクトスキャン\n-> メディア契約\n-> 決定的な PNG 成果物\n-> プロジェクトのインストール計画\n-> スナップショット付きローカルファイル\n-> 検証とレポート\n-> エージェントが生成済みパス/ヘルパーを使用\n-> ロールバックは利用可能",
      ko: "로컬 이미지 파일\n-> 프로젝트 스캔\n-> 미디어 계약\n-> 결정적 PNG 산출물\n-> 프로젝트 설치 계획\n-> 스냅샷이 포함된 로컬 파일\n-> 검증과 리포트\n-> 에이전트가 생성된 경로/헬퍼 사용\n-> 롤백은 계속 사용 가능",
      es: "archivo de imagen local\n-> escaneo del proyecto\n-> contrato de medios\n-> artefacto PNG determinístico\n-> plan de instalación del proyecto\n-> archivos locales con instantáneas\n-> verificar y reportar\n-> el agente usa rutas/helpers generados\n-> rollback sigue disponible"
    },
    "Use openRender to convert tmp/slime_idle_strip.png into an engine-ready sprite asset.\nDetect whether the project is Phaser, Godot, LOVE2D, PixiJS, or Canvas, inspect the core recipe metadata, run detect-frames if geometry is unclear, plan and dry-run first, install only if the plan is valid, verify the generated files, keep the local report and frame preview paths in your final answer, and reuse recipe context instead of spending tokens on repeated handoff reasoning.": {
      ko: "openRender를 사용해 tmp/slime_idle_strip.png를 엔진에서 바로 쓸 수 있는 스프라이트 애셋으로 변환하세요.\n프로젝트가 Phaser, Godot, LOVE2D 중 무엇인지 감지하고, 코어 레시피 메타데이터를 확인하고, 구조가 불명확하면 detect-frames를 실행하고, 먼저 계획과 드라이런을 수행하세요. 계획이 유효할 때만 설치하고, 생성된 파일을 검증하고, 최종 답변에 로컬 리포트와 프레임 미리보기 경로를 남기며, 반복적인 인계 추론에 토큰을 쓰지 말고 레시피 맥락을 재사용하세요."
    }
  };

  function normalize(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function currentLanguage() {
    const saved = window.localStorage.getItem(storageKey);
    return languages.some(([code]) => code === saved) ? saved : "en";
  }

  function activeLanguage(locale) {
    return languages.find(([code]) => code === locale) || languages[0];
  }

  function shouldSkip(element) {
    return Boolean(element.closest("script, style, pre, code, [translate='no']"));
  }

  function translateTextNodes(locale) {
    const dict = dictionary[locale] || {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }

    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || shouldSkip(parent) || parent.closest(".locale-switcher")) return;
      const key = normalize(node.nodeValue || "");
      const translated = dict[key];
      if (!translated) return;

      const leading = (node.nodeValue || "").match(/^\s*/)?.[0] || "";
      const trailing = (node.nodeValue || "").match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${translated}${trailing}`;
    });
  }

  function translateCodeBlocks(locale) {
    document.querySelectorAll("pre code.language-text").forEach((code) => {
      const key = normalize(code.textContent || "").replace(/\s*->\s*/g, "\n-> ");
      const translated = codeBlockTranslations[key]?.[locale];
      if (translated) code.textContent = translated;
    });
  }

  function translateTextSurface(locale) {
    const dict = dictionary[locale] || {};
    const selector = [
      "title",
      ".skip-link",
      ".sidebar-title",
      ".sidebar-section-title",
      ".doc-header .eyebrow",
      "h1",
      "h2",
      "h3",
      "p",
      "li",
      "td",
      "th",
      "a",
      "button",
      "strong",
      "span",
      "small",
      "svg text"
    ].join(",");

    document.querySelectorAll(selector).forEach((element) => {
      if (!element.isConnected || shouldSkip(element)) return;
      if (element.closest(".locale-switcher")) return;
      const key = normalize(element.textContent || "");
      const translated = dict[key];
      if (!translated) return;
      element.textContent = translated;
    });

    const pageTitle = normalize(document.title);
    if (dict[pageTitle]) document.title = dict[pageTitle];
    translateTextNodes(locale);
    translateCodeBlocks(locale);
  }

  function translateChrome(locale) {
    const text = labels[locale];
    if (!text) return;
    document.querySelectorAll("[data-language-switcher]").forEach((root) => {
      root.setAttribute("aria-label", text.language);
    });
    document.querySelectorAll(".brand, .footer-brand").forEach((link) => {
      link.setAttribute("aria-label", text.home);
    });
    const primaryNav = document.querySelector(".nav");
    if (primaryNav) primaryNav.setAttribute("aria-label", text.primary);
    const docsNav = document.querySelector(".sidebar");
    if (docsNav) docsNav.setAttribute("aria-label", text.docsNav);
    const footer = document.querySelector(".site-footer");
    if (footer) footer.setAttribute("aria-label", text.footer);
    const footerLinks = document.querySelector(".footer-links");
    if (footerLinks) footerLinks.setAttribute("aria-label", text.officialDocs);
  }

  function applyLocale(locale) {
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-language-switcher]").forEach((root) => {
      const label = root.querySelector("[data-locale-label]");
      const active = activeLanguage(locale);
      if (label) label.textContent = active[1];
      root.querySelectorAll("[data-locale-option]").forEach((option) => {
        const isActive = option.dataset.localeOption === locale;
        option.classList.toggle("is-active", isActive);
        option.setAttribute("aria-current", isActive ? "true" : "false");
      });
    });

    if (locale === "en") return;
    translateChrome(locale);
    translateTextSurface(locale);
  }

  function mountSwitcher(root) {
    const active = currentLanguage();
    root.className = "locale-switcher";
    root.innerHTML = `
      <button class="locale-button" type="button" aria-haspopup="true" aria-expanded="false">
        <span class="locale-globe" aria-hidden="true"></span>
        <span data-locale-label>${activeLanguage(active)[1]}</span>
        <span class="locale-caret" aria-hidden="true"></span>
      </button>
      <div class="locale-menu" role="menu">
        ${languages.map(([code, nativeName, englishName]) => `
          <button type="button" role="menuitem" data-locale-option="${code}">
            <span>${nativeName}</span>
            <small>${englishName}</small>
          </button>
        `).join("")}
      </div>
    `;

    const button = root.querySelector(".locale-button");
    const menu = root.querySelector(".locale-menu");
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      menu.classList.toggle("is-open", !expanded);
    });

    root.querySelectorAll("[data-locale-option]").forEach((option) => {
      option.addEventListener("click", () => {
        const locale = option.dataset.localeOption;
        window.localStorage.setItem(storageKey, locale);
        location.reload();
      });
    });

    document.addEventListener("click", (event) => {
      if (root.contains(event.target)) return;
      button.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    });
  }

  document.querySelectorAll("[data-language-switcher]").forEach(mountSwitcher);
  applyLocale(currentLanguage());
})();
