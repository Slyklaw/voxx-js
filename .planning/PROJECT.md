# voxx-js

## What This Is

A WebGL2 voxel rendering engine in JavaScript that enables infinite procedural voxel world generation with first-person navigation, block placement/destruction, and real-time rendering with advanced graphics features (SSAO, deferred rendering, day/night cycle).

## Core Value

High-performance browser-based voxel world rendering with smooth frame rates and rich visual features.

## Requirements

### Validated

- ✓ WebGL2 rendering pipeline with GBuffer deferred rendering — existing
- ✓ Procedural terrain generation using simplex noise — existing
- ✓ First-person camera controls (WASD + mouse look) — existing
- ✓ Block placement and destruction via raycasting — existing
- ✓ Chunk-based world management with 16x16x16 chunks — existing
- ✓ Worker-based chunk mesh generation — existing
- ✓ Biome-based terrain (plains, desert, mountains, snow) — existing
- ✓ Day/night cycle with sun movement — existing
- ✓ SSAO and post-processing effects — existing
- ✓ Debug modes (wireframe, chunk boundaries) — existing

### Active

- [ ] Fix WebGL resource management (memory leaks, context loss handling)
- [ ] Resolve worker termination race conditions
- [ ] Fix chunk mesh synchronization issues
- [ ] Address global state pollution in main.js and render.js
- [ ] Optimize render loop (move matrix math to shaders)
- [ ] Implement chunk visibility tracking optimization
- [ ] Add resource loading progress indicator
- [ ] Add graphics quality settings (render distance, SSAO toggle)
- [ ] Improve test coverage for WebGL and worker threads
- [ ] Self-host simplex-noise dependency

### Out of Scope

- Multiplayer/network play — requires significant infrastructure
- Save/load world persistence — defer to future
- Physics simulation (falling blocks, collisions) — defer to future
- Mob/NPC entities — defer to future
- Audio system — defer to future

## Context

**Technical Environment:**
- Vanilla JavaScript (ES2020) with WebGL2
- No build step - direct ES module serving
- simplex-noise for procedural generation
- Vitest for testing

**Existing Codebase:**
- Modular layered architecture (Presentation/Game Logic/Interaction/Application)
- Already has solid foundation: rendering pipeline, chunk system, world generation
- Issues are technical debt and polish, not fundamental missing features

**Known Issues to Address:**
- WebGL context loss handling incomplete
- Worker pool race conditions
- Global state causing maintenance difficulty
- Performance bottlenecks in render loop
- Missing user experience features (loading indicator, quality settings)

## Constraints

- **Tech Stack**: Vanilla JavaScript + WebGL2 — no framework changes
- **Browser-only**: No server-side components
- **Performance**: Maintain 60fps on mid-range hardware with default settings

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS (no framework) | Keep dependencies minimal, direct WebGL access | ✓ Good - aligns with core value |
| Worker-based mesh generation | Prevent frame drops during chunk creation | ⚠️ Revisit - worker termination issues need fixing |
| CDN for simplex-noise | Quick setup | ⚠️ Revisit - should self-host |

---

*Last updated: 2026-03-27 after CONCERNS.md analysis for addressing codebase issues*
