# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```
voxx-js/
├── .git/                    # Git repository data
├── .planning/               # GSD planning documents
├── voxx-js/                 # Main application directory
│   ├── src/                 # Source modules
│   │   ├── chunk/           # Chunk management module
│   │   ├── gl/              # WebGL rendering layer
│   │   ├── shaders/         # GLSL shader source files
│   │   └── main.js          # Application entry point
│   ├── index.html           # HTML entry point
│   ├── style.css            # Application styling
│   ├── textures-atlas.png   # Block texture atlas
│   ├── config.js            # Configuration constants
│   ├── world.js             # World management
│   ├── chunk.js             # Chunk implementation
│   ├── chunkCore.js         # Core chunk data model
│   ├── blocks.js            # Block definitions
│   ├── biomes.js            # Biome system
│   ├── greedyMesh.js        # Greedy meshing algorithm
│   ├── chunkWorker.js       # Web Worker for chunk generation
│   └── workerPool.js        # Worker pool management
├── LICENSE                  # MIT License
└── README.md                # Project readme
```

## Directory Purposes

**voxx-js/src/:**
- Purpose: Application source code organized by functional domain
- Contains: WebGL rendering, chunk management, shader programs
- Key files: `main.js`, `gl/`, `chunk/`, `shaders/`

**voxx-js/src/gl/:**
- Purpose: WebGL2 rendering layer abstraction
- Contains: Context management, shader utilities, buffer management, UBOs, performance monitoring
- Key files: `context.js`, `render.js`, `shaders.js`, `buffers.js`, `ubo.js`, `performance.js`

**voxx-js/src/shaders/:**
- Purpose: GLSL shader source code as JavaScript template literals
- Contains: Vertex and fragment shaders for different rendering passes
- Key files: `voxel.js`, `sky.js`, `selection.js`

**voxx-js/src/chunk/:**
- Purpose: Chunk management utilities (appears to be legacy/unused)
- Contains: Chunk manager class with dirty tracking
- Key files: `chunkManager.js`

**Root Directory (voxx-js/):**
- Purpose: Application entry point and core domain logic
- Contains: World, Chunk, Block, Biome, Meshing, Workers, Configuration
- Key files: `index.html`, `main.js`, `world.js`, `chunk.js`, `blocks.js`, `biomes.js`, `greedyMesh.js`, `config.js`

## Key File Locations

**Entry Points:**
- `voxx-js/index.html`: HTML page that loads the application
- `voxx-js/src/main.js`: JavaScript entry point, initializes all systems

**Configuration:**
- `voxx-js/config.js`: Centralized configuration for rendering, player, lighting, UI
- `voxx-js/blocks.js`: Block type definitions and properties
- `voxx-js/biomes.js`: Biome definitions and generation parameters

**Core Logic:**
- `voxx-js/world.js`: World management, chunk loading/unloading, spatial queries
- `voxx-js/chunk.js`: Chunk data structure with voxel storage and mesh generation
- `voxx-js/chunkCore.js`: Core chunk data model used by workers
- `voxx-js/greedyMesh.js`: Greedy meshing algorithm implementation

**Rendering:**
- `voxx-js/src/gl/render.js`: Main rendering pipeline orchestration
- `voxx-js/src/gl/context.js`: WebGL2 context management
- `voxx-js/src/gl/shaders.js`: Shader compilation utilities
- `voxx-js/src/gl/buffers.js`: WebGL buffer management
- `voxx-js/src/gl/ubo.js`: Uniform Buffer Object management

**Worker System:**
- `voxx-js/chunkWorker.js`: Web Worker for chunk generation
- `voxx-js/workerPool.js`: Worker pool with task queue

**Testing:**
- Not applicable - no test files found in codebase

## Naming Conventions

**Files:**
- camelCase for JavaScript files: `world.js`, `chunk.js`, `greedyMesh.js`
- PascalCase for class-containing files: `ChunkCore` in `chunkCore.js` (exception)
- Descriptive names matching primary export: `WorkerPool` in `workerPool.js`
- Shader files named by purpose: `voxel.js`, `sky.js`, `selection.js`

**Directories:**
- lowercase for functional grouping: `src/`, `gl/`, `chunk/`, `shaders/`
- No hyphens or underscores in directory names

**Classes/Functions:**
- PascalCase for classes: `World`, `Chunk`, `WorkerPool`, `ChunkManager`
- camelCase for functions and variables: `getChunk()`, `updateMesh()`, `chunkMeshes`
- UPPER_CASE for constants: `CHUNK_WIDTH`, `BLOCK_TYPES`, `RENDER_CONFIG`

## Where to Add New Code

**New Feature (Rendering):**
- Primary code: `voxx-js/src/gl/` (add new module like `lighting.js`)
- Tests: No test directory structure exists

**New Feature (World/Chunks):**
- Primary code: `voxx-js/world.js` or new file in root
- Worker code: `voxx-js/chunkWorker.js` for generation logic
- Mesh generation: `voxx-js/greedyMesh.js`

**New UI Feature:**
- Primary code: `voxx-js/src/main.js` for event handling
- Styling: `voxx-js/style.css`
- HTML elements: `voxx-js/index.html`

**New Shader Effect:**
- Primary code: `voxx-js/src/shaders/` (new file like `water.js`)
- Integration: `voxx-js/src/gl/render.js`

**Utilities:**
- Shared helpers: `voxx-js/src/gl/shaders.js` (already contains utilities)
- Math utilities: Inline in `src/main.js` (contains matrix/vector operations)

## Special Directories

**voxx-js/src/gl/:**
- Purpose: WebGL abstraction layer, hardware-accelerated rendering
- Generated: No, hand-written
- Committed: Yes

**voxx-js/src/shaders/:**
- Purpose: GLSL shader source embedded in JavaScript
- Generated: No, hand-written
- Committed: Yes

**voxx-js/workerPool.js:**
- Purpose: Web Worker pool management, off-main-thread computation
- Generated: No, hand-written
- Committed: Yes

**voxx-js/textures-atlas.png:**
- Purpose: Block texture atlas (1024x512 pixels, 16x16 tiles)
- Generated: No, artist-created asset
- Committed: Yes

---

*Structure analysis: 2026-03-19*