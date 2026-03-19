# Coding Conventions

**Analysis Date:** 2026-03-18

## Language

- **JavaScript** (ES2020+) - Vanilla JavaScript with ES modules
- **WebGL2** - Direct GPU rendering, no abstraction library (no Three.js)

## File Organization

### File Naming
- **Pattern:** kebab-case (e.g., `chunkManager.js`, `test-render.js`, `workerPool.js`)
- **Directories:** kebab-case (e.g., `src/gl/`, `src/chunk/`, `src/shaders/`)

### Directory Structure
```
voxx-js/
├── voxx-js/              # Main source directory
│   ├── src/              # Core rendering logic
│   │   ├── gl/           # WebGL2 rendering (buffers, shaders, context, performance)
│   │   ├── chunk/        # Chunk management
│   │   └── shaders/      # GLSL shader code (voxel, sky, selection)
│   ├── world.js          # World generation and chunk loading
│   ├── chunk.js          # Individual chunk voxel data and mesh generation
│   ├── blocks.js         # Block type definitions and utilities
│   ├── biomes.js         # Biome generation and calculations
│   ├── config.js         # Configuration constants
│   ├── workerPool.js     # Web Worker pool for chunk generation
│   └── chunkWorker.js    # Web Worker for async chunk generation
└── .planning/            # GSD planning directory
```

## Naming Conventions

### Classes
- **Pattern:** PascalCase
- **Examples:** `World`, `Chunk`, `ChunkManager`, `BiomeCalculator`, `WorkerPool`

### Functions
- **Pattern:** camelCase
- **Examples:** `createChunkMeshFromData`, `getVoxel`, `initRenderer`, `updateTargetedBlock`
- **Verb prefixes:** `get`, `set`, `create`, `init`, `update`, `render`, `is`, `has`

### Variables
- **Pattern:** camelCase
- **Examples:** `cameraPosition`, `chunkMeshes`, `wireframeMode`, `textureAtlas`

### Constants
- **Pattern:** SCREAMING_SNAKE_CASE
- **Examples:** `CHUNK_WIDTH`, `BLOCK_TYPES`, `RENDER_CONFIG`, `FPS_SAMPLE_SIZE`
- **Configuration objects:** PascalCase keys within UPPER_SNAKE objects: `RENDER_CONFIG.FOV`

### Exports
- **Named exports only** - No default exports
- **Re-exports grouped** at end of file: `export { CHUNK_SIZE, createChunkKey, parseChunkKey };`

## Code Style

### Formatting
- **Indentation:** 2 spaces (observed throughout codebase)
- **Semicolons:** Always used (after every statement)
- **Braces:** Same-line style
  ```javascript
  if (condition) {
    doSomething();
  }
  ```
- **Arrow functions:** Used for callbacks where appropriate
- **Template literals:** Used for string interpolation: `` `Chunk ${key}` ``

### Import Organization
1. External CDN imports first
2. Internal module imports next
3. Relative imports last
```javascript
// External
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';

// Internal modules
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';

// Relative (same module)
import { gl, canvas, isContextLost } from './gl/context.js';
```

### Module System
- **ES Modules** with `.js` extension in import paths
- **Named exports** only
- **Barrel exports** used in modules: `export { function1, function2, CONSTANT };`

## Comments

### JSDoc Style
Used for public functions and complex algorithms:
```javascript
/**
 * Load texture atlas from URL
 * @param {WebGL2RenderingContext} gl 
 * @param {string} url - Path to texture atlas image
 * @returns {WebGLTexture|null} The loaded texture or null on failure
 */
export function loadTextureAtlas(gl, url = 'textures-atlas.png') {
```

### Inline Comments
Used for non-obvious logic:
```javascript
// Slightly larger than block to avoid z-fighting
const size = 0.51; 

// Guard if chunk was unloaded while job ran
if (!this.chunks[key]) {
  return;
}
```

