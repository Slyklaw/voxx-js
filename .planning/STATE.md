# State: Voxx-JS Block Editing

**Last Updated:** 2026-03-18 (after completing Phase 8 Plan 1)

---

## Project Reference

**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

**Current Milestone:** v1.1 Block Editing

**Mode:** yolo

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | 8: Chunk Updates & Persistence |
| **Plan** | 1 (of 1) |
| **Status** | Plan Complete |
| **Progress** | 1 / 1 phases |

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

### What's Been Done

1. v1.0 milestone completed — WebGL2 refactor shipped (2026-03-18)
2. Core rendering pipeline functional with 60fps performance
3. Procedural terrain, controls, day/night cycle, debug UI
4. v1.1 requirements defined (6 requirements)
5. Roadmap created with 3 phases (6-8)

### What's Next

1. ✅ Block targeting implemented (Plan 1 complete)
2. ✅ Left-click break implemented (Plan 2 complete)
3. ✅ Right-click place implemented (Plan 3 complete)
4. ✅ Keyboard block selection (1-5) with UI feedback (Plan 1 complete)
5. ✅ Chunk mesh update verification complete (Phase 8 Plan 1)
6. ✅ Rebuild throttling added to prevent frame drops (Phase 8 Plan 1)

**Phase 8 complete** — All v1.1 Block Editing requirements satisfied (CHUNK-01, PERSIST-01)

---

## v1.1 Phase Map

| Phase | Goal | Requirements |
|-------|------|--------------|
| 6 | Target, break, and place blocks | EDIT-01, EDIT-02, EDIT-03 |
| 7 | Select block type to place | INV-01 |
| 8 | Visual updates and session persistence | CHUNK-01, PERSIST-01 |

---

*State updated: 2026-03-18 after completing Plan 03 (right-click place) — Phase 6 complete*
