# Voxx-js Voxel Engine

## What This Is

Voxx-js is a browser-based voxel engine (like Minecraft) built with vanilla JavaScript and WebGL. It features procedural terrain generation, chunk-based world storage, and first-person player controls. The project aims to improve code quality, fix bugs, add missing features, and address technical debt to create a stable, performant engine with core gameplay features.

## Core Value

Deliver a stable, performant voxel engine with core gameplay features (block placement, collision detection, persistence).

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Basic world generation with terrain — existing
- ✓ Chunk-based world storage (32x32x32 voxels) — existing
- ✓ WebGL rendering of voxel world — existing
- ✓ First-person player movement with mouse look — existing
- ✓ Keyboard input handling — existing
- ✓ Dynamic chunk loading/unloading — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Fix duplicate world data structures (World vs ChunkManager)
- [ ] Extract hardcoded constants (CHUNK_SIZE) to shared module
- [ ] Add error handling to async module loading
- [ ] Implement stub methods (loadWorld, saveWorld, update persistence)
- [ ] Fix non-deterministic world generation (use seeded RNG)
- [ ] Fix diagonal movement physics normalization
- [ ] Implement collision detection (player vs blocks)
- [ ] Implement block placement and removal
- [ ] Add world persistence (IndexedDB)
- [ ] Add inventory system for block selection
- [ ] Add input validation for voxel coordinates
- [ ] Fix event listener memory leaks
- [ ] Add logging levels (disable debug logs in production)
- [ ] Implement chunk loading throttling
- [ ] Add frustum culling for rendering
- [ ] Implement chunk object pooling for memory management
- [ ] Add WebGL context loss/restore handling
- [ ] Add shader compilation fallbacks
- [ ] Upgrade to WebGL 2.0 with WebGL 1.0 fallback
- [ ] Add package.json with dependencies
- [ ] Add test coverage for core functionality

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multiplayer networking — Single-player focus for now
- Advanced lighting/shadows — Keep rendering simple for performance
- Complex terrain features (caves, structures) — Basic terrain only
- Mobile touch controls — Desktop-first with keyboard/mouse
- Sound effects/audio — Visual experience only
- Modding/plugin system — Fixed feature set

## Context

Voxx-js is an existing codebase with a modular architecture. The codebase map reveals significant technical debt and missing features. The project plan-qwen.md and tasks-qwen.md outline desired features (voxel game engine like Minecraft). The immediate goal is to address the concerns audit and build a solid foundation for gameplay.

## Constraints

- **Tech stack**: Vanilla JavaScript, WebGL 1.0, no build tools — must maintain compatibility
- **Performance**: Target 60 FPS with reasonable view distance in browser
- **Memory**: Browser tab memory limits (~2GB) constrain world size
- **Single-player only**: No networking infrastructure planned for v1

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Address tech debt first | Clean foundation prevents compounding issues | — Pending |
| Use IndexedDB for persistence | Browser-native, no server needed | — Pending |
| Implement collision detection before block interaction | Physics required for playable movement | — Pending |
| Upgrade to WebGL 2.0 | Better performance, modern features, with fallback | — Pending |
| Add testing gradually | Prevent regressions during refactoring | — Pending |

---
*Last updated: 2026-03-16 after initialization*