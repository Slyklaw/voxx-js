# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
voxx-js/
├── index.html           # HTML entry with canvas
├── style.css            # UI styling
├── textures-atlas.png   # Block texture atlas (1024x512)
├── config.js            # Configuration constants
├── blocks.js            # Block type definitions
├── biomes.js            # Biome and terrain generation
├── world.js             # World/chunk management
├── chunk.js             # Individual chunk implementation
├── chunkCore.js         # Chunk constants
├── chunkWorker.js       # Web Worker for chunk generation
├── workerPool.js        # Worker thread pool
└── src/
    ├── main.js          # Main entry point (ES module)
    ├── shaders/
    │   ├── voxel.js     # Voxel rendering shaders
    │   ├── sky.js       # Sky rendering shaders
    │   └── selection.js # Block selection shaders
    ├── gl/
    │   ├── context.js   # WebGL2 context setup
    │   ├── render.js    # Rendering pipeline
    │   ├── buffers.js   # VAO/VBO/IBO management
    │   ├── shaders.js   # Shader compilation utilities
    │   ├── ubo.js       # Uniform buffer objects
    │   ├── performance.js # FPS/metrics tracking
    │   └── test-render.js # Test rendering utilities
    └── chunk/
        └── chunkManager.js # Chunk lifecycle management
```

## Directory Purposes

**Root (`voxx-js/`):**
- Purpose: Core game logic and data
- Contains: World, chunks, blocks, biomes, config
- Key files: `world.js`, `chunk.js`, `blocks.js`, `config.js`

**`src/` (Source):**
- Purpose: Application entry and WebGL rendering
- Contains: Main module, GL pipeline, shaders

**`src/shaders/` (Shaders):**
- Purpose: GLSL shader source code
- Contains: Vertex/fragment shader factories

**`src/gl/` (Graphics Library):**
- Purpose: WebGL2 rendering utilities
- Contains: Context, rendering, buffers, shaders, UBO, performance

**`src/chunk/` (Chunk Utilities):**
- Purpose: Chunk management utilities
- Contains: `chunkManager.js` - alternative chunk tracking

## Key File Locations

**Entry Points:**
- `voxx-js/index.html` - Page entry, canvas element
- `voxx-js/src/main.js` - ES module entry, render loop
- `voxx-js/chunkWorker.js` - Worker entry for chunk generation

**Configuration:**
- `voxx-js/config.js` - All game constants (RENDER_CONFIG, PLAYER_CONFIG, SUN_CYCLE_CONFIG)
- `voxx-js/blocks.js` - Block type definitions (BLOCK_TYPES, BLOCKS)
- `voxx-js/biomes.js` - Biome constants (BIOMES, BIOME_CONFIG, SEA_LEVEL)

**Core Logic:**
- `voxx-js/world.js` - World class, chunk management
- `voxx-js/chunk.js` - Chunk class, voxel storage, mesh generation
- `voxx-js/chunkCore.js` - Chunk dimension constants

**WebGL2 Rendering:**
- `voxx-js/src/gl/context.js` - WebGL2 context setup
- `voxx-js/src/gl/render.js` - Main rendering functions
- `voxx-js/src/gl/buffers.js` - VAO/VBO buffer management
- `voxx-js/src/gl/shaders.js` - Shader compilation
- `voxx-js/src/gl/ubo.js` - Uniform buffer objects

**Shaders:**
- `voxx-js/src/shaders/voxel.js` - Voxel mesh shaders
- `voxx-js/src/shaders/sky.js` - Sky gradient shaders
- `voxx-js/src/shaders/selection.js` - Block selection wireframe

**Worker/Async:**
- `voxx-js/workerPool.js` - WorkerPool class
- `voxx-js/chunkWorker.js` - Chunk generation worker

## Naming Conventions

**Files:**
- CamelCase for classes/objects: `world.js`, `chunk.js`, `workerPool.js`
- Lowercase for utilities/styles: `config.js`, `blocks.js`, `style.css`

**Directories:**
- Lowercase descriptive: `src/gl/`, `src/shaders/`, `src/chunk/`

**Classes:**
- PascalCase: `World`, `Chunk`, `BiomeCalculator`, `WorkerPool`

**Functions/Variables:**
- camelCase: `getChunk`, `updateMesh`, `renderDistance`
- UPPER_CASE for constants: `CHUNK_WIDTH`, `RENDER_CONFIG`, `BLOCK_TYPES`

**Modules:**
- ES modules with `.js` extension and `export`/`import`

## Where to Add New Code

**New Feature (Block Type):**
- Define in `voxx-js/blocks.js` (BLOCK_TYPES constant, BLOCKS array)
- Add atlas position in `BLOCKS` array
- Update `getBiomeBlockType()` in `voxx-js/biomes.js` if needed

**New Biome:**
- Add to `BIOMES` object in `voxx-js/biomes.js`
- Update `getBiomeBlockType()` for block type rules

**New Shader:**
- Add shader source in `voxx-js/src/shaders/` directory
- Import in `voxx-js/src/gl/render.js`
- Initialize program in `initRenderer()`

**New WebGL Utility:**
- Add to `voxx-js/src/gl/` directory
- Export functions for use in `render.js`

**New Worker Task:**
- Add handler in `voxx-js/chunkWorker.js`
- Add wrapper method in `voxx-js/workerPool.js` if needed

**New UI Element:**
- Add HTML in `voxx-js/index.html`
- Add styles in `voxx-js/style.css`
- Add event handlers in `voxx-js/src/main.js`

## Special Directories

**`src/gl/`:**
- Purpose: All WebGL2 rendering code
- Generated: No
- Committed: Yes

**Shaders (`src/shaders/`):**
- Purpose: GLSL shader source as JS string exports
- Generated: No (written by hand)
- Committed: Yes

**Chunk Worker (`chunkWorker.js`):**
- Purpose: Runs in Web Worker thread for parallel processing
- Generated: No
- Committed: Yes
- Note: Cannot use ES module imports from main thread

**Textures (`textures-atlas.png`):**
- Purpose: 1024x512 pixel art atlas, 16x16 tiles
- Generated: External tool (pixel art editor)
- Committed: Yes

---

*Structure analysis: 2026-03-18*
