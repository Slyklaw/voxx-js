# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:** Vitest ^1.6.0
- Config: `voxx-js/vitest.config.js`
- Assertions: Built-in Vitest expect
- Environment: `node` (default), `jsdom` for DOM tests

**Run Commands:**
```bash
npm test              # Watch mode
npm run test:run      # Single run
```

**Config:**
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`

**Naming:**
- Files: `*.test.js`
- Examples:
  - `tests/unit/chunk.test.js`
  - `tests/unit/greedyMesh.test.js`
  - `tests/unit/biomes.test.js`
  - `tests/unit/ssao-config.test.js`
  - `tests/integration/ssao-ui.test.js`

**Co-location:** Tests are NOT co-located with source - separate `tests/` directory at project root

## Test Suite Structure

**Pattern using describe blocks:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../../chunk.js';

describe('Chunk', () => {
  let chunk;

  beforeEach(() => {
    chunk = new Chunk(0, 0);
  });

  describe('constructor', () => {
    it('initializes with correct chunk coordinates', () => {
      expect(chunk.chunkX).toBe(0);
      expect(chunk.chunkZ).toBe(0);
    });

    it('initializes voxel array with correct size', () => {
      expect(chunk.voxels.length).toBe(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    });
  });

  describe('getVoxel', () => {
    it('returns 0 for out-of-bounds coordinates', () => {
      expect(chunk.getVoxel(-1, 0, 0)).toBe(0);
    });
  });
});
```

**Test utilities location:** `tests/setup.js`

## Test Fixtures & Utilities

**Setup file (`tests/setup.js`):**
```javascript
export function mockNoise(x, z) {
  return 0; // Returns 0 for predictable results
}

export function createMockNoise(value) {
  return (x, z) => value;
}

export const TEST_CHUNK_X = 0;
export const TEST_CHUNK_Z = 0;
export const TEST_WORLD_X = 0;
export const TEST_WORLD_Z = 0;
```

**Mock chunk factory pattern:**
```javascript
function createMockChunk() {
  return {
    chunkX: 0,
    chunkZ: 0,
    voxels: new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH)
  };
}
```

## Mocking Patterns

**Inline mock objects:**
```javascript
it('returns false when not all neighbors have voxel data', () => {
  const north = new Chunk(0, -1);
  north.hasVoxelData = true;
  chunk.neighborChunks.north = north;
  expect(chunk.canGenerateMesh()).toBe(false);
});
```

**Function mocks:**
```javascript
const mockNoise = () => 0;
const height = generateBiomeHeight(0, 0, BIOMES.LOWLAND, mockNoise);
expect(height).toBe(BIOMES.LOWLAND.baseHeight);
```

**JSDOM setup for DOM tests:**
```javascript
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';

describe('SSAO UI Controls Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="debug-ui">
        <input type="checkbox" id="ssao-toggle" checked>
        <input type="range" id="ssao-intensity" min="50" max="200" value="100">
      </div>
    `;
  });

  it('should have SSAO toggle element', () => {
    const toggle = document.getElementById('ssao-toggle');
    expect(toggle).not.toBeNull();
  });
});
```

## Common Test Patterns

**Testing boundary conditions:**
```javascript
it('returns 0 for out-of-bounds coordinates', () => {
  expect(chunk.getVoxel(-1, 0, 0)).toBe(0);
  expect(chunk.getVoxel(0, -1, 0)).toBe(0);
  expect(chunk.getVoxel(0, 0, -1)).toBe(0);
  expect(chunk.getVoxel(CHUNK_WIDTH, 0, 0)).toBe(0);
});
```

**Testing array types:**
```javascript
expect(mesh.positions).toBeInstanceOf(Float32Array);
expect(mesh.normals).toBeInstanceOf(Float32Array);
expect(mesh.indices).toBeInstanceOf(Uint32Array);
```

**Testing object structure:**
```javascript
expect(mesh).toHaveProperty('positions');
expect(mesh).toHaveProperty('normals');
expect(mesh).toHaveProperty('uvs');
expect(mesh).toHaveProperty('indices');
```

**Testing array sums:**
```javascript
it('contributions sum to 100', () => {
  const contributions = calculator.getBiomeContributions(0, 0);
  const sum = contributions.reduce((acc, c) => acc + c.contribution, 0);
  expect(sum).toBe(100);
});
```

**Conditional testing (only run assertion if condition met):**
```javascript
if (mesh.indices.length > 0) {
  expect(Number.isInteger(mesh.indices[0])).toBe(true);
  expect(mesh.indices.length % 3).toBe(0);
}
```

**Error handling tests:**
```javascript
it('ignores out-of-bounds coordinates', () => {
  expect(() => chunk.setVoxel(-1, 0, 0, 1)).not.toThrow();
});
```

## Coverage

**Reporter configured:** text, json, html
- Output: Likely `coverage/` directory (Vitest default)

**View coverage:**
```bash
npm run test:run -- --coverage
```

## Test Types

**Unit Tests:**
- Test individual functions and classes in isolation
- Mock dependencies (noise functions, dependencies)
- Example: `tests/unit/chunk.test.js`, `tests/unit/greedyMesh.test.js`

**Integration Tests:**
- Test UI components with DOM
- Use `/** @vitest-environment jsdom */`
- Example: `tests/integration/ssao-ui.test.js`

## What to Mock

**Mock these:**
- Noise functions (return predictable values)
- DOM elements (set up in beforeEach)
- Chunk neighbors (create mock Chunk objects)

**Don't mock:**
- Simple value objects
- Constants (BLOCK_TYPES, CHUNK_WIDTH, etc.)
- Pure calculation functions (they ARE the test subject)

---

*Testing analysis: 2026-03-21*
