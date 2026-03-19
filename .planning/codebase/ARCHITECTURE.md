# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Event-driven, layered architecture for real-time 3D voxel engine

**Key Characteristics:**
- Main thread handles rendering, input, and UI
- Web Workers handle heavy terrain generation and meshing
- WebGL2-based rendering pipeline with shader programs
- Chunk-based world management with dynamic loading/unloading
- Greedy meshing algorithm for optimized mesh generation

## Layers

**Presentation Layer:**
- Purpose: Handles user input, UI updates, and rendering loop
- Location: `voxx-js/src/main.js`
- Contains: Input handling, camera control, UI state updates, render loop orchestration
- Depends on: WebGL context, shader programs, world data
- Used by: Browser environment

**Rendering Layer (GL):**
- Purpose: Manages WebGL2 context, shader programs, buffers, and draw calls
- Location: `voxx-js/src/gl/` directory
- Contains: Context management, shader compilation, UBOs, VAOs/VBOs, performance monitoring
- Depends on: WebGL2 API, shader source files
- Used by: Presentation layer

**World Management Layer:**
- Purpose: Manages chunk lifecycle, terrain generation, and spatial queries
- Location: `voxx-js/world.js`
- Contains: Chunk loading/unloading, neighbor relationships, visibility culling
- Depends on: Chunk instances, worker pool
- Used by: Presentation layer

**Data Layer:**
- Purpose: Stores and manipulates voxel data
- Location: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Contains: Voxel storage, biome generation, mesh generation
- Depends on: Block definitions, biome configuration
- Used by: World management layer, worker pool

**Worker Layer:**
- Purpose: Offloads CPU-intensive terrain generation and mesh generation
- Location: `voxx-js/chunkWorker.js`, `voxx-js/workerPool.js`
- Contains: Chunk generation algorithm, greedy meshing, worker pool management
- Depends on: Simplex noise library, block/biome definitions
- Used by: World management layer

**Configuration Layer:**
- Purpose: Centralized configuration and constants
- Location: `voxx-js/config.js`
- Contains: Render settings, player settings, lighting, sky colors
- Depends on: None
- Used by: All layers

## Data Flow

**Chunk Loading Flow:**

1. Camera position updates trigger `world.update()`
2. `World` calculates visible chunk coordinates based on render distance
3. For each needed chunk, `World.getChunk()` creates Chunk instance and enqueues generation job
4. `WorkerPool` dispatches job to available Worker
5. `ChunkCore.generate()` creates terrain using noise functions
6. `generateMeshData()` runs greedy meshing algorithm
7. Worker posts result back to main thread
8. `World` receives data, populates Chunk voxel data and mesh data
9. Chunk marked as ready for rendering

**Rendering Flow:**

1. `requestAnimationFrame` triggers render loop
2. Camera movement updates view matrix
3. `World.getVisibleChunks()` returns chunks with ready meshes
4. For each visible chunk:
   - WebGL buffers bound if not already synced
   - Chunk VAO bound and indexed draw call issued
5. Sky shader renders skybox
6. Block outline shader renders selection highlight
7. Performance metrics updated

**Block Editing Flow:**

1. Mouse click triggers `destroyBlock()` or `placeBlock()`
2. Chunk voxel data updated
3. Chunk mesh data regenerated locally
4. Old WebGL buffers deleted
5. Neighboring chunks marked for update if on boundary
6. Next render frame uploads new mesh data

## Key Abstractions

**World:**
- Purpose: Manages collection of chunks and their lifecycle
- Examples: `voxx-js/world.js`
- Pattern: Singleton-like instance holding chunk map and worker pool

**Chunk:**
- Purpose: Represents a 32x256x32 block of voxel data with mesh state
- Examples: `voxx-js/chunk.js`
- Pattern: Data container with generation and meshing methods

**ChunkCore:**
- Purpose: Core voxel data storage and generation (used by workers)
- Examples: `voxx-js/chunkCore.js`
- Pattern: Pure data model without rendering dependencies

**WorkerPool:**
- Purpose: Manages Web Worker lifecycle and job queue
- Examples: `voxx-js/workerPool.js`
- Pattern: Pool pattern with task queue and callback management

**Shader Programs:**
- Purpose: Encapsulate vertex/fragment shader pairs for specific rendering
- Examples: `voxx-js/src/shaders/voxel.js`, `voxx-js/src/shaders/sky.js`
- Pattern: Factory functions creating programs and returning uniform/attrib locations

**UBO (Uniform Buffer Object):**
- Purpose: Efficient uniform data sharing across shaders
- Examples: `voxx-js/src/gl/ubo.js`
- Pattern: Single buffer object updated per frame, bound to multiple programs

## Entry Points

**Application Entry:**
- Location: `voxx-js/index.html`
- Triggers: Browser loads page, executes `voxx-js/src/main.js` module
- Responsibilities: Initialize WebGL, create world, start render loop

**Module Entry:**
- Location: `voxx-js/src/main.js`
- Triggers: ES6 module import
- Responsibilities: Setup all subsystems, register event handlers, start animation loop

**Worker Entry:**
- Location: `voxx-js/chunkWorker.js`
- Triggers: Message from main thread
- Responsibilities: Generate chunk terrain and mesh, post result back

## Error Handling

**Strategy:** Try-catch blocks with console logging, graceful degradation

**Patterns:**
- WebGL context loss handled via event listeners, resources recreated
- Worker errors caught and callbacks notified with null result
- Chunk generation errors logged but don't crash application
- Invalid block types checked in debug mode only

## Cross-Cutting Concerns

**Logging:** Conditional based on `DEBUG` flag from config, console.log for development
**Validation:** Block type bounds checking in debug mode, coordinate bounds in chunk methods
**Authentication:** Not applicable (client-side application)

---

*Architecture analysis: 2026-03-19*