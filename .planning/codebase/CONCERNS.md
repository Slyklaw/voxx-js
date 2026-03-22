# Codebase Concerns

**Analysis Date:** 2026-03-22

## Tech Debt

**[WebGL Resource Management]:**
- Issue: Complex manual WebGL resource disposal with potential memory leaks
- Files: `src/main.js`, `src/gl/context.js`, `src/gl/render.js`, `world.js`
- Impact: GPU memory leaks, context loss recovery issues, performance degradation over time
- Fix approach: Implement centralized resource manager with reference counting, use WebGL2 vertex arrays properly, improve context loss/restore handling

**[Chunk System Complexity]:**
- Issue: Over-engineered chunk management with worker pools, pending tracking, and hot chunk retention
- Files: `world.js`, `workerPool.js`, `chunkWorker.js`
- Impact: Difficult to debug race conditions, complex failure scenarios, maintenance burden
- Fix approach: Simplify chunk lifecycle, reduce state tracking, consider synchronous generation for smaller worlds or improve worker communication patterns

**[Global State Pollution]:**
- Issue: Excessive global variables in main.js and render.js modules
- Files: `src/main.js` (lines 43-54, 99-149), `src/gl/render.js` (lines 99-150)
- Impact: Namespace pollution, tight coupling, difficulty in testing, potential conflicts
- Fix approach: Encapsulate state in modules/classes, use dependency injection, reduce global scope usage

## Known Bugs

**[WebGL Context Loss Handling]:**
- Symptoms: Potential crashes or rendering issues when WebGL context is lost/restored
- Files: `src/main.js` (disposeWebGLResources/initWebGLResources), `src/gl/context.js`
- Trigger: GPU reset, driver update, tab backgrounding on mobile
- Workaround: Page reload required
- Status: Basic handling exists but may not cover all resource types consistently

**[Worker Termination Race]:**
- Symptoms: Potential errors when terminating workers while jobs are in progress
- Files: `workerPool.js`, `world.js` (dispose method)
- Trigger: Rapid world disposal during active chunk generation
- Workaround: None currently implemented
- Status: Worker termination doesn't wait for job completion, may cause errors

**[Chunk Mesh Synchronization]:**
- Symptoms: Potential for chunks to render outdated meshes after voxel changes
- Files: `src/main.js` (updateChunks/syncChunkToWebGL), `world.js`
- Trigger: Block placement/removal near chunk boundaries
- Workaround: None, may cause visual inconsistencies
- Status: Mesh updates triggered but complex dependency tracking may miss edge cases

## Security Considerations

**[Eval Risk in Dynamic Imports]:**
- Risk: Dynamic script loading could be exploited if inputs aren't sanitized
- Files: `workerPool.js` (Worker constructor with './chunkWorker.js')
- Current mitigation: Hardcoded path, no user input
- Recommendations: Continue using hardcoded paths, avoid dynamic worker URLs based on user input

**[External Script Injection]:**
- Risk: Loading external libraries from CDN without integrity checks
- Files: `world.js` (line 7: simplex-noise from cdn.jsdelivr.net)
- Current mitigation: None
- Recommendations: Add subresource integrity (SRI) hashes, consider self-hosting critical dependencies

## Performance Bottlenecks

**[Excessive Matrix Math in Render Loop]:**
- Problem: Matrix multiplication happening per-frame in JavaScript (main.js lines 164-175, 203-220)
- Files: `src/main.js`
- Cause: CPU-side matrix math for MVP calculations that could be done in shaders
- Improvement path: Move matrix calculations to vertex shader, pass camera matrices as uniforms

**[Inefficient Chunk Visibility Checks]:**
- Problem: O(n) chunk scanning every frame in getVisibleChunks() and updateChunks()
- Files: `world.js` (lines 240-256, 331-342)
- Cause: Checking all chunks instead of spatial partitioning or change-based updates
- Improvement path: Implement chunk visibility tracking that only updates when camera moves significantly

**[Redundant Neighbor Calculations]:**
- Problem: Neighbor relationships recalculated multiple times during chunk loading
- Files: `world.js` (lines 102-135, 71-72, 79-80)
- Cause: setupChunkNeighbors called multiple times per chunk load
- Improvement path: Cache neighbor relationships, update incrementally when chunks load/unload

