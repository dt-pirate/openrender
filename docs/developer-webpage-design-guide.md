# openRender Developer Webpage Design Guide

Status: Draft guide  
Date: 2026-04-30  
Source spec: `docs/openRender_POC_v0.1.md`  
Target surface: Simple developer-facing public webpage  
Primary inspiration: Ollama homepage structure and restraint, not its exact visual identity

## 1. Purpose

This document defines the design direction for a simple openRender developer webpage.

The page should make one idea immediately clear:

```text
openRender is a local-first compiler that turns AI-generated media into engine-ready game assets.
```

The first public page is not a SaaS landing page, not a hosted playground, and not a generic AI art product page. It is a compact developer page for people who want to understand and try a local CLI.

The page should feel close to the developer confidence of Ollama: quiet, direct, command-line friendly, open-source oriented, and easy to start. It must not look copied. openRender needs its own identity: media-to-engine pipelines, Phaser-ready artifacts, local reports, rollback, and agent-friendly commands.

## 2. Design Principles

### 2.1. Developer-first, not marketing-first

The page should prioritize comprehension over persuasion.

Use short, concrete claims:

- Local-first CLI
- Image-to-Phaser POC
- Installable generated assets
- Report, verify, rollback
- No account, no billing, no cloud dependency in v0.1

Avoid broad AI hype:

- Do not say "revolutionary"
- Do not say "all-in-one game creation platform"
- Do not imply model generation is included
- Do not imply cloud hosting exists
- Do not imply Unity/Godot support exists in v0.1

### 2.2. Inspired by Ollama, distinct from Ollama

Borrow these qualities:

- Minimal top navigation
- Large restrained hero type
- Immediate terminal command
- Strong first CTA
- Calm neutral background
- Simple section rhythm
- Sparse copy
- Developer trust through exact commands

Do not copy these qualities too closely:

- Do not reuse the same hero wording rhythm
- Do not center the entire identity around one install command only
- Do not imitate Ollama's exact spacing, color, typography, button shape, or homepage section order
- Do not use the same nav item set
- Do not use a cloud pricing block in the POC page
- Do not use product phrasing that could be mistaken for Ollama's model runtime positioning

openRender's own signal should be:

```text
raw image -> contract -> Phaser-ready asset -> install -> report -> rollback
```

### 2.3. Local-first trust

The page should repeatedly reinforce that v0.1 is local:

- The CLI runs in the user's project
- Generated artifacts stay local
- Reports are local HTML/JSON files
- There is no account
- There is no billing
- There is no cloud API
- There is no model provider call in the POC path

This should feel like a product constraint, not a disclaimer.

### 2.4. Actual product surface over abstraction

The page must show the thing developers can run.

Primary visuals should be:

- Terminal command block
- Media pipeline strip
- Example output file tree
- Report preview screenshot or report mock
- Phaser helper code snippet

Avoid purely decorative visuals:

- No gradient blobs
- No abstract AI network illustrations
- No floating 3D shapes
- No generic robot imagery
- No stock game-art collage

## 3. Target Audience

### 3.1. Primary user

An individual developer using Codex, Cursor, Claude Code, or another coding agent to build a Web 2D prototype.

They already have or can create:

- A Vite project
- Phaser installed
- A generated raw image
- A terminal workflow

They want:

- A repeatable way to turn raw generated images into usable game assets
- Less custom scripting
- Stable frame slicing and output paths
- A report that both a human and an agent can inspect
- Safe rollback if generated files are wrong

### 3.2. Secondary user

An open-source or toolchain-oriented developer evaluating whether openRender is a useful compiler layer for agentic game development.

They care about:

- Clear scope
- Clean contracts
- Local operation
- Adapter architecture
- Future support for media beyond images

### 3.3. Non-target users for this page

The page should not optimize for:

- Artists looking for an AI image generator
- Buyers looking for an asset marketplace
- SaaS users looking for hosted generation
- Teams comparing enterprise pricing
- Users seeking Unity/Godot support today

## 4. Recommended Page Strategy

### 4.1. Chosen approach

Use a single-page developer homepage with a sparse, documentation-adjacent layout:

```text
Header
Hero with command and pipeline visual
Quickstart
How it works
What gets written
Local report and rollback
Scope and limitations
Developer docs footer
```

