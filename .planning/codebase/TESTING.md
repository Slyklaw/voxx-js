# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Status:** None detected

No formal testing framework is in use:
- No Jest, Vitest, Mocha, or similar test runner
- No test configuration files (`jest.config.*`, `vitest.config.*`)
- No test files matching `*.test.js` or `*.spec.js` patterns

## Current Testing Approach

### Manual Testing
The codebase relies on manual testing and runtime validation:

1. **Console logging** for state verification
2. **Visual inspection** via browser rendering
3. **Tagged log output** for filtering

### Debug Rendering
`voxx-js/src/gl/test-render.js` provides minimal test utilities:

```javascript
import { gl } from './context.js';
import { createProgram, sampleVertexShader, sampleFragmentShader } from './shaders.js';

let testProgram = null;
let testVAO = null;

function initTestRender() {
  testProgram = createProgram(gl, sampleVertexShader, sampleFragmentShader);
  // ... test setup
}

export function renderTestTriangle(glContext, program) {
  // Test rendering function
}

export function cleanupTestRender() {
  // Test cleanup
}
```

### Debug Features Built Into Main Code

**Wireframe Mode:**
```javascript
let wireframeMode = false;

function render() {
  if (webglChunks.length > 0) {
    renderChunks(gl, webglChunks, [], viewMatrix, projectionMatrix, wireframeMode, debugColorsMode);
  }
}
```

**Debug Colors Mode:**
```javascript
let debugColorsMode = false;

// Toggle via UI or keyboard (V key)
document.getElementById('debug-toggle')?.addEventListener('change', (e) => {
  debugColorsMode = e.target.checked;
});
```

**FPS Display:**
```javascript
const fpsEl = document.querySelector('.debug-fps');
if (fpsEl) fpsEl.textContent = `FPS: ${getFPSDisplay()} (est: ${getFPS()})`;
```

**UV Texture Debug Logging:**
```javascript
// In chunk.js - limited logging for first N faces
const UV_LOG_MAX = 20;
if (uvLogCount < UV_LOG_MAX) {
  const blockName = Object.keys(BLOCK_TYPES).find(k => BLOCK_TYPES[k] === blockIndex) || 'UNKNOWN';
  console.log(`[Texture] ${blockName} face: atlas=[${atlasX},${atlasY}], ...`);
}
```

## Test File Locations

### Current Test Utilities
- `voxx-js/src/gl/test-render.js` - Minimal WebGL test utilities

### Where Tests Should Go
No established test directory pattern. Suggested locations:
```
voxx-js/
├── voxx-js/
│   ├── tests/              # Preferred: separate test directory
│   │   ├── unit/
│   │   └── integration/
│   ├── src/
│   │   ├── __tests__/     # Alternative: co-located tests
│   │   └── *.test.js      # (if co-located)
```

## Test Patterns to Implement

### Recommended Framework: Vitest
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

### Unit Test Structure
```javascript
// tests/unit/chunk.test.js
import { describe, it, expect, vi } from 'vitest';
import { Chunk } from '../../chunk.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../../chunk.js';

describe('Chunk', () => {
  it('should initialize with correct coordinates', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.chunkX).toBe(0);
    expect(chunk.chunkZ).toBe(0);
  });

  it('should return AIR for out-of-bounds voxel', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.getVoxel(-1, 0, 0)).toBe(0);
    expect(chunk.getVoxel(0, CHUNK_HEIGHT, 0)).toBe(0);
  });
});
```

### Mocking WebGL Context
```javascript
// tests/mocks/webgl.js
export function createMockGL() {
  return {
    createBuffer: vi.fn(),
    createVertexArray: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getError: vi.fn(() => 0),
    // ... other WebGL methods
  };
}
```

### Integration Test Structure
```javascript
// tests/integration/world.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../world.js';

describe('World', () => {
  let world;
  
  beforeEach(() => {
    world = new World(12345);
  });

  it('should create chunks on demand', () => {
    const chunk = world.getChunk(0, 0);
    expect(chunk).toBeDefined();
    expect(chunk.chunkX).toBe(0);
    expect(chunk.chunkZ).toBe(0);
  });
});
```

## What Should Be Tested

### Core Data Structures
- `Chunk.getVoxel()` / `setVoxel()` - bounds checking
- `Chunk.canGenerateMesh()` - mesh generation prerequisites
- `Chunk.generateMeshData()` - mesh data output format

### Biome System
- `BiomeCalculator.getBiomeContributions()` - biome blending
- `generateBiomeHeight()` - height calculation

### WebGL Operations (Mocked)
- `createChunkMeshFromData()` - buffer creation
- Shader compilation and linking
- Texture atlas loading

### Configuration
- `RENDER_CONFIG` values are valid
- `CHUNK_WIDTH`, `CHUNK_HEIGHT`, `CHUNK_DEPTH` are positive

## Run Commands (Once Implemented)

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# Run specific test file
npm test -- chunk.test.js
```

## Coverage

**Current Target:** Not defined

**Suggested Minimum:**
- 70% line coverage for core modules
- 100% coverage for critical paths (chunk mesh generation, biome calculations)

## Manual Validation Checklist

When testing changes manually:

- [ ] Console shows no `[Renderer]` errors on load
- [ ] Chunks render at various camera positions
- [ ] Block selection (keys 1-9) works
- [ ] Left-click destroys blocks
- [ ] Right-click places blocks
- [ ] Wireframe mode (F key) toggles
- [ ] Debug colors (V key) toggle
- [ ] FPS display updates correctly
- [ ] Chunk unloading works at distance
- [ ] Context loss handling works

## Performance Testing

### FPS Monitoring
Built into `src/gl/performance.js`:
```javascript
import { getFPS, getMetrics } from './gl/performance.js';

const metrics = getMetrics();
console.log(`FPS: ${metrics.fps}, Render: ${metrics.renderTime}ms`);
```

### Frame Timing
```javascript
beginRenderTiming();
// ... render code ...
endRenderTiming();
const renderTime = getRenderTime();
```

---

*Testing analysis: 2026-03-18*
