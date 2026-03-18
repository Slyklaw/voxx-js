# Voxx-JS WebGL2 Refactor

## What This Is

A browser-based voxel game engine (Minecraft-like 3D world) rendered in WebGL. Players can explore a procedurally generated terrain, place and remove blocks in first-person view. Refactoring rendering from Three.js to raw WebGL2 for improved performance and reduced bundle size.

## Core Value

Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

## Requirements

### Validated

- ✓ Three.js-based voxel rendering — v1.0
- ✓ Procedural terrain generation with biomes — v1.0
- ✓ First-person camera controls — v1.0
- ✓ Block placement and removal — v1.0
- ✓ Chunk-based world management with lazy loading — v1.0
- ✓ Greedy meshing algorithm — v1.0
- ✓ Web Worker parallel chunk generation — v1.0
- ✓ Sky dome with day/night cycle — v1.0

### Active

- [ ] Refactor rendering from Three.js to WebGL2
- [ ] Maintain all existing gameplay features during refactor
- [ ] Preserve chunk-based world management
- [ ] Keep Web Worker parallel generation

### Out of Scope

- Multiplayer — requires server infrastructure
- Block textures — using colored blocks for v1
- Physics/collisions — free-flight camera for exploration
- Mobile support — desktop-first

## Context

This is a brownfield project with an existing Three.js-based voxel engine. The codebase has been mapped with ARCHITECTURE.md and STACK.md in `.planning/codebase/`. The refactoring task is to replace Three.js rendering with raw WebGL2 while maintaining all existing functionality.

**Current Architecture:**
- Rendering Layer: Three.js-based (renderer.js, shaders.js, sky.js)
- World Management: Chunk dictionary with lazy loading
- Chunk Layer: 32x256x32 voxel volumes with greedy meshing
- Camera: Custom view/projection matrix computation
- Terrain: Simplex noise with biome blending
- Workers: Web Worker pool for parallel generation

**Why WebGL2?**
- Reduce dependency on Three.js library (~600KB minified)
- Direct GPU control for optimized voxel rendering
- Learn low-level WebGL graphics programming
- Better performance through custom render loops

## Constraints

- **Browser Compatibility**: Must work in modern browsers with WebGL2 support
- **Performance**: Maintain 60fps with render distance of 8+ chunks
- **Features**: All existing Three.js features must work identically after refactor
- **No Build System**: Continue using ES Modules with CDN loading

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use raw WebGL2 instead of WebGL1 | Better GPU features, instanced rendering | — Pending |
| Keep chunk-based architecture | Proven efficient for voxel worlds | — Pending |
| Maintain worker-based generation | Critical for performance | — Pending |

---
*Last updated: 2026-03-17 after project initialization*
