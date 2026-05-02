# Agent Usage

Guidance for coding agents using openRender inside local Phaser, Godot, or LOVE2D projects.

## Agent Role

openRender is designed for AI coding agents operating inside local game repositories. The agent should use openRender for deterministic media-to-engine handoff, then use the generated paths and helpers while editing game code.

## Decision Rules

- Run `scan --json` before assuming the target project type.
- Run `doctor --json` before writing project files in an unfamiliar repo.
- Prefer `compile sprite --dry-run --json` before `--install`.
- Inspect `installPlan.files` before installing.
- Do not use `--force` unless the user accepts overwriting generated destination files.
- Remember generated manifests are written from the current compile result; they are not automatically merged with older manifest entries.
- After install, run `verify --run latest --json`.
- Use `report --run latest --json` when verification fails or when the user needs an audit trail.
- Use `rollback --run latest --json` only for files recorded by a specific openRender install.

## Agent Prompt Example

```text
Use openRender to convert tmp/slime_idle_strip.png into an engine-ready sprite asset.
Detect whether the project is Phaser, Godot, or LOVE2D, dry-run first, install only if the plan is valid, verify the generated files, and keep the local report path in your final answer.
```
