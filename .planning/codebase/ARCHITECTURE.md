# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Multi-pass WebGL2 Rendering Engine with Deferred Shading

**Key Characteristics:**
- Vanilla JavaScript ES modules (no framework)
- Raw WebGL2 API with custom GLSL shaders
- Deferred rendering pipeline with G-buffer
- Worker-based parallel chunk processing
- Chunk-based voxel world management
- Real-time SSAO and shadow mapping

## Layers

**Application Layer:**
- Purpose: Entry point and main game loop
- Location: `src/main.js`
- Contains: Camera control, input handling, game loop, block editing, UI coordination
- Depends on: World, Renderer, GL utilities
- Used by: Browser (via ES module import)

**World Layer:**
- Purpose: Voxel world state management and chunk coordination
- Location: `world.js`, `chunk.js`, `src/chunk/chunkManager.js`
- Contains: Chunk loading/unloading, terrain generation, biome system, hot chunk retention
- Depends on: WorkerPool, Chunk, BiomeCalculator, GreedyMesh
- Used by: Main (for rendering queries)

**Rendering Layer:**
- Purpose: All WebGL2 rendering operations
- Location: `src/gl/render.js`
- Contains: Multi-pass rendering pipeline, shader programs, texture management
- Depends on: GL utilities, Shaders
- Used by: Main (per-frame rendering)

**Shader Layer:**
- Purpose: GLSL vertex/fragment shaders for rendering effects
- Location: `src/shaders/` (voxel.js, sky.js, ssao.js, blur.js, composite.js, selection.js, shadow.js)
- Contains: Shader source code, program creation utilities, uniform/attribute accessors
- Depends on: None (pure GLSL)
- Used by: Render layer

**GL Utilities Layer:**
- Purpose: Low-level WebGL2 resource management
- Location: `src/gl/` (buffers.js, context.js, fbo.js, frustum.js, performance.js, shaders.js, ubo.js)
- Contains: Buffer management, framebuffer objects, uniform buffer objects, frustum culling
- Depends on: WebGL2 API
- Used by: Render, Main

**Worker Layer:**
- Purpose: Offload heavy computation to separate threads
- Location: `workerPool.js`, `chunkWorker.js`
- Contains: Worker pool management, chunk generation tasks, priority-based scheduling
- Depends on: Web Workers API
- Used by: World (for async chunk generation)

**Data/Configuration Layer:**
- Purpose: World generation algorithms and runtime configuration
- Location: `biomes.js`, `blocks.js`, `chunkCore.js`, `greedyMesh.js`, `config.js`
- Contains: Biome definitions, block types, noise functions, mesh generation, tuning parameters
- Depends on: None (pure computation)
- Used by: World, Chunk, Renderer

## Data Flow

**Main Render Loop (`src/main.js`):**

1. Input Processing
   - Capture mouse/keyboard via event listeners
   - Update camera position and rotation
   - Handle block selection and raycast targeting

2. World Update
   - Call `world.update(cameraPosition, renderDistance)`
   - Triggers chunk loading/unloading based on camera
   - Worker pool processes pending chunk generation

3. Chunk Synchronization
   - `updateChunks()` checks for new mesh data
   - `syncChunkToWebGL(chunk)` uploads mesh to GPU

4. Render Pass (delegated to `src/gl/render.js`)
   - `renderVoxelsToGBuffer()` executes multi-pass pipeline

**Multi-Pass Rendering Pipeline (`src/gl/render.js` - `renderVoxelsToGBuffer`):**

```
Pass 0: Shadow Map
├── Render depth from light perspective
└── Store in shadowMapFBO

Pass 1a: Sky (G-buffer albedo only)
├── Render gradient skybox
└── Output to gbuffer.color[0]

Pass 1b: Geometry (MRT - Multiple Render Targets)
├── Render chunk geometry
├── Output to gbuffer: albedo, normals, view position
└── Apply shadow sampling

Pass 2: SSAO
├── Sample G-buffer normals and positions
├── Generate ambient occlusion
└── Output to ssaoBuffer

Pass 3: Blur
├── Edge-aware blur on SSAO
└── Output to ssaoBlurBuffer

Pass 4: Composite
├── Multiply albedo × blurred SSAO
└── Output to screen
```

**Worker Chunk Generation Flow (`world.js`, `chunkWorker.js`):**

1. World requests chunk via `getChunk(x, z)`
2. If not cached, enqueue task to WorkerPool with priority (distance-based)
3. Worker executes `chunkWorker.js`:
   - Generate terrain using simplex noise and biomes
   - Build mesh data using greedy meshing algorithm
   - Return `{ voxels, meshData }` via postMessage
