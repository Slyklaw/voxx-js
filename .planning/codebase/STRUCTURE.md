# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
voxx-js/
├── index.html              # Entry point, canvas and UI markup
├── style.css               # UI styling
├── textures-atlas.png      # Block texture atlas (1024x512)
├── world.js                # World manager, chunk lifecycle
├── chunk.js                # Main thread chunk with mesh generation
├── chunkCore.js            # Worker chunk (terrain only, no mesh)
├── chunkWorker.js          # Worker entry point
├── workerPool.js           # Web Worker pool manager
├── blocks.js               # Block type definitions and atlas positions
├── biomes.js               # Biome definitions and terrain generation
├── config.js               # All configuration constants
├── src/
│   ├── main.js             # Main game loop and input handling
│   ├── gl/
│   │   ├── context.js      # WebGL2 context setup
│   │   ├── render.js       # Main rendering functions
│   │   ├── buffers.js      # VAO/VBO/IBO creation
│   │   ├── shaders.js      # Shader compilation helpers
│   │   ├── ubo.js          # Uniform buffer objects
│   │   ├── performance.js  # FPS and timing metrics
│   │   └── test-render.js  # Test rendering utilities
│   ├── shaders/
│   │   ├── voxel.js        # Voxel vertex/fragment shaders
│   │   ├── sky.js          # Sky rendering shaders
│   │   └── selection.js    # Block selection outline shader
│   └── chunk/
│       └── chunkManager.js # Chunk lifecycle helper (unused by main)
```

## Directory Purposes

**Root (`voxx-js/`):**
- Purpose: Core game logic and world generation
- Contains: World management, chunk classes, worker files, data definitions

**`src/`:**
- Purpose: WebGL rendering and game loop
- Contains: Main entry point, rendering pipeline, shaders

**`src/gl/`:**
- Purpose: WebGL2 rendering infrastructure
- Contains: Context, buffers, shaders, uniforms, performance

**`src/shaders/`:**
- Purpose: GLSL shader source code and metadata
- Contains: Vertex/fragment shaders as template literals

**`src/chunk/`:**
- Purpose: Chunk management utilities
- Contains: `chunkManager.js` (appears to be unused by main game)

## Key File Locations

**Entry Points:**
- `voxx-js/index.html`: Browser entry, loads main.js as ES module
- `voxx-js/src/main.js`: Game initialization and render loop

**Configuration:**
- `voxx-js/config.js`: All tunable constants (render, lighting, player, sun)

**Core Logic:**
- `voxx-js/world.js`: World state and chunk management
- `voxx-js/chunk.js`: Chunk voxel storage and mesh generation
- `voxx-js/chunkCore.js`: Lightweight chunk for worker terrain generation

**Worker/Threading:**
- `voxx-js/workerPool.js`: Worker pool with task queue
- `voxx-js/chunkWorker.js`: Worker script for async chunk generation

**Data Definitions:**
- `voxx-js/blocks.js`: Block types, colors, atlas positions
- `voxx-js/biomes.js`: Biome definitions, height generation

**Rendering:**
- `voxx-js/src/gl/context.js`: WebGL2 context and canvas
- `voxx-js/src/gl/render.js`: Main rendering functions
- `voxx-js/src/gl/buffers.js`: VAO/VBO creation and management

**Shaders:**
- `voxx-js/src/shaders/voxel.js`: Voxel rendering shaders
- `voxx-js/src/shaders/sky.js`: Sky box shaders
- `voxx-js/src/shaders/selection.js`: Block outline shader

## Naming Conventions

**Files:**
- camelCase.js: JavaScript modules (`world.js`, `chunkCore.js`)
- kebab-case.css: Stylesheets (`style.css`)
- Lowercase: Assets (`textures-atlas.png`)

**Classes:**
- PascalCase: `World`, `Chunk`, `ChunkCore`, `WorkerPool`, `BiomeCalculator`

**Constants:**
- UPPER_SNAKE_CASE: `CHUNK_WIDTH`, `CHUNK_HEIGHT`, `BLOCK_TYPES`, `RENDER_CONFIG`

**Functions:**
- camelCase: `getChunk()`, `generateMeshData()`, `createChunkMeshFromData()`
- Verb-noun pattern: `updateMovement()`, `renderChunks()`, `loadTextureAtlas()`

**Variables:**
- camelCase: `cameraPosition`, `chunkMeshes`, `selectedBlockType`
- Descriptive names preferred over abbreviations

## Where to Add New Code

**New Block Type:**
1. Add to `voxx-js/blocks.js`: `BLOCK_TYPES` enum and `BLOCKS` array
2. Add texture to `textures-atlas.png` at correct position
3. Update atlas position in `BLOCKS` array entry

**New Biome:**
1. Add to `voxx-js/biomes.js`: `BIOMES` object with height/variation settings
2. Update `getBiomeBlockType()` for block type logic

**New Render Feature:**
1. Add shader code to `voxx-js/src/shaders/`
2. Add render function in `voxx-js/src/gl/render.js`
3. Call from main loop in `voxx-js/src/main.js`

**New Worker Task:**
1. Add handler in `voxx-js/chunkWorker.js`
2. Enqueue via `voxx-js/workerPool.js`

**Configuration:**
1. Add constants to `voxx-js/config.js` in appropriate section

## Special Directories

**`src/chunk/`:**
- Purpose: Chunk management utilities
- Contains: `chunkManager.js`
- Status: Appears unused by main game (different chunk size constants)

**`src/gl/test-render.js`:**
- Purpose: Test rendering utilities
- Generated: No
- Committed: Yes
- Status: Utility functions for debugging render issues

**ES Module Structure:**
- All files use ES module syntax (`import`/`export`)
- No CommonJS or bundled output
- Runs directly in modern browsers with `<script type="module">`

---

*Structure analysis: 2026-03-18*
