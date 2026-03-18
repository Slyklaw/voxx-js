# Voxx-JS WebGL2 Refactor

## What This Is

A browser-based voxel game engine (Minecraft-like 3D world) rendered in raw WebGL2. Players can explore a procedurally generated terrain in first-person view with WASD+mouse controls. The rendering was refactored from Three.js to raw WebGL2 for improved performance and reduced bundle size.

## Core Value

Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

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

### Active

- [ ] Block placement and removal (in-game editing)
- [ ] Texture support for blocks
- [ ] Chunk mesh updates on block changes
- [ ] Frustum culling for performance

### Out of Scope

- Multiplayer — requires server infrastructure
- Physics/collisions — free-flight camera for exploration
- Mobile support — desktop-first

## Context

**Current Architecture (v1.0):**
- Rendering Layer: Raw WebGL2 (context.js, shaders.js, buffers.js, render.js, ubo.js, performance.js)
- World Management: Chunk dictionary with lazy loading
- Chunk Layer: 32x256x32 voxel volumes with greedy meshing
- Camera: Custom view/projection matrix computation
- Terrain: Simplex noise with biome blending
- Workers: Web Worker for parallel chunk generation

**Tech Stack:**
- Language: JavaScript (ES Modules)
- Rendering: Raw WebGL2 with GLSL ES 3.00
- No build system (CDN loaded)
- ~12 custom WebGL2 modules

**v1.0 Shipped Features:**
- Procedural terrain with biome-based coloring
- First-person WASD + mouse look controls
- Day/night sky cycle
- Block selection wireframe outline
- FPS counter in debug UI
- Render distance adjustment
- Move speed adjustment

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

## Current State

**v1.0 WebGL2 Refactor:** SHIPPED 2026-03-18

The core WebGL2 refactor is complete. The voxel game renders procedurally generated terrain with biome-based colors, supports first-person exploration with WASD+mouse controls, includes a debug UI with FPS counter, and maintains 60fps with default render distance.

## Next Milestone Goals

- Block placement and removal functionality
- Texture atlas for block types
- Improved performance (frustum culling, instancing)
- Save/load world state

---
*Last updated: 2026-03-18 after v1.0 milestone*
