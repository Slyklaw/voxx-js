# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Modular ES Module Architecture with WebGL2 Game Engine

**Key Characteristics:**
- Vanilla JavaScript ES modules (no framework)
- Single-page WebGL2 application with game loop
- Deferred rendering pipeline with multi-pass shaders
- Worker-based parallel chunk generation
- Procedural terrain via simplex noise and biomes

## Layers

**Entry/Game Loop:**
- Purpose: Initialize app, run main render loop, handle input
- Location: `voxx-js/src/main.js`
- Contains: Camera control, input handling, render orchestration, block raycasting, game state
- Depends on: World, GL rendering, config
- Used by: Browser (script entry point)

**World Management:**
- Purpose: Manage loaded chunks, orchestrate async chunk generation, handle chunk lifecycle
- Location: `voxx-js/world.js`
- Contains: Chunk map, worker pool integration, chunk loading/unloading, hot chunk retention
- Depends on: Chunk, WorkerPool, ChunkCore
- Used by: `src/main.js`

**Chunk/Voxel Layer:**
- Purpose: Store voxel data, generate terrain, manage mesh state
- Location: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Contains: Voxel data (Uint8Array), terrain generation (biome-based noise), mesh data storage
- Depends on: Blocks, Biomes, GreedyMesh, ChunkCore
- Used by: World, GreedyMesh

**Terrain Generation:**
- Purpose: Procedural terrain via noise and biomes
- Location: `voxx-js/biomes.js`
- Contains: Biome definitions, height generation, block type selection
- Depends on: Blocks, config
- Used by: Chunk, ChunkCore

**Mesh Generation:**
- Purpose: Convert voxel data to optimized triangle mesh via greedy algorithm
- Location: `voxx-js/greedyMesh.js`
- Contains: Greedy meshing implementation, UV atlas coordinate calculation
- Depends on: Blocks, ChunkCore
- Used by: Chunk, ChunkWorker

**Rendering Pipeline:**
- Purpose: WebGL2 rendering with deferred shading, SSAO, shadows
- Location: `voxx-js/src/gl/render.js`
- Contains: Multi-pass renderer (shadow → G-buffer → SSAO → blur → composite), chunk rendering, sky rendering
- Depends on: Shaders, Buffers, FBO, UBO, config
- Used by: `src/main.js`

**Shader Layer:**
- Purpose: GLSL shader programs for voxels, sky, SSAO, selection outline
- Location: `voxx-js/src/shaders/voxel.js`, `voxx-js/src/shaders/sky.js`, `voxx-js/src/shaders/ssao.js`, `voxx-js/src/shaders/blur.js`, `voxx-js/src/shaders/composite.js`, `voxx-js/src/shaders/shadow.js`, `voxx-js/src/shaders/selection.js`
- Contains: Vertex/fragment shader source, uniform/attribute location getters
- Depends on: GL context
- Used by: `src/gl/render.js`

**WebGL Utilities:**
- Purpose: Reusable GL utilities
- Location: `voxx-js/src/gl/buffers.js` (VAO/VBO/IBO creation, buffer pool), `voxx-js/src/gl/fbo.js` (G-buffer, SSAO buffers, shadow maps), `voxx-js/src/gl/context.js` (GL context setup, context loss handling), `voxx-js/src/gl/shaders.js` (shader compilation, program linking), `voxx-js/src/gl/ubo.js` (uniform buffer objects), `voxx-js/src/gl/frustum.js` (frustum culling)
- Used by: Rendering pipeline

**Configuration/Data:**
- Purpose: Constants, block definitions, rendering config
- Location: `voxx-js/config.js`, `voxx-js/blocks.js`
- Contains: All magic numbers, block types, rendering settings, biome tuning
- Used by: All layers

**Worker Pool:**
- Purpose: Manage Web Workers for parallel chunk generation
- Location: `voxx-js/workerPool.js`
- Contains: Worker lifecycle, task queue, priority scheduling, stale request clearing
- Used by: World

**Chunk Worker:**
- Purpose: Off-thread terrain and mesh generation
- Location: `voxx-js/chunkWorker.js`
- Contains: Noise generation, terrain generation, mesh generation
- Used by: WorkerPool

**Performance Monitoring:**
- Purpose: Track FPS, render times, memory, draw calls
- Location: `voxx-js/src/gl/performance.js`
- Used by: Rendering, main loop

