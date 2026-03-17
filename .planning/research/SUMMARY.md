# Project Research Summary

**Project:** Voxx-js Voxel Engine
**Domain:** Browser-based 3D Voxel Engine (Minecraft-like)
**Researched:** 2026-03-16
**Confidence:** MEDIUM-HIGH

## Executive Summary

Voxx-js is a browser-based voxel engine that requires careful architectural decisions to balance performance, user experience, and browser constraints. The research reveals that successful voxel engines follow a chunk-based streaming architecture with clear separation between world management, rendering, physics, and persistence layers. Experts recommend Three.js for rendering (with fallback to custom WebGL), Cannon-es for physics, and IndexedDB via Dexie for persistence—all well-established libraries with active communities.

The recommended approach prioritizes foundational architecture in early phases: establishing deterministic seeded generation, clean component boundaries, and event-driven communication between systems. The codebase already has chunk-based loading implemented, but needs refactoring to eliminate duplicate data structures and establish a single source of truth for voxel data. Performance-critical patterns like vertex pooling and greedy meshing should be planned early, even if deferred to later implementation.

Key risks center on performance pitfalls that are expensive to fix retrospectively: naive chunk rendering causing excessive draw calls (scales poorly beyond ~100 chunks), main-thread blocking during mesh/collider generation (causes stutter), and memory leaks from improper WebGL resource cleanup. Physics tunnelling and non-deterministic generation are also critical failures that undermine user trust. Mitigation strategies include benchmarking with 500+ chunks early, implementing Web Workers for mesh generation, and using seeded PRNG for all procedural content.

## Key Findings

### Recommended Stack

The stack research identifies a pragmatic, proven technology set for browser-based voxel engines. Three.js provides the rendering foundation with WebGL2 support and a massive ecosystem. Cannon-es offers lightweight physics suitable for AABB-based voxel collisions. Simplex-noise handles deterministic terrain generation, while Dexie wraps IndexedDB for world persistence.

**Core technologies:**
- **Three.js (0.183.2)**: 3D rendering and scene management — industry standard with WebGL2, used by successful voxel engines like Blockerzz
- **Cannon-es (0.20.0)**: Collision detection and physics — maintained fork of Cannon.js, supports AABB suitable for voxel worlds
- **Simplex-noise (4.0.3)**: Procedural terrain generation — fast, deterministic, works in browser and Node
- **Dexie (4.3.0)**: IndexedDB persistence — minimal wrapper, battle-tested, simplifies async storage
- **Vanilla HTML/CSS**: UI overlays — no framework lock-in, keeps bundle small

**Supporting options:** voxel-physics-engine (if turnkey voxel physics needed), fast-voxel-raycast (if custom raycast insufficient), Vite (recommended dev server but optional).

### Expected Features

Features are organized by user expectations and complexity. The MVP should focus on core interaction loop: terrain generation, collision, and block manipulation. Visual differentiators like ambient occlusion can follow once the foundation is stable.

**Must have (table stakes):**
- **Seeded terrain generation** — deterministic worlds, enables persistence (already partially implemented but needs seeded RNG)
- **Collision detection** — prevents walking through blocks, enables realistic movement
- **Block placement & removal** — core interaction requiring raycasting, world mutation, mesh updates
- **World persistence** — save/load locally via IndexedDB (stubbed in codebase)
- **Inventory system** — select blocks to place, simple 9-slot hotbar
- **Chunk-based loading** — infinite world illusion (already implemented, needs throttling)

**Should have (differentiators):**
- **Ambient occlusion shading** — visual depth without complex lighting (use ao-mesher or shader)
- **WebGL 2.0 with fallback** — better performance, modern features (already planned)
- **Real-time shadows** — immersive lighting, high complexity, optional for v1

**Defer (v2+):**
- **Multiplayer** — shared worlds, very high complexity, out of scope for v1
- **Complex cave systems** — adds generation complexity, basic height-map terrain sufficient
- **Mobile touch controls** — desktop-first focus
- **Sound effects** — visual-only experience
- **Modding/plugin system** — fixed feature set for v1

### Architecture Approach

The architecture follows a layered design with clear separation of concerns: Game Layer (player, input, UI, game logic), Core Engine (world management, chunks, generation), Systems Layer (physics, rendering, events), and Data Layer (storage, assets, config). This modular approach enables independent development and testing of subsystems.

**Major components:**
1. **World Management** — Chunk-based storage, coordinate transformations, streaming based on player position
2. **Rendering Pipeline** — Voxel-to-mesh conversion (greedy/culled meshing), WebGL rendering, material system
3. **Physics & Collision** — AABB collision detection, raycasting, player movement, gravity
4. **Event System** — Decouples components via pub/sub (setBlock, chunkLoaded, tick events)
5. **Persistence** — Async save/load to IndexedDB with dirty tracking and binary serialization

