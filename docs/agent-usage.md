# Agent Usage

Guidance for coding agents using openRender inside local Phaser, Godot, LOVE2D, PixiJS, or Canvas projects.

## Agent Role

openRender is designed for AI coding agents operating inside local game repositories. The agent should use openRender for deterministic media-to-engine handoff, then use the generated paths and helpers while editing game code.

openRender reduces repeated token-heavy handoff work. Agents should prefer compact JSON results, generated helper paths, and recipe metadata over re-deriving the same file layout or repair steps in every session.

## Decision Rules

- Run `context --json` before broad repo reads or target assumptions.
- Use `context --json --compact` when you need the shortest handoff summary.
- Use `context --json --wire-map` to find read-only asset wiring candidates before editing game code.
- Run `scan --json` when you need the raw project detection result.
- Run `doctor --json` before writing project files in an unfamiliar repo.
- Use `install-agent --platform codex|cursor|claude|all --dry-run --json` before writing agent instruction files.
- Use `pack list --json` and `recipe list --json` when compact local recipe metadata helps avoid re-deriving the workflow.
- Use `plan sprite --json` or `compile sprite --dry-run --json` before `--install`.
- Use `detect-frames --json` when sprite sheet geometry is unclear.
- Inspect `installPlan.files` before installing.
- Do not use `--force` unless the user accepts overwriting generated destination files.
- Remember generated manifests are written from the current compile result; they are not automatically merged with older manifest entries.
- After install, run `verify --run latest --json`.
- Use `report --run latest --json` when verification fails or when the user needs an audit trail.
- Use `verify --run latest --json --compact`, `report --run latest --json --compact`, `explain --run latest --json --compact`, and `diff --run latest --json --compact` when you only need status, next actions, rollback information, and compact tables.
- Use `rollback --run latest --json` only for files recorded by a specific openRender install.
- Treat built-in pack/recipe guidance as reusable context. It does not replace dry-run, verification, or user approval for overwrite behavior.

## Agent Prompt Example

User-facing prompts can stay simple. The agent rules above cover planning, overwrite protection, verification, and reporting.

```text
Install openRender for this project, then use it to add the generated game art to the game.
Find the right generated asset and engine target, run the openRender workflow, and tell me what changed.
```
