# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Greedy Meshing Duplication:**
- Issue: Greedy meshing algorithm exists in two places with slight variations
- Files: `voxx-js/chunk.js` (lines 157-389), `voxx-js/chunkWorker.js` (lines 61-269)
- Impact: Maintenance burden, potential for divergence in behavior
- Fix approach: Extract to shared utility module, import from both locations

**Dead Code - Three.js References:**
- Issue: `chunk.js` still references Three.js in comments (lines 6-8) and has legacy mesh properties
- Files: `voxx-js/chunk.js` (lines 23-26)
- Impact: Confusing for new developers, unused properties consume memory
- Fix approach: Remove Three.js references and dead properties (`mesh`, `geometry`, `material`)

**Dead Code - Test Triangle:**
- Issue: Test render module exists but may not be used
- Files: `voxx-js/src/gl/test-render.js`
- Impact: Unused code increases bundle size
- Fix approach: Remove if unused, or document purpose

**Legacy generateChunk Method:**
- Issue: `World.generateChunk()` method exists but is no longer used in normal flow
- Files: `voxx-js/world.js` (lines 144-148)
- Impact: Dead code that may confuse developers
- Fix approach: Remove if not needed for fallback/debugging

**Constants Duplicated Between Files:**
- Issue: Chunk dimensions defined in both `chunk.js` and `chunkCore.js`
- Files: `voxx-js/chunk.js` (lines 10-13), `voxx-js/chunkCore.js` (lines 4-6)
- Impact: Potential for inconsistency if one is updated without the other
- Fix approach: Import from single source, or consolidate into shared constants file

## Known Bugs

**Block Selection Mismatch:**
- Issue: Mousewheel block selection uses `blockCount = 5` but keys 1-9 are documented
- Files: `voxx-js/src/main.js` (line 210)
- Impact: Users cannot select blocks 6-9 via scroll wheel even though keys work
- Workaround: Use number keys 1-5

**Render Distance UI Not Functional:**
- Issue: Render distance increment/decrement buttons update the DOM but do not affect chunk loading
- Files: `voxx-js/src/main.js` (lines 245-253, 743-744)
- Impact: UI controls appear broken
- Fix approach: Connect UI to actual render distance parameter

**Block Selector UI Stale:**
- Issue: Block selector hardcodes data-block attributes and doesn't update with scroll changes
- Files: `voxx-js/index.html` (lines 88-113), `voxx-js/src/main.js` (lines 24-29)
- Impact: Visual selection state may not match actual selected block
- Workaround: Use keyboard for block selection

**Context Loss Handler Incomplete:**
- Issue: `initWebGLResources()` in context.js is empty stub
- Files: `voxx-js/src/gl/context.js` (lines 41-44)
- Impact: Application will not recover from WebGL context loss
- Fix approach: Implement full resource reinitialization on context restore

## Security Considerations

**No Input Sanitization:**
- Risk: User keyboard/mouse input directly controls game state without validation
- Files: `voxx-js/src/main.js` (lines 174-178, 281-321)
- Current mitigation: None
- Recommendations: Add bounds checking for camera position and rotation values

**External CDN Dependency:**
- Risk: Relies on external simplex-noise from jsdelivr.net
- Files: `voxx-js/world.js` (line 6), `voxx-js/chunkWorker.js` (line 1), `voxx-js/biomes.js` (line 1)
- Impact: Application breaks if CDN is unavailable
- Recommendations: Bundle noise library locally or use importmap with fallback

**No Web Security Headers:**
- Risk: No Content-Security-Policy, allowing inline scripts/potential XSS
- Files: `voxx-js/index.html`
- Impact: Vulnerable to injection attacks if served alongside user content
- Recommendations: Add CSP headers when deploying

## Performance Bottlenecks

**Debug Logging in Production:**
- Problem: ~59 console.log statements throughout codebase
- Files: Multiple files including `main.js`, `render.js`, `chunk.js`, `chunkWorker.js`, `world.js`
- Cause: Excessive logging creates garbage collection pressure
- Improvement path: Add debug flag to disable logs in production

**Mesh Regeneration on Block Edit:**
- Problem: Full mesh regeneration on every block change instead of incremental update
- Files: `voxx-js/src/main.js` (lines 544-545, 589-590)
- Cause: Simpler but inefficient approach
- Improvement path: Implement incremental mesh updates for edited regions

