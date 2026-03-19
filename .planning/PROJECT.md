# Voxx-JS WebGL2 Refactor

## What This Is

A browser-based voxel game engine (Minecraft-like 3D world) rendered in raw WebGL2. Players can explore a procedurally generated terrain in first-person view with WASD+mouse controls. The rendering was refactored from Three.js to raw WebGL2 for improved performance and reduced bundle size. Blocks are now rendered with textures from a texture atlas.

## Core Value

Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

## Current State

**v1.2 Texture Atlas:** SHIPPED 2026-03-19

Texture atlas is now fully implemented. Blocks render with proper textures from textures-atlas.png instead of flat vertex colors. All 5 block types (Stone, Dirt, Grass, Water, Snow) have correct textures with appropriate face variations.

## Requirements

### Validated

- ✓ Three.js-based voxel rendering — v1.0 (legacy)
- ✓ WebGL2 voxel rendering — v1.0
- ✓ Procedural terrain generation with biomes — v1.0
- ✓ First-person camera controls — v1.0
- ✓ Chunk-based world management with lazy loading — v1.0
- ✓ Greedy meshing algorithm — v1.0
- ✓ Web Worker parallel chunk generation — v1.0
- ✓ Sky dome with day/night cycle — v1.0
- ✓ FPS monitoring and debug UI — v1.0
- ✓ Block selection outline (wireframe) — v1.0
- ✓ Block targeting with raycast — v1.1
- ✓ Block breaking (left-click) — v1.1
- ✓ Block placement (right-click) — v1.1
- ✓ Block inventory selection (1-5 + mousewheel) — v1.1
- ✓ Real-time chunk mesh updates — v1.1
- ✓ Block edits persist until reload — v1.1
- ✓ Texture atlas for block types — v1.2
- ✓ UV coordinate generation in greedy meshing — v1.2
- ✓ Fragment shader texture sampling with wrapping — v1.2

### Active

- [ ] Frustum culling for performance
- [ ] Save/load world state (localStorage)

### Out of Scope

- Multiplayer — requires server infrastructure
- Physics/collisions — free-flight camera for exploration
- Mobile support — desktop-first

## Context

**Current Architecture (v1.2):**
- Rendering Layer: Raw WebGL2 with texture atlas support
- World Management: Chunk dictionary with lazy loading
- Chunk Layer: 32x256x32 voxel volumes with greedy meshing
- Camera: Custom view/projection matrix computation
- Terrain: Simplex noise with biome blending
- Workers: Web Worker for parallel chunk generation
- Textures: 1024x512 atlas with 16x16 tiles, nearest-neighbor filtering

**Tech Stack:**
- Language: JavaScript (ES Modules)
- Rendering: Raw WebGL2 with GLSL ES 3.00
- No build system (CDN loaded)
- ~12 custom WebGL2 modules

**Shipped Features (v1.2):**
- All v1.0 and v1.1 features
- Texture atlas with 5 block types
- UV wrapping for proper face tiling
- X-face rotation for Minecraft-style orientation

## Constraints

- **Browser Compatibility**: Must work in modern browsers with WebGL2 support
- **Performance**: Maintain 60fps with render distance of 8+ chunks
- **No Build System**: Continue using ES Modules with CDN loading

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use raw WebGL2 instead of Three.js | Remove 600KB dependency, learn low-level WebGL | ✓ Shipped - working at 60fps |
| Keep chunk-based architecture | Proven efficient for voxel worlds | ✓ Shipped - confirmed |
| Maintain worker-based generation | Critical for performance | ✓ Shipped - parallel generation works |
| Use vertex colors instead of textures | Simplify v1, focus on core rendering | ✓ Shipped - colored blocks render |
| Implement greedy meshing | Reduce vertex count | ✓ Shipped - optimized chunk geometry |
| Implement texture atlas | Blocks should have visual textures | ✓ Shipped - 5 block types textured |

## Future Milestone Goals

- Frustum culling for performance
- Save/load world state (localStorage)
- Block physics (falling sand, water flow)

---
*Last updated: 2026-03-19 after v1.2 milestone*
