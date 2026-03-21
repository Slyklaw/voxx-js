# Coding Conventions

**Analysis Date:** 2026-03-21

## Language & Modules

**Type:** Vanilla JavaScript (ES Modules)
- Project type: `"type": "module"` in `package.json`
- All imports use `.js` extensions: `import { Chunk } from './chunk.js'`
- No TypeScript, no transpilation

## Naming Conventions

**Files:**
- Single module per file
- Filenames: `camelCase.js` for modules, `PascalCase.js` for classes
- Examples: `chunk.js`, `greedyMesh.js`, `blocks.js`, `workerPool.js`

**Classes:**
- PascalCase: `Chunk`, `World`, `BiomeCalculator`, `WorkerPool`
- Constructor parameters: camelCase
- Instance properties: camelCase

**Functions:**
- camelCase: `generateMeshData()`, `getVoxel()`, `createNoise2D()`
- Helper functions defined inline within test files

**Constants:**
- UPPER_SNAKE_CASE: `CHUNK_WIDTH`, `CHUNK_HEIGHT`, `BLOCK_TYPES`
- Configuration objects: PascalCase keys, UPPER_SNAKE_CASE leaf values
  ```javascript
  export const SSAO_CONFIG = {
    ENABLED: true,
    INTENSITY: 1.0,
    RADIUS: 0.5
  };
  ```

**Variables:**
- camelCase: `chunkX`, `chunkZ`, `renderDistance`, `selectedBlockType`
- Boolean prefixes: `isPointerLocked`, `hasVoxelData`, `needsUpdate`

## Import Organization

**Order:**
1. External imports (CDN packages): `import { createNoise2D } from 'https://cdn.jsdelivr.net/...'`
2. Internal module imports: `import { Chunk } from './chunk.js'`
3. Config imports: `import { DEBUG } from './config.js'`

**Pattern:**
```javascript
import { BIOMES, BIOME_CONFIG, generateBiomeHeight } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';
import { DEBUG, BIOME_TUNING } from './config.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT } from './chunkCore.js';
```

## Code Style

**No ESLint/Prettier config detected** - Code follows manual conventions:

- **Semicolons:** Used consistently
- **Quotes:** Single quotes for strings
- **Braces:** K&R style (opening brace on same line)
- **Indentation:** 2 spaces
- **Line length:** No strict limit, but readable

**Example from `chunk.js`:**
```javascript
export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    this.needsUpdate = true;
  }
}
```

## JSDoc Comments

**Functions use JSDoc for documentation:**

```javascript
/**
 * Generate terrain data using biome-based noise functions
 * @param {Function} heightNoise - Noise function for height
 * @param {Function} biomeNoise - Noise function for biome selection
 */
generate(heightNoise, biomeNoise) {
  // ...
}
```

**Module-level comments:**
```javascript
/**
 * Chunk implementation
 */
```

## Error Handling

**Guard Clauses Pattern:**
```javascript
getVoxel(x, y, z) {
  if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
    return 0;
  }
  // ... actual implementation
}
```

**Debug Assertion Functions:**
```javascript
function assertValidBlockType(blockType, operation) {
  if (DEBUG && (blockType < 0 || blockType >= BLOCK_TYPES_COUNT)) {
    console.error(`[Blocks] Invalid block type ${blockType} in ${operation}`);
  }
}
```

**No try/catch in main code** - Errors propagate or are logged with `console.error()`

## Logging

**Conditional Debug Logging:**
```javascript
if (DEBUG) console.log(`[BlockEdit] Target: ${result.x},${result.y},${result.z}`);
if (DEBUG) console.error(`[WorkerPool] Worker ${workerIndex} error:`, errorContext);
```

**Prefix Convention:**
- `[BlockEdit]` - Block editing features
- `[World]` - World/chunk management
- `[WebGL2]` - WebGL rendering
- `[WorkerPool]` - Web worker management
- `[Camera]` - Camera/movement
- `[Debug]` - Debug mode features

## Function Design

**Size:** Functions can be long (e.g., `chunk.generate()` is ~60 lines) but focused on single responsibility

**Parameters:** Grouped logically, use destructuring where helpful
```javascript
function raycastBlock(origin, direction, maxDistance = 8) {
  // ...
}
```

**Return Values:**
- Explicit returns, early returns for guard clauses
- Boolean methods: `isHotChunk()`, `canGenerateMesh()`, `isBlockSolid()`

## Class Design

**Constructor Pattern:**
```javascript
export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.voxels = new Uint8Array(...);
  }
}
```

**Method Organization:**
1. Constructor/initialization
2. Getters/setters
3. Public methods
4. Private/underscore-prefixed methods: `_createMeshFromData()`, `_updateMeshInPlace()`
5. Static methods where applicable

## Data Structures

**Typed Arrays for Performance:**
```javascript
this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
meshData.positions = new Float32Array(positions);
meshData.indices = new Uint32Array(indices);
```

**Map for Object Lookups:**
```javascript
this.chunks = {};  // Key: "x,z"
this.pendingChunks = new Map();
```

---

*Convention analysis: 2026-03-21*
