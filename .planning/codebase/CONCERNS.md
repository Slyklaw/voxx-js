# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**Duplicate Chunk Classes:**
- Issue: `chunk.js` (218 lines) and `chunkCore.js` (80 lines) contain nearly identical terrain generation logic
- Files: `voxx-js/chunk.js`, `voxx-js/chunkCore.js`
- Impact: Maintenance burden - changes to terrain generation must be made in two places
- Fix approach: Consolidate into single Chunk class with separate terrain generator module

**Monolithic Main File:**
- Issue: `src/main.js` is 997 lines with mixed responsibilities (rendering, input, game logic, WebGL)
- Files: `voxx-js/src/main.js`
- Impact: Hard to navigate, test, and modify safely
- Fix approach: Split into separate modules (InputHandler, BlockEditor, Camera, Renderer interface)

**Manual Matrix Math:**
- Issue: Matrix math duplicated in multiple files (`main.js`, `render.js`) without a shared math module
- Files: `voxx-js/src/main.js` (multiplyMatrices, lookAt, createViewMatrix, createProjectionMatrix, createOrthoMatrix, createLightSpaceMatrix)
- Impact: Code duplication, potential for inconsistencies
- Fix approach: Use gl-matrix library or create a shared math utilities module

**Forced Flat Terrain in Lowlands:**
- Issue: Biome generation has a test hack forcing perfectly flat lowland terrain
- Files: `voxx-js/biomes.js` (line 48-51)
- Impact: Lowlands are featureless; terrain variation is broken
- Fix approach: Remove the test override to restore fractal terrain

**Scattered DEBUG Flags:**
- Issue: DEBUG constant checked throughout code with manual console.log statements
- Files: All JS files in `voxx-js/`
- Impact: No structured logging, verbose code
- Fix approach: Implement proper logging utility with levels (info, warn, error)

**No Type Safety:**
- Issue: Plain JavaScript with no TypeScript or JSDoc type annotations
- Impact: No compile-time error catching, harder to refactor safely
- Fix approach: Migrate to TypeScript or add comprehensive JSDoc

**Duplicate Block Editing Logic:**
- Issue: `destroyBlock()` and `placeBlock()` in `main.js` manually regenerate meshes and WebGL buffers
- Files: `voxx-js/src/main.js` (lines 695-803)
- Impact: Code duplication, easy to introduce bugs when editing
- Fix approach: Extract to BlockEditor class with shared mesh update logic

---

## Known Bugs

**Biome Blending Produces Incorrect Heights:**
- Symptoms: Terrain has harsh biome transitions instead of smooth blending
- Files: `voxx-js/chunk.js` (lines 102-118), `voxx-js/chunkCore.js` (lines 37-53)
- Trigger: Any world generation
- Workaround: None - biome blending needs to be rewritten

**Manual Mesh Regeneration After Block Edit:**
- Symptoms: Block edits sometimes don't appear until chunks reload
- Files: `voxx-js/src/main.js` (destroyBlock at line 695, placeBlock at line 726)
- Trigger: Left/right click block editing
- Workaround: Move camera away and back to force chunk refresh

**Stale Worker Requests May Not Clear:**
- Symptoms: Chunks far from player still being generated
- Files: `voxx-js/workerPool.js` (clearStaleRequests at line 196)
- Trigger: Fast camera movement
- Workaround: Wait for chunks to generate then move on

---

## Security Considerations

**External CDN Dependency for Simplex-Noise:**
- Risk: Project depends on external CDN URL for noise generation
- Files: `voxx-js/world.js` (line 7), `voxx-js/biomes.js` (line 1), `voxx-js/chunkWorker.js` (line 1)
- Current mitigation: Using jsdelivr with pinned version
- Recommendations: Bundle simplex-noise locally, verify integrity hash

**Texture Atlas Loaded from Relative Path:**
- Risk: No validation that texture file exists or is valid
- Files: `voxx-js/src/gl/render.js` (loadTextureAtlas at line 526)
- Current mitigation: Error logged on load failure, magenta placeholder shown
- Recommendations: Add startup validation, show user-friendly error

**No Input Sanitization on World Position:**
- Risk: Player position could potentially be manipulated
- Files: `voxx-js/src/main.js` (updateMovement at line 385)
- Current mitigation: Hard-coded MIN_POS/MAX_POS clamping
- Recommendations: Validate deltaTime, add rate limiting

---

## Performance Bottlenecks

**Excessive Shadow Map Resolution:**
- Problem: 4096x4096 shadow map is rendered every frame
- Files: `voxx-js/src/gl/render.js` (line 498), `voxx-js/src/gl/fbo.js` (line 303)
- Cause: High resolution without LOD or adaptive quality
- Improvement path: Add shadow map LOD, reduce resolution on distant shadows

**No Frustum Culling:**
- Problem: All chunks within render distance are rendered regardless of visibility
- Files: `voxx-js/src/gl/render.js` (renderChunks at line 660, comment at line 666)
- Cause: Previous implementation had issues with plane extraction math
- Improvement path: Re-implement frustum culling with proper vector math

**Full Mesh Regeneration on Block Edit:**
- Problem: Every block place/destroy regenerates entire chunk mesh
- Files: `voxx-js/src/main.js` (destroyBlock at line 706, placeBlock at line 751)
- Cause: Simple implementation, no incremental updates
- Improvement path: Partial mesh update for single block changes

