# Voxx-JS Tech Debt Cleanup

## What This Is

Voxx-JS is a browser-based voxel engine using WebGL2 for 3D rendering with procedural terrain generation. The codebase was mapped and significant technical debt was identified across code quality, performance, and reliability areas. This project addresses those concerns systematically.

## Core Value

Improve code quality and reliability without breaking existing functionality.

---

## Current State

**Version:** v1.0 (shipped 2026-03-19)
**Status:** Tech debt cleanup complete

---

## Requirements

### Validated

- ✓ Procedural terrain generation with biomes — v1.0
- ✓ WebGL2 rendering with custom shaders — v1.0
- ✓ Block placement and destruction via raycasting — v1.0
- ✓ Web Worker pool for chunk generation — v1.0
- ✓ Greedy meshing optimization — v1.0 (deduplicated)
- ✓ Dead code removal (Three.js refs, unused modules) — v1.0
- ✓ Chunk constant consolidation — v1.0
- ✓ Block selection UI fix — v1.0
- ✓ Render distance UI fix — v1.0
- ✓ WebGL context loss recovery — v1.0
- ✓ DEBUG flag infrastructure — v1.0
- ✓ Worker callback ID collision-safe generation — v1.0
- ✓ Block type assertions — v1.0
- ✓ Camera bounds checking — v1.0

### Active

- [ ] Collision detection — requires separate feature work
- [ ] World persistence (save/load) — requires separate feature work
- [ ] Test coverage — deferred to future quality initiative

### Out of Scope

- Collision detection — requires separate feature work
- World persistence/save — requires separate feature work
- Lighting/shadows improvements — visual polish, not tech debt
- Test coverage — deferred to future quality initiative

## Context

**Project:** Browser-based voxel engine (Minecraft-like)
**Stack:** JavaScript ES2020+, WebGL2, Web Workers
**Entry:** `voxx-js/index.html` → `voxx-js/src/main.js`

**v1.0 milestone changes:**
- Created `voxx-js/greedyMesh.js` — shared greedy meshing utility (~450 lines deduplicated)
- Removed Three.js references and dead properties
- Deleted orphaned `src/gl/test-render.js`
- Fixed 4 bugs: block selection, render distance, context loss, UI updates
- Added DEBUG infrastructure and input validation

## Constraints

- **No functionality changes:** Cleanup must not alter existing behavior
- **Backward compatibility:** All block editing, terrain gen, rendering must continue working
- **Browser-only:** No Node.js build step

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope limited to tech debt | Avoid feature creep during cleanup | ✓ Complete |
| Dead code removal first | Reduces maintenance burden before deduplication | ✓ Complete |
| Performance fixes last | Verify base stability before optimization | ✓ Complete |
| getVoxelFn abstraction for greedy meshing | Support both neighbor-aware and direct voxel access | ✓ Good |

## v1.0 Accomplishments

1. Removed dead code (Three.js refs, unused modules, legacy methods)
2. Extracted shared greedyMesh.js utility (~450 lines deduplicated)
3. Fixed 4 bugs: block selection, render distance, context loss, UI updates
4. Added debug infrastructure and input validation

---

## Next Milestone Goals

**Suggested focus areas:**
- Collision detection (player walks on terrain)
- World persistence (save/load builds)
- Test coverage (unit tests for terrain generation)
- Visual polish (lighting, shadows)

---
*Last updated: 2026-03-19 after v1.0 milestone*
