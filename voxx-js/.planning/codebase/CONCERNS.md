# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**Chunk Generation Code Duplication:**
- Issue: `chunk.js` and `chunkCore.js` contain nearly identical terrain generation logic
- Files: `chunk.js` (lines 91-147), `chunkCore.js` (lines 28-79)
- Impact: Maintenance burden, potential for divergent behavior
- Fix approach: Extract terrain generation to shared utility function

**Debug Flag Scattered Throughout:**
- Issue: `DEBUG` flag imported and checked in ~15+ files; debug logs pollute production code
- Files: `config.js`, `world.js`, `greedyMesh.js`, `blocks.js`, `main.js`, `workerPool.js`, `src/gl/render.js`, `src/gl/fbo.js`, `src/gl/performance.js`, `biomes.js`, etc.
- Impact: Debug output floods console; harder to diagnose production issues
- Fix approach: Consolidate debug logging to single module, use proper log levels

**Force-Flat Lowlands Override:**
- Issue: Biome generation has hardcoded override forcing lowlands to be perfectly flat
- Files: `biomes.js` (lines 48-51)
- Code: `if (biome.id === BIOMES.LOWLAND.id) { return biome.baseHeight; }`
- Impact: Lowlands biome always flat regardless of noise config; testing only code in production
- Fix approach: Remove override or gate behind debug/test config

**Duplicate Chunks Constant:**
- Issue: `CHUNK_WIDTH`, `CHUNK_DEPTH`, `CHUNK_HEIGHT` defined in `chunkCore.js` and may be duplicated
- Files: `chunkCore.js`, referenced in `chunk.js`, `world.js`, `greedyMesh.js`, `biomes.js`, `main.js`
- Impact: Potential import mismatches
- Fix approach: Single source of truth in `chunkCore.js`, barrel export

**Commented-Out Code:**
- Issue: Multiple commented-out code blocks remain in codebase
- Files: `config.js` (lines 119-126), `src/gl/render.js` (lines 627, 815-898)
- Impact: Code bloat, confusion about intended behavior
- Fix approach: Remove dead code, keep history in git

## Known Bugs

**No SSAO When Float Textures Unavailable:**
- Symptoms: No ambient occlusion on devices without EXT_color_buffer_float support
- Files: `src/gl/fbo.js` (lines 13-68), `src/gl/render.js` (lines 481-494)
- Trigger: Mobile devices, older GPUs, Safari with limited WebGL2 support
- Workaround: None - silently falls back to no SSAO

**Texture Atlas Not Found Fails Silently:**
- Symptoms: Blocks render with magenta placeholder color
- Files: `src/gl/render.js` (lines 526-558)
- Trigger: Missing `textures-atlas.png` file or network error
- Workaround: Ensure texture file exists and is accessible

**WebGL Context Loss Not Fully Handled:**
- Symptoms: Renderer stops updating after context loss events
- Files: `src/main.js` (lines 869-872), `src/gl/render.js` (dispose/init functions)
- Trigger: Browser tab switching, GPU driver resets
- Workaround: Page refresh required

## Security Considerations

**CDN Dependency Without Integrity Check:**
- Risk: External simplex-noise library loaded from jsdelivr CDN
- Files: `world.js` (line 7), `biomes.js` (line 1)
- Code: `import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js'`
- Current mitigation: None
- Recommendations: 
  - Vendor the library locally
  - Add SRI (Subresource Integrity) hash if continuing CDN use
  - Pin to specific version

**No Input Sanitization:**
- Risk: Player position/input values not validated against extreme values
- Files: `src/main.js` (lines 426-441)
- Current mitigation: Position clamping to -10000 to 10000
- Recommendations: Add more comprehensive bounds checking

**No CSP Headers:**
- Risk: Game served as static files without Content-Security-Policy
- Impact: XSS if user-generated content is ever added
- Recommendations: Add CSP headers to server config

## Performance Bottlenecks

**Greedy Mesh Regeneration on Block Edit:**
- Problem: `destroyBlock()` and `placeBlock()` regenerate entire chunk mesh on each edit
- Files: `src/main.js` (lines 694-803)
- Cause: `chunk.meshData = chunk.generateMeshData()` regenerates full mesh
- Improvement path: Partial mesh update for single-block changes

**No Frustum Culling:**
- Problem: All loaded chunks rendered regardless of camera view
- Files: `src/main.js` (line 667), `src/gl/render.js` (lines 665-679)
- Cause: Frustum code exists but disabled due to "issues with plane extraction math"
- Impact: Unnecessary draw calls for chunks behind camera
- Improvement path: Fix `src/gl/frustum.js` plane extraction or use GPU-based culling

**Web Worker Memory Copy:**
- Problem: Worker returns mesh data as transferable array, but deserialization copies data
- Files: `world.js` (lines 59-66), `chunkWorker.js`
- Impact: Double memory usage during chunk load
- Improvement path: Use transferable objects more aggressively

**No LOD System:**
- Problem: All chunks rendered at full detail regardless of distance
- Impact: Performance degrades with render distance
- Improvement path: Implement level-of-detail mesh generation for distant chunks

**Memory Tracking Incomplete:**
- Problem: `performance.memory` is Chrome-only; memory tracking fails silently elsewhere
- Files: `src/gl/performance.js` (lines 77-86)
- Impact: Can't diagnose memory issues on Firefox/Safari
- Improvement path: Use `performance.measureUserAgentSpecificMemory()` when available