**No Level of Detail (LOD) System:**
- Problem: All chunks rendered at same detail regardless of distance
- Impact: Wasted GPU work on distant chunks
- Improvement path: Implement chunk LOD with distance-based mesh simplification

**Memory Growth in Worker Pool:**
- Problem: No limit on pending callbacks, potential memory leak during rapid navigation
- Files: `voxx-js/workerPool.js` (pendingCallbacks Map at line 9)
- Cause: Stale requests cleared but callbacks may accumulate
- Improvement path: Add callback timeout and cleanup

---

## Fragile Areas

**WebGL Context Loss Handling:**
- Files: `voxx-js/src/main.js` (disposeWebGLResources at line 76, initWebGLResources at line 94), `voxx-js/src/gl/context.js`
- Why fragile: Context loss can happen at any time, resources must be disposed and recreated atomically
- Safe modification: Ensure dispose and init are complete, test by unplugging GPU
- Test coverage: None - requires manual GPU testing

**FBO Creation Failures:**
- Files: `voxx-js/src/gl/fbo.js` (createGBufferFBO at line 78, createSSAOBuffer at line 219, createShadowMapFBO at line 303)
- Why fragile: FBO creation can fail silently or throw, leaving system in inconsistent state
- Safe modification: All FBO functions should have fallback paths
- Test coverage: None

**Worker Recreation Logic:**
- Files: `voxx-js/workerPool.js` (recreateWorker at line 39)
- Why fragile: Worker recreation could fail repeatedly, no circuit breaker
- Safe modification: Add retry limit and alert mechanism
- Test coverage: None

**Simplex Noise from CDN:**
- Files: `voxx-js/world.js`, `voxx-js/biomes.js`, `voxx-js/chunkWorker.js`
- Why fragile: CDN could be down, version could change, CORS issues
- Safe modification: Bundle locally, verify hash
- Test coverage: None - seed-based so reproducible if CDN works

---

## Scaling Limits

**World Size Limits:**
- Current capacity: ±10000 blocks in X/Z, 256 blocks in Y
- Limit: Hard-coded in `main.js` (MIN_POS/MAX_POS at line 426)
- Scaling path: Increase bounds, implement chunk persistence

**No World Persistence:**
- Problem: All world state is in-memory, lost on page refresh
- Impact: No save/load functionality
- Scaling path: Implement IndexedDB or server-side persistence

**Render Distance Limits:**
- Current capacity: Configurable 1-32 chunks (set in UI)
- Limit: Hardware-dependent, no automatic scaling
- Scaling path: Add automatic quality adjustment based on FPS

**Worker Pool Size:**
- Current capacity: `navigator.hardwareConcurrency || 4`
- Limit: May be inappropriate for chunk generation vs other tasks
- Scaling path: Allow configuration, adaptive sizing

---

## Dependencies at Risk

**simplex-noise@4.0.3:**
- Risk: External CDN dependency, version pinning relies on trust
- Impact: World generation breaks if CDN unavailable or version changes
- Migration plan: Bundle locally via npm, pin to specific commit hash

**jsdom (dev dependency):**
- Risk: Used for tests, may not reflect real browser behavior
- Impact: Tests passing locally but failing in production
- Migration plan: Add integration tests with headless browser

---

## Missing Critical Features

**Save/Load World:**
- Problem: No persistence, changes lost on refresh
- Blocks: Playing without re-exploring, building without re-constructing

**Block Inventory:**
- Problem: Can only place predefined block types (1-9)
- Blocks: Survival mode, resource management

**Proper Error UI:**
- Problem: WebGL errors logged to console, not shown to user
- Blocks: Users don't know when features fail silently (SSAO, shadows)

**Configuration UI:**
- Problem: Many settings hardcoded in config.js
- Blocks: User preference customization

---

## Test Coverage Gaps

**Untested Core Game Loop:**
- What's not tested: Main render loop, camera movement, input handling
- Files: `voxx-js/src/main.js`
- Risk: Silent regressions in player controls or rendering
- Priority: High

**Untested WebGL Rendering:**
- What's not tested: Shader compilation, FBO creation, texture loading
- Files: `voxx-js/src/gl/render.js`, `voxx-js/src/gl/fbo.js`, `voxx-js/src/gl/buffers.js`
- Risk: Rendering silently fails, user sees blank screen
- Priority: High

**Untested Worker Pool:**
- What's not tested: Task queuing, priority handling, worker recreation
- Files: `voxx-js/workerPool.js`
- Risk: Memory leaks, hung workers, lost tasks
- Priority: Medium

**Untested Block Editing:**
- What's not tested: Block placement, destruction, neighbor updates
- Files: `voxx-js/src/main.js` (destroyBlock, placeBlock, markNeighborChunksForUpdate)
- Risk: Block edits corrupt terrain or crash
- Priority: High

**Test Environment Mismatch:**
- Problem: `vitest.config.js` sets `environment: 'node'` but most code assumes browser
- Files: `voxx-js/vitest.config.js`
- Impact: Tests may not catch browser-specific issues
- Priority: Medium

---

*Concerns audit: 2026-03-21*
