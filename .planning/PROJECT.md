# Voxx-JS Tech Debt Cleanup

## What This Is

Voxx-JS is a browser-based voxel engine using WebGL2 for 3D rendering with procedural terrain generation. The codebase was mapped and significant technical debt was identified across code quality, performance, and reliability areas. This project addresses those concerns systematically.

## Core Value

Improve code quality and reliability without breaking existing functionality.

## Requirements

### Validated

- ✓ Procedural terrain generation with biomes — existing
- ✓ WebGL2 rendering with custom shaders — existing
- ✓ Block placement and destruction via raycasting — existing
- ✓ Web Worker pool for chunk generation — existing
- ✓ Greedy meshing optimization — existing (but duplicated)

### Active

- [ ] Remove dead code (Three.js references, unused modules, legacy methods)
- [ ] Deduplicate greedy meshing implementation (exists in two files)
- [ ] Consolidate duplicated constants into single source
- [ ] Fix block selection UI mismatch (mousewheel vs keyboard)
- [ ] Make render distance UI functional
- [ ] Implement context loss recovery handler
- [ ] Add debug flag to disable production logging
- [ ] Add bounds checking / validation to prevent invalid states
- [ ] Improve worker pool callback ID generation (collision-safe)

### Out of Scope

- Collision detection — requires separate feature work
- World persistence/save — requires separate feature work
- Lighting/shadows improvements — visual polish, not tech debt
- Test coverage — deferred to future quality initiative

## Context

**Project:** Browser-based voxel engine (Minecraft-like)
**Stack:** JavaScript ES2020+, WebGL2, Web Workers
**Entry:** `voxx-js/index.html` → `voxx-js/src/main.js`

**Existing codebase state:**
- 1,208 lines of documentation across 7 files
- Multiple patterns already established (chunk architecture, worker pool)
- No existing tests
- ~59 debug log statements throughout

**Key files identified in tech debt audit:**
- `voxx-js/chunk.js` (lines 157-389): Greedy meshing duplication
- `voxx-js/chunkWorker.js` (lines 61-269): Greedy meshing duplication  
- `voxx-js/src/main.js`: Block selection bug, render distance bug
- `voxx-js/src/gl/context.js`: Empty context loss handler

## Constraints

- **No functionality changes:** Cleanup must not alter existing behavior
- **Backward compatibility:** All block editing, terrain gen, rendering must continue working
- **Browser-only:** No Node.js build step

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope limited to tech debt | Avoid feature creep during cleanup | — Pending |
| Dead code removal first | Reduces maintenance burden before deduplication | — Pending |
| Performance fixes last | Verify base stability before optimization | — Pending |

---
*Last updated: 2026-03-18 after initialization*
