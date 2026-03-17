# Domain Pitfalls: Voxel Engine Development

**Domain:** Browser-based Voxel Engine (JavaScript/WebGL)
**Researched:** 2026-03-16
**Confidence:** HIGH (based on established game dev patterns, community knowledge, and documentation)

## Critical Pitfalls

### Pitfall 1: Naive Chunk Rendering Architecture

**What goes wrong:**
Creating separate VAO/VBO pairs for each chunk causes excessive draw calls and driver overhead. Each chunk requires its own state change, which scales poorly beyond ~100 chunks. At 500+ chunks, frame times degrade exponentially.

**Why it happens:**
Developers start with simple "one chunk = one mesh" architecture because it's conceptually clear and works for prototypes. They don't realize the driver overhead until scale reveals the problem.

**How to avoid:**
- Implement vertex pooling or merged VBO systems early
- Use `glMultiDrawElementsIndirect` or equivalent for batched rendering
- Consider greedy meshing to reduce vertex count before optimizing draw calls
- Benchmark with 500+ chunks during early development

**Warning signs:**
- Frame time increases linearly or worse with chunk count
- GPU profiler shows high "CPU side" time in draw calls
- Moving camera causes frame spikes (new chunks loading triggers state changes)

**Phase to address:** Phase 3 (Rendering Pipeline) - architectural decisions made here are expensive to change later

---

### Pitfall 2: Tunnelling and Poor Collision Response

**What goes wrong:**
Players fall through terrain when moving fast, get stuck inside blocks, or slide uncontrollably. Physics feels "wrong" because collision response doesn't properly handle voxel geometry.

**Why it happens:**
Mesh colliders have no thickness - objects can rest inside them without depenetration force. Developers use simple AABB checks without proper slide vectors or collision normals.

**How to avoid:**
- Implement continuous collision detection (CCD) or raycast trails for fast objects
- Use proper collision response: calculate slide vector along collision plane
- Limit player velocity to reasonable values
- Test collision at extreme speeds intentionally

**Warning signs:**
- Players occasionally fall through floor when jumping
- Objects oscillate when resting on terrain
- Fast movement causes clipping

**Phase to address:** Phase 4 (Physics & Collision) - core physics architecture

---

### Pitfall 3: Blocking Main Thread with Mesh/Collider Generation

**What goes wrong:**
Game freezes for 50-200ms when loading new chunks because mesh generation and collider creation run on main thread. Users perceive this as "lag" or "stuttering."

**Why it happens:**
Collider creation from mesh is 3-5x more expensive than meshing itself (creates BVH acceleration structure). JavaScript's single-threaded nature makes this worse. Developers defer to main thread because "threading is hard."

**How to avoid:**
- Offload mesh generation to Web Workers
- Use worker pool pattern with task queuing
- Stream chunk loading (load distant chunks first, process gradually)
- Implement LOD to reduce geometry complexity at distance
- Budget main thread time per frame (e.g., max 4ms for voxel tasks)

**Warning signs:**
- Frame drops when walking into new area
- Browser "unresponsive" warnings
- Chunk loading causes visible freeze

**Phase to address:** Phase 3 (Rendering) & Phase 5 (Persistence) - threading architecture

---

### Pitfall 4: Duplicate Data Structures and State Management

**What goes wrong:**
Having both `World` and `ChunkManager` with overlapping responsibilities leads to synchronization bugs, inconsistent state, and difficulty maintaining code. Changes in one structure don't propagate to the other.

**Why it happens:**
Incremental development without refactoring. Different features added by different people (or at different times) create parallel structures. "It works" mentality prevents consolidation.

**How to avoid:**
- Establish single source of truth for voxel data
- Use observer pattern for state changes
- Define clear responsibility boundaries early
- Refactor duplicates immediately when spotted

**Warning signs:**
- Same data exists in multiple objects
- Changes require updating multiple places
- Bugs where structures disagree

**Phase to address:** Phase 1 (Foundation) - technical debt addressed first per project decision

---

### Pitfall 5: Non-Deterministic World Generation

**What goes wrong:**
World generates differently each load because RNG isn't seeded. Player loses their base, terrain changes unpredictably. Debugging becomes impossible because you can't reproduce issues.

**Why it happens:**
Using `Math.random()` without seeding. Not considering that procedural generation must be reproducible for persistence to work.

**How to avoid:**
- Use seeded PRNG (e.g., seeded Perlin/Simplex noise)
- Store world seed in save data
- Test by loading same seed twice - must be identical
- Document seed format for save compatibility

