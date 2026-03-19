# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- Lowercase with camelCase: `chunk.js`, `biomes.js`, `greedyMesh.js`
- Directories: lowercase, some camelCase (`chunk/`), some lowercase (`gl/`, `shaders/`)
- Entry points: `src/main.js` (main entry), `index.html` (HTML entry)

**Functions:**
- camelCase: `getVoxel`, `setVoxel`, `generateMeshData`, `initWebGLResources`
- PascalCase for classes: `Chunk`, `World`, `BiomeCalculator`, `WorkerPool`
- Private methods prefixed with underscore: `_createMeshFromData`, `_updateMeshInPlace`

**Variables:**
- camelCase: `cameraPosition`, `isPointerLocked`, `selectedBlockType`
- Constants: UPPER_SNAKE_CASE: `CHUNK_WIDTH`, `DEBUG`, `RENDER_CONFIG`
- Global state: exported constants: `BLOCK_TYPES`, `BIOME_CONFIG`

**Types:**
- No TypeScript; JSDoc used for parameter documentation (see `blocks.js` functions)

## Code Style

**Formatting:**
- Indentation: 2 spaces
- Quotes: single quotes for strings (`'WebGL2 main initializing...'`)
- Template literals for string interpolation: `Chunk ${chunkX},${chunkZ}`
- Semicolons: used consistently
- Line length: no strict limit, but lines are generally under 120 chars

**Linting:**
- No ESLint/Prettier config detected
- Code style appears manually consistent

## Import Organization

**Order:**
1. External libraries (e.g., `simplex-noise`)
2. Local module imports (`./chunk.js`, `../config.js`)
3. Relative imports with path aliases not used

**Path Aliases:**
- Not used; relative paths only (`./`, `../`)

## Error Handling

**Patterns:**
- Debug assertions via conditional console.error: `if (DEBUG && ...) console.error(...)`
- Guard clauses: early returns for invalid inputs (`if (x < 0 || ...) return 0`)
- WebGL error checking: `const err = gl.getError(); if (err !== gl.NO_ERROR) console.error(...)`
- Try-catch around WebGL mesh creation with error logging (`src/main.js` line 714-738)

## Logging

**Framework:** console (console.log, console.error)

**Patterns:**
- Debug logging guarded by `DEBUG` flag from `config.js`
- Prefixes: `[WebGL2]`, `[BlockEdit]`, `[Camera]`, `[Texture]`
- Example: `if (DEBUG) console.log('[WebGL2] Resources disposed on context loss')`
- Error logging always printed: `console.error('[Renderer] WebGL error: ${err}')`

## Comments

**When to Comment:**
- Function purpose: JSDoc style for exported functions (`blocks.js`, `biomes.js`)
- Inline comments for complex logic (e.g., raycast algorithm, biome blending)
- Commented-out debug logs for future use (often left commented)

**JSDoc/TSDoc:**
- Used for exported functions with `@param` and `@returns` tags
- Example: `/** Debug assertion for valid block type */` in `blocks.js`

## Function Design

**Size:** Functions are moderate (20-50 lines), with some longer rendering loops (100+ lines)

**Parameters:** Objects used for multiple parameters (e.g., `registerContextResources({ dispose, init })`)

**Return Values:** Often plain objects or arrays; sometimes return `null`/`undefined` for failure

## Module Design

**Exports:** Named exports for functions and constants; default exports not used

**Barrel Files:** Not used; each file exports its own API

## Specific Patterns

**Configuration:**
- Centralized in `config.js` with exported constants (`RENDER_CONFIG`, `PLAYER_CONFIG`, etc.)
- Constants are immutable objects (exported as `const`)

**WebGL Resource Management:**
- Resource registry pattern for context loss/restoration (`src/gl/context.js`)
- Register resources via `registerContextResources({ dispose, init })`

**Chunk Mesh Generation:**
- Mesh data stored as plain arrays (`positions`, `normals`, `colors`, `indices`)
- WebGL buffers created separately in `src/gl/buffers.js`

**Worker Communication:**
- Worker pool pattern (`workerPool.js`) with async tasks
- Completion callbacks with error handling

---

*Convention analysis: 2026-03-19*