# Voxx-JS Tech Debt Removal

## What This Is

A browser-based voxel game engine (Minecraft-like 3D world) rendered in raw WebGL2. Players can explore a procedurally generated terrain in first-person view with WASD+mouse controls. Blocks are rendered with textures from a texture atlas. This milestone focuses on removing technical debt identified during codebase mapping.

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

- [ ] Remove duplicate mesh generation code
- [ ] Consolidate duplicate chunk classes
- [ ] Remove unused modules and dead code
- [ ] Clean up debug console spam
- [ ] Centralize texture atlas configuration
- [ ] Add proper WebGL resource cleanup on chunk dispose
- [ ] Vendor simplex-noise library locally

### Out of Scope

- Frustum culling — performance optimization, separate milestone
- Save/load world state — feature work, separate milestone
- Unit tests — testing infrastructure, separate milestone
- Block physics — feature work, separate milestone
- Build system / bundling — deferred (no-build is intentional constraint)

## Context

**Current Architecture:**
- Rendering Layer: Raw WebGL2 with texture atlas support
- World Management: Chunk dictionary with lazy loading
- Chunk Layer: 32x256x32 voxel volumes with greedy meshing
- Camera: Custom view/projection matrix computation
- Terrain: Simplex noise with biome blending
- Workers: Web Worker for parallel chunk generation
- Textures: 1024x512 atlas with 16x16 tiles, nearest-neighbor filtering

**Tech Debt Identified (from codebase mapping):**

| Category | Issue | Files | Impact |
|----------|-------|-------|--------|
| Duplication | Greedy meshing duplicated | chunk.js, chunkWorker.js | Maintenance burden |
| Duplication | ChunkCore and Chunk overlap | chunkCore.js, chunk.js | Confusion |
| Dead Code | Unused ChunkManager | src/chunk/chunkManager.js | Noise |
| Dead Code | Test cube function | src/gl/render.js | Confusion |
| Dead Code | Test render module | src/gl/test-render.js | Noise |
| Dead Code | Commented debug blocks | Multiple files | Visual noise |
| Console Spam | Texture/UV logging | chunk.js, chunkWorker.js | Performance |
| Config | Atlas dimensions hardcoded | blocks.js, chunk.js, chunkWorker.js | Fragility |
| Memory | WebGL resource leaks | world.js, chunk.js | Memory growth |
| Dependencies | simplex-noise from CDN | world.js, biomes.js, chunkWorker.js | Availability risk |

## Constraints

- **No Build System**: Continue using ES Modules with CDN loading
- **Browser Compatibility**: Must work in modern browsers with WebGL2 support
- **Performance**: Maintain 60fps during refactoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use raw WebGL2 instead of Three.js | Remove 600KB dependency, learn low-level WebGL | ✓ Good |
| Keep chunk-based architecture | Proven efficient for voxel worlds | ✓ Good |
| Maintain worker-based generation | Critical for performance | ✓ Good |
| Use texture atlas | Blocks should have visual textures | ✓ Good |
| No bundled output | Simplifies deployment, learning exercise | ✓ Good |

---

*Last updated: 2026-03-18 after codebase mapping*