4. Main thread receives result in `onComplete` callback
5. Chunk mesh uploaded to GPU via `syncChunkToWebGL()`

## Key Abstractions

**World (`world.js`):**
- Purpose: Central coordinator for all chunk state
- Examples: `src/main.js` instantiates `new World(seed, gl)`
- Pattern: Singleton-like manager with Map-based chunk storage
- Key methods: `getChunk()`, `update()`, `getVisibleChunks()`, `dispose()`

**Chunk (`chunk.js`):**
- Purpose: Single 16×256×16 voxel volume
- Examples: `world.chunks["0,0"]` references a chunk
- Pattern: Value object with neighbor references and mesh state
- Key methods: `getVoxel()`, `setVoxel()`, `generate()`, `updateMesh()`, `dispose()`

**ChunkManager (`src/chunk/chunkManager.js`):**
- Purpose: Legacy utility for chunk lifecycle management
- Examples: `defaultChunkManager` singleton
- Pattern: Manager with Map-based storage
- Note: `World` class now handles most chunk management directly

**WorkerPool (`workerPool.js`):**
- Purpose: Thread pool for parallel chunk generation
- Examples: `world.pool = new WorkerPool('./chunkWorker.js')`
- Pattern: Priority queue with worker availability tracking
- Key methods: `enqueueTask()`, `terminate()`, `clearStaleRequests()`

**BiomeCalculator (`biomes.js`):**
- Purpose: Procedural biome height and block type determination
- Examples: `biomeCalculator.getBiomeContributions(x, z)`
- Pattern: Noise-based procedural generation
- Key classes: `BIOMES` enum, `BiomeCalculator`, `generateBiomeHeight()`

**GreedyMesh (`greedyMesh.js`):**
- Purpose: Convert voxel data to optimized mesh geometry
- Examples: `generateMeshData(chunk, getVoxelFn, chunkX, chunkZ)`
- Pattern: Quads-based mesh optimization
- Output: `{ positions, colors, normals, uvs, indices, ... }`

**Renderer (`src/gl/render.js`):**
- Purpose: All WebGL2 rendering operations
- Examples: `renderVoxelsToGBuffer(gl, canvas, chunks, ...)`
- Pattern: State machine managing render passes
- Key exports: `initRenderer()`, `loadTextureAtlas()`, `renderVoxelsToGBuffer()`, `updateSSAOSettings()`

**Shader Programs (`src/shaders/*.js`):**
- Purpose: GLSL shader compilation and uniform/attribute access
- Examples: `createVoxelProgram(gl)`, `getVoxelUniforms(gl, program)`
- Pattern: Factory functions returning compiled programs and accessors

## Entry Points

**Browser Entry Point:**
- Location: `index.html` (line 159)
- Triggers: `<script type="module" src="./src/main.js">`
- Responsibilities: Load main.js, mount canvas, UI elements present

**Main Module:**
- Location: `src/main.js`
- Triggers: ES module import from index.html
- Responsibilities: Initialize WebGL, create world, start render loop
- Flow: Sets up controls → initializes renderer → creates World → `requestAnimationFrame(render)`

**Worker Entry Point:**
- Location: `chunkWorker.js`
- Triggers: `new Worker('./chunkWorker.js')` from WorkerPool
- Responsibilities: Chunk generation, mesh building, postMessage results

## Error Handling

**Strategy:** Graceful degradation with debug logging

**Patterns:**
- WebGL context loss: `disposeWebGLResources()` / `initWebGLResources()` handlers
- Worker failures: Auto-recreation via `recreateWorker()` in WorkerPool
- Stale requests: `clearStaleRequests()` during fast player movement
- GLSL compilation: Try-catch with detailed error messages
- Missing resources: Placeholder textures (magenta 1×1 pixel)

## Cross-Cutting Concerns

**Logging:** `console.log()` / `console.error()` with `[Tag]` prefixes (e.g., `[Renderer]`, `[World]`)

**Validation:** 
- Null checks on WebGL resources
- Bounds checking in voxel access
- Context loss detection via `isContextLost()`

**Configuration:**
- Centralized in `config.js` (DEBUG, RENDER_CONFIG, LIGHTING_CONFIG, etc.)
- Atlas constants in `ATLAS_CONFIG`
- Worker tuning in `WORKER_CONFIG`

**Performance Monitoring:**
- `src/gl/performance.js`: FPS tracking, draw call counting, frame timing
- `getFPS()`, `getDrawCalls()`, `logPerformance()`

---

*Architecture analysis: 2026-03-21*
