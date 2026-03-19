# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**Commented Debug Code:**
- Issue: Numerous commented-out console.log statements scattered throughout the codebase
- Files: `src/main.js` (lines 710, 723, 727, 731, 747, 754, 758), `chunk.js` (line 183), `chunkWorker.js` (lines 10, 42, 50), `world.js` (line 41), `blocks.js` (lines 121, 124)
- Impact: Code clutter and maintenance overhead
- Fix approach: Remove commented debug code or implement proper debug logging system with configurable levels

**Hardcoded Test Code:**
- Issue: Forced perfectly flat lowland terrain in biomes.js (lines 48-51)
- Files: `biomes.js` (line 48-51)
- Impact: Masks potential terrain generation issues, may be intentional but not clearly documented
- Fix approach: Remove test code or move behind a debug flag

**Magic Numbers:**
- Issue: Hardcoded vertex format stride and offsets without clear documentation
- Files: `src/gl/buffers.js` (lines 1-4)
- Impact: Maintenance difficulty when changing vertex format
- Fix approach: Use named constants with clear documentation

## Known Bugs

**WebGL Context Loss Recovery:**
- Symptoms: Potential resource leaks on context loss/restore cycles
- Files: `src/gl/context.js`, `src/main.js` (lines 53-81)
- Trigger: Browser WebGL context loss events
- Workaround: Manual page refresh required if resources don't restore properly

**Chunk Generation Race Conditions:**
- Symptoms: Mesh generation failures when chunks load/unload rapidly
- Files: `world.js` (lines 44-73), `chunk.js` (lines 197-201)
- Trigger: Fast player movement causing rapid chunk loading/unloading
- Workaround: Slow down movement or increase chunk cache

**Missing Error Handling in Worker Communication:**
- Symptoms: Silent failures when worker tasks fail
- Files: `workerPool.js` (lines 38-46), `world.js` (lines 40-74)
- Trigger: Worker process crashes or communication failures
- Workaround: Monitor console for error messages

## Security Considerations

**External CDN Dependency:**
- Risk: Supply chain attack via compromised CDN
- Files: `world.js` (line 7), `biomes.js` (line 1)
- Current mitigation: Using specific version (simplex-noise@4.0.3)
- Recommendations: Add Subresource Integrity (SRI) hashes or bundle dependency locally

**No Input Validation:**
- Risk: Potential for invalid game state from user input
- Files: `src/main.js` (lines 200-319)
- Current mitigation: Basic parameter clamping
- Recommendations: Add comprehensive input validation for all user interactions

**WebGL Shader Injection:**
- Risk: Potential shader injection if user-controlled data enters shader source
- Files: `src/gl/shaders.js` (lines 1-30), `src/main.js` (lines 84-99)
- Current mitigation: Shader sources are hardcoded strings
- Recommendations: Validate any dynamic shader content

## Performance Bottlenecks

**Main Thread Mesh Generation:**
- Problem: Some mesh generation occurs on main thread
- Files: `chunk.js` (lines 149-165), `src/main.js` (lines 702-739)
- Cause: Fallback to main thread when worker unavailable
- Improvement path: Complete worker-based generation or add worker fallback queue

**Large Float32Array Allocations:**
- Problem: Frequent allocation of large typed arrays for mesh data
- Files: `src/gl/buffers.js` (lines 110, 185, 203), `greedyMesh.js`
- Cause: Each chunk mesh requires new allocations
- Improvement path: Implement object pooling for temporary arrays

**WebGL Buffer Binding Overhead:**
- Problem: Multiple buffer bind/unbind operations per frame
- Files: `src/gl/buffers.js` (lines 51-57, 176-177, 187-188), `src/gl/render.js`
- Cause: Per-chunk buffer binding for rendering
- Improvement path: Use instanced rendering or batch similar chunks

**Texture Atlas Loading:**
- Problem: Synchronous texture binding during render loop
- Files: `src/gl/render.js` (lines 270-285)
- Cause: Texture binding check on each render call
- Improvement path: Pre-load and cache texture binding state

## Fragile Areas

**Chunk Neighbor Dependency System:**
- Files: `chunk.js` (lines 74-89), `world.js` (lines 83-143)
- Why fragile: Complex bidirectional dependency management
- Safe modification: Test with edge cases (corner chunks, chunk loading order)
- Test coverage: Limited - mostly manual testing

**WebGL Resource Management:**
- Files: `src/gl/context.js`, `src/main.js` (lines 53-81), `src/gl/buffers.js` (lines 59-70)
- Why fragile: Manual resource tracking and cleanup
- Safe modification: Use resource disposal registry pattern
- Test coverage: Minimal automated testing for context loss scenarios

**Worker Thread Communication:**
- Files: `workerPool.js`, `world.js` (lines 38-77)
- Why fragile: Callback-based async communication
- Safe modification: Ensure proper cleanup of pending callbacks
- Test coverage: No automated tests for worker failures

**Memory Management for Large Voxel Arrays:**
- Files: `chunk.js` (lines 17-19), `world.js` (lines 170-179)
- Why fragile: Manual disposal of large typed arrays
- Safe modification: Use weak references or explicit disposal patterns
- Test coverage: Memory leak detection needed

## Scaling Limits

**Render Distance:**
- Current capacity: 8 chunks (configurable up to 32)
- Limit: Performance degrades exponentially with render distance
- Scaling path: Implement Level of Detail (LOD) system

**Worker Pool Size:**
- Current capacity: `navigator.hardwareConcurrency || 4` workers
- Limit: Limited by available CPU cores
- Scaling path: Dynamic worker scaling based on workload

**Chunk Cache:**
- Current capacity: All chunks within render distance
- Limit: Memory usage grows with render distance squared
- Scaling path: Implement chunk pooling and LOD

**WebGL Draw Calls:**
- Current capacity: One draw call per chunk
- Limit: GPU overhead per draw call
- Scaling path: Batch draw calls or use instanced rendering

## Dependencies at Risk

**simplex-noise CDN:**
- Risk: CDN availability or version changes
- Impact: World generation fails to load
- Migration plan: Bundle dependency locally with npm

**WebGL2 Support:**
- Risk: Browser compatibility for advanced features
- Impact: Application fails on unsupported browsers
- Migration plan: Add WebGL1 fallback or clear browser requirements

## Missing Critical Features

**Error Recovery System:**
- Problem: No automatic recovery from WebGL errors
- Blocks: Long-running sessions without manual intervention

**Memory Monitoring:**
- Problem: No memory usage tracking or limits
- Blocks: Stable operation on memory-constrained devices

**Asset Preloading:**
- Problem: No texture or shader preloading system
- Blocks: Smooth startup experience

## Test Coverage Gaps

**WebGL Context Loss:**
- What's not tested: Resource disposal and restoration
- Files: `src/gl/context.js`, `src/main.js` (lines 53-81)
- Risk: Silent resource leaks
- Priority: High

**Chunk Generation Edge Cases:**
- What's not tested: Chunks at world boundaries, chunk loading order
- Files: `chunk.js`, `world.js`
- Risk: Visual artifacts or crashes
- Priority: Medium

**Worker Failure Scenarios:**
- What's not tested: Worker crashes, communication timeouts
- Files: `workerPool.js`, `chunkWorker.js`
- Risk: Silent failures in chunk generation
- Priority: Medium

**Performance Regression:**
- What's not tested: Frame rate drops, memory leaks
- Files: `src/gl/performance.js`, all rendering code
- Risk: Gradual performance degradation
- Priority: Low

---

*Concerns audit: 2026-03-19*