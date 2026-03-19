# Phase 2: Performance Optimization - Research

**Research Date:** 2026-03-19
**Phase:** 2 - Performance Optimization

## Current Architecture (from codebase analysis)

### Rendering Pipeline
- WebGL2 with VAOs, VBOs, UBOs for GPU performance
- Greedy meshing algorithm for optimized mesh generation
- Chunk-based rendering with dynamic loading/unloading based on render distance
- Custom shader programs (voxels, sky, selection)
- Texture atlas support

### Chunk System
- 32x256x32 blocks per chunk
- Web Worker pool for multi-threaded terrain generation
- Chunk loading/unloading based on camera position
- Mesh regeneration on block edits

### Known Performance Areas (from CONCERNS.md)
- Chunk generation race conditions during fast movement
- Missing error handling in worker communication
- WebGL context loss recovery issues

## Performance Optimization Opportunities

### 1. Rendering Pipeline (PERF-01)

**Areas to investigate:**

**Draw Call Reduction:**
- Current: Each chunk renders independently
- Opportunity: Batch similar chunks, use instanced rendering
- The codebase already uses VAOs per chunk - potential for improvement

**Buffer Management:**
- Files: `voxx-js/src/gl/buffers.js`
- Current: Buffers created per chunk, deleted on unload
- Opportunity: Buffer pooling to reduce allocation overhead

**Frustum Culling:**
- Currently chunks loaded based on distance
- Opportunity: Actual frustum culling to skip off-screen chunks

**LOD (Level of Detail):**
- Not currently implemented
- Opportunity: Lower detail meshes for distant chunks

### 2. Memory Management (PERF-02)

**Areas to investigate:**

**Chunk Cache:**
- File: `voxx-js/world.js`
- Currently loads/unloads based on render distance
- Opportunity: Smarter cache eviction, keep hot chunks

**Worker Communication:**
- File: `voxx-js/workerPool.js`, `voxx-js/chunkWorker.js`
- Messages transferred for each chunk
- Opportunity: Reduce message overhead, batch operations

**Mesh Memory:**
- Greedy mesh generates optimized geometry
- Opportunity: Compress mesh data, share vertices

**Resource Cleanup:**
- Files: `voxx-js/src/gl/context.js`
- WebGL resources should be properly disposed
- Check for memory leaks on chunk unload

## Recommended Optimizations

### High Impact, Low Risk
1. **Add frustum culling** - Skip rendering off-screen chunks
2. **Implement buffer pooling** - Reuse WebGL buffers instead of creating/destroying
3. **Optimize chunk unloading** - Ensure proper resource disposal
4. **Reduce draw calls per frame** - Sort chunks by texture to minimize state changes

### Medium Impact, Medium Risk
5. **Implement chunk LOD** - Lower detail meshes for distant terrain
6. **Batch worker messages** - Send multiple chunk requests together
7. **Add render distance scaling** - Higher distance = larger step between chunks

### Performance Metrics to Track
- FPS (already tracked via getFPS())
- Draw calls per frame
- Chunk generation time
- Memory usage (browser performance.memory if available)
- Frame time variance (stuttering indicator)

## Validation Approach

**Manual Testing:**
1. Open browser dev tools Performance tab
2. Record while exploring for 2+ minutes
3. Check for:
   - Stable FPS (target: 60fps, acceptable: 30fps+)
   - No memory growth over time
   - Minimal GC pauses
   - Consistent frame times (no major spikes)

**Metrics Available:**
- FPS counter already in UI
- Debug mode in config (DEBUG flag)
- Console logging available for timing data

## Implementation Notes

- Keep existing architecture (Web Workers, chunk system)
- Performance improvements should be incremental
- Test on lower-end hardware if possible
- Profile before/after to measure impact

---

*Research ready for planning*
