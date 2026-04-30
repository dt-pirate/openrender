# Release Checklist

This checklist is for publishing openRender v0.1 from the public monorepo.

Do not publish until every required item is checked.

## Preconditions

- [ ] Working tree is clean.
- [ ] `main` is pushed to `origin/main`.
- [ ] GitHub Actions CI is green on the release commit.
- [ ] `README.md`, `docs/quickstart-phaser.md`, and `docs/cli-reference.md` describe the current command surface.
- [ ] No private assets, reports, credentials, `.env` files, or generated `.openrender` state are tracked.
- [ ] npm account has permission to publish the `@openrender` scope.

## Local Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

Run the source CLI smoke loop in a temporary Vite + Phaser-shaped project:

```bash
repo_root="$(pwd)"
pnpm build
tmp="$(mktemp -d)"
cd "$tmp"
cat > package.json <<'JSON'
{"name":"openrender-smoke-game","dependencies":{"vite":"^5.0.0","phaser":"^3.0.0"}}
JSON
mkdir -p tmp src
node -e 'require("node:fs").writeFileSync("tmp/slime_raw.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"))'
node "$repo_root/packages/cli/dist/index.js" init --json
node "$repo_root/packages/cli/dist/index.js" scan --json
node "$repo_root/packages/cli/dist/index.js" compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 1 --frame-size 1x1 --install --json
node "$repo_root/packages/cli/dist/index.js" verify --run latest --json
node "$repo_root/packages/cli/dist/index.js" report --run latest --json
node "$repo_root/packages/cli/dist/index.js" rollback --run latest --json
```

## Pack Verification

Pack every publishable workspace package:

```bash
pack_dir="$(mktemp -d)"
pnpm --filter @openrender/core pack --pack-destination "$pack_dir"
pnpm --filter @openrender/adapter-phaser pack --pack-destination "$pack_dir"
pnpm --filter @openrender/reporter pack --pack-destination "$pack_dir"
pnpm --filter @openrender/doctor pack --pack-destination "$pack_dir"
pnpm --filter @openrender/harness-visual pack --pack-destination "$pack_dir"
pnpm --filter @openrender/cli pack --pack-destination "$pack_dir"
```

Install the packed tarballs into a temporary project and confirm the CLI starts:

```bash
mkdir -p "$pack_dir/install"
cd "$pack_dir/install"
npm init -y
npm install \
  "$pack_dir"/openrender-core-0.1.0.tgz \
  "$pack_dir"/openrender-adapter-phaser-0.1.0.tgz \
  "$pack_dir"/openrender-reporter-0.1.0.tgz \
  "$pack_dir"/openrender-doctor-0.1.0.tgz \
  "$pack_dir"/openrender-harness-visual-0.1.0.tgz \
  "$pack_dir"/openrender-cli-0.1.0.tgz
./node_modules/.bin/openrender --version
```

Expected output:

```text
0.1.0
```

## Publish Order

Publish packages in dependency order:

1. `@openrender/core`
2. `@openrender/adapter-phaser`
3. `@openrender/reporter`
4. `@openrender/doctor`
5. `@openrender/harness-visual`
6. `@openrender/cli`

Use the `latest` tag only when the v0.1 package set is ready:

```bash
pnpm --filter @openrender/core publish --access public
pnpm --filter @openrender/adapter-phaser publish --access public
pnpm --filter @openrender/reporter publish --access public
pnpm --filter @openrender/doctor publish --access public
pnpm --filter @openrender/harness-visual publish --access public
pnpm --filter @openrender/cli publish --access public
```

If publishing a dry-run first:

```bash
pnpm --filter @openrender/cli publish --dry-run
```

## Post-Publish Verification

Install from npm in a temporary project:

```bash
tmp="$(mktemp -d)"
cd "$tmp"
npm init -y
npm install @openrender/cli
npx openrender --version
```

Then run the full v0.1 smoke loop:

```bash
mkdir -p tmp src
node -e 'require("node:fs").writeFileSync("tmp/slime_raw.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"))'
npx openrender init --json
npx openrender scan --json
npx openrender compile sprite --from tmp/slime_raw.png --id enemy.slime.idle --frames 1 --frame-size 1x1 --install --json
npx openrender verify --run latest --json
npx openrender report --run latest --json
npx openrender rollback --run latest --json
```

## GitHub Release

- [ ] Create tag `v0.1.0`.
- [ ] Create GitHub Release from the tag.
- [ ] Include the CI run URL for the release commit.
- [ ] Include npm package names and versions.
- [ ] State v0.1 limitations clearly: local only, image only, Vite + Phaser only, no MCP server.

## Do Not Release If

- CI is failing.
- A package tarball contains tests, tsbuildinfo, local state, or private files.
- README install commands describe unpublished packages as already available.
- Any command requires credentials, cloud sync, telemetry, billing, or account setup.
