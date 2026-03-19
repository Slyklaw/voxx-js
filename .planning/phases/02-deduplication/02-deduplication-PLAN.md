---
phase: 02-deduplication
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/chunkCore.js
  - voxx-js/chunk.js
  - voxx-js/chunkWorker.js
autonomous: true
requirements:
  - DEDUP-01
  - DEDUP-02

must_haves:
  truths:
    - "Greedy meshing algorithm exists in exactly one location"
    - "Chunk constants defined once in chunkCore.js"
    - "Both chunk.js and chunkWorker.js import from shared modules"
    - "No compilation or runtime errors after refactoring"
  artifacts:
    - path: "voxx-js/greedyMesh.js"
      exports: "generateMeshData function"
    - path: "voxx-js/chunkCore.js"
      exports: "CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH"
    - path: "voxx-js/chunk.js"
      imports: "greedyMesh.js, chunkCore.js"
    - path: "voxx-js/chunkWorker.js"
      imports: "greedyMesh.js, chunkCore.js"
  key_links:
    - from: "voxx-js/chunk.js"
      to: "voxx-js/greedyMesh.js"
      via: "import { generateMeshData }"
    - from: "voxx-js/chunkWorker.js"
      to: "voxx-js/greedyMesh.js"
      via: "import { generateMeshData }"
---

<objective>
Extract greedy meshing algorithm to shared utility module and consolidate chunk constants to single source.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

**Current State:**
- `voxx-js/chunk.js` lines 152-384: generateMeshData() method with ~230 lines
- `voxx-js/chunkWorker.js` lines 62-271: generateMeshData() standalone function with ~210 lines
- `voxx-js/chunk.js` lines 11-13: CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH defined locally
- `voxx-js/chunkCore.js` lines 4-6: Same constants already defined (worker imports from here)

**Goal:** Single source of truth for greedy meshing and chunk constants.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Consolidate chunk constants to chunkCore.js</name>
  <files>
    - voxx-js/chunkCore.js
    - voxx-js/chunk.js
  </files>
  <action>
    1. Read voxx-js/chunkCore.js to confirm constants exist at lines 4-6
    2. Read voxx-js/chunk.js to find local constant definitions at lines 11-13
    3. Remove local constant definitions from chunk.js (lines 11-13):
       - export const CHUNK_WIDTH = 32;
       - export const CHUNK_HEIGHT = 256;
       - export const CHUNK_DEPTH = 32;
    4. Add import to chunk.js from chunkCore.js:
       import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunkCore.js';
    5. Verify constants are imported (chunkCore.js already has them)
  </action>
  <verify>
    grep -n "CHUNK_WIDTH\|CHUNK_HEIGHT\|CHUNK_DEPTH" voxx-js/chunk.js | head -5
    Should show imports from chunkCore.js, NOT local definitions
  </verify>
  <done>Chunk constants defined once in chunkCore.js, imported by chunk.js</done>
</task>

<task type="auto">
  <name>Task 2: Create shared greedyMesh.js utility</name>
  <files>voxx-js/greedyMesh.js</files>
  <action>
    1. Create new file voxx-js/greedyMesh.js
    2. Extract the greedy meshing algorithm from chunkWorker.js (lines 62-271) - this version is more standalone
    3. The function signature should be: generateMeshData(chunk, getVoxelFn, chunkX, chunkZ)
       where getVoxelFn is a function to get voxel data (allows both Chunk class and ChunkCore usage)
    4. Key differences to handle:
       - chunk.js uses getVoxelWithNeighbors() 
       - chunkWorker.js uses getVoxel() directly
    5. Keep the same output format: { positions, normals, uvs, tileBase, indices, colors, blockTypes, triangleVariant }
    6. Include imports for BLOCKS, BLOCK_TYPES, getBlockColor from blocks.js
    7. Include constants import from chunkCore.js
  </action>
  <verify>
    ls -la voxx-js/greedyMesh.js
    grep -n "export function generateMeshData" voxx-js/greedyMesh.js
  </verify>
  <done>greedyMesh.js created with generateMeshData function exported</done>
</task>

<task type="auto">
  <name>Task 3: Update chunk.js to use shared greedyMesh</name>
  <files>
    - voxx-js/chunk.js
    - voxx-js/chunkCore.js
  </files>
  <action>
    1. Read updated chunk.js (after Task 1)
    2. Find the generateMeshData method (lines 152-384)
    3. Add import at top of chunk.js:
       import { generateMeshData } from './greedyMesh.js';
    4. Replace the generateMeshData method body with a call to the shared function:
       generateMeshData(this, this.getVoxelWithNeighbors.bind(this), this.chunkX, this.chunkZ)
    5. Remove the old generateMeshData method (lines 152-384)
    6. Verify the mesh generation still works with neighbor-aware voxel getter
  </action>
  <verify>
    grep -n "generateMeshData" voxx-js/chunk.js
    Should show: import statement + single-line method call
  </verify>
  <done>chunk.js uses shared greedyMesh.js</done>
</task>

<task type="auto">
  <name>Task 4: Update chunkWorker.js to use shared greedyMesh</name>
  <files>
    - voxx-js/chunkWorker.js
    - voxx-js/greedyMesh.js
  </files>
  <action>
    1. Read chunkWorker.js
    2. Add import at top:
       import { generateMeshData } from './greedyMesh.js';
    3. Find the generateMeshData function (lines 62-271) 
    4. Replace the call on line 20:
       OLD: const meshData = generateMeshData(chunk, chunkX, chunkZ);
       NEW: const meshData = generateMeshData(chunk, chunk.getVoxel.bind(chunk), chunkX, chunkZ);
    5. Remove the old generateMeshData function (lines 62-271)
    6. Verify DEBUG logging import is still available (if used in greedyMesh)
  </action>
  <verify>
    grep -n "generateMeshData" voxx-js/chunkWorker.js
    Should show: import statement + single call
  </verify>
  <done>chunkWorker.js uses shared greedyMesh.js</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 5: Verify functionality</name>
  <files></files>
  <action>
    1. Open voxx-js/index.html in browser
    2. Verify terrain generates correctly (chunks visible)
    3. Verify block placement/destruction still works
    4. Verify no console errors on load
  </action>
  <verify>
    Load page, verify rendering works, check console for errors
  </verify>
  <done>Application works correctly with refactored code</done>
</task>

</tasks>

<verification>
1. grep for "generateMeshData" in voxx-js/ - should only find calls and imports, not two definitions
2. grep for "CHUNK_WIDTH.*=.*32" - should only find one definition in chunkCore.js
3. Load browser and verify terrain renders
</verification>

<success_criteria>
- [ ] DEDUP-01: Greedy meshing in greedyMesh.js, imported by both files
- [ ] DEDUP-02: Constants in chunkCore.js only
- [ ] No runtime errors after refactoring
</success_criteria>

<output>
After completion, create `.planning/phases/02-deduplication/02-deduplication-SUMMARY.md`
</output>