**Recommended project structure:** src/core/, src/chunks/, src/player/, src/world/, src/input/, src/rendering/, src/ui/, src/utils/ — each directory encapsulating a specific concern with clear interfaces.

### Critical Pitfalls

The pitfalls research identifies 10 critical and 5 moderate pitfalls, each mapped to specific development phases. The most expensive mistakes are architectural decisions made early that are difficult to change later.

1. **Naive Chunk Rendering Architecture** — Separate VAO/VBO per chunk causes excessive draw calls; scales poorly beyond ~100 chunks. Avoid with vertex pooling and merged VBOs early. Phase: Rendering (3).

2. **Tunnelling and Poor Collision Response** — Players fall through terrain at high speed; mesh colliders lack thickness. Avoid with continuous collision detection and proper slide vectors. Phase: Physics (4).

3. **Blocking Main Thread with Mesh Generation** — 50-200ms freezes when loading chunks; collider creation 3-5x more expensive than meshing. Avoid with Web Workers and task queuing. Phase: Rendering (3).

4. **Non-Deterministic World Generation** — World changes each load if RNG not seeded; debugging becomes impossible. Avoid with seeded PRNG and storing seed in save data. Phase: Foundation (1).

5. **Memory Leaks from WebGL Resources** — Browser tab grows until crash; buffers/textures not deleted on chunk unload. Avoid with explicit cleanup and FinalizationRegistry. Phase: Rendering (3).

**Additional critical pitfalls:** Duplicate data structures (Phase 1), slow persistence with naive serialization (Phase 5), incomplete block interaction (Phase 4), diagonal movement physics bug (Phase 4), event listener memory leaks (Phase 1).

## Implications for Roadmap

Based on combined research, the following phased approach balances dependency order, risk mitigation, and incremental value delivery:

### Phase 1: Foundation & Architecture
**Rationale:** Research shows architectural decisions are expensive to change. Duplicate data structures, non-deterministic generation, and event system flaws become deeply embedded technical debt. Foundation must be clean before building features on top.

**Delivers:**
- Clean component architecture with single source of truth for voxel data
- Event-driven communication system (EventEmitter pattern)
- Centralized constants and configuration
- Seeded RNG integrated into generation pipeline
- Error handling patterns for async operations

**Addresses:**
- Seeded terrain generation (deterministic)
- World persistence (save/load stubs with IndexedDB)

