# voxx-js

## What This Is

A WebGL2 voxel rendering engine in JavaScript that enables infinite procedural voxel world generation with first-person navigation, block placement/destruction, and real-time rendering with advanced graphics features (SSAO, deferred rendering, day/night cycle).

## Core Value

High-performance browser-based voxel world rendering with smooth frame rates and rich visual features.

## Requirements

### Validated (v1.0 — shipped 2026-04-01)

**Existing features:**
- ✓ WebGL2 rendering pipeline with GBuffer deferred rendering
- ✓ Procedural terrain generation using simplex noise
- ✓ First-person camera controls (WASD + mouse look)
- ✓ Block placement and destruction via raycasting
- ✓ Chunk-based world management with 16x16x16 chunks
- ✓ Worker-based chunk mesh generation
- ✓ Biome-based terrain (plains, desert, mountains, snow)
- ✓ Day/night cycle with sun movement
- ✓ SSAO and post-processing effects
- ✓ Debug modes (wireframe, chunk boundaries)

**v1.0 improvements:**
- ✓ GL-01: Memory leak prevention via resource registry lifecycle management — v1.0
- ✓ GL-02: Context loss detection and auto-recovery without page reload — v1.0
- ✓ GL-03: FPS monitoring with warning threshold at 50fps — v1.0
- ✓ WRK-01: Graceful worker termination waiting for in-progress jobs — v1.0
- ✓ WRK-02: Chunk mesh state machine preventing race conditions — v1.0
- ✓ PERF-01: Instanced rendering with shader-based transforms — v1.0
- ✓ PERF-02: Grid-based visibility culling with spatial index — v1.0
- ✓ PERF-03: Neighbor calculation caching with dirty flags — v1.0

### Active (v2.0 — planned)

- [ ] UX-01: Add resource loading progress indicator during world generation
- [ ] UX-02: Add graphics quality settings (render distance, SSAO toggle)
- [ ] QUAL-01: Encapsulate global state in modules
- [ ] QUAL-02: Implement centralized WebGL resource manager
- [ ] DEPS-01: Self-host simplex-noise dependency

### Out of Scope

- Multiplayer/network play — requires significant infrastructure
- Save/load world persistence — defer to future
- Physics simulation (falling blocks, collisions) — defer to future
- Mob/NPC entities — defer to future
- Audio system — defer to future

## Context

**v1.0 Shipped (2026-04-01):**
- 3 phases completed, 9 plans executed
- Fixed critical WebGL memory leaks and context loss handling
- Resolved worker termination race conditions and mesh synchronization
- Implemented instanced rendering for significant performance gains
- Grid-based visibility culling reduces CPU overhead
- Neighbor caching eliminates redundant calculations

**Technical Environment:**
- Vanilla JavaScript (ES2020) with WebGL2
- No build step - direct ES module serving
- simplex-noise for procedural generation
- Vitest for testing

**Codebase State:**
- Modular layered architecture (Presentation/Game Logic/Interaction/Application)
- WebGL resource lifecycle management via context registry
- Worker pool with graceful termination and job tracking
- Instanced rendering with shader-based matrix transforms

**Known Issues (v2.0 scope):**
- No loading progress indicator during world generation
- No UI for graphics quality settings
- Global state pollution in main.js and render.js
- simplex-noise loaded from CDN (dependency risk)

## Constraints

- **Tech Stack**: Vanilla JavaScript + WebGL2 — no framework changes
- **Browser-only**: No server-side components
- **Performance**: Maintain 60fps on mid-range hardware with default settings

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS (no framework) | Keep dependencies minimal, direct WebGL access | ✓ Good - aligns with core value |
| Worker-based mesh generation | Prevent frame drops during chunk creation | ✓ Fixed - graceful termination + state machine |
| CDN for simplex-noise | Quick setup | ⚠️ Revisit - should self-host (v2.0) |
| Resource registry pattern | Unified WebGL resource lifecycle | ✓ Good - eliminates memory leaks |
| Instanced rendering | Reduce draw calls for chunk-heavy scenes | ✓ Good - significant perf improvement |
| Grid-based visibility culling | O(1) chunk lookup vs scanning all chunks | ✓ Good - bounded iteration time |

---

*Last updated: 2026-04-01 after v1.0 milestone completion*
