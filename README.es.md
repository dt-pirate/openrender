<div align="center">
  <h1>openRender</h1>
  <h3>Infraestructura de estado para desarrollo de juegos nativo de agentes IA</h3>
  <p>
    openRender da a los agentes de codigo con IA una capa local de estado de proyecto para continuar el desarrollo del juego:
    memoria compacta, evidencia visual, handoff al motor, verificacion, reportes y rollback.
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
    <a href="./AGENT_USAGE.md#skill-setup">Agent Skill</a> •
    <a href="./ADAPTER_AUTHORING.md">Adapter Authoring</a> •
    <a href="./RECIPES.md">Recipes</a> •
    <a href="./ROADMAP.md">Roadmap</a> •
    <a href="./RELEASES.md">Releases</a>
  </p>
  <p>
    <a href="https://github.com/dt-pirate/openrender/releases/tag/v1.1.1"><img alt="Release" src="https://img.shields.io/badge/release-v1.1.1-111827.svg"></a>
    <a href="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dt-pirate/openrender/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg"></a>
    <a href="./package.json"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22-2f8f7a.svg"></a>
    <a href="./package.json"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-f69220.svg"></a>
  </p>
</div>

---

## Que es openRender?

openRender es infraestructura local de estado para agentes de codigo con IA que necesitan mantener coherente un proyecto de juego a traves de muchos ciclos de build, test y refinamiento.

Los agentes pierden continuidad cuando la intencion del proyecto, el gusto del creador, la direccion visual, las restricciones del motor y el estado de recuperacion viven solo en el chat. openRender guarda esas senales como estado derivado del proyecto y las une a un handoff determinista de medios: planes, helper paths, wire maps, reportes, verificacion y rollback.

Los modelos de imagen crean pixeles; openRender mantiene esos pixeles utilizables dentro de un proyecto real. No reemplaza el motor ni edita automaticamente gameplay code. Le da al siguiente agente suficiente contexto compacto para continuar desde el estado real del proyecto.

La memoria de openRender no es una capa para tomar notas. Guarda eventos derivados, conclusiones, tarjetas de proyecto, tarjetas de agente, tarjetas de gusto del creador, tarjetas de direccion del juego, tarjetas de evitacion visual e indice compacto de evidencia visual para que la siguiente tarea del agente reciba el contexto correcto sin releer logs completos ni pedir a una API de modelo que regenere assets.

El core actual `1.1.1` soporta continuidad del gusto del creador, tarjetas de direccion del juego, memoria de evitacion visual, briefs de evidencia visual, revision de drift por run, loop task packets, service snapshots y handoff determinista de sprites, animaciones, audio, atlas/tileset y UI para Vite + Phaser, Godot 4, LOVE2D, PixiJS + Vite, Three.js + Vite, Canvas plano + Vite y proyectos Unity.

## Inicio rapido

Instala el paquete CLI de npm y usa el comando `openrender` desde un proyecto de juego cuando un agente necesite contexto de proyecto, memoria, verificacion o handoff de medios:

```bash
npm install -g @openrender/cli
openrender --version
```

El nombre del paquete npm es `@openrender/cli`; el comando instalado es `openrender`. El nombre npm sin scope `openrender` ya pertenece a otro maintainer, asi que `npm install -g openrender` no es la ruta de release salvo que ese nombre se transfiera mas adelante.

Para desarrollo basado en el repositorio, compila la CLI desde source:

```bash
pnpm install
pnpm build
```

Para un uso guiado por agentes, instala openRender para el proyecto y luego dile al agente de codigo que lo use. El agente puede elegir los comandos exactos de openRender desde las instrucciones y referencias del proyecto.

```text
Instala openRender para este proyecto, lee el compact project context y continua la siguiente tarea de desarrollo sin perder direccion visual, restricciones del motor ni estado de recuperacion.
Usa openRender para memoria, verificacion, reportes y handoff de medios con rollback. Dime que cambio y que debe saber el siguiente agente.
```

Tambien puedes formular el setup como una solicitud de skill:

```text
Install the openRender skill for this repository.
Preview the instruction files first, install the right agent instructions, and explain what changed.
```

La skill es guia de proyecto para el agente. Mapea esa solicitud en lenguaje natural a `install-agent`, compact context, wire maps de solo lectura, dry-runs, verificacion, reportes y reglas de rollback.

La secuencia CLI siguiente sirve para setup, verificacion del agente y referencia manual.

Desde un proyecto de juego objetivo:

```bash
cd /path/to/game-project

openrender context --json
openrender context --json --compact
openrender memory status --json
openrender memory context --json --compact
openrender memory query --for style --json --compact
openrender memory review --run latest --json
openrender service snapshot --json
openrender loop status --json --compact
openrender scan --json
openrender doctor --json
```

Antes de escribir instrucciones para agentes de codigo, revisa primero el dry-run:

```bash
openrender install-agent --platform all --dry-run --json
openrender install-agent --platform codex --json
```

Planifica y ejecuta un dry-run antes de escribir archivos:

```bash
openrender plan sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --json

openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --dry-run \
  --json
```

Antes de instalar assets de animation, puedes registrar referencias o analizar motion:

```bash
openrender ingest reference \
  --url https://example.com/reference.gif \
  --role motion \
  --intent "Match this timing and movement style." \
  --json

openrender detect-motion tmp/slime_idle_frames --json --compact

openrender compile animation \
  --from tmp/slime_idle_frames \
  --target phaser \
  --id enemy.slime.idle \
  --fps 8 \
  --layout horizontal_strip \
  --dry-run \
  --json
```

Preserva la intencion del proyecto y la direccion visual para la siguiente tarea del agente:

