# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
voxx-js/                          # Project root (WebGL2 voxel engine)
├── src/                          # Source code (organized by domain)
│   ├── main.js                   # Entry point - WebGL init, controls, game loop
│   ├── gl/                       # WebGL rendering subsystem
│   ├── shaders/                  # GLSL shader sources
│   └── chunk/                    # Chunk management utilities
├── world.js                      # World generation and chunk loading
├── chunk.js                      # Chunk data structure and mesh generation
├── chunkCore.js                  # Chunk constants (CHUNK_WIDTH, CHUNK_HEIGHT, etc.)
├── greedyMesh.js                 # Mesh generation algorithm
├── blocks.js                     # Block type definitions
├── biomes.js                     # Biome calculation
├── workerPool.js                 # Worker thread pool for async chunk generation
├── chunkWorker.js                # Web Worker for chunk generation
├── config.js                     # Configuration constants
├── index.html                    # Entry HTML
├── style.css                     # UI styles
├── textures-atlas.png            # Block texture atlas
├── tests/                        # Test files
│   ├── setup.js                  # Test utilities and mocks
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── vitest.config.js              # Vitest configuration
└── package.json                  # Dependencies
```

## Directory Purposes

**`src/` (Source code):**
- Purpose: Organized source modules by functional domain
- Contains: `main.js` entry point, `gl/`, `shaders/`, `chunk/` subdirectories

**`src/gl/` (WebGL subsystem):**
- Purpose: All WebGL rendering and GPU resource management
- Contains: `context.js`, `render.js`, `buffers.js`, `fbo.js`, `frustum.js`, `performance.js`, `shaders.js`, `ubo.js`
- Key file: `render.js` - main rendering pipeline

**`src/shaders/` (GLSL shader sources):**
- Purpose: WebGL shader program definitions
- Contains: `voxel.js`, `sky.js`, `blur.js`, `composite.js`, `shadow.js`, `ssao.js`, `selection.js`
- Pattern: Each shader exports vertex/fragment source strings

**`src/chunk/` (Chunk utilities):**
- Purpose: Helper utilities for chunk management
- Contains: `chunkManager.js` - chunk lifecycle and dirty tracking

**Root level .js files (Core modules):**
- Purpose: Domain-specific logic at project root for easy imports
- Contains: `world.js`, `chunk.js`, `greedyMesh.js`, `blocks.js`, `biomes.js`, `config.js`, `workerPool.js`, `chunkWorker.js`

**`tests/` (Test suite):**
- Purpose: Unit and integration tests
- Contains: `setup.js` (mocks/utilities), `unit/` (co-located unit tests), `integration/` (end-to-end tests)
- Pattern: Tests co-located in `tests/unit/` or next to source files (`.test.js`)

## Key File Locations

**Entry Points:**
- `index.html` - HTML entry, loads `src/main.js` as ES module
- `src/main.js` - Main initialization, controls, render loop (997 lines)

**Configuration:**
- `config.js` - All runtime configuration constants (RENDER_CONFIG, PLAYER_CONFIG, etc.)
- `chunkCore.js` - Chunk dimension constants (CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH)
- `vitest.config.js` - Test runner configuration

**Core Logic:**
- `world.js` - World class: chunk loading, generation orchestration, worker pool
- `chunk.js` - Chunk class: voxel storage, mesh generation, neighbor management
- `greedyMesh.js` - Greedy meshing algorithm for optimized geometry
- `blocks.js` - Block type definitions and properties
- `biomes.js` - Biome calculation using noise functions

**WebGL/Rendering:**
- `src/gl/context.js` - WebGL context initialization and context loss handling
- `src/gl/render.js` - Main rendering pipeline (G-buffer, deferred shading) (~1200+ lines)
- `src/gl/buffers.js` - VAO/VBO creation and management
- `src/gl/fbo.js` - Framebuffer object management (G-buffer, shadow maps)
- `src/gl/shaders.js` - Shader program creation utilities

**Worker Threads:**
- `workerPool.js` - Worker pool for async chunk generation
- `chunkWorker.js` - Web Worker script for chunk generation

**Testing:**
- `tests/unit/chunk.test.js` - Unit tests for Chunk class
- `tests/unit/greedyMesh.test.js` - Unit tests for mesh generation
- `tests/unit/biomes.test.js` - Unit tests for biome calculation
- `tests/unit/ssao-config.test.js` - Unit tests for SSAO configuration
- `tests/integration/ssao-ui.test.js` - Integration tests for SSAO UI

## Naming Conventions

**Files:**
- PascalCase for classes/constructors: `ChunkManager.js`, `BiomeCalculator.js`
- Lowercase for utilities/misc: `world.js`, `blocks.js`, `config.js`
- Suffix `.test.js` for test files: `chunk.test.js`, `greedyMesh.test.js`
- Shader files: lowercase with domain prefix: `voxel.js`, `sky.js`, `ssao.js`

**Directories:**
- Lowercase: `src/gl/`, `src/shaders/`, `tests/unit/`

**JavaScript Classes:**
- PascalCase: `World`, `Chunk`, `ChunkManager`, `BiomeCalculator`, `WorkerPool`
- Use named exports for classes: `export class World { ... }`

**Functions/Variables:**
- camelCase: `createChunkMeshFromData`, `updateTargetedBlock`, `syncChunkToWebGL`
- Constants (config values): UPPER_SNAKE_CASE: `CHUNK_WIDTH`, `RENDER_CONFIG`, `BLOCK_TYPES`
- Private members prefixed with underscore: `_webglMesh`, `_playerChunkX`

**Imports:**
- ES module syntax: `import { World } from './world.js';`
- Explicit `.js` extension in imports
- Path aliases NOT used (relative paths throughout)

## Where to Add New Code

**New Feature/Module:**
1. If WebGL-related → add to `src/gl/` or `src/shaders/`
2. If chunk-related → add to `src/chunk/` or `chunk.js`
3. If world simulation → add to `world.js` or create new file at root
4. Always create corresponding test in `tests/unit/`

**New WebGL Resource/Shader:**
- Shader source → `src/shaders/[name].js` (export vertex/fragment sources)
- Shader utilities → `src/gl/shaders.js`
- FBO management → `src/gl/fbo.js`
- Buffer management → `src/gl/buffers.js`

**New Chunk/World Logic:**
- Core chunk behavior → `chunk.js`
- Chunk utilities → `src/chunk/chunkManager.js`
- World-level orchestration → `world.js`
- Terrain generation → `biomes.js` or `chunkWorker.js`

**New Configuration:**
- Runtime config → `config.js`
- Chunk dimensions → `chunkCore.js`
- Block types → `blocks.js`

**New Test:**
- Unit tests → `tests/unit/[module].test.js`
- Integration tests → `tests/integration/[feature].test.js`
- Test utilities → `tests/setup.js`

## Special Directories

**`src/shaders/`:**
- Purpose: GLSL shader source code organized by render pass
- Contains: `blur.js`, `composite.js`, `selection.js`, `shadow.js`, `sky.js`, `ssao.js`, `voxel.js`
- Pattern: Each file exports `{ vertexSource, fragmentSource }` objects or shader program factory functions

**`tests/`:**
- Purpose: Vitest test suite
- Contains: `setup.js` (mocks/utilities), `unit/` (78-131 line test files), `integration/`
- Config: `vitest.config.js` with `environment: 'node'`
- Test pattern: `import { describe, it, expect, beforeEach } from 'vitest';`

**`node_modules/`:**
- Purpose: npm dependencies (vitest, jsdom, simplex-noise)
- Generated: Yes (via `npm install`)
- Not committed: Ignored in `.gitignore`

**`.planning/codebase/`:**
- Purpose: GSD planning documentation
- Generated: No (created by planning tools)
- Committed: Yes

---

*Structure analysis: 2026-03-21*
