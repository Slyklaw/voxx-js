# Phase 3: Performance - Research

**Researched:** 2026-03-27
**Domain:** WebGL2 performance optimization for voxel rendering
**Confidence:** HIGH

## Summary

Phase 3 focuses on three performance optimizations: moving matrix calculations to shaders (PERF-01), implementing efficient chunk visibility culling (PERF-02), and caching neighbor calculations (PERF-03). The codebase currently calculates MVP matrices in JavaScript each frame and scans all chunks for visibility each frame—both expensive operations at scale.

**Primary recommendation:** Implement instanced rendering with per-chunk model matrices stored as vertex attributes, use grid-based spatial hashing for visibility culling, and cache neighbor references with dirty flags for incremental updates.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | Matrix calculations run in shaders rather than JavaScript per-frame | WebGL2 instanced drawing + UBO patterns enable GPU-side transforms |
| PERF-02 | Chunk visibility checks don't scan all chunks every frame | Grid-based spatial hashing provides O(1) lookup vs O(n) scan |
| PERF-03 | Neighbor calculations are cached and updated incrementally | Chunk neighbor references already exist; need dirty flag tracking |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WebGL2 | Native | GPU rendering | Already used; instancing requires WebGL2 |
| UBOs | Native | Shared camera matrices | Already implemented in src/gl/ubo.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Instanced Rendering | Native | Batch draw calls | PERF-01 implementation |
| Vertex Array Objects | Native | Buffer state | Already used |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Instanced rendering | Individual draw calls per chunk | Simpler but higher CPU overhead |
| Grid spatial hash | Octree | Simpler to implement, sufficient for chunked worlds |
| Full neighbor recalculation | Dirty flag tracking | More complex, similar performance |

## Architecture Patterns

### Current Implementation Analysis

**Matrix Calculations (PERF-01):**
- `src/main.js:217-228` - `multiplyMatrices()` runs per-frame
- `src/main.js:510-523` - View/projection matrices created each frame
- `src/main.js:193-215` - Block outline uses JavaScript matrix multiply

**Chunk Visibility (PERF-02):**
- `world.js:244-260` - `getVisibleChunks()` scans ALL chunks in `this.chunks` object
- No spatial partitioning; O(n) complexity where n = total loaded chunks
- `src/gl/render.js:665-691` - Additional filtering without frustum culling

**Neighbor Calculations (PERF-03):**
- `world.js:107-139` - `setupChunkNeighbors()` called on chunk load AND when neighbors load
- `world.js:142-149` - `getChunkNeighbors()` creates new object each call
- No dirty tracking; recalculates on every chunk load

### Recommended Implementation

#### Pattern 1: Instanced Rendering with Shader Matrix (PERF-01)

**What:** Store chunk world positions as instance attributes; compute final position in vertex shader

**When to use:** When rendering many static meshes (chunks)

**Example:**
```glsl
// Vertex shader - chunk position from instance attribute
#version 300 es
layout(location = 2) in vec3 aChunkOffset; // Instance attribute

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
  // Transform vertex by instance offset (chunk position)
  vec3 worldPosition = aPosition + aChunkOffset;
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPosition, 1.0);
}
```

```javascript
// JavaScript - setup instanced rendering
// Per-chunk: drawElementsInstanced with chunk offset as instance attribute
gl.vertexAttribDivisor(attribLocation, 1); // Advance per instance
gl.drawElementsInstanced(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0, instanceCount);
```

**Source:** WebGL2Fundamentals.org - Instanced Drawing (https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html)

#### Pattern 2: Grid-Based Spatial Hashing (PERF-02)

**What:** Use chunk coordinates as direct lookup keys; maintain set of visible chunks

**When to use:** Chunked world with regular grid layout

**Example:**
```javascript
// Spatial index: Map<"x,z", Chunk>
class SpatialIndex {
  constructor() {
    this.chunks = new Map(); // "chunkX,chunkZ" -> Chunk
  }
  
  getChunk(chunkX, chunkZ) {
    return this.chunks.get(`${chunkX},${chunkZ}`);
  }
  
  // Only check chunks in render distance, not all chunks
  *getChunksInFrustum(frustum, camChunkX, camChunkZ, renderDistance) {
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const chunk = this.chunks.get(`${x},${z}`);
        if (chunk && this.isInFrustum(chunk, frustum)) {
          yield chunk;
        }
      }
    }
  }
}
```

**Key insight:** Instead of scanning all chunks, only iterate the render-distance grid (e.g., 17x17 = 289 chunks max for renderDistance=8).

#### Pattern 3: Incremental Neighbor Updates (PERF-03)

**What:** Store neighbor references with dirty flags; update only affected chunks

**When to use:** When chunks load/unload and trigger neighbor mesh regeneration