**Greedy Meshing Memory Allocation:**
- Problem: `Int32Array mask` created on each mesh generation sweep
- Files: `voxx-js/chunk.js` (line 182), `voxx-js/chunkWorker.js` (line 87)
- Cause: Repeated allocations in tight loop
- Improvement path: Reuse buffer with resize when needed

**Worker Response Handling Inefficiency:**
- Problem: Linear search through workers array on every message
- Files: `voxx-js/workerPool.js` (lines 21-22, 57-58)
- Cause: `find()` called multiple times per task
- Improvement path: Use Map for O(1) worker lookup

## Fragile Areas

**Worker Pool Callback ID Generation:**
- Files: `voxx-js/workerPool.js` (line 68)
- Why fragile: Uses `performance.now() + Math.random()` which could theoretically collide
- Safe modification: Use incrementing counter or UUID
- Test coverage: No tests exist

**Chunk Mesh Synchronization Race:**
- Files: `voxx-js/src/main.js` (lines 686-703), `voxx-js/world.js` (lines 150-185)
- Why fragile: WebGL mesh creation can lag behind chunk data arrival
- Safe modification: Ensure null checks before mesh operations
- Risk: May briefly render empty chunks during fast movement

**Greedy Meshing Winding Order:**
- Files: `voxx-js/chunk.js` (lines 341-347), `voxx-js/chunkWorker.js` (lines 233-241)
- Why fragile: Different winding order based on face direction; subtle bugs can cause artifacts
- Safe modification: Verify backface culling remains consistent
- Risk: Incorrect winding causes missing/inverted faces

**Block Type Lookup Without Bounds Check:**
- Files: `voxx-js/blocks.js` (lines 43-45), `voxx-js/chunk.js` (line 244)
- Why fragile: Returns black/default color for invalid block types silently
- Safe modification: Add assertion in debug mode
- Risk: Invalid block types create invisible geometry

## Scaling Limits

**Memory - Chunks:**
- Current capacity: ~17 chunks visible at render distance 8 (8x8 + edge)
- Limit: Each chunk uses ~256KB for voxel data (32x32x256 bytes)
- Scaling path: Implement LOD (Level of Detail) for distant chunks

**Memory - Mesh Buffers:**
- Current capacity: Each chunk mesh can grow large with complex terrain
- Limit: WebGL buffer size limits on mobile devices
- Scaling path: Implement mesh simplification for distant terrain

**Worker Pool - Fixed Size:**
- Current capacity: `navigator.hardwareConcurrency || 4` workers
- Limit: Cannot adapt to workload dynamically
- Scaling path: Implement worker recycling with task priority

## Dependencies at Risk

**simplex-noise@4.0.3:**
- Risk: Pinned to specific version from CDN
- Impact: If CDN changes or version removed, generation breaks completely
- Migration plan: 
  1. Copy simplex-noise implementation locally
  2. Use npm package with proper versioning
  3. Consider alternative noise library with better maintenance

**WebGL2 Browser Support:**
- Risk: Requires WebGL2 which has limited mobile support
- Impact: Does not work on older browsers/devices
- Migration plan: Add WebGL1 fallback with reduced features

## Missing Critical Features

**No Block Persistence:**
- Problem: World regenerates fresh on each load
- Blocks: Cannot save builds
- Priority: High

**No Collision Detection:**
- Problem: Player can fly through terrain
- Files: `voxx-js/src/main.js` (lines 282-321)
- Priority: High for game viability

**No Lighting/Shadows:**
- Problem: Flat lighting despite having normal data
- Files: `voxx-js/src/gl/shaders/voxel.js` (shader implementation)
- Priority: Medium - affects visual quality

**No World Save/Load:**
- Problem: No serialization of chunk data
- Files: `voxx-js/world.js`
- Priority: High for persistence

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Core terrain generation, greedy meshing algorithm, block type lookups
- Files: Entire codebase
- Risk: Bugs in generation can cause crashes or visual artifacts
- Priority: High

**No Integration Tests:**
- What's not tested: Worker communication, chunk mesh synchronization, WebGL rendering pipeline
- Files: `voxx-js/workerPool.js`, `voxx-js/world.js`
- Risk: Race conditions and WebGL errors go undetected
- Priority: Medium

**No Performance Tests:**
- What's not tested: FPS under load, memory usage, mesh generation time
- Risk: Performance regressions go unnoticed
- Priority: Low - manual monitoring exists

---

*Concerns audit: 2026-03-18*
