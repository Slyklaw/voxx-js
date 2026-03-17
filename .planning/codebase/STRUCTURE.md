# Codebase Structure

**Analysis Date:** 2026-03-16

## Directory Layout

```
voxx-js/
├── index.html                 # Entry point, loads engine.js as ES module
├── src/
│   ├── core/                  # Core engine systems
│   │   ├── engine.js          # Main engine class, WebGL initialization
│   │   ├── renderer.js        # WebGL rendering system with shaders
│   │   └── world.js           # World/terrain generation
│   ├── chunks/                # Chunk management
│   │   ├── chunk.js           # Chunk data structure
│   │   └── chunk-manager.js   # Chunk loading/unloading system
│   ├── player/                # Player controller
│   │   └── player.js          # Player controller and physics
│   └── graphics/              # Graphics resources (placeholder)
│       ├── shaders/           # Empty directory for shader files
│       └── textures/          # Empty directory for texture files
├── .planning/                 # GSD planning documents
│   └── codebase/              # Codebase analysis documents
└── [other root files]         # LICENSE, README.md, etc.
```

## Directory Purposes

**`src/core/`:**
- Purpose: Core engine systems (Engine, World, Renderer)
- Contains: JavaScript modules implementing main engine functionality
- Key files: `engine.js`, `renderer.js`, `world.js`

**`src/chunks/`:**
- Purpose: Chunk-based world storage and management
- Contains: Data structures and systems for voxel chunk handling
- Key files: `chunk.js`, `chunk-manager.js`

**`src/player/`:**
- Purpose: Player controller and input handling
- Contains: Player movement, physics, and input processing
- Key files: `player.js`

**`src/graphics/`:**
- Purpose: Placeholder for graphics assets
- Contains: Empty directories intended for shaders and textures
- Key files: None (empty)

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Contains: Generated analysis files (ARCHITECTURE.md, STACK.md, etc.)
- Key files: `ARCHITECTURE.md`, `STACK.md`

## Key File Locations

**Entry Points:**
- `index.html`: Browser entry point, loads engine as ES module
- `src/core/engine.js`: Engine initialization and main loop

**Configuration:**
- No configuration files detected (no package.json, config files)
- Project uses static file serving only

**Core Logic:**
- `src/core/engine.js`: Engine orchestration
- `src/core/world.js`: World generation and voxel storage
- `src/core/renderer.js`: WebGL rendering pipeline
- `src/chunks/chunk.js`: Voxel data container
- `src/chunks/chunk-manager.js`: Chunk lifecycle management
- `src/player/player.js`: Player physics and input

**Testing:**
- No test files detected
- No test framework configuration

## Naming Conventions

**Files:**
- Lowercase with hyphens for multi-word names: `chunk-manager.js`
- Single word for simple modules: `engine.js`, `world.js`, `player.js`
- Consistent `.js` extension for all JavaScript modules

**Directories:**
- Lowercase singular nouns: `core`, `chunks`, `player`, `graphics`
- No hyphens in directory names

**Classes:**
- PascalCase: `Engine`, `World`, `Renderer`, `Player`, `Chunk`, `ChunkManager`
- One class per file (ES6 export)

**Variables/Methods:**
- camelCase: `chunkSize`, `generateChunk()`, `getVoxelIndex()`
- Private-like underscore convention not used (no underscore prefix)

## Where to Add New Code

**New Feature:**
- Primary code: `src/` directory (appropriate subdirectory based on domain)
- Tests: Not applicable (no test structure)
- Example: New physics system → `src/physics/physics.js`

**New Component/Module:**
- Implementation: Create new file in relevant `src/` subdirectory
- Export: ES6 class or function export
- Example: New audio system → `src/audio/audio.js`

**Utilities:**
- Shared helpers: Create in appropriate domain directory
- No dedicated `utils/` directory exists
- Example: Math utilities → `src/core/math.js` (if core-related) or `src/utils/math.js` (new directory)

## Special Directories

**`src/graphics/shaders/`:**
- Purpose: Intended for GLSL shader files
- Generated: No
- Committed: Yes (currently empty)

**`src/graphics/textures/`:**
- Purpose: Intended for texture image files
- Generated: No
- Committed: Yes (currently empty)

**`.planning/`:**
- Purpose: GSD-generated planning documents
- Generated: Yes
- Committed: Not yet (should be ignored via .gitignore)

---

*Structure analysis: 2026-03-16*