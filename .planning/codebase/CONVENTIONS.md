# Coding Conventions

**Analysis Date:** 2026-03-17

## Project Overview

This is a vanilla JavaScript voxel game engine (similar to Minecraft) using Three.js for 3D rendering. The codebase runs in the browser using ES6 modules without a build system or package.json.

## Naming Patterns

**Files:**
- Lowercase with camelCase for multi-word files: `chunk.js`, `workerPool.js`, `chunkWorker.js`
- No barrel files or index modules

**Classes:**
- PascalCase for class names: `class World`, `class Chunk`, `class Renderer`
- One class per file (primary convention)

**Variables and Functions:**
- camelCase: `noiseSeed`, `chunkX`, `renderDistance`, `getChunk()`
- Private methods prefixed with underscore: `_createMeshFromData()`, `_updateMeshInPlace()`
- Boolean variables: `isPointerLocked`, `meshReady`, `hasVoxelData`

**Constants:**
- UPPER_SNAKE_CASE for configuration constants: `CHUNK_WIDTH`, `BLOCK_TYPES`, `RENDER_CONFIG`
- Configuration objects: `RENDER_CONFIG`, `LIGHTING_CONFIG`, `PLAYER_CONFIG`

**Object Properties:**
- camelCase: `this.chunkX`, `this.chunkZ`, `this.meshReady`

## Code Style

**Formatting:**
- No automated formatter detected (no Prettier or similar)
- Manual indentation with 2 spaces
- Each import on its own line

**Indentation:**
- 2 spaces for all code blocks

**Line Length:**
- No explicit line length limit enforced
- Variable lines often kept under 100 characters

**Semicolons:**
- Used consistently at end of statements

**Braces:**
- Same-line opening braces: `function init() {`
- Class methods use concise method syntax in object literals

## Import Organization

**Order:**
1. External library imports: `import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js'`
2. Local module imports: `import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js'`

**Style:**
```javascript
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { BiomeCalculator } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';
```

**Path Aliases:**
- None used
- Relative paths with `.js` extension

## Error Handling

**Patterns:**

1. **Try-Catch for Async Operations:**
```javascript
async function init() {
  try {
    // Initialize renderer
    renderer = new Renderer();
    await renderer.init(canvas);
    console.log('Voxel Engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize renderer:', error);
    showRendererError(error.message);
  }
}
```

2. **Guard Clauses for Null Checks:**
```javascript
const chunk = world.chunks[`${chunkX},${chunkZ}`];
if (!chunk) return;
```

3. **Error Callbacks in Async Workers:**
```javascript
const onComplete = (chunkData) => {
  console.log(`[World] Chunk ${chunkX},${chunkZ} generation completed:`, chunkData ? 'success' : 'failed');
  if (!this.chunks[key]) {
    this.pendingChunks.delete(key);
    return;
  }
  // ...
};
```

4. **Console Warnings for Non-Fatal Issues:**
```javascript
console.warn('Blocks will render with flat color instead of texture');
```

## Logging

**Framework:** Browser console (`console.log`, `console.error`, `console.warn`)

**Patterns:**
- Initialization success: `console.log('Voxel Engine initialized successfully')`
- Errors: `console.error('Failed to initialize renderer:', error)`
- Debug output with low probability: `if (Math.random() < 0.01) { console.log(...) }`
- Worker messages: `console.log('[World] Chunk generation completed:')`

## Comments

**When to Comment:**
- JSDoc for public functions: `/** Generate terrain data using biome-based noise functions */`
- Inline comments for complex calculations: `// Convert cycle progress to 24-hour time`
- Code explanation: `// Initialize renderer`
- Debug TODOs: `// Debug camera position occasionally`

**JSDoc Usage:**
- Present on exported functions: `getBlockColor()`, `isBlockSolid()`, `isBlockTransparent()`
- Includes parameter types and return descriptions

## Function Design

**Size:** Functions vary in size from small helpers (10-20 lines) to larger functions (50+ lines like `animate()` and `updateSunCycle()`)

**Parameters:**
- Explicit parameters with clear names
- Default parameter values for optional params: `function update(cameraPosition, renderDistance = 8)`

**Return Values:**
- Explicit returns for early exits
- Object returns for complex data: `return { hit: false }`

## Module Design

**Exports:**
- Named exports for classes: `export class World`
- Named exports for constants: `export const CHUNK_WIDTH = 32`
- Named exports for functions: `export function getBlockColor(blockType)`

**Module Pattern:**
- ES6 modules with import/export
- No default exports
- One class per file as primary pattern

## Web-Specific Patterns

**DOM Access:**
```javascript
canvas = document.createElement('canvas');
document.body.appendChild(canvas);
document.addEventListener('keydown', (event) => { ... });
```

**Animation Loop:**
```javascript
function animate(currentTime) {
  requestAnimationFrame(animate);
  // ... render logic
}
```

**Event Handling:**
- Pointer lock for mouse capture
- Keyboard event listeners for movement
- Mouse wheel for block selection

---

*Convention analysis: 2026-03-17*
