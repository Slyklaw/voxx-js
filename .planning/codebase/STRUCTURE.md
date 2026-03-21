# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
voxx-js/
├── .planning/                    # GSD planning documents
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONCERNS.md
│       ├── CONVENTIONS.md
│       ├── INTEGRATIONS.md
│       ├── STACK.md
│       └── TESTING.md
├── index.html                    # Entry HTML with canvas and UI
├── style.css                     # UI styling
├── config.js                    # Global configuration constants
├── blocks.js                    # Block type definitions
├── biomes.js                    # Biome definitions and generation
├── chunk.js                     # Chunk class (voxel volume)
├── chunkCore.js                 # Chunk dimension constants
├── chunkWorker.js               # Web Worker for chunk generation
├── greedyMesh.js                # Mesh generation algorithm
├── world.js                     # World state manager
├── workerPool.js                # Worker thread pool manager
├── textures-atlas.png           # Block texture atlas (1024×512)
├── vitest.config.js             # Test configuration
├── package.json                 # Dependencies (vitest, jsdom, simplex-noise)
└── src/
    ├── main.js                  # Main entry point (~1000 lines)
    ├── chunk/
    │   └── chunkManager.js      # Chunk lifecycle utilities
    └── gl/
        ├── buffers.js           # VBO/VAO/IBO management
        ├── context.js            # WebGL context initialization
        ├── fbo.js                # Framebuffer objects (G-buffer, SSAO, shadow)
        ├── frustum.js            # Frustum culling (unused)
        ├── performance.js        # FPS/metrics tracking
        ├── render.js             # Main renderer (~1140 lines)
        ├── shaders.js            # Shader compilation utilities
        ├── ubo.js                # Uniform buffer objects
        └── shaders/
            ├── voxel.js          # Voxel rendering shader (GLSL)
            ├── sky.js            # Skybox shader
            ├── ssao.js           # Screen-space ambient occlusion
            ├── blur.js           # SSAO blur pass
            ├── composite.js      # Final composite shader
            ├── selection.js      # Block selection outline
            └── shadow.js          # Shadow map depth shader
