# Codebase Structure

**Analysis Date:** 2026-03-17

## Directory Layout

```
voxx-js/                          # Project root (also repo root)
├── voxx-js/                      # Source code directory
│   ├── index.html                # Entry HTML
│   ├── main.js                   # Application entry point
│   ├── style.css                 # UI styles
│   ├── config.js                 # Configuration constants
│   ├── renderer.js               # Three.js rendering
│   ├── camera.js                 # Camera/view matrices
│   ├── world.js                  # World management
│   ├── chunk.js                  # Chunk (main thread)
│   ├── chunkCore.js              # Chunk logic (worker thread)
│   ├── chunkWorker.js            # Web Worker script
│   ├── workerPool.js             # Worker management
│   ├── blocks.js                 # Block definitions
│   ├── biomes.js                 # Biome/terrain generation
│   ├── shaders.js                # GLSL shaders
│   ├── sky.js                    # Sky rendering
│   └── textures-atlas.png       # Block texture atlas (256x256)
├── .planning/
│   └── codebase/                 # Analysis documents
├── README.md
└── LICENSE
```

## Directory Purposes

**voxx-js/ (source):**
- Purpose: All application source code
- Contains: JavaScript modules, HTML, CSS, textures, shaders
- Key files: `main.js`, `index.html`

**voxx-js/textures-atlas.png:**
- Purpose: Sprite atlas containing all block textures (16x16 per block)
- Generated: Not in repo (external asset)
- Committed: Yes

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md
- Generated: Yes (by this analysis)
- Committed: No

## Key File Locations

**Entry Points:**
- `voxx-js/index.html`: HTML entry - loads main.js as module
- `voxx-js/main.js`: JS entry - initializes engine, runs animation loop

**Configuration:**
- `voxx-js/config.js`: All tunable constants (render distance, fog, player speed, sun cycle)

**Core Logic:**
- `voxx-js/world.js`: Chunk management and worker coordination
- `voxx-js/chunk.js`: Chunk mesh generation (main thread)
- `voxx-js/chunkCore.js`: Chunk voxel storage and terrain generation (worker)
- `voxx-js/chunkWorker.js`: Web Worker for async chunk generation
- `voxx-js/workerPool.js`: Worker pool management
- `voxx-js/biomes.js`: Terrain height and block type generation
- `voxx-js/blocks.js`: Block type definitions and colors

**Rendering:**
- `voxx-js/renderer.js`: Three.js scene setup and rendering
- `voxx-js/camera.js`: Camera view/projection matrices
- `voxx-js/shaders.js`: GLSL vertex and fragment shaders
- `voxx-js/sky.js`: Sky dome with sun/moon cycle

**Assets:**
- `voxx-js/textures-atlas.png`: Block textures (loaded at runtime)

## Naming Conventions

**Files:**
- camelCase.js: All JavaScript files use camelCase
- UPPERCASE.js: Constants files may use uppercase (rare)
- hyphen-case.css: CSS uses kebab-case

**Classes:**
- PascalCase: All classes (Renderer, Camera, World, Chunk, BiomeCalculator, WorkerPool, SkyRenderer)

**Functions:**
- camelCase: All functions (init, animate, update, generateChunk)

**Variables:**
- camelCase: Local variables and properties
- UPPER_SNAKE_CASE: Constants (RENDER_CONFIG, CHUNK_WIDTH, BLOCK_TYPES)

**Constants/Configuration:**
- Object exports in UPPER_SNAKE_CASE (e.g., `RENDER_CONFIG`, `BLOCK_TYPES`)
- Block types as PascalCase keys (e.g., `BLOCK_TYPES.STONE`)

## Where to Add New Code

**New Feature:**
- Primary code: Add to appropriate existing module (e.g., new block type → `blocks.js`)
- Tests: Not applicable (no test framework currently)

**New Component/Module:**
- Implementation: Create new `.js` file in `voxx-js/` directory
- Export from main.js if needed for initialization

**Utilities:**
- Shared helpers: Consider adding to existing relevant module
- Noise utilities: `biomes.js` (already imports simplex-noise)
- Math utilities: Could create `math.js` if needed

**New Block Type:**
- Add to `blocks.js`: Add to `BLOCKS` array, `BLOCK_TYPES` enum, update `getBlockColor()`, `getBlockAtlasPositions()`
- Update shader uniforms in `chunk.js` and `renderer.js` (arrays sized for 6 block types)

**New Biome:**
- Add to `biomes.js`: Add to `BIOMES` object, update `getBiomeBlockType()`
- BiomeCalculator will automatically include it in biome blending

## Special Directories

**voxx-js/textures-atlas.png:**
- Purpose: Texture atlas for block rendering
- Generated: External (created separately, not procedurally)
- Committed: Yes (binary PNG)

**Web Workers (voxx-js/chunkWorker.js):**
- Purpose: Run chunk generation in background thread
- Note: Must be separate file (not inline), loaded as module

---

*Structure analysis: 2026-03-17*