**Warning signs:**
- World changes between sessions
- Can't reproduce terrain generation bugs
- Structures appear/disappear randomly

**Phase to address:** Phase 1 (Foundation) - affects all subsequent features

---

### Pitfall 6: Memory Leaks from WebGL Resources

**What goes wrong:**
Browser tab memory grows continuously until crash. WebGL buffers, textures, and shader programs aren't properly deleted when chunks unload.

**Why it happens:**
JavaScript garbage collection doesn't automatically clean up WebGL resources. Developers create buffers but forget `gl.deleteBuffer()`. Event listeners accumulate.

**How to avoid:**
- Implement explicit cleanup for all WebGL objects
- Use `FinalizationRegistry` or disposal pattern
- Remove event listeners on chunk unload
- Monitor memory usage with browser devtools during testing
- Implement object pooling for frequently created/destroyed objects

**Warning signs:**
- Memory grows monotonically
- "Out of memory" crashes after extended play
- Performance degrades over time

**Phase to address:** Phase 3 (Rendering) - resource management patterns

---

### Pitfall 7: Slow Persistence with Naive Serialization

**What goes wrong:**
Saving world takes 10+ seconds because entire world is serialized to JSON. Loading triggers garbage collection pauses. IndexedDB transactions block main thread.

**Why it happens:**
Using JSON.stringify on large nested objects. Not chunking save data. Writing everything synchronously.

**How to avoid:**
- Save only changed chunks (dirty tracking)
- Use binary formats (ArrayBuffer) instead of JSON
- Implement incremental saves (spread over frames)
- Use IndexedDB with proper indexing
- Compress data (simple RLE for voxel data)

**Warning signs:**
- "Save" causes visible freeze
- Save file size > 10MB for small world
- Loading takes > 5 seconds

**Phase to address:** Phase 5 (Persistence) - design decisions affect performance

---

### Pitfall 8: Incomplete Block Interaction System

**What goes wrong:**
Block placement fails silently, blocks place in invalid locations, or inventory doesn't sync with world state. Raycast for block selection misses or hits wrong block.

**Why it happens:**
Not validating voxel coordinates, missing boundary checks, not handling edge cases (placing at chunk boundaries), raycast precision issues.

**How to avoid:**
- Validate all voxel coordinates before access
- Handle chunk boundary cases explicitly
- Implement proper AABB vs voxel raycasting
- Test placement at world edges and chunk seams
- Add visual feedback for placement preview

**Warning signs:**
- Blocks place inside player
- Placement fails at chunk edges
- Inventory count desyncs from world

**Phase to address:** Phase 4 (Block Interaction) - validation patterns

---

### Pitfall 9: Diagonal Movement Physics Bug

**What goes wrong:**
Player moves faster diagonally because velocity vector isn't normalized. Moving forward+right = 1.414x normal speed instead of 1.0x.

**Why it happens:**
Simple velocity addition without normalization. Common in first-time physics implementations.

**How to avoid:**
- Normalize movement vector before applying speed
- Or use separate horizontal/vertical velocity components
- Test movement speed in all 8 directions
- Add unit tests for movement normalization

**Warning signs:**
- Player moves faster when strafing
- Speed varies with input combination
- Physics feels "off" but hard to pinpoint

**Phase to address:** Phase 4 (Physics) - fundamental movement code

---

### Pitfall 10: Event Listener Memory Leaks

**What goes wrong:**
Keyboard/mouse handlers accumulate, causing double-fires or memory growth. Chunk-specific listeners don't get removed on unload.

