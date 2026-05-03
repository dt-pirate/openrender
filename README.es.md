<div align="center">
  <h1>openRender</h1>
  <h3>Infraestructura local de handoff de assets para desarrollo de juegos con IA</h3>
  <p>
    openRender convierte imagenes de juego ya generadas en archivos listos para el proyecto,
    con planes de instalacion, codigo auxiliar, reportes, verificacion y registros de rollback.
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a>
  </p>
  <p>
    <a href="./AGENT_USAGE.md">Agent Usage</a> •
    <a href="./docs/LLM-OPTIMIZED-REFERENCE.md">LLM Reference</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## Que es openRender?

openRender es un Developer Kit local-first para agentes de codigo con IA que necesitan colocar arte de juego generado dentro de proyectos reales.

Los generadores de imagenes crean pixeles. Los proyectos de juego necesitan rutas estables, metadatos de frames, manifests, codigo auxiliar, previsualizaciones, reportes y una forma de deshacer la instalacion. openRender ofrece esa capa de handoff para que los agentes dejen de adivinar y mantengan el estado del proyecto revisable.

El core actual `0.6.1` soporta handoff de imagenes para Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite y Canvas plano + Vite.

## Inicio rapido

Los paquetes estan preparados para desarrollo local. Hasta que se publiquen, ejecuta la CLI desde este repositorio.

```bash
pnpm install
pnpm build
```

Para un uso guiado por agentes, empieza pidiendo la tarea al agente de codigo en lenguaje natural. El agente debe encontrar la imagen generada correcta, inspeccionar el proyecto y elegir los comandos seguros de openRender segun el contexto.

```text
Encuentra la imagen sprite generada en este proyecto y usa openRender para instalarla con seguridad.
Detecta el motor, planifica y ejecuta primero un dry-run; instala solo si el plan es valido, verifica el resultado y devuelve las rutas generadas, el reporte, la preview y el comando rollback.
```

La secuencia CLI siguiente sirve para verificacion del agente y referencia manual.

Desde un proyecto de juego objetivo:

```bash
cd /path/to/game-project

node /path/to/openrender/packages/cli/dist/index.js context --json
node /path/to/openrender/packages/cli/dist/index.js context --json --compact
node /path/to/openrender/packages/cli/dist/index.js scan --json
node /path/to/openrender/packages/cli/dist/index.js doctor --json
```

Para instalar instrucciones locales para agentes de codigo, revisa primero el dry-run:

```bash
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform all --dry-run --json
node /path/to/openrender/packages/cli/dist/index.js install-agent --platform codex --json
```

Planifica y ejecuta un dry-run antes de escribir archivos:

```bash
node /path/to/openrender/packages/cli/dist/index.js plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Instala solo cuando el plan sea correcto:

```bash
node /path/to/openrender/packages/cli/dist/index.js compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --install \
  --json

node /path/to/openrender/packages/cli/dist/index.js verify --run latest --json
node /path/to/openrender/packages/cli/dist/index.js report --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js explain --run latest --json --compact
node /path/to/openrender/packages/cli/dist/index.js diff --run latest --json --compact
```

Cuando un agente necesite saber donde conectar helpers generados, usa `context --json --wire-map` para obtener candidatos de solo lectura.

Revierte la ultima instalacion de openRender:

```bash
node /path/to/openrender/packages/cli/dist/index.js rollback --run latest --json
```

Puedes usar `--target phaser`, `--target godot`, `--target love2d`, `--target pixi` o `--target canvas`.

## Como funciona

```text
local image
-> project scan
-> media contract
-> deterministic artifact
-> install plan
-> engine-shaped files
-> verify and report
-> agent handoff summary
-> rollback remains available
```

openRender guarda el estado de cada ejecucion en `.openrender/`, incluyendo artifacts, previews, reports, run records y rollback snapshots.

## Capacidades principales

- Escaneo de proyecto y checks de doctor.
- Planes de sprite, dry-runs, instalaciones, verificacion, reportes, diffs, explicaciones y rollback.
- Salida compacta para agentes en context, verificacion, reportes, explain y diff.
- Wiring map de solo lectura para posibles puntos de conexion en el codigo del juego.
- Diagnostico alpha, deteccion de frames, presets de normalizacion, invariants de sprites y hojas de preview de frames.
- Adaptadores para Phaser, Godot, LOVE2D, PixiJS y Canvas.
- JSON schemas, resumenes compactos para agentes, recipes, fixture capture y golden fixtures.
- Helpers locales JSON-only de metadata MCP para los targets soportados.

## Salidas por engine

| Target | Output Shape |
|---|---|
| Vite + Phaser | Assets PNG, manifest TypeScript, helpers de animacion, snippets de preload |
| Godot 4 | Assets PNG, helpers GDScript, helpers de animacion, rutas `res://` |
| LOVE2D | Assets PNG, modulo Lua, metadata de animacion, snippets load/draw |
| PixiJS + Vite | Assets PNG, spritesheet JSON opcional, helpers Pixi en TypeScript |
| Canvas + Vite | Assets PNG, manifest TypeScript, helpers para cargar imagenes y dibujar frames |

## Reglas para agentes

- Ejecuta `context --json` antes de leer ampliamente o asumir el tipo de proyecto.
- Usa `context --json --compact` para el handoff mas corto.
- Usa `context --json --wire-map` antes de editar codigo de juego que conecta helpers generados.
- Ejecuta `doctor --json` antes de escribir en un proyecto desconocido.
- Usa `plan sprite --json` o `compile sprite --dry-run --json` antes de `--install`.
- Inspecciona `installPlan.files` antes de instalar.
- No pases `--force` salvo que el usuario acepte sobrescribir archivos de destino.
- Trata los manifests generados como archivos escritos desde el resultado actual de compile, no como merges automaticos con entradas anteriores.
- Despues de instalar, ejecuta `verify --run latest --json`.
- Usa `rollback --run latest --json` solo para la instalacion de openRender.

## Estructura del repositorio

```text
packages/core              shared config, contracts, paths, and run state
packages/cli               openrender command-line interface
packages/harness-visual    image metadata, normalization, crop, and frame checks
packages/adapters/*        engine-specific project output helpers
packages/reporter          report and preview generation
packages/doctor            environment diagnostics
packages/mcp-server        local JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    local recipe metadata for supported targets
```

## Desarrollo

Requisitos:

- Node.js 22 o superior
- pnpm 10 o superior

Ejecutar checks:

```bash
pnpm typecheck
pnpm test
```

Ejecutar la CLI desde el codigo fuente:

```bash
pnpm build
node packages/cli/dist/index.js --version
```

## Contact

For project questions, contact `stelify87@gmail.com`.
