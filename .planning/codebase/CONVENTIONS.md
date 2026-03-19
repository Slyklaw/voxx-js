# Coding Conventions

**Analysis Date:** 2026-03-18

## Language & Module System

**Primary Language:**
- JavaScript (ES2020+)
- Module System: ES Modules with `.js` extensions in import statements

**Example import pattern:**
```javascript
import { gl, canvas, isContextLost } from './gl/context.js';
import { initRenderer, setupRenderState } from './gl/render.js';
```

## Naming Conventions

**Files:**
- JavaScript modules: `camelCase.js` (e.g., `chunkManager.js`, `world.js`)
- WebGL/shader modules: `kebab-case.js` (e.g., `test-render.js`)
- GLSL shaders: inline strings in JavaScript files

**Classes:**
- PascalCase (e.g., `class Chunk`, `class World`, `class BiomeCalculator`)

**Functions/Methods:**
- camelCase (e.g., `generateMeshData()`, `getVoxel()`, `initRenderer()`)

**Constants:**
- UPPER_SNAKE_CASE for exported config constants
- camelCase for internal constants

**Example constants:**
```javascript
export const CHUNK_WIDTH = 32;
export const RENDER_CONFIG = { FOV: 75, NEAR_PLANE: 0.1 };
const FPS_SAMPLE_SIZE = 60;
```

**Variables:**
- camelCase (e.g., `let cameraPosition`, `let isPointerLocked`)
- Descriptive names for game state (e.g., `targetedBlock`, `selectedBlockType`)

## Code Style

**No Formal Linter/Formatter Configured:**
- No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, or `biome.json` found
- Manual formatting follows common JS conventions

**Indentation:**
- 2 spaces (inferred from codebase)

**Braces:**
- K&R style (opening brace on same line)

**Semicolons:**
- Used after statements

**Quotes:**
- Single quotes for strings

## Import Organization

**Order:**
1. External dependencies (CDN modules)
2. Internal relative imports

**Example:**
```javascript
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { gl, canvas } from './gl/context.js';
import { Chunk } from './chunk.js';
```

## JSDoc Documentation

**When to Use:**
- All exported functions and classes
- Complex algorithms with non-obvious behavior

**Pattern:**
```javascript
/**
 * Get block color as RGB values (0-1 range)
 * @param {number} blockType - Block type ID
 * @returns {Object} RGB color object
 */
export function getBlockColor(blockType) {
  // ...
}
```

**Class JSDoc:**
```javascript
/**
 * Chunk implementation
 */
export class Chunk {
  // ...
}
```

## Error Handling

**Pattern: Try/Catch with descriptive errors**
```javascript
export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const infoLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation error: ${infoLog}`);
  }
  return shader;
}
```

**WebGL Error Checking:**
```javascript
const err = gl.getError();
if (err !== gl.NO_ERROR) {
  console.error(`[Renderer] WebGL error: ${err}`);
}
```

**Graceful Null Handling:**
```javascript
if (!chunk || !chunk.meshData || !chunk.meshData.positions) {
  return null;
}
```

## Logging Patterns

**Module-tagged console output:**
```javascript
console.log('[Renderer] Initializing voxel renderer...');
console.log('[WebGL2] Created mesh for chunk:', key);
console.error(`[Renderer] Failed to create voxel shader program!`);
console.warn('[Renderer] No texture atlas to bind!');
```

**Debug conditionals for verbose logging:**
```javascript
// Debug logging for first few faces only
if (uvLogCount < UV_LOG_MAX) {
  console.log(`[Texture] UV data:`, ...);
  uvLogCount++;
  if (uvLogCount === UV_LOG_MAX) {
    console.log(`[Texture] UV logging limited to first ${UV_LOG_MAX} faces`);
  }
}
```

**Commented-out debug code for production:**
```javascript
// console.log(`[WebGL2] Chunk UV range: U[${minU.toFixed(1)},${maxU.toFixed(1)}]`);
```

## Function Design

**Size Guidelines:**
- Functions typically 20-100 lines
- Large functions (e.g., `generateMeshData()` at 233 lines) contain complex algorithms
- Complex algorithms commented inline

**Parameters:**
- Max ~4 parameters before using options objects
- JSDoc for all public functions

**Return Values:**
- Explicit returns (no implicit returns)
- Return `null` for "not found" scenarios
- Return `{}` object literals for complex data

## Module Design

**Single Responsibility:**
- `shaders.js` - Shader compilation utilities
- `buffers.js` - WebGL buffer management
- `context.js` - WebGL context setup
- `performance.js` - FPS/metrics tracking
- `render.js` - Rendering orchestration

**Export Pattern:**
```javascript
// Named exports for functions/constants
export function createProgram(gl, vertexSource, fragmentSource) { }

// Named exports for configs
export const VERTEX_FORMAT = { /* ... */ };

// Default export rarely used
```

## Class Patterns

**Constructor Injection:**
```javascript
export class World {
  constructor(noiseSeed) {
    this.chunks = {};
    this.noiseSeed = noiseSeed;
    this.pool = new WorkerPool('./chunkWorker.js');
  }
}
```

**Getters for Computed Properties:**
```javascript
get key() {
  return `${this.x},${this.z}`;
}
```

**Private Methods:**
- Prefixed with underscore convention (e.g., `_createMeshFromData()`)

## WebGL Patterns

**Context Loss Handling:**
```javascript
function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  contextLossListeners.forEach(callback => callback());
}
```

**Buffer Creation Pattern:**
```javascript
export function createVBO(gl, data, usage = gl.STATIC_DRAW) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vbo;
}
```

**Shader Source Patterns:**
```javascript
export const sampleVertexShader = `#version 300 es
in vec3 aPosition;
uniform mat4 uModelViewProjection;
void main() {
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}`;
```

## Configuration Patterns

**Centralized Config Objects:**
```javascript
export const RENDER_CONFIG = {
  FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  // ...
};
```

**Constants Colocation:**
- Constants defined near their usage (e.g., `CHUNK_WIDTH` in `chunk.js`)
- Shared constants exported from config files

---

*Convention analysis: 2026-03-18*