This approach is recommended because openRender is still a v0.1 POC. The page should help a developer understand and try the CLI, not create a large commercial impression that the product cannot yet support.

### 4.2. Rejected approach: SaaS landing page

Do not use:

- Big gradient hero
- Customer logos
- Pricing cards
- "Book a demo"
- Feature grid with vague AI claims
- Cloud-first language

Why rejected:

The POC explicitly excludes account, billing, cloud API, and hosted playground. A SaaS page would misrepresent the project.

### 4.3. Rejected approach: full documentation homepage

Do not make the first screen look like only a docs portal.

Why rejected:

The page still needs a strong product signal. Developers should understand the category and value before diving into CLI details.

### 4.4. Rejected approach: game-art showcase

Do not make the page look like an asset generator or art gallery.

Why rejected:

openRender does not generate images. It compiles already-generated media into engine-ready project components.

## 5. Information Architecture

### 5.1. Header

Header goals:

- Make the brand visible
- Keep navigation small
- Prioritize install/get started

Recommended nav:

```text
openRender
Docs
CLI
Contracts
GitHub
```

Recommended actions:

```text
Get started
```

Header layout:

- Left: `openRender` wordmark
- Center or right: small text links
- Far right: bordered or filled `Get started` button
- Mobile: brand left, menu icon right, CTA inside menu

Avoid:

- Pricing
- Sign in
- Dashboard
- Cloud
- Playground

These surfaces are outside the v0.1 POC.

### 5.2. Hero

The hero should identify openRender as a product immediately.

Recommended H1:

```text
openRender
```

Recommended supporting line:

```text
Local-first media-to-engine compiler for agentic game development.
```

Alternative supporting line:

```text
Turn raw generated images into Phaser-ready assets, reports, and rollbackable local project changes.
```

Hero should include:

- One-line category
- Short paragraph
- Terminal command
- Primary CTA
- Secondary docs link
- Compact pipeline visual

Hero should not exceed the first viewport. The next section should peek above the fold on common desktop and mobile sizes.

Recommended hero composition:

```text
Left column:
  openRender
  Local-first media-to-engine compiler...
  command block
  CTA row

Right column:
  pipeline visual or local report preview
```

On mobile:

```text
Brand headline
Short description
Command block
CTA row
Pipeline visual
```

The hero should not use a large decorative card. It can use a terminal panel and a report panel because those represent real product surfaces.

### 5.3. Hero command block

The command block is the main conversion point.

Recommended command:

```bash
pnpm dev:cli compile sprite \
  --from tmp/slime_raw.png \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json
```

For a public packaged version, use:

```bash
openrender compile sprite \
  --from tmp/slime_raw.png \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json
```

The webpage should choose one depending on release state:

- Before package release: show `pnpm dev:cli` with a "from source" label
- After package release: show `openrender`

Command block behavior:

- Include a copy button with a copy icon
- Keep monospace text readable
- Allow horizontal scroll on mobile instead of wrapping command flags poorly
- Use syntax highlighting lightly
- Show a small label such as `local CLI`

Do not include:

- curl install script unless the package install path is real
- API key setup
- login command
- cloud endpoint

### 5.4. Pipeline visual

The page needs one openRender-specific visual identity element.

Recommended pipeline:

```text
raw image
contract
visual harness
Phaser output
local report
rollback
```

Visual style:

- Use small rectangular nodes
- Use thin connector lines
- Use file/path labels
- Include one tiny sprite frame strip
- Include one report thumbnail

This visual should be precise, not decorative.

Do not use:

- A generic flowchart that could belong to any AI tool
- Heavy SVG illustration
- Animated particles
- Large mascot

### 5.5. Quickstart section

Purpose:

Help developers know the first three commands.

Recommended content:

```text
1. Initialize local state
2. Compile and install a sprite
3. Verify and open the report
```

Example:

```bash
openrender init
openrender compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 6 --frame-size 64x64 --install
openrender verify --run latest
openrender report --run latest --open
```

Layout:

- Full-width section
- Three compact steps
- Each step has a short title, one command, and one sentence
- Avoid nested cards
- If cards are used, use one card per step only

### 5.6. How it works section

Purpose:

Explain the actual compiler loop from the POC spec.

Recommended section title:

```text
From generated media to playable project files
```

Content blocks:

