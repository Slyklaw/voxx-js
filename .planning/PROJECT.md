# Voxx-JS WebGL2 Refactor

## What This Is

A browser-based voxel game engine (Minecraft-like 3D world) rendered in raw WebGL2. Players can explore a procedurally generated terrain in first-person view with WASD+mouse controls. The rendering was refactored from Three.js to raw WebGL2 for improved performance and reduced bundle size.

## Core Value

Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

## Current State

**v1.1 Block Editing:** SHIPPED 2026-03-18

Block editing is complete. Players can target blocks with a magenta wireframe outline, break blocks with left-click, place blocks with right-click, select block types with keyboard (1-5) or mousewheel, and see chunk updates in real-time.

## Current Milestone: v1.2 Texture Atlas

**Goal:** Activate the existing texture atlas implementation (built in v1.0 but kept inactive) to render blocks with proper textures from textures-atlas.png

**Target features:**
- Verify and fix texture atlas loading
- Debug texture rendering in shaders
- Ensure correct UV mapping per block type and face
- Add additional block types if atlas supports them

**Note:** This code already exists in renderer.js, shaders.js, blocks.js, and chunk.js from v1.0. The milestone is activation and debugging, not building from scratch.

## Future Milestone Goals

- Frustum culling for performance
- Save/load world state (localStorage)
- Block physics (falling sand, water flow)

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

### Active

- [ ] Texture atlas for block types
- [ ] Frustum culling for performance
- [ ] Save/load world state (localStorage)

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

## Future Milestone Goals

- Texture atlas for block types
- Frustum culling for performance
- Save/load world state
- Block physics/collisions

---
*Last updated: 2026-03-18 after v1.1 milestone*