### Debug Logging Prefix
Tagged console output for easy filtering:
```javascript
console.log('[Renderer] Initializing voxel renderer...');
console.log('[BlockEdit] Target: ${x},${y},${z}');
console.error('[WebGL2] Error creating mesh for chunk ${key}:', e);
```

## Error Handling

### Try/Catch Pattern
For WebGL operations and complex initialization:
```javascript
try {
  const webglMesh = createChunkMeshFromData(gl, chunk.meshData, voxelAttribs);
  if (webglMesh) {
    chunk._webglMesh = webglMesh;
  }
} catch (e) {
  console.error(`[WebGL2] Error creating mesh for chunk ${key}:`, e);
  return null;
}
```

### Guard Clauses
Early returns for invalid states:
```javascript
if (!chunk || !chunk.meshData || chunk.meshData.positions.length === 0) {
  return null;
}

if (!targetedBlock || !targetedBlock.hit) {
  console.log('[BlockEdit] destroyBlock: no target');
  return;
}
```

### Null Returns
Functions return `null` instead of throwing for expected failure cases:
```javascript
export function createChunkMeshFromData(gl, meshData, attribs = null) {
  if (!meshData || !meshData.positions || meshData.positions.length === 0) {
    return null;
  }
  // ...
}
```

## Logging

### Console Usage
- **`console.log`** - General logging, initialization, state changes
- **`console.error`** - Errors and failures
- **`console.warn`** - Warnings (not heavily used)

### Tagged Logging Format
```
[ModuleName] Message
```
- `[Renderer]` - WebGL rendering
- `[World]` - World/chunk management
- `[BlockEdit]` - Block interaction
- `[Debug]` - Debug mode toggles
- `[Performance]` - FPS and timing
- `[WebGL2]` - WebGL-specific operations
- `[Texture]` - Texture loading

## Function Design

### Parameter Patterns
- **Gl context as first parameter** - Most rendering functions take `gl` first
- **Optional parameters with defaults** - `function init(chunkX, chunkZ, renderDistance = 8)`
- **Options objects** for complex configs - Used in config.js

### Return Patterns
- **Objects for multi-value returns** - `return { x, z, d2: dx * dx + dz * dz };`
- **`this` for chaining** - Not heavily used
- **Null/undefined for failures** - Prefer `null` to `undefined`

## Class Patterns

### Constructor Assignments
```javascript
class Chunk {
  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.dirty = true;
    this.mesh = null;
  }
}
```

### Getter Properties
```javascript
get key() {
  return `${this.x},${this.z}`;
}
```

### Method Organization
1. Getters/setters
2. Public methods
3. Private/internal methods
4. Static methods

## Configuration Objects

### Pattern
```javascript
export const RENDER_CONFIG = {
  FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
};
```

### Access Pattern
```javascript
const fov = RENDER_CONFIG.FOV;
const near = RENDER_CONFIG.NEAR_PLANE;
```

## WebGL Patterns

### Context Initialization
```javascript
const gl = canvas.getContext('webgl2', {
  antialias: true,
  alpha: false,
  depth: true,
  stencil: false,
  premultipliedAlpha: false
});
```

### Resource Cleanup Pattern
```javascript
dispose(gl) {
  for (const chunk of this.chunks.values()) {
    if (chunk.mesh) {
      if (chunk.mesh.vao) gl.deleteVertexArray(chunk.mesh.vao);
      if (chunk.mesh.vbo) gl.deleteBuffer(chunk.mesh.vbo);
    }
  }
  this.chunks.clear();
}
```

### State Binding Pattern
```javascript
// Bind
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

// Unbind
gl.bindVertexArray(null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
```

## Linting/Formatting Configuration

**Status:** None detected

- No `.eslintrc`, `.eslintrc.js`, or `eslint.config.*`
- No `.prettierrc` or `.prettierrc.json`
- No `.editorconfig`
- Code follows informal style (2 spaces, same-line braces, semicolons)

---

*Convention analysis: 2026-03-18*
