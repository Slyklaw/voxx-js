# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Raw WebGL2 Voxel Engine with Worker-based Terrain Generation

**Key Characteristics:**
- Pure WebGL2 with no 3D framework (no Three.js)
- Worker thread pool for chunk generation and meshing
- Greedy meshing algorithm for efficient geometry
- Texture atlas-based block rendering
- First-person camera controls with block editing

## Layers

**World/Generation Layer:**
- Purpose: Manage voxel world state and terrain generation
- Location: `voxx-js/`
- Contains: `world.js`, `chunk.js`, `chunkCore.js`, `chunkWorker.js`, `workerPool.js`
- Depends on: Simplex noise, biome/blocks data
- Used by: Main render loop

**Biome/Block Data Layer:**
- Purpose: Define terrain types and block properties
- Location: `voxx-js/`
- Contains: `biomes.js`, `blocks.js`
- Depends on: None
- Used by: World generation, chunk workers

**Rendering Layer:**
- Purpose: WebGL2 rendering pipeline for voxels and sky
- Location: `voxx-js/src/gl/`
- Contains: `render.js`, `buffers.js`, `context.js`, `ubo.js`, `performance.js`
- Depends on: WebGL2 context, shader sources
- Used by: Main render loop

**Shader Layer:**
- Purpose: GLSL vertex/fragment shaders for rendering
- Location: `voxx-js/src/shaders/`
- Contains: `voxel.js`, `sky.js`, `selection.js`
- Depends on: WebGL2
- Used by: Rendering layer

**Input/UI Layer:**
- Purpose: Handle user input and debug UI
- Location: `voxx-js/src/main.js`, `voxx-js/index.html`
- Contains: Controls, block selection, debug controls
- Depends on: World state, rendering
- Used by: Browser events

**Configuration Layer:**
- Purpose: Centralized constants and settings
- Location: `voxx-js/config.js`
- Contains: Render, lighting, player, sun cycle configs
- Depends on: None
- Used by: All layers

## Data Flow

**Chunk Generation Flow:**

1. `World.update()` calculates camera chunk position and desired render distance
2. `World.getChunk(chunkX, chunkZ)` creates chunk if missing
3. Chunk request enqueued to `WorkerPool`
4. `chunkWorker.js` generates terrain using simplex noise and biome blending
5. Worker runs greedy meshing algorithm to create geometry
6. Worker posts mesh data back via `postMessage`
7. `World` receives data, stores voxels and mesh data
8. `main.js:syncChunkToWebGL()` uploads mesh to GPU

**Render Flow:**

1. `main.js:render()` called each frame via `requestAnimationFrame`
2. Camera position/rotation updated from input
3. View and projection matrices calculated
4. `clear()` clears framebuffer
5. `renderSky()` draws sky with day/night colors
6. `renderChunks()` iterates visible chunks with ready meshes
7. Each chunk: binds VAO, sets uniforms, draws elements
8. `renderBlockOutline()` draws selection highlight

**Block Editing Flow:**

1. `raycastBlock()` uses DDA algorithm for voxel selection
2. On left-click: `destroyBlock()` sets voxel to AIR, regenerates mesh
3. On right-click: `placeBlock()` sets voxel to selected type, regenerates mesh
4. `markNeighborChunksForUpdate()` ensures boundary quads regenerate

## Key Abstractions

**World:**
- Purpose: Container for all chunks, manages chunk lifecycle
- Examples: `voxx-js/world.js`
- Pattern: Singleton per game instance, chunk map with string keys ("x,z")

**Chunk:**
- Purpose: 32x256x32 voxel volume with mesh generation
- Examples: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Pattern: Dual use - main thread version (Chunk) and worker version (ChunkCore)

**WorkerPool:**
- Purpose: Manages worker threads for parallel chunk processing
- Examples: `voxx-js/workerPool.js`
- Pattern: Pool of Web Workers with task queue and callbacks

**MeshBuffer:**
- Purpose: GPU-ready mesh data with VAO/VBO/IBO
- Examples: `voxx-js/src/gl/buffers.js`
- Pattern: Interleaved vertex format, separate index buffers for solid/wireframe

**ShaderProgram:**
- Purpose: Compiled GLSL programs with uniform/attribute locations
- Examples: `voxx-js/src/gl/shaders.js`
- Pattern: Factory functions create programs, helper functions extract locations

## Entry Points

**Web Entry Point:**
- Location: `voxx-js/index.html`
- Triggers: Browser loads page
- Responsibilities: Canvas setup, UI elements, loads main.js as ES module

**Game Entry Point:**
- Location: `voxx-js/src/main.js`
- Triggers: ES module import from index.html
- Responsibilities: GL context init, world creation, render loop, input handling

**Worker Entry Point:**
- Location: `voxx-js/chunkWorker.js`
- Triggers: WorkerPool creates worker instance
- Responsibilities: Terrain generation, greedy meshing, post results

## Error Handling

**Strategy:** Console logging with descriptive tags

**Patterns:**
- `[WebGL2]` prefix for rendering errors
- `[BlockEdit]` prefix for block interaction logs
- `[ChunkWorker]` prefix for worker errors
- Context loss handling in `context.js` with listener pattern
- Silent failures with fallback values for non-critical operations

## Cross-Cutting Concerns

**Logging:** Console-based with prefixed tags for filtering

**Validation:** 
- Bounds checking in voxel get/set operations
- Null checks before WebGL operations
- Context loss detection and recovery

**Authentication:** N/A (client-side only)

**Performance:**
- FPS tracking via rolling average in `performance.js`
- Render timing with `beginRenderTiming`/`endRenderTiming`
- Chunk rebuild throttling (`MAX_REBUILDS_PER_FRAME = 2`)
- Nearest-neighbor texture filtering for pixel art

---

*Architecture analysis: 2026-03-18*
