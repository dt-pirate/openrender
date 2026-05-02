# openRender Golden Fixtures

Golden fixtures keep adapter behavior stable without requiring contributors to attach full private projects.

Each fixture contains:

- `fixture.json`: source image payload, target CLI arguments, and expected output shape.
- Generated test input files are created in a temporary project during tests.

The fixture runner lives in `packages/cli/src/fixtures.test.ts`.