**Why it happens:**
Adding listeners with anonymous functions (can't remove). Not tracking listener references. Assuming browser cleanup.

**How to avoid:**
- Store function references for removal
- Use AbortController for signal-based cleanup
- Remove listeners in chunk disposal
- WeakMap for weakly-held chunk data

**Warning signs:**
- Same event fires multiple times
- Memory grows with chunk load/unload cycles
- "Too many event listeners" warnings

**Phase to address:** Phase 1 (Foundation) - event system architecture

---

## Moderate Pitfalls

### Pitfall 11: Hardcoded Constants Throughout Codebase

**What goes wrong:**
CHUNK_SIZE, GRAVITY, PLAYER_SPEED defined in multiple files. Changing requires find-replace with high error risk.

**How to avoid:**
- Centralize constants in config module
- Export from single source
- Document purpose of each constant

**Phase to address:** Phase 1 (Foundation)

---

### Pitfall 12: Missing Error Handling in Async Operations

**What goes wrong:**
Chunk loading fails silently, shader compilation errors ignored, IndexedDB errors swallowed. User sees nothing happen.

**How to avoid:**
- Add try/catch with logging
- Implement error boundaries
- Provide user feedback for failures

**Phase to address:** Phase 1 (Foundation)

---

### Pitfall 13: No Frustum Culling

**What goes wrong:**
Rendering chunks behind camera wastes GPU cycles. View distance illusion of "more performance" while actually rendering unnecessary geometry.

**How to avoid:**
- Implement camera frustum test per chunk
- Don't submit draw calls for out-of-view chunks
- Simple bounding sphere test is sufficient

**Phase to address:** Phase 3 (Rendering)

---

### Pitfall 14: Synchronous World Generation

**What goes wrong:**
Generating chunk data blocks main thread for 10-50ms per chunk. New area loading causes stutter.

**How to avoid:**
- Generate in Web Workers
- Use noise libraries that support async
- Generate distant chunks ahead of time

**Phase to address:** Phase 2 (World Generation)

---

### Pitfall 15: No Chunk Loading Throttle

**What goes wrong:**
Moving fast triggers 20+ chunk generations simultaneously, causing massive frame drops and memory spike.

**How to avoid:**
- Limit concurrent chunk loads (e.g., 2-4 per frame)
- Queue requests by distance to player
- Prioritize visible chunks

**Phase to address:** Phase 3 (Rendering)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Per-chunk VAO/VBO | Simple to implement | Doesn't scale past 100 chunks | Never - refactor early |
| JSON for saves | Easy to debug | Slow, large files | Prototyping only |
| Global variables | Quick access | Tight coupling, testing hard | Never |
| Inline math (no normalize) | Less code | Physics bugs | Never |
| Anonymous event handlers | Less boilerplate | Can't remove, leaks | Never |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Single chunk = single draw call | FPS drops with chunk count | Vertex pooling, merged VBOs | ~200 chunks |
| Main thread mesh generation | Stutter on chunk load | Web Workers | Any chunk load |
| No object pooling | GC pauses | Pool reusable objects | 1000+ entities |
| Full world JSON serialization | 10+ second saves | Incremental binary saves | 100x100 world |
| Unnormalized movement vectors | Faster diagonal movement | Normalize input vectors | Any movement |

---

## "Looks Done But Isn't" Checklist

- [ ] **Chunk Loading:** Works at origin, but fails at negative coordinates or world edges
- [ ] **Collision:** Works standing still, but tunnelling occurs at high speed
- [ ] **Persistence:** Save works, but load doesn't validate data format
- [ ] **Block Placement:** Works in open area, but fails at chunk boundaries
- [ ] **Inventory:** Shows correct items, but doesn't sync with actual world state
- [ ] **Rendering:** Looks correct, but memory leaks over 30 minutes
- [ ] **Movement:** Feels right, but diagonal is 41% faster

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate data structures | Phase 1 (Foundation) | Audit: no overlapping state |
| Non-deterministic generation | Phase 1 (Foundation) | Test: same seed = same world |
| Event listener leaks | Phase 1 (Foundation) | Test: memory stable after 1000 chunk loads |
| Naive chunk rendering | Phase 3 (Rendering) | Benchmark: 500 chunks at 60 FPS |
| Blocking main thread | Phase 3 (Rendering) | Profile: <4ms per frame for voxel tasks |
| Tunnelling physics | Phase 4 (Physics) | Test: sprint+jump doesn't clip |
| Diagonal movement | Phase 4 (Physics) | Test: all 8 directions = same speed |
| Block placement edge cases | Phase 4 (Block Interaction) | Test: place at all chunk boundaries |
| Slow persistence | Phase 5 (Persistence) | Benchmark: save <100ms, load <500ms |
| Memory leaks | Phase 3 (Rendering) | Monitor: stable memory after 30min |

---

## Sources

- Nick's Blog: "High Performance Voxel Engine: Vertex Pooling" - performance pitfalls with naive rendering
- Voxel Tools Documentation (Godot) - collision tunnelling, mesh collider performance, threading issues
- Reddit r/VoxelGameDev - community discussions on hardest parts of voxel engines
- DeepWiki: voxel-engine physics system - collision detection patterns
- WebFetch search results on voxel engine performance and pitfalls

---
*Pitfalls research for: Browser-based Voxel Engine*
*Researched: 2026-03-16*