- `Scan`: detects Vite, Phaser, source root, asset root
- `Compile`: reads image metadata, validates frames, writes artifacts
- `Install`: copies assets and writes manifest/codegen
- `Verify`: checks artifacts and installed files
- `Report`: writes local HTML/JSON
- `Rollback`: restores snapshots or deletes generated files

Each block should name real files:

```text
.openrender/artifacts/{run_id}/
.openrender/runs/latest.json
public/assets/{asset}.png
src/assets/openrender-manifest.ts
src/openrender/animations/{asset}.ts
.openrender/reports/latest.html
```

### 5.7. What gets written section

Purpose:

Build trust by showing exactly what openRender changes.

Recommended layout:

```text
Before
  tmp/slime_raw.png

After
  .openrender/artifacts/run_.../enemy-slime-idle.png
  public/assets/enemy-slime-idle.png
  src/assets/openrender-manifest.ts
  src/openrender/animations/enemy-slime-idle.ts
  .openrender/reports/latest.html
```

Visual treatment:

- Use a file tree panel
- Highlight generated files
- Use muted labels for local state
- Use a clear "no upload" note nearby

Avoid saying "safe" without showing why. Instead show:

```text
Snapshots are written before install. Rollback restores or deletes installed files.
```

### 5.8. Report section

Purpose:

Show that openRender is not just a converter. It creates inspectable records.

Recommended title:

```text
Reports for humans and agents
```

Show:

- HTML report preview
- JSON run record mention
- Visual overlay for asset bounds or frame slices
- Verification checks

Copy should emphasize:

- The agent can read the run JSON
- A human can inspect the HTML report
- The report is local
- No project files are uploaded

### 5.9. Scope section

Purpose:

Set expectations without weakening the page.

Recommended title:

```text
v0.1 scope is intentionally narrow
```

Use two columns:

Included:

- Vite + Phaser
- Image assets
- Transparent sprites
- Sprite frame sets
- Local CLI
- Local report
- Rollback

Not included:

- Account
- Billing
- Cloud API
- Hosted playground
- Model provider calls
- Audio/video compiler
- Full MCP server
- Godot/Pixi/Unity adapters

This section should be visually calm and direct. It should not feel like legal fine print.

### 5.10. Footer

Footer links:

- Docs
- Quickstart
- CLI reference
- Contracts
- GitHub
- License

Footer tone:

- Sparse
- No newsletter unless there is a real mailing list
- No social links unless official accounts exist

## 6. Visual System

### 6.1. Overall feel

Desired feel:

- Quiet
- Technical
- Precise
- Local
- Open-source
- Slightly tactile through file/report surfaces

Avoid:

- Neon cyberpunk
- Purple AI SaaS gradients
- Heavy dark-mode dashboard
- Beige-only editorial page
- Game marketplace look
- Decorative card-heavy page

### 6.2. Color palette

The palette should be neutral and developer-friendly, but not an Ollama clone.

Recommended tokens:

```css
--color-canvas: #fafaf7;
--color-surface: #ffffff;
--color-ink: #141414;
--color-muted: #66625d;
--color-subtle: #8a857d;
--color-rule: #e4e0d7;
--color-code-bg: #111111;
--color-code-fg: #f6f3ec;
--color-accent: #0f766e;
--color-accent-strong: #0d9488;
--color-link: #1d4ed8;
--color-success: #16a34a;
--color-warning: #b45309;
```

Usage:

- Canvas uses warm off-white, but keep it close to white
- Main text uses near-black
- Code panels use black or deep charcoal
- Accent teal is for pipeline edges, verification, and active UI
- Blue is for documentation links
- Do not let beige, teal, blue, or dark charcoal dominate the whole page alone

Do not use:

- Purple-blue gradient as the brand signature
- Large beige/tan fields with brown text
- Blue/slate-only dashboard palette
- Rainbow AI gradient

### 6.3. Typography

Recommended typography:

- Sans: system UI stack or a clean grotesk such as Inter/Geist if already available
- Mono: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, monospace

Type scale:

```css
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-md: 18px;
--text-lg: 22px;
--text-xl: 30px;
--text-hero: 64px;
```

Responsive type:

- Do not scale font size directly with viewport width
- Use breakpoint-based sizes
- Keep mobile hero around 42px
- Keep desktop hero around 64px to 72px
- Letter spacing should stay at `0`