## Fragile Areas

**[WebGL State Management]:**
- Files: `src/gl/render.js` (entire file), `src/main.js` (render function)
- Why fragile: Manual WebGL state binding/unbinding, easy to break rendering pipeline state
- Safe modification: Always save/restore WebGL state, use VAOs extensively, consider WebGL2 state query extensions
- Test coverage: Limited - visual testing only, no automated WebGL state validation

**[Worker Communication]:**
- Files: `workerPool.js`, `chunkWorker.js`, `world.js` (worker job handling)
- Why fragile: Complex job prioritization, cancellation, and transferable object handling
- Safe modification: Maintain transferable object patterns, test cancellation paths thoroughly
- Test coverage: Minimal - relies on integration testing of world loading

**[Configuration Dependencies]:**
- Files: `config.js`, many files importing config constants
- Why fragile: Tight coupling to configuration constants, magic numbers throughout code
- Safe modification: Group related configs, provide default values, validate configuration at startup
- Test coverage: None - configuration errors cause runtime failures

## Scaling Limits

**[Maximum World Size]:**
- Current capacity: Limited by JavaScript number precision for chunk coordinates (safe up to ~±10^15 chunks)
- Limit: Practical limit is memory - each chunk stores voxel data (16^3 bytes) plus mesh data
- Scaling path: Implement chunk level-of-detail, compress voxel storage, implement paging for very large worlds

**[Render Distance Scaling]:**
- Current capacity: Render distance of 8-16 chunks works well
- Limit: Beyond 32 chunks, CPU overhead for chunk management and GPU overhead for draw calls becomes significant
- Scaling path: Implement hierarchical chunk rendering (octree), increase chunk size for distant terrain, implement imposters/impostors for distant objects

**[Worker Pool Scaling]:**
- Current capacity: Fixed worker pool size (default: navigator.hardwareConcurrency)
- Limit: Too many workers causes overhead, too few causes chunk generation backlog
- Scaling path: Dynamic worker pool sizing based on workload, prioritize visible chunks more aggressively

## Dependencies at Risk

**[Simplex Noise CDN Dependency]:**
- Risk: Reliance on external CDN for noise generation; if CDN fails or changes, world generation breaks
- Impact: Procedural world generation fails completely
- Migration plan: Self-host simplex-noise module, add fallback to built-in noise function

**[jsdom Test Dependency]:**
- Risk: Testing relies on jsdom which may not perfectly match browser behavior
- Impact: Tests may pass in CI but fail in actual browsers
- Migration plan: Increase cross-browser testing, consider headless Chrome/Vitest browser mode for critical paths

## Missing Critical Features

**[Resource Loading Progress]:**
- Problem: No feedback to user during initial world loading/chunk generation
- Blocks: Polished user experience, perception of performance
- Implementation: Add loading screen/progress indicator based on pending chunk count

**[Graphics Quality Settings]:**
- Problem: No way to adjust graphics quality for different hardware capabilities
- Blocks: Accessibility for lower-end devices, battery life optimization
- Implementation: Add quality presets that adjust render distance, SSAO, shadow quality, etc.

## Test Coverage Gaps

**[WebGL Integration Testing]:**
- What's not tested: Actual rendering output, shader correctness, framebuffer completeness
- Files: `src/gl/` directory (shaders, render, fbo, buffers)
- Risk: Rendering bugs may only manifest visually, hard to catch automatically
- Priority: High - rendering is core to application

**[Worker Thread Safety]:**
- What's not tested: Race conditions in worker pool, transferable object handling
- Files: `workerPool.js`, `world.js` worker interactions
- Risk: Intermittent failures under load, difficult to reproduce
- Priority: Medium - manifests as occasional chunk generation failures

**[Edge Case Chunk Updates]:**
- What's not tested: Chunk updates at world boundaries, negative coordinates, large coordinate values
- Files: `world.js` chunk neighbor logic
- Risk: World boundary issues, coordinate wrapping problems
- Priority: Medium - affects exploration at world edges

---
*Concerns audit: 2026-03-22*