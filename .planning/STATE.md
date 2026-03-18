# State: Voxx-JS

**Last Updated:** 2026-03-18 (starting v1.2 milestone)

---

## Project Reference

**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

**Current Milestone:** v1.2 Texture Atlas (defining requirements)

**Mode:** yolo

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Status** | Defining requirements |
| **Phase** | Not started |
| **Plan** | — |
| **Last activity** | 2026-03-18 — Milestone v1.2 started |

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Frame Rate | 60fps | 60fps |
| Block Edit Latency | < 16ms | N/A |
| Chunk Rebuild | < 50ms | N/A |

---
| Phase 06-block-targeting-interaction P01 | 1min | 3 tasks | 1 files |
| Phase 06-block-targeting-interaction P02 | 0min | 3 tasks | 0 files |
| Phase 06-block-targeting-interaction P02 | 0min | 3 tasks | 0 files |
| Phase 08 P01 | 2min | 3 tasks | 1 files |

## Accumulated Context

### Decisions

- Using raw WebGL2 (not WebGL1) for native VAO/instancing support
- VAO-per-chunk pattern for efficient draw calls
- UBO for shared globals (camera, projection, lighting)
- glMatrix for matrix math (lightweight 6KB)
- ES Modules with CDN loading (no build system)
- Target outline uses wireframe cube shader (existing in v1.0)
- Outline mesh created once, visibility toggled instead of per-frame recreation
- Persistence uses in-memory only (no localStorage until v2)
- Used existing destroyBlock() implementation from plan 06-01, no changes needed
- Left-click wired via mousedown event with button check, already present
- [Phase 06-block-targeting-interaction]: Used existing destroyBlock() implementation from plan 06-01, no changes needed
- [Phase 06-block-targeting-interaction]: Left-click wired via mousedown event with button check, already present
- [Phase 06-block-targeting-interaction]: Existing placeBlock() implementation verified - EDIT-02 requirement satisfied
- [Phase 06-block-targeting-interaction]: Step-back distance of 0.2 units reliably places block in adjacent air cell
- [Phase 07-block-inventory]: Digits 1-5 mapped directly to block type IDs (Stone=1, Dirt=2, Grass=3, Water=4, Snow=5)
- [Phase 07-block-inventory]: Keyboard selection only active when pointer locked (isPointerLocked guard)
- [Phase 08-chunk-updates-persistence]: Added chunk rebuild throttling to limit rebuilds per frame

### Known Blockers

- None yet

### Technical Debt

- Chunk mesh rebuild throttled (MAX_REBUILDS_PER_FRAME=2) — ✅ addressed
- In-memory persistence only (no localStorage) — intentional for v1.1
- No undo/redo for block edits — deferred to v2

---

## Session Continuity

### Milestones Completed

1. **v1.0 WebGL2 Refactor** (2026-03-17) — 5 phases, 6 plans
   - Refactored from Three.js to raw WebGL2
   - Procedural terrain, controls, day/night cycle
   
2. **v1.1 Block Editing** (2026-03-18) — 3 phases, 5 plans
   - Block targeting with raycast and wireframe outline
   - Left-click destruction, right-click placement
   - Keyboard block selection (1-5) with UI
   - Throttled chunk updates, in-memory persistence

### What's Next

Start next milestone with `/gsd-new-milestone`

Potential v1.2 features:
- Texture atlas for block types
- Frustum culling for performance
- Save/load world state (localStorage)

---

*State updated: 2026-03-18 — v1.1 milestone complete*
