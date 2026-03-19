# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Component-based voxel engine with procedural terrain generation

**Key Characteristics:**
- Raw WebGL2 rendering (no Three.js) with custom shaders
- Chunked world architecture with 32x256x32 voxel chunks
- Web Worker pool for parallel chunk generation/meshing
- Greedy meshing algorithm for mesh optimization
- Block editing at runtime with raycasting

## Layers

**Rendering Layer:**
- Purpose: WebGL2 rendering pipeline with shaders
- Location: `voxx-js/src/gl/`
- Contains: `context.js`, `render.js`, `buffers.js`, `shaders.js`, `ubo.js`, `performance.js`
- Depends on: Browser WebGL2 API, shaders
- Used by: `voxx-js/src/main.js`

**World/Chunk Layer:**
- Purpose: Voxel data storage and mesh generation
- Location: `voxx-js/`
- Contains: `world.js`, `chunk.js`, `chunkCore.js`
- Depends on: `blocks.js`, `biomes.js`, `workerPool.js`
- Used by: `voxx-js/src/main.js`

**Terrain Generation Layer:**
- Purpose: Procedural biome-based terrain generation
- Location: `voxx-js/`
- Contains: `biomes.js`, `config.js`
- Depends on: `simplex-noise` (CDN)
- Used by: `world.js`, `chunk.js`

**Configuration Layer:**
- Purpose: Centralized constants and configuration
- Location: `voxx-js/config.js`
- Contains: `RENDER_CONFIG`, `PLAYER_CONFIG`, `SUN_CYCLE_CONFIG`
- Used by: All layers

**Entry/UI Layer:**
- Purpose: Main application entry, controls, render loop
- Location: `voxx-js/src/main.js`
- Contains: Camera control, input handling, block editing

## Data Flow

**World Generation Flow:**

1. `World.update()` called with camera position
2. Calculate visible chunk coordinates based on render distance
3. `World.getChunk(x, z)` creates chunk if not exists
4. Chunk enqueued to `WorkerPool` for async generation
5. Worker runs `chunkWorker.js` → generates voxel data + mesh data
6. Main thread receives result, stores voxel data
7. `Chunk.updateMesh()` or `fromWorkerMesh()` creates mesh data
8. `syncChunkToWebGL()` uploads mesh data to GPU

**Rendering Flow:**

1. `requestAnimationFrame` calls `render()` in `main.js`
2. `updateMovement()` processes camera input
3. `world.update()` loads/unloads chunks based on camera
4. `updateChunks()` syncs chunk meshes to GPU
5. `renderChunks()` draws each visible chunk:
   - Binds VAO
   - Sets uniforms (MVP matrix, textures)
   - `gl.drawElements()` with triangles or lines
6. `renderBlockOutline()` draws selection highlight

**Block Editing Flow:**

1. `raycastBlock()` performs DDA voxel raycast
2. `targetedBlock` stores hit information
3. `destroyBlock()` / `placeBlock()` modifies voxel data
4. Chunk marked for re-meshing
5. WebGL mesh resources deleted and recreated

## Key Abstractions

**World:**
- Purpose: Manages all chunks and world state
- Examples: `voxx-js/world.js`
- Pattern: Object with Map-based chunk storage, coordinate keying (`"x,z"`)

**Chunk:**
- Purpose: 3D voxel data container and mesh generation
- Examples: `voxx-js/chunk.js`
- Pattern: Class with voxel array, mesh state, neighbor references

**WorkerPool:**
- Purpose: Manages Web Worker threads for parallel processing
- Examples: `voxx-js/workerPool.js`
- Pattern: Pool pattern with task queue, callbacks, hardware concurrency detection

**BiomeCalculator:**
- Purpose: Procedural biome determination and height blending
- Examples: `voxx-js/biomes.js`
- Pattern: Class with noise function, contributes to height/block type decisions

## Entry Points

**Main Entry:**
- Location: `voxx-js/src/main.js`
- Triggers: Browser loads the HTML which imports main.js as ES module
- Responsibilities: Initialize WebGL, create world, handle input, render loop

**Worker Entry:**
- Location: `voxx-js/chunkWorker.js`
- Triggers: WorkerPool enqueues chunk generation task
- Responsibilities: Generate voxel data, create mesh data, post results back

**HTML Entry:**
- Location: `voxx-js/index.html`
- Triggers: Browser loads page
- Responsibilities: Canvas element, UI elements, imports main.js

## Error Handling

**Strategy:** Console logging with tag prefixes, graceful degradation

**Patterns:**
- `[BlockEdit]` - Block interaction events
- `[WebGL2]` - WebGL-specific operations
- `[World]` - Chunk management
- `[Renderer]` - Rendering pipeline
- `[Debug]` - Debug mode toggles
- Context loss recovery via `handleContextLost()` in `context.js`

## Cross-Cutting Concerns

**Logging:** Tagged console.log statements throughout codebase

**Validation:** Bounds checking in voxel access (`getVoxel`, `setVoxel`)

**Authentication:** Not applicable (single-player client-side only)

**Resource Management:**
- WebGL resource cleanup in `dispose()` methods
- Worker pool termination
- Chunk unloading with resource cleanup

---

*Architecture analysis: 2026-03-18*