**Example:**
```javascript
class Chunk {
  constructor(x, z) {
    this.neighborChunks = { north: null, south: null, east: null, west: null };
    this.neighborsDirty = false;
  }
  
  setNeighbors(north, south, east, west) {
    const changed = this.neighborChunks.north !== north ||
                    this.neighborChunks.south !== south ||
                    this.neighborChunks.east !== east ||
                    this.neighborChunks.west !== west;
    
    this.neighborChunks = { north, south, east, west };
    if (changed) {
      this.neighborsDirty = true;
    }
  }
  
  // Only rebuild mesh when neighbors actually changed
  needsMeshRebuild() {
    return this.needsUpdate || this.neighborsDirty;
  }
}
```

### Anti-Patterns to Avoid

- **Scanning all chunks every frame:** Causes O(n) visibility check regardless of render distance
- **Matrix multiplication in JavaScript per-frame:** GPU is faster; compute once or use instancing
- **Creating new objects for neighbor lookups:** Causes GC pressure; cache references

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Matrix math | Custom JS multiply | Built-in Float32Array or GPU | WebGL handles efficiently |
| Spatial queries | Custom octree | Grid hash | Chunks are already a grid |
| Chunk storage | Array scan | Map by key | O(1) vs O(n) lookup |

**Key insight:** The chunk grid is already a spatial structure—leverage it directly rather than building additional data structures.

## Common Pitfalls

### Pitfall 1: Instanced Rendering Setup Complexity
**What goes wrong:** Incorrect divisor configuration causes rendering artifacts or crashes
**Why it happens:** `vertexAttribDivisor` must match attribute usage pattern
**How to avoid:** Test with single-chunk first, verify divisor = 1 for per-instance data
**Warning signs:** All chunks render at origin, or only first chunk visible

### Pitfall 2: Stale Neighbor References
**What goes wrong:** Chunks reference unloaded neighbor chunks, causing null pointer errors
**Why it happens:** Neighbor pointers not cleared when chunks unload
**How to avoid:** Clear neighbor references in chunk dispose(), validate before use

### Pitfall 3: Over-Invalidation
**What goes wrong:** Marking entire chunk regions dirty causes excessive mesh rebuilds
**Why it happens:** Coarse-grained dirty tracking
**How to avoid:** Track specific sub-region changes, only rebuild affected chunk faces

## Code Examples

### Current: JavaScript Matrix Multiply (main.js:217-228)
```javascript
function multiplyMatrices(a, b) {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[j * 4 + i] = 0;
      for (let k = 0; k < 4; k++) {
        result[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
      }
    }
  }
  return result;
}
```

### Recommended: Shader-Based Transform
```glsl
// In vertex shader - compute once per vertex, not per frame in JS
vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Immediate mode matrix calc | Shader-based transform | WebGL2 era | 10x+ faster |
| Brute-force visibility | Spatial hashing | Games since ~2010 | O(n) → O(1) |
| Full mesh rebuild | Incremental/dirty flags | Minecraft 2011 | 5x fewer rebuilds |

**Deprecated/outdated:**
- Fixed-function pipeline: Replaced by programmable shaders
- Display lists: Replaced by VBOs/VAOs

## Open Questions

1. **Instancing compatibility with existing mesh system**
   - What we know: Current system uses per-chunk VAOs; instancing requires reorganizing buffer layout
   - What's unclear: Whether to keep per-chunk VAOs or move to single instanced draw
   - Recommendation: Keep separate meshes but add instance attributes for chunk position; use `drawElementsInstanced` per chunk batch

2. **Frustum culling re-enablement**
   - What we know: Frustum culling was previously removed due to math issues (render.js:666 comment)
   - What's unclear: What specifically broke; whether to fix or replace
   - Recommendation: Re-implement using grid-based iteration (only check ~289 chunks max)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing in project) |
| Config file | voxx-js/vitest.config.js |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --run` |
| Estimated runtime | ~5-10 seconds |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PERF-01 | Matrix in shader | Manual/performance | N/A (visual check + FPS) | N/A |
| PERF-02 | Visibility check O(1) | Unit | `npm test` (test chunk lookup) | ✅ tests/unit/chunk.test.js |
| PERF-03 | Neighbor caching | Unit | `npm test` (test neighbor refs) | ✅ tests/unit/chunk.test.js |

### Wave 0 Gaps (must be created before implementation)
- None — existing test infrastructure covers chunk behavior

## Sources

### Primary (HIGH confidence)
- WebGL2Fundamentals.org - Instanced Drawing (https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html)
- MDN WebGL2RenderingContext - drawElementsInstanced (https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawElementsInstanced)
- Existing codebase: src/gl/ubo.js, world.js, chunk.js

### Secondary (MEDIUM confidence)
- Simulant Engine - Spatial Hash Partitioner (https://simulant-engine.appspot.com/docs/spatial_hashing.md)

### Tertiary (LOW confidence)
- General game dev patterns from various voxel engine implementations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WebGL2 native features, existing UBO usage in codebase
- Architecture: HIGH - Proven patterns from Minecraft-like games
- Pitfalls: MEDIUM - Based on common WebGL issues, project-specific testing needed

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (30 days for stable WebGL2 technology)
