# Codebase Concerns

**Analysis Date:** 2026-03-16

## Tech Debt

**Duplicate World Data Structures:**
- Issue: World class (`src/core/world.js`) maintains its own chunk storage (`this.chunks = new Map()`), while ChunkManager (`src/chunks/chunk-manager.js`) also maintains separate chunk storage
- Files: `src/core/world.js`, `src/chunks/chunk-manager.js`
- Impact: Memory duplication, inconsistent state, potential synchronization issues
- Fix approach: Consolidate chunk management into ChunkManager only, have World delegate to it

**Hardcoded Constants Repeated Across Files:**
- Issue: Chunk size (32) is hardcoded in multiple locations without a shared constant
- Files: `src/core/world.js` (line 8), `src/chunks/chunk.js` (line 12, 66), `src/chunks/chunk-manager.js` (line 9)
- Impact: Changing chunk size requires updates in 5+ places, risk of inconsistency
- Fix approach: Create a shared constants module (e.g., `src/core/constants.js`) with `CHUNK_SIZE = 32`

**Async Module Loading Without Error Handling:**
- Issue: Engine imports modules asynchronously in `initSystems()` but doesn't handle loading failures or ensure systems are initialized before use
- Files: `src/core/engine.js` (lines 57-67)
- Impact: Systems may be undefined when render loop starts, causing runtime errors
- Fix approach: Use dynamic import with proper error handling and wait for initialization

**Stub Implementations:**
- Issue: Multiple methods are stubbed out with console.log only
- Files: `src/core/world.js` (`loadWorld()` line 178, `saveWorld()` line 186, `update()` line 166)
- Impact: False sense of functionality, persistence not actually implemented
- Fix approach: Implement IndexedDB storage as outlined in plan

## Known Bugs

**Non-Deterministic World Generation:**
- Symptoms: World terrain changes on every page load
- Files: `src/core/world.js` (line 100: `Math.random() * 2`)
- Trigger: Any world generation
- Workaround: None - terrain is different each time

**Movement Physics Issues:**
- Symptoms: Player movement doesn't properly handle diagonal movement normalization
- Files: `src/player/player.js` (lines 166-189)
- Trigger: Moving forward+left or forward+right simultaneously
- Workaround: None - diagonal movement is faster than straight movement

**Missing Collision Detection:**
- Symptoms: Player can walk through blocks, fall through floor
- Files: `src/player/player.js`
- Trigger: Any movement near solid blocks
- Workaround: None - not implemented (noted in tasks-qwen.md line 20)

## Security Considerations

**No Input Validation:**
- Risk: Voxel coordinates from external sources could cause array index out of bounds
- Files: `src/chunks/chunk.js` (`setVoxel()` line 47), `src/core/world.js` (`getVoxel()` line 124)
- Current mitigation: Basic bounds checking exists in Chunk class
- Recommendations: Add validation at World level, sanitize all coordinate inputs

**Memory Leak - Event Listeners:**
- Risk: Player class adds event listeners but never removes them
- Files: `src/player/player.js` (lines 48-65)
- Current mitigation: None
- Recommendations: Add cleanup method to remove listeners when player is destroyed

**Console Logging in Production:**
- Risk: Debug information exposed to users
- Files: All major classes (`renderer.js`, `world.js`, `player.js`, `engine.js`, `chunk.js`)
- Current mitigation: None
- Recommendations: Implement logging levels, disable debug logs in production

## Performance Bottlenecks

**Chunk Loading on Every Update:**
- Problem: `ChunkManager.update()` loads/unloads chunks every frame without throttling
- Files: `src/chunks/chunk-manager.js` (lines 99-105)
- Cause: No distance threshold or time-based throttling
- Improvement path: Add hysteresis to chunk loading, throttle to once per second

**Large Static Geometry Data:**
- Problem: Renderer creates large vertex arrays on initialization
- Files: `src/core/renderer.js` (lines 137-281)
- Cause: Hardcoded cube geometry with texture coords and normals
- Improvement path: Generate meshes dynamically, use instanced rendering

**No Frustum Culling:**
- Problem: All chunks render regardless of camera view
- Files: `src/core/renderer.js`
- Cause: Simple rendering loop without visibility checks
- Improvement path: Implement frustum culling per chunk

**Unbounded Memory Growth:**
- Problem: Chunks accumulate in memory without proper cleanup
- Files: `src/chunks/chunk-manager.js`, `src/core/world.js`
- Cause: No chunk pooling or memory limits
- Improvement path: Implement chunk object pooling, LRU eviction

## Fragile Areas

**WebGL Context Handling:**
- Files: `src/core/engine.js` (lines 28-50)
- Why fragile: No recovery if WebGL context is lost
- Safe modification: Add context loss/restore event handlers
- Test coverage: None

**Async System Initialization:**
- Files: `src/core/engine.js` (lines 55-68)
- Why fragile: Race conditions between system initialization and render loop start
- Safe modification: Use Promise.all() to wait for all systems
- Test coverage: None

**Shader Compilation:**
- Files: `src/core/renderer.js` (lines 36-111)
- Why fragile: No fallback if shader compilation fails
- Safe modification: Add shader validation and fallback shaders
- Test coverage: None

## Scaling Limits

**Chunk Storage:**
- Current capacity: ~1,000 chunks (estimated memory limit)
- Limit: Chrome tab memory limits (~2GB)
- Scaling path: Implement chunk streaming, reduce chunk size, add LOD

**Rendering Performance:**
- Current capacity: ~60 FPS with small view distance
- Limit: GPU fill rate and vertex processing
- Scaling path: Implement frustum culling, occlusion culling, chunk meshing

## Dependencies at Risk

**No Package Management:**
- Risk: No dependency tracking or version pinning
- Impact: Difficult to reproduce builds, no security updates
- Migration plan: Add package.json with any required dependencies

**WebGL 1.0 Only:**
- Risk: Deprecated API, limited features
- Impact: Missing modern WebGL 2.0 features (compute shaders, etc.)
- Migration plan: Upgrade to WebGL 2.0 with WebGL 1.0 fallback

## Missing Critical Features

**Block Interaction System:**
- Problem: Cannot place or remove blocks
- Blocks: Complete gameplay - world modification is core feature
- Priority: High

**Collision Detection:**
- Problem: Player walks through blocks
- Blocks: Playability - game is unplayable without physics
- Priority: High

**Persistence/Save System:**
- Problem: World lost on page refresh
- Blocks: Long-term play, world building
- Priority: Medium

**Inventory System:**
- Problem: No way to select different block types
- Blocks: Creative mode gameplay
- Priority: Medium

## Test Coverage Gaps

**Entire Codebase:**
- What's not tested: All functionality
- Files: `src/**/*.js`
- Risk: Refactoring could break functionality without detection
- Priority: High

**Specifically Missing:**
- World generation determinism
- Chunk coordinate calculations
- Player physics calculations
- Renderer matrix math
- Event handling

---

*Concerns audit: 2026-03-16*
