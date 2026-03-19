# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Status:** No formal test framework configured

**Evidence:**
- No `jest.config.*`, `vitest.config.*`, or test framework config found
- No `package.json` in codebase (no npm/yarn test scripts)
- No test files matching `*.test.js` or `*.spec.js` patterns

**Implication:**
- This is a prototype/visualization codebase focused on WebGL rendering
- Testing is minimal or manual (visual verification)

## Test File Organization

**Not applicable** - No formal test directory structure exists

**Existing Test-Related Files:**

### `src/gl/test-render.js`

Purpose: WebGL rendering verification utility (not unit tests)

```javascript
import { gl } from './context.js';
import { createProgram, sampleVertexShader, sampleFragmentShader } from './shaders.js';

export function renderTestTriangle(glContext, program) {
  // Renders a simple triangle to verify WebGL context works
  glContext.clearColor(0.133, 0.133, 0.133, 1.0);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  // ... render triangle
}

export function cleanupTestRender() {
  // Cleanup WebGL resources
}
```

## Manual Testing Approaches

### Console-Based Verification

Debug logging for state inspection:

```javascript
console.log(`[WebGL2] Created mesh for chunk ${key}: ${webglMesh.vertexCount} vertices`);

// Conditional logging for metrics
export function logPerformance() {
  const metrics = getMetrics();
  console.log(`[Performance] FPS: ${metrics.fps} | Est: ${metrics.estimatedFPS} | ...`);
}
```

### WebGL Context Verification

```javascript
export function render(currentTime) {
  if (isContextLost()) {
    requestAnimationFrame(render);
    return;
  }
  // ... render logic
}
```

### Visual Verification

The main entry point (`index.html`) renders to a canvas. Verification is done by:
1. Opening the page in a browser
2. Visual inspection of rendered voxel terrain
3. Interaction testing (mouse look, block placement)

## Test Data Patterns

### Fixtures/Constants

Configuration objects serve as test data:

```javascript
export const TEST_CONFIG = {
  CUBE_SIZE: { width: 3, height: 6, depth: 3 },
  CUBE_COLOR: 0x8B4513,
  CUBE_POSITION: { x: 20, y: 70, z: 20 }
};
```

### Mock Objects

Hand-written mock data for development:

```javascript
export function createMockChunkMesh(gl) {
  // Creates a test cube mesh for development/debugging
  // Not used in production (kept for testing shader compilation)
  return null; // Disabled - terrain rendering works
}
```

### Chunk Data Generation

Realistic test data generated via noise functions:

```javascript
const noiseSeed = Math.random();
world = new World(noiseSeed);
biomeCalculator = new BiomeCalculator(noiseSeed);
```

## Mocking Patterns

### No Framework Mocking

Manual dependency injection for testing:

```javascript
// Noise function injected for testability
export function generateBiomeHeight(worldX, worldZ, biome, noise) {
  // Uses injected noise function, can pass mock noise for testing
}
```

### WebGL Mocking

No WebGL mocking - requires real browser context:

```javascript
// In test-render.js - uses actual gl context
import { gl } from './context.js';
```

## Coverage

**No coverage requirements enforced**

**Current test scope:**
- Manual browser-based visual testing
- Console logging for debugging
- No automated assertions

## Common Patterns

### Debug Logging Pattern

```javascript
// Limited logging with count caps to prevent spam
const UV_LOG_MAX = 20;
let uvLogCount = 0;

if (uvLogCount < UV_LOG_MAX) {
  console.log(`[Texture] Debug info`);
  uvLogCount++;
  if (uvLogCount === UV_LOG_MAX) {
    console.log(`[Texture] Logging limited to first ${UV_LOG_MAX}`);
  }
}
```

### Error Recovery Pattern

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

### Null Safety Pattern

```javascript
export function createChunkMeshFromData(gl, meshData, attribs = null) {
  if (!meshData || !meshData.positions || meshData.positions.length === 0) {
    return null;
  }
  // ... proceed with mesh creation
}
```

## Recommendations for Adding Tests

If tests were to be added to this codebase:

1. **Framework:** Vitest (lighter, modern alternative to Jest)
2. **Location:** `__tests__/` directory or co-located `*.test.js` files
3. **Key Areas to Test:**
   - `Chunk.getVoxel()` / `setVoxel()` - bounds checking
   - `biomes.js` - noise generation and biome blending
   - `buffers.js` - buffer creation utilities
   - `generateMeshData()` - greedy meshing algorithm

4. **Example Test Structure:**
```javascript
// __tests__/chunk.test.js
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } from '../chunk.js';

describe('Chunk', () => {
  let chunk;
  
  beforeEach(() => {
    chunk = new Chunk(0, 0);
  });
  
  describe('getVoxel', () => {
    it('should return 0 for out-of-bounds coordinates', () => {
      expect(chunk.getVoxel(-1, 0, 0)).toBe(0);
      expect(chunk.getVoxel(0, -1, 0)).toBe(0);
      expect(chunk.getVoxel(0, 0, CHUNK_WIDTH)).toBe(0);
    });
    
    it('should return 0 by default', () => {
      expect(chunk.getVoxel(0, 0, 0)).toBe(0);
    });
  });
});
```

5. **WebGL Testing:** Use `@vpobstest/gl` or similar headless WebGL library for testing WebGL code

---

*Testing analysis: 2026-03-18*