Tone:

- H1 should be calm and large
- Body copy should be concise
- Code should be highly readable
- Section headings should be direct, not clever

### 6.4. Layout

Page width:

```css
--max-content: 1120px;
--max-readable: 720px;
```

Spacing:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 72px;
--space-9: 96px;
```

Layout rules:

- Use wide whitespace
- Keep content aligned to a consistent grid
- Prefer full-width sections with constrained inner content
- Do not put page sections inside large floating cards
- Do not put cards inside cards
- Use cards only for repeated items, terminal panels, report panels, or step blocks
- Border radius should be 8px or less
- Rules/dividers should be thin and quiet

### 6.5. Component style

Buttons:

- Primary: filled dark or accent
- Secondary: subtle outline
- Height: 40px to 44px
- Radius: 6px to 8px
- Use icons only when they improve recognition
- For copy buttons, use a copy icon with tooltip

Links:

- Underline on hover
- Keep nav links understated
- Use blue or ink, not bright accent everywhere

Code panels:

- Dark background
- Rounded 8px
- Thin border
- Copy button top right
- Preserve command indentation
- Use horizontal scroll on mobile

File tree panels:

- Light surface
- Mono text
- Muted path prefixes
- Accent highlight for generated outputs

Pills/badges:

- Use sparingly
- Good labels: `local`, `v0.1`, `Phaser`, `image-only`, `no account`
- Avoid filling the page with badges

Icons:

- Use lucide icons if the frontend stack includes lucide
- Suggested icons: Terminal, FileCode, Image, RotateCcw, CheckCircle, Shield, Copy, Github
- Keep icon strokes thin and consistent

## 7. Copywriting Guide

### 7.1. Voice

Voice should be:

- Direct
- Plain
- Technically specific
- Developer-respectful
- Honest about scope

Do not over-explain the obvious. Do not hide limitations.

### 7.2. Recommended hero copy

Option A:

```text
openRender
Local-first media-to-engine compiler for agentic game development.

Turn raw generated images into Phaser-ready assets, codegen, local reports, and rollbackable project changes.
```

Option B:

```text
openRender
Compile generated media into game-ready project files.

Start with image-to-Phaser assets today. Keep the workflow local, inspectable, and agent-friendly.
```

Option C:

```text
openRender
From raw image to Phaser-ready asset.

A local CLI for compiling, installing, verifying, reporting, and rolling back generated game media.
```

Recommended: Option A. It is closest to the POC positioning while still being short.

### 7.3. CTA copy

Primary CTA:

```text
Get started
```

Secondary CTA:

```text
Read the CLI reference
```

Alternative:

```text
View contracts
```

Avoid:

```text
Start building with AI
Try the cloud
Generate assets
Sign up free
```

These either overpromise or contradict POC scope.

### 7.4. Section title examples

Good:

```text
Run it inside your project
What openRender writes
Reports for humans and agents
v0.1 scope is intentionally narrow
Designed for rollback
```

Avoid:

```text
Unleash creativity
The future of game assets
AI-powered magic
Create anything instantly
```

## 8. Page Wireframe

### 8.1. Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ openRender        Docs  CLI  Contracts  GitHub   Get started │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ openRender                      ┌──────────────────────────┐ │
│ Local-first media-to-engine     │ raw image -> contract    │ │
│ compiler for agentic game dev.  │ -> harness -> Phaser     │ │
│                                 │ -> report -> rollback    │ │
│ ┌───────────────────────────┐   └──────────────────────────┘ │
│ │ openrender compile ...    │                                │
│ └───────────────────────────┘                                │
│ [Get started] [CLI reference]                                │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Quickstart: init / compile / verify                          │
├──────────────────────────────────────────────────────────────┤
│ How it works: scan / compile / install / verify / report      │
├──────────────────────────────────────────────────────────────┤
│ What gets written: file tree                                  │
├──────────────────────────────────────────────────────────────┤
│ Local report preview + rollback note                          │
├──────────────────────────────────────────────────────────────┤
│ v0.1 included / not included                                  │
└──────────────────────────────────────────────────────────────┘
```

### 8.2. Mobile wireframe