**Avoids Pitfalls:**
- Duplicate data structures (#4)
- Non-deterministic generation (#5)
- Event listener leaks (#10)
- Hardcoded constants (#11)
- Missing error handling (#12)

### Phase 2: Core Rendering
**Rationale:** Visual feedback is essential for development velocity. Rendering must work before physics or block interaction can be meaningfully tested. Architecture from Phase 1 enables clean rendering pipeline.

**Delivers:**
- WebGL2 rendering with fallback
- Basic chunk meshing (culled meshing)
- Texture atlas and material system
- Frustum culling for performance
- Chunk loading throttle

**Uses:** Three.js for scene management and rendering.

**Implements:** Rendering Pipeline, Asset Manager components.

**Avoids Pitfalls:**
- Naive chunk rendering (#1) — implement vertex pooling from start
- No frustum culling (#13)
- No chunk loading throttle (#15)

**Research Flag:** Greedy meshing optimization may need deeper research during implementation.

### Phase 3: Player & Physics
**Rationale:** With rendering providing visual feedback, player movement and collision can be developed and tested. Physics interacts heavily with world data (Phase 1) and rendering (Phase 2).

**Delivers:**
- First-person camera with pointer lock
- Keyboard/mouse input system
- AABB collision detection against voxels
- Gravity and player movement
- Proper collision response (slide vectors)

**Uses:** Cannon-es for physics, or custom AABB implementation.

**Implements:** Player Control, Physics & Collision, Input System components.

**Avoids Pitfalls:**
- Tunnelling and poor collision response (#2)
- Diagonal movement physics bug (#9)
- Synchronous world generation (#14) — ensure chunk generation offloaded

**Research Flag:** Continuous collision detection for fast movement may need investigation.

### Phase 4: World Generation & Interaction
**Rationale:** Now that player can move in the world, terrain generation provides content and block interaction enables the core gameplay loop. These depend on stable foundation (Phase 1), rendering (Phase 2), and player controls (Phase 3).

**Delivers:**
- Procedural terrain using simplex-noise
- Heightmap-based generation with biome variation
- Block placement via raycasting
- Block removal
- Inventory/hotbar system

**Uses:** Simplex-noise for terrain, Three.js raycaster.

**Implements:** World Generator, Inventory & Interaction components.

**Avoids Pitfalls:**
- Incomplete block interaction (#8) — validate coordinates, handle chunk boundaries
- Block placement edge cases

**Research Flag:** Raycast precision at chunk boundaries needs careful implementation.

### Phase 5: Persistence & Polish
**Rationale:** With core gameplay loop working, persistence enables users to keep their worlds. This phase defers until after block interaction is stable to avoid premature optimization.

**Delivers:**
- Chunk dirty tracking
- Binary serialization (not JSON)
- Incremental saves (spread over frames)
- Load validation
- Ambient occlusion shading (optional differentiator)
- UI/HUD refinements

**Uses:** Dexie for IndexedDB operations.

**Implements:** Persistence, advanced rendering features, UI components.

**Avoids Pitfalls:**
- Slow persistence with naive serialization (#7)
- Memory leaks from WebGL resources (#6) — implement cleanup patterns

### Phase Ordering Rationale

- **Foundation first:** Architecture decisions (Phase 1) are expensive to change; duplicate structures and non-deterministic generation become deeply embedded
- **Rendering early:** Visual feedback accelerates development of all subsequent features; enables testing of physics and interaction
- **Physics before generation:** Player movement in a static world is simpler to debug; adding procedural content increases complexity
- **Interaction before persistence:** Core gameplay loop must work before adding save/load complexity
- **Polish last:** Visual differentiators (AO, shadows) and persistence optimization are lower priority than functional core

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Rendering):** Greedy meshing algorithm implementation, vertex pooling strategy, shader optimization
- **Phase 3 (Physics):** Continuous collision detection for fast movement, collision response tuning
- **Phase 5 (Persistence):** Binary serialization format design, compression strategy for voxel data

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Well-documented EventEmitter pattern, configuration management
- **Phase 4 (World Generation):** Simplex-noise API is straightforward, raycasting is standard Three.js

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Three.js, Cannon-es, Dexie versions verified via npm; voxel-physics-engine confidence low (2022 update) |
| Features | HIGH | Based on established voxel game expectations (Minecraft, Minetest) and existing codebase analysis |
| Architecture | HIGH | Based on multiple authoritative sources (DeepWiki, existing engines), clear patterns emerge |
| Pitfalls | HIGH | Based on established game dev patterns, community knowledge, and performance documentation |

**Overall confidence:** MEDIUM-HIGH

Stack confidence is MEDIUM because Three.js version 0.183.2 couldn't be independently verified (npm shows latest). Architecture and pitfalls are HIGH confidence due to multiple corroborating sources and established patterns in voxel engine development.

### Gaps to Address

- **Three.js version verification:** Confirm 0.183.2 is current; if not, identify latest stable version during Phase 2 planning
- **Greedy meshing implementation details:** Research specific algorithm variants (ao-mesher vs custom) during Phase 2
- **Web Workers integration pattern:** Design worker pool architecture for mesh generation during Phase 2/3
- **Binary serialization format:** Design efficient chunk serialization format during Phase 5 planning
- **Performance benchmarks:** Establish baseline metrics (target: 500 chunks at 60 FPS) before Phase 2 completion

## Sources

### Primary (HIGH confidence)
- [Cannon-es npm](https://www.npmjs.com/package/cannon-es) — version 0.20.0, maintained physics library
- [Simplex-noise npm](https://www.npmjs.com/package/simplex-noise) — version 4.0.3, deterministic noise
- [Dexie npm](https://www.npmjs.com/package/dexie) — version 4.3.0, IndexedDB wrapper
- [max-mapper/voxel-engine DeepWiki](https://deepwiki.com/max-mapper/voxel-engine/) — core architecture, subsystems
- [Nick's Blog: High Performance Voxel Engine](https://nickthecook.wordpress.com/) — vertex pooling, performance pitfalls

### Secondary (MEDIUM confidence)
- [Three.js npm](https://www.npmjs.com/package/three) — version 0.183.2, rendering library
- [noa-engine GitHub](https://github.com/fenomas/noa) — successful voxel engine using Babylon.js
- [Blockerzz blog](https://blog.quizalize.com/2026/02/12/building-the-worlds-most-advanced-3d-voxel-engine-for-the-browser) — Three.js voxel engine
- [Voxel Tools Documentation (Godot)](https://docs.godotengine.org/) — collision patterns, threading issues
- [Reddit r/VoxelGameDev](https://www.reddit.com/r/VoxelGameDev/) — community discussions on hardest parts

### Tertiary (LOW confidence)
- [voxel-physics-engine npm](https://www.npmjs.com/package/voxel-physics-engine) — version 0.13.0, last updated 2022, needs validation
- [Let's Make a Voxel Engine](https://sites.google.com/site/letsmakeavoxelengine/) — step-by-step tutorial, may be outdated

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
