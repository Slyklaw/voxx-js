# Voxel Engine

## What This Is

A browser-based voxel world engine using WebGL2 with multi-pass deferred rendering. Players explore procedurally generated terrain with biomes, place and destroy blocks, and experience real-time lighting with SSAO and shadows. The codebase already includes WebGL2 rendering pipeline, Web Worker-based chunk generation, and greedy meshing optimization.

## Core Value

Players can explore an infinite procedural voxel world and modify blocks in real-time with smooth controls.

## Requirements

### Validated

The following features are implemented and working:

- ✓ WebGL2 multi-pass rendering with deferred shading — existing
- ✓ Procedural terrain generation with simplex noise and biomes — existing
- ✓ Web Worker-based parallel chunk processing — existing
- ✓ Greedy meshing for optimized geometry — existing
- ✓ SSAO (Screen Space Ambient Occlusion) — existing
- ✓ Shadow mapping — existing
- ✓ Sky rendering — existing
- ✓ Block placement (left click) — existing
- ✓ Block destruction (right click) — existing
- ✓ Camera controls (WASD + mouse look) — existing
- ✓ Chunk-based world loading/unloading — existing
- ✓ Render distance configuration — existing

### Active

Building toward these features:

- [ ] Save/Load world state to browser storage
- [ ] Block inventory with selection (1-9 keys)
- [ ] Player survival mechanics (health, hunger)
- [ ] Day/night cycle
- [ ] Multiplayer foundation (client architecture)

### Out of Scope

- Server-side persistence (future work)
- Mobile touch controls (desktop-first)
- VR support (future work)
- Procedural caves (deferred due to complexity)

## Context

**Existing Implementation:**
- Vanilla JavaScript ES modules (no framework)
- Raw WebGL2 API with custom GLSL shaders
- Deferred rendering with G-buffer (albedo, normals, position)
- Web Workers for offloading chunk generation
- IndexedDB will be used for persistence

**Technical Debt (from codebase audit):**
- Duplicate chunk classes (chunk.js, chunkCore.js)
- Monolithic main.js (997 lines)
- No frustum culling
- Manual mesh regeneration after block edit
- Scattered DEBUG flags

**Known Issues:**
- Biome blending produces harsh transitions
- Block edits sometimes require chunk refresh
- External CDN dependency for simplex-noise

## Constraints

- **Tech Stack**: Vanilla JavaScript, WebGL2, Web Workers — no framework dependencies
- **Browser**: Modern browser with WebGL2 support required
- **Storage**: Browser IndexedDB for persistence (no server)
- **Performance**: Target 60 FPS with render distance up to 16 chunks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS (no framework) | Minimal overhead, full WebGL control | ✓ Confirmed working |
| Web Workers for chunks | Prevent main thread blocking | ✓ Working, expand for save/load |
| IndexedDB for persistence | No server required, browser-native | — Pending |
| Deferred shading pipeline | Enable SSAO and post-processing | ✓ Working |
| Greedy meshing | Reduce draw calls for large worlds | ✓ Working |

---
*Last updated: 2026-03-21 after project initialization*