```text
┌──────────────────────────┐
│ openRender          menu │
├──────────────────────────┤
│ openRender               │
│ Local-first media...     │
│                          │
│ ┌──────────────────────┐ │
│ │ openrender compile   │ │
│ └──────────────────────┘ │
│ [Get started]            │
│ [CLI reference]          │
│                          │
│ raw -> contract -> ...   │
├──────────────────────────┤
│ Quickstart               │
│ Step 1                   │
│ Step 2                   │
│ Step 3                   │
└──────────────────────────┘
```

Mobile requirements:

- No overlapping text
- No clipped command buttons
- Command blocks scroll horizontally
- CTA buttons can stack
- Header remains simple
- Pipeline visual can become a vertical list

## 9. Interaction Guidelines

### 9.1. Copy command

Command panels should include copy behavior.

States:

- Default: copy icon
- Hover: tooltip `Copy command`
- Copied: check icon and `Copied`
- Error: keep command visible, no intrusive alert

### 9.2. Tabs or segmented controls

Use tabs only where they reduce clutter.

Possible tab groups:

- `From source` / `Installed CLI`
- `Sprite frame set` / `Transparent sprite`
- `HTML report` / `JSON run`

Do not add tabs just for visual sophistication.

### 9.3. Motion

Motion should be minimal:

- Subtle hover states
- Optional short pipeline reveal on first load
- No constant animation
- No animated background
- No scroll-jacking

The page should feel fast and stable.

## 10. Accessibility

Requirements:

- Body text contrast should meet WCAG AA
- Code text must be readable on dark background
- Buttons need visible focus states
- Icons used without text need `aria-label`
- Copy buttons need screen-reader labels
- Pipeline visual needs text fallback
- Do not rely on color alone for status
- Command blocks should be selectable text
- Links must be keyboard reachable

Recommended focus style:

```css
outline: 2px solid #0d9488;
outline-offset: 2px;
```

## 11. Responsive Rules

Breakpoints:

```css
mobile: < 640px
tablet: 640px - 1023px
desktop: >= 1024px
wide: >= 1280px
```

Rules:

- Desktop hero can use two columns
- Tablet can keep two columns if command block remains readable
- Mobile should stack everything
- Keep max content width around 1120px
- Keep readable text width around 720px
- Avoid viewport-width font scaling
- Do not let long file paths overflow without scroll or wrapping

## 12. Implementation Notes For Future Build

### 12.1. Recommended route

If implemented in a web app later, use:

```text
/
```

as the product/developer homepage.

If docs are separate, use:

```text
/docs
/docs/quickstart
/docs/cli
/docs/contracts
```

### 12.2. Recommended assets

Use real or product-derived visuals:

- Screenshot of generated report
- Screenshot of CLI output
- Tiny generated sprite strip fixture
- File tree from a sample run

Do not use unrelated stock images.

### 12.3. Content source of truth

Use these docs as source:

- `docs/openRender_POC_v0.1.md`
- `docs/quickstart-phaser.md`
- `docs/cli-reference.md`
- `docs/contracts.md`
- `docs/known-limitations.md`

If implementation and docs differ, prefer current CLI behavior and update docs separately.

### 12.4. Suggested section data model

If using React or another component framework, keep page content structured:

```ts
type QuickstartStep = {
  title: string;
  command: string;
  description: string;
};

type PipelineStage = {
  label: string;
  detail: string;
  output?: string;
};

type ScopeItem = {
  label: string;
  included: boolean;
};
```

This makes it easier to keep copy consistent with docs.

## 13. Quality Checklist

Before shipping the page, verify:

- The first viewport clearly says `openRender`
- The page does not look like a copied Ollama page
- The main command is real for the current release state
- No account, pricing, API key, cloud, or hosted playground is implied
- The POC scope is clear
- The page shows actual files or commands
- The color palette is not one-note beige, purple, or dark blue
- Text does not overlap on mobile
- Long commands and file paths remain readable
- Buttons have hover and focus states
- Copy buttons work
- The report preview uses a real or faithful product visual
- The page loads without external heavy visual dependencies
- Links point to existing docs

## 14. Summary Direction

The developer webpage should feel like a restrained open-source tool page:

```text
Ollama-like in clarity and developer immediacy.
openRender-specific in pipeline visuals, local asset outputs, reports, and rollback.
```

The winning design is not a large AI landing page. It is a precise developer entry point that helps someone understand the POC, copy a command, and trust what the CLI will write to their project.