```bash
openrender memory ingest \
  --feedback "Keep the UI readable and preserve the neon arcade direction." \
  --json

openrender memory query --for ui --json --compact
openrender memory review --run latest --json
openrender memory context --json --compact
openrender clean --memory --keep-latest --dry-run --json
```

Instala solo cuando el plan sea correcto:

```bash
openrender compile sprite \
  --from tmp/slime_idle_strip.png \
  --target phaser \
  --id enemy.slime.idle \
  --frames 6 \
  --frame-size 64x64 \
  --manifest-strategy merge \
  --install \
  --json

openrender verify --run latest --json --compact
openrender report --run latest --json --compact
openrender loop attach --run latest --json --compact
openrender loop run animation --from tmp/slime_idle_frames --target phaser --id enemy.slime.idle --fps 8 --install --json --compact
openrender loop complete --notes "Helper wired and checked in game scene." --json --compact
openrender explain --run latest --json --compact
openrender diff --run latest --json --compact
```

Cuando un agente necesite saber donde conectar helpers generados, usa `context --json --wire-map` para obtener candidatos de solo lectura.

Revierte la ultima instalacion de openRender:

```bash
openrender rollback --run latest --json
```

Puedes usar `--target phaser`, `--target godot`, `--target love2d`, `--target pixi`, `--target canvas`, `--target three` o `--target unity`.

## Como funciona

```text
source media
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
- Registro seguro de sketches, mockups, concept images, archivos del proyecto o URLs como visual references. Las URLs solo se guardan como provenance y no se descargan automaticamente.
- `detect-motion` analiza video/GIF/PNG sequence antes de instalar y devuelve pasos claros cuando falta ffmpeg.
- `compile animation` genera animation sheets, runtime helpers por engine, wire-map handoff, verificacion, reportes, diffs, explicaciones y rollback.
- Compile/install/verify/report/rollback para audio, atlas/tileset y UI en el mismo pipeline de run-state.
- Infraestructura de memoria que deriva project cards, agent cards, user-direction cards, engine cards, creator-taste cards, game-direction cards, visual-avoidance cards y un visual-evidence index desde runs, loops, feedback del usuario y referencias visuales.
- `memory query` y `memory review` para revisar brevemente gusto del creador, direccion del juego, evitaciones visuales y drift signals antes de la siguiente tarea del agente.
- `service snapshot --json` exporta un limite local de contexto para futuros dashboards o agent supervisors.
- Salida compacta para agentes en context, verificacion, reportes, explain y diff.
- Wiring map de solo lectura para posibles puntos de conexion en el codigo del juego.
- Diagnostico alpha, cutout de fondo seguro por defecto, eliminacion edge-flood de fondo, deteccion de frames, presets de normalizacion, invariants de sprites y hojas de preview de frames.
- Runtime smoke para Godot/LOVE2D y web build smoke opcional con `smoke --build`.
- Adaptadores para Phaser, Godot, LOVE2D, PixiJS, Three.js, Canvas y Unity.
- JSON schemas, resumenes compactos para agentes, recipes, fixture capture y golden fixtures.
- Helpers JSON-only de metadata MCP para los targets soportados.

## Salidas por engine

| Target | Output Shape |
|---|---|
| Vite + Phaser | Assets PNG, manifest TypeScript, helpers de animacion, snippets de preload |
| Godot 4 | Assets PNG, helpers GDScript, helpers de animacion, rutas `res://` |
| LOVE2D | Assets PNG, modulo Lua, metadata de animacion, snippets load/draw |
| PixiJS + Vite | Assets PNG, spritesheet JSON opcional, helpers Pixi en TypeScript |
| Three.js + Vite | Assets PNG, manifest TypeScript, helpers `TextureLoader`, `Sprite` y `PlaneGeometry` |
| Canvas + Vite | Assets PNG, manifest TypeScript, helpers para cargar imagenes y dibujar frames |
| Unity | Assets PNG/audio bajo `Assets/OpenRender`, manifests C#, clases helper para sprite/media |

Animation compile reutiliza los mismos target adapters. Phaser, Godot, LOVE2D y Unity reciben helpers runtime mas profundos; PixiJS, Three.js y Canvas reciben helper paths y snippets para conectar el render loop. openRender sigue sin modificar automaticamente el codigo del juego.

## Reglas para agentes

- Ejecuta `context --json` antes de leer ampliamente o asumir el tipo de proyecto.
- Usa `context --json --compact` para el handoff mas corto.
- Usa `context --json --wire-map` antes de editar codigo de juego que conecta helpers generados.
- Ejecuta `doctor --json` antes de escribir en un proyecto desconocido.
- Usa `plan sprite --json` o `compile sprite --dry-run --json` antes de `--install`.
- Si el usuario entrega un sketch, mockup, concept image, video URL o project reference file, registralo con `ingest reference --json`.
- Si la siguiente tarea depende del visual style o del feel de control, usa `memory query --for style|ui|movement --json --compact` para revisar primero gusto del creador y evidencia visual.
- Despues de instalar o ejecutar un loop, usa `memory review --run latest --json` para detectar falta de memoria o senales de drift.
- Usa `detect-motion --json --compact` antes de elegir fps, frame count, layout y loop de una animation.
- Usa `compile animation --dry-run --json` antes de instalar animation assets.
- Inspecciona `installPlan.files` antes de instalar.
- No pases `--force` salvo que el usuario acepte sobrescribir archivos de destino.
- Los manifests generados usan `merge` por defecto para acumular entradas; usa `--manifest-strategy replace|isolated` solo si necesitas una sola entrada o no escribir un manifest compartido.
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
packages/mcp-server        JSON-only MCP metadata helpers
schemas                    JSON schemas for contracts, outputs, reports, install plans
fixtures                   golden fixture corpus for adapter regression checks
recipes                    recipe metadata for supported targets
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
