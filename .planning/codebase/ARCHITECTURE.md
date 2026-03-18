# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** Modular 3D Voxel Game Engine

**Key Characteristics:**
- Three.js-based rendering with custom shader materials
- Web Worker-based parallel chunk generation for performance
- Chunk-based world management with lazy loading/unloading
- Greedy meshing algorithm for efficient mesh generation
- Client-side terrain generation using Simplex noise

## Layers

**Rendering Layer:**
- Purpose: Handle all WebGL/Three.js rendering operations
- Location: `voxx-js/renderer.js`, `voxx-js/shaders.js`, `voxx-js/sky.js`
- Contains: Renderer class, GLSL shaders, sky dome rendering
- Depends on: Three.js library, chunk meshes, camera
- Used by: main.js animation loop

**World Management Layer:**
- Purpose: Manage world state, chunk loading/unloading, and chunk coordinate mapping
- Location: `voxx-js/world.js`
- Contains: World class with chunk dictionary
- Depends on: Chunk class, WorkerPool, BiomeCalculator
- Used by: main.js

**Chunk Layer:**
- Purpose: Store voxel data and generate mesh geometry
- Location: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Contains: Chunk class (main thread), ChunkCore class (worker thread)
- Depends on: blocks.js, biomes.js, Three.js for mesh
- Used by: World class, workerPool

**Camera Layer:**
- Purpose: Handle player view, projection matrices, and input-driven rotation
- Location: `voxx-js/camera.js`
- Contains: Camera class with position, rotation, view/projection matrices
- Depends on: None (standalone)
- Used by: main.js, renderer.js

**Terrain Generation Layer:**
- Purpose: Generate biome-based terrain using noise functions
- Location: `voxx-js/biomes.js`, `voxx-js/blocks.js`
- Contains: Biome definitions, height generation, block type selection
- Depends on: Simplex-noise library
- Used by: chunk.js, chunkCore.js, chunkWorker.js

**Worker Layer:**
- Purpose: Offload heavy computation to background threads
- Location: `voxx-js/workerPool.js`, `voxx-js/chunkWorker.js`
- Contains: WorkerPool class, chunkWorker script
- Depends on: chunkCore.js for terrain generation
- Used by: world.js

**Configuration Layer:**
- Purpose: Centralized constants for rendering, lighting, player, and UI
- Location: `voxx-js/config.js`
- Contains: RENDER_CONFIG, LIGHTING_CONFIG, PLAYER_CONFIG, SUN_CYCLE_CONFIG, UI_CONFIG
- Depends on: None
- Used by: All modules

## Data Flow

**World Update Flow:**

1. `main.js` calls `world.update(cameraPosition, renderDistance)` each frame
2. World calculates which chunks should be loaded based on camera position
3. For new chunks: `world.getChunk(chunkX, chunkZ)` creates Chunk and enqueues worker task
4. WorkerPool assigns task to available worker thread
5. Worker generates terrain using noise and performs greedy meshing
6. Worker posts mesh data back to main thread
7. World receives data, updates Chunk with voxel data and mesh
8. Chunks beyond render distance are disposed

**Rendering Flow:**

1. `main.js animate()` loop calls `renderer.render(chunks, camera, targetedBlock, skyData)`
2. Renderer updates camera position/rotation from Camera object
3. Renderer updates sky based on sun/moon cycle
4. Renderer calls `updateChunkMeshes()` to sync Three.js meshes
5. Renderer draws selection outline for targeted block
6. Three.js renders scene to canvas

**Block Placement Flow:**

1. Player right-clicks with pointer locked
2. `main.js placeBlock()` performs raycast
3. Ray traverses from camera through world in 0.1 unit steps
4. Converts world coords to chunk coords
5. Updates Chunk voxel data
6. Calls `chunk.updateMesh(true)` to regenerate mesh

## Key Abstractions

**Chunk:**
- Purpose: Represents a 32x256x32 volume of voxels
- Examples: `voxx-js/chunk.js`
- Pattern: Lazy initialization with worker-based generation

**WorkerPool:**
- Purpose: Manages pool of web workers for parallel chunk generation
- Examples: `voxx-js/workerPool.js`, `voxx-js/chunkWorker.js`
- Pattern: Pool pattern with task queue

**Camera:**
- Purpose: First-person camera with custom matrix calculations
- Examples: `voxx-js/camera.js`
- Pattern: Manual view/projection matrix computation (not using Three.js Camera)

**BiomeCalculator:**
- Purpose: Calculate biome blend at any world position
- Examples: `voxx-js/biomes.js`
- Pattern: Noise-based terrain evaluation

## Entry Points

**Application Entry:**
- Location: `voxx-js/index.html` → `<script type="module" src="./main.js">`
- Triggers: Browser loads HTML, imports main.js
- Responsibilities: Initialize renderer, camera, world; setup controls; start animation loop

**Animation Loop:**
- Location: `voxx-js/main.js` → `animate(currentTime)` function
- Triggers: `requestAnimationFrame(animate)`
- Responsibilities: Update movement, world, sun cycle, biome display, compass, camera matrices; render frame

**Chunk Generation Entry:**
- Location: `voxx-js/chunkWorker.js` → `self.onmessage`
- Triggers: WorkerPool enqueues task with chunk coordinates
- Responsibilities: Generate terrain, perform greedy meshing, post results back

## Error Handling

**Strategy:** Try-catch blocks with console.error logging and user-facing error UI

**Patterns:**
- Renderer initialization wraps in try-catch, shows error div on failure (`main.js` lines 76-79)
- Worker errors logged and callbacks invoked with null to indicate failure (`workerPool.js` lines 37-45)
- Chunk boundary checks return air (0) for out-of-bounds voxels (`chunk.js` lines 40-46)

## Cross-Cutting Concerns

**Logging:** Console.log used throughout for debugging (e.g., chunk generation timing, camera position)

**Validation:** 
- Block coordinates validated with bounds checks before voxel access
- Chunk neighbor availability verified before mesh generation

**Authentication:** Not applicable (client-side only, no auth)

---

*Architecture analysis: 2026-03-17*