## Fragile Areas

**GLSL Shader Compilation:**
- Files: `src/gl/shaders.js` (lines 1-14)
- Why fragile: Shader errors are opaque, debugging GLSL is difficult
- Safe modification: Test shader changes on multiple browsers/GPU combinations
- Test coverage: None - no automated shader compilation tests

**Matrix Math Implementation:**
- Files: `src/main.js` (lines 188-199, 444-499), `src/gl/render.js` (lines 702-729), `src/gl/frustum.js` (lines 66-123)
- Why fragile: Manual matrix/vector math prone to subtle errors; column-major vs row-major confusion
- Safe modification: Use gl-matrix library instead
- Test coverage: None

**Chunk Mesh Data Synchronization:**
- Files: `src/main.js` (lines 806-843), `world.js` (lines 36-100)
- Why fragile: Race conditions between worker completion, chunk disposal, and WebGL mesh sync
- Symptoms: Chunks disappear momentarily, stale mesh data rendered
- Safe modification: Add state machine for chunk lifecycle

**Texture Atlas Coordinates Hardcoded:**
- Files: `blocks.js` (lines 21-28), `src/gl/buffers.js` (lines 815-836)
- Why fragile: Atlas positions hardcoded; changing atlas requires manual coordinate updates
- Safe modification: Generate atlas metadata from actual atlas image
- Test coverage: None

**Worker Pool Error Recovery:**
- Files: `workerPool.js` (lines 39-68, 131-156)
- Why fragile: Worker recreation on error may fail in loop; no exponential backoff
- Symptoms: Tab becomes unresponsive if workers crash repeatedly
- Safe modification: Add circuit breaker pattern with backoff

**WebGL Resource Cleanup:**
- Files: `chunk.js` (lines 197-217), `world.js` (lines 317-325), `src/main.js` (lines 76-92)
- Why fragile: Context loss handling incomplete; resources may leak on disposal failures
- Safe modification: Track all GL resources in registry, batch cleanup on context loss

## Scaling Limits

**Chunk Count:**
- Current capacity: Limited by renderDistance (max 32 in UI, effectively unlimited in code)
- Limit: Browser memory; each chunk uses ~256KB for voxels + mesh data
- Scaling path: Implement chunk unloading at memory threshold

**Worker Pool:**
- Current capacity: `navigator.hardwareConcurrency || 4` workers
- Limit: Mobile devices with 2-4 cores may struggle
- Scaling path: Add adaptive pool sizing based on device capability

**World Bounds:**
- Current capacity: Position clamped to -10000 to 10000
- Limit: Hardcoded in `src/main.js` (lines 426-441)
- Scaling path: Dynamic world generation, procedural world extension

## Dependencies at Risk

**simplex-noise@4.0.3:**
- Risk: CDN dependency, could become unavailable or change
- Impact: World generation breaks completely
- Migration plan: Vendor locally, use npm package with lockfile

**vitest@1.6.0:**
- Risk: Older version, may have compatibility issues
- Impact: Tests may fail on newer Node.js versions
- Migration plan: Upgrade to latest vitest

**jsdom@29.0.1:**
- Risk: WebGL not supported in jsdom; integration tests limited
- Impact: Can't test WebGL rendering without browser automation
- Migration plan: Use playwright/puppeteer for full integration tests

## Missing Critical Features

**Persistence:**
- Problem: World regenerates on refresh; no save/load
- Blocks: Can't have persistent builds
- Priority: High for user experience

**Multiplayer:**
- Problem: Single-player only; no network sync
- Blocks: Any collaborative features
- Priority: High for long-term viability

**Undo/Redo:**
- Problem: Block edits are permanent
- Blocks: User mistakes require manual correction
- Priority: Medium

**Performance Profiling:**
- Problem: No built-in profiler for chunk generation, mesh, render
- Blocks: Difficult to diagnose performance regressions
- Priority: Medium

## Test Coverage Gaps

**Untested: World Generation:**
- What's not tested: Biome blending, height generation, water placement
- Files: `biomes.js`, `chunk.js`, `chunkCore.js`
- Risk: Changes to noise parameters may break terrain generation
- Priority: High

**Untested: WebGL Rendering:**
- What's not tested: Shader compilation, FBO creation, texture binding
- Files: `src/gl/*.js`, `src/shaders/*.js`
- Risk: Renderer regressions undetected
- Priority: High (requires browser testing framework)

**Untested: Chunk Mesh Sync:**
- What's not tested: Worker completion timing, context loss recovery
- Files: `world.js`, `src/main.js`, `workerPool.js`
- Risk: Race conditions cause visual glitches
- Priority: Medium

**Untested: Matrix Operations:**
- What's not tested: View matrix, projection matrix, frustum extraction
- Files: `src/main.js`, `src/gl/render.js`, `src/gl/frustum.js`
- Risk: Subtle math errors cause visual artifacts
- Priority: Medium

**Untested: Block Editing:**
- What's not tested: destroyBlock/placeBlock boundary conditions
- Files: `src/main.js` (lines 694-803)
- Risk: Block placement outside world bounds, neighbor chunk updates
- Priority: Medium

---

*Concerns audit: 2026-03-21*