## Data Flow

**Render Loop Flow:**
1. `requestAnimationFrame(render)` in `main.js`
2. Delta time calculation, input/movement update
3. `world.update(cameraPosition, renderDistance)` - load/unload chunks
4. `updateChunks()` - sync chunk mesh data to WebGL
5. Camera matrices (view, projection) created
6. `renderVoxelsToGBuffer()` - multi-pass render:
   - Pass 0: Shadow map (depth only)
   - Pass 1a: Sky into G-buffer albedo
   - Pass 1b: Chunks to G-buffer (albedo, normals, position)
   - Pass 2: SSAO on normals/position
   - Pass 3: Blur SSAO
   - Pass 4: Composite (albedo × AO → screen)

**Chunk Loading Flow:**
1. `world.update()` calculates visible chunk coords
2. `world.getChunk(x, z)` creates Chunk if missing
3. Chunk queued to WorkerPool with priority (squared distance)
4. Worker (`chunkWorker.js`) generates terrain + mesh data
5. `onComplete` callback in World populates chunk voxel data
6. `chunk.updateMesh()` or worker mesh used
7. Next frame: `syncChunkToWebGL()` uploads to GPU

**Block Editing Flow:**
1. Raycast via DDA algorithm in `raycastBlock()`
2. `destroyBlock()` / `placeBlock()` modifies voxel data
3. Chunk mesh data regenerated via `generateMeshData()`
4. WebGL mesh deleted, recreated next frame

## Key Abstractions

**Chunk:**
- Purpose: Represents a 32×256×32 voxel volume
- Examples: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Pattern: Class with voxel storage, terrain generation, mesh state tracking

**World:**
- Purpose: Container for all loaded chunks, manages chunk lifecycle
- Examples: `voxx-js/world.js`
- Pattern: Class with Map-based chunk storage, async generation coordination

**WorkerPool:**
- Purpose: Abstract worker management with priority queue
- Examples: `voxx-js/workerPool.js`
- Pattern: Pool of Web Workers with task queuing and stale request handling

**MeshData:**
- Purpose: Plain data object passed between chunk generation and WebGL
- Examples: Returned by `greedyMesh.js`, stored in `chunk.meshData`
- Pattern: Typed arrays (Float32Array, Uint32Array) for GPU upload

**Shader Program:**
- Purpose: Compiled GLSL program with uniform/attribute locations cached
- Examples: `voxx-js/src/shaders/voxel.js`
- Pattern: Factory function returning { program, uniforms, attribs }

## Entry Points

**Browser Script Entry:**
- Location: `voxx-js/src/main.js`
- Triggers: `<script type="module" src="src/main.js">` in HTML
- Responsibilities: Initialize WebGL, create world, set up controls, run render loop

**Worker Entry:**
- Location: `voxx-js/chunkWorker.js`
- Triggers: `new Worker('./chunkWorker.js')` from WorkerPool
- Responsibilities: Generate terrain, create mesh, postMessage results

## Error Handling

**Strategy:** Console logging with optional DEBUG flag gating

**Patterns:**
- WebGL errors: Checked via `gl.getError()` after render passes
- Shader compilation: Throws `Error` with `gl.getShaderInfoLog()`
- Worker errors: `onerror` handler with worker recreation
- Context loss: Event listeners for `webglcontextlost`/`webglcontextrestored`
- Chunk generation failures: Null data passed to callback, logged

**DEBUG Flag:**
- Global export in `config.js`
- Controls verbose logging throughout codebase
- Set via `export const DEBUG = false;` (production default)

## Cross-Cutting Concerns

**Logging:** Console-based, guarded by `DEBUG` flag in `config.js`. Uses `[Tag]` prefix convention (e.g., `[Renderer]`, `[World]`, `[BlockEdit]`).

**Validation:** Minimal runtime validation. Bounds checking in voxel getters/setters. Block type assertions in debug mode only.

**Authentication:** Not applicable (no auth).

**Configuration:** Centralized in `config.js` with named exports (RENDER_CONFIG, SSAO_CONFIG, BIOME_TUNING, etc.).

**Resource Management:**
- WebGL resources tracked via `resourceRegistry` in context.js
- Context loss/recovery callbacks for resource disposal/recreation
- Buffer pool for VBO/VAO/IBO reuse
- Hot chunk retention to prevent thrashing

---

*Architecture analysis: 2026-03-21*