```

## Directory Purposes

**Root Level:**
- Purpose: Core application files and entry points
- Contains: HTML, CSS, JavaScript modules, configuration
- Key files: `index.html`, `src/main.js`, `config.js`

**`src/` (Source):**
- Purpose: Main application code
- Contains: Main module, GL utilities, shaders
- Key files: `src/main.js`, `src/gl/render.js`

**`src/chunk/` (Chunk Management):**
- Purpose: Chunk lifecycle utilities
- Contains: ChunkManager class
- Key files: `src/chunk/chunkManager.js`

**`src/gl/` (WebGL Utilities):**
- Purpose: Low-level WebGL2 resource management
- Contains: Buffers, context, FBOs, shaders, UBOs
- Key files: `src/gl/render.js`, `src/gl/buffers.js`, `src/gl/fbo.js`

**`src/gl/shaders/` (GLSL Shaders):**
- Purpose: All GLSL shader source and program creation
- Contains: Vertex/fragment shaders for each render pass
- Key files: `src/shaders/voxel.js`, `src/shaders/ssao.js`

**`tests/` (Testing):**
- Purpose: Unit and integration tests
- Contains: Vitest test suites
- Location: `tests/unit/`, `tests/integration/`

## Key File Locations

**Entry Points:**
- `index.html`: Browser entry (line 159 loads main.js)
- `src/main.js`: Main module (~1000 lines) - initializes WebGL, world, render loop
- `chunkWorker.js`: Web Worker entry for chunk generation

**Configuration:**
- `config.js`: Global constants (DEBUG, RENDER_CONFIG, LIGHTING_CONFIG, SSAO_CONFIG, etc.)
- `vitest.config.js`: Test runner configuration
- `package.json`: Dependencies and scripts

**Core Logic:**
- `world.js`: World state manager, chunk loading/unloading (326 lines)
- `chunk.js`: Chunk class, voxel access, mesh state (218 lines)
- `biomes.js`: Biome definitions, height generation (6081 bytes)
- `greedyMesh.js`: Mesh generation algorithm (5577 bytes)
- `blocks.js`: Block type definitions (4288 bytes)

**Rendering:**
- `src/gl/render.js`: Main renderer with multi-pass pipeline (1140 lines)
- `src/gl/buffers.js`: WebGL buffer management (10084 bytes)
- `src/gl/fbo.js`: Framebuffer objects (12252 bytes)
- `src/shaders/voxel.js`: Voxel vertex/fragment shaders (6753 bytes)

**Utilities:**
- `workerPool.js`: Worker thread pool (8144 bytes)
- `src/gl/performance.js`: FPS tracking (5250 bytes)
- `src/gl/shaders.js`: Shader compilation (1835 bytes)

## Naming Conventions

**Files:**
- Classes: PascalCase (`World.js`, `Chunk.js`, `WorkerPool.js`)
- Utilities/Modules: camelCase or kebab-case (`chunkCore.js`, `greedyMesh.js`)
- Shaders: snake_case (`voxel.js`, `sky.js`, `ssao.js`)

**Directories:**
- Lowercase single words (`src/gl/`, `src/chunk/`, `src/shaders/`)

**Classes:**
- PascalCase (`World`, `Chunk`, `WorkerPool`, `BiomeCalculator`)
- Singleton patterns: lowercase with `default` prefix (`defaultChunkManager`)

**Functions:**
- camelCase (`getChunk()`, `updateChunks()`, `syncChunkToWebGL()`)
- Export verbs: `create*`, `init*`, `update*`, `render*`, `dispose*`

**Constants:**
- SCREAMING_SNAKE_CASE: `CHUNK_WIDTH`, `CHUNK_HEIGHT`, `RENDER_CONFIG`
- Enum-like: `BLOCK_TYPES`, `BIOMES`

**Variables:**
- camelCase (`cameraPosition`, `chunkMeshes`, `targetedBlock`)
- Maps/Sets: descriptive names (`chunkAccessMap`, `pendingChunks`)

## Where to Add New Code

**New Feature/Module:**
- Primary: Root level or appropriate subdirectory
- If WebGL-related: Add to `src/gl/`
- If shader-related: Add to `src/gl/shaders/`
- Register in `src/main.js` if initialization needed

**New Shader:**
- Location: `src/shaders/` as `name.js`
- Export: `createNameProgram()`, `getNameUniforms()`, `getNameAttribs()`
- GLSL source as template literals in the file
- Import and call from `src/gl/render.js`

**New Block Type:**
- Location: `blocks.js` - add to `BLOCK_TYPES` enum
- Location: `biomes.js` - update `getBiomeBlockType()` if biome-specific
- Add texture to `textures-atlas.png`

**New Biome:**
- Location: `biomes.js` - add to `BIOMES` object with height/color config
- Update `generateBiomeHeight()` if custom generation needed

**New Utility (GL):**
- Location: `src/gl/` directory
- Export functions for use by `render.js`
- Follow existing patterns (e.g., `init*`, `dispose*`)

**New Test:**
- Location: `tests/unit/` or `tests/integration/`
- Naming: `name.test.js` for unit, `feature.integration.test.js` for integration
- Use Vitest framework (see `vitest.config.js`)

## Special Directories

**`src/gl/shaders/`:**
- Purpose: All GLSL shader code and program factories
- Generated: No (manually written GLSL)
- Committed: Yes
- Note: Each file exports `create*Program()`, `get*Uniforms()`, `get*Attribs()`

**`tests/`:**
- Purpose: Test suites
- Generated: No
- Committed: Yes
- Structure: `tests/unit/` for unit tests, `tests/integration/` for integration tests

**`.planning/codebase/`:**
- Purpose: GSD architecture documentation
- Generated: No
- Committed: Yes (for team reference)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**`textures-atlas.png`:**
- Purpose: Block texture atlas (1024×512, 16×16 tiles)
- Generated: External tool
- Committed: Yes (binary asset)

---

*Structure analysis: 2026-03-21*
