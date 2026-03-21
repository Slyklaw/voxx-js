# State: Voxel Engine

**Last updated:** 2026-03-21

## Project Reference

**Core value:** Players can explore an infinite procedural voxel world and modify blocks in real-time with smooth controls.

**Extension goal:** Add survival mechanics (health, hunger, inventory, day/night, mobs) on top of existing voxel engine.

**Current phase:** v1.1 Phase 6 (Code Structure) - Plans 01-02 complete

---

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 Code Cleanup |
| Current Phase | Phase 6: Code Structure |
| Current Plan | 06-02 complete (of 2+ plans) |
| Status | Plans 01-02 complete |
| Progress | 5/8 phases complete (v1.0: Phases 1-5) |

**Progress Bar:** [█████░░░░░] 62.5% (5 of 8 phases)

---

## v1.1 Milestone: Code Cleanup

This milestone addresses technical debt before feature development.

**Phase 6 - Code Structure:**
- STRUCT-01: Consolidate chunk.js and chunkCore.js
- STRUCT-02: Split main.js into modules
- STRUCT-03: Extract BlockEditor class
- STRUCT-04: Create math utilities module

**Phase 7 - Bug Fixes:**
- FIX-01: Remove forced flat terrain hack
- FIX-02: Fix biome blending
- FIX-03: Fix mesh regeneration after block edit
- FIX-04: Fix stale worker requests

**Phase 8 - Reliability:**
- RELI-01: Bundle simplex-noise locally
- RELI-02: Add structured logging utility
- RELI-03: Replace DEBUG console.log

---

## Phase Status

### v1.0 Roadmap (Complete)

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | Persistence Foundation | PERS-01 to PERS-05 | Not started |
| 2 | Survival Core | PLAY-01 to PLAY-05, HUNG-01 to HUNG-05 | Not started |
| 3 | Inventory System | INV-01 to INV-06 | Not started |
| 4 | Day/Night Cycle | DAY-01 to DAY-06 | Not started |
| 5 | Hostile Mobs | MOBS-01 to MOBS-05 | Not started |

### v1.1 Roadmap (Code Cleanup)

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 6 | Code Structure | STRUCT-01 to STRUCT-04 | Plans 01-02 complete (STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-04 done) |
| 7 | Bug Fixes | FIX-01 to FIX-04 | Not started |
| 8 | Reliability | RELI-01 to RELI-03 | Not started |

---

## Accumulated Context

### Technical Decisions

- **IndexedDB** for persistence (no server required)
- **Web Workers** extended for persistence operations
- **Observable state** pattern for game state (changes emit events, UI subscribes)
- **Dirty chunk tracking** for efficient saves (only modified chunks serialized)
- **Async batch persistence** (writes queue and flush every 5 seconds)
- **Hunger buff-based design** (full hunger grants regen, empty is neutral not deadly)
- **Hotbar-first inventory** (no full grid screen in v1)

### v1.1 Technical Notes

- **Phase 6 dependencies:** None (can run in parallel with v1.0)
- **Phase 7 dependencies:** Phase 6 (needs modular structure for safe refactoring)
- **Phase 8 dependencies:** Phase 6 (needs module structure for logger)
- **No v1.0 phase dependencies for v1.1:** Code cleanup is self-contained

### Critical Pitfalls (from research)

1. IndexedDB quota eviction wipes entire database silently
2. IndexedDB writes not flushed to disk (need explicit sync)
3. Partial serialization on save/load (need explicit schema)
4. Block edit mesh mismatch after load (existing bug to fix in Phase 7)
5. Hunger as punishment (must be buff-based from start)

### Code Cleanup Concerns (from codebase audit)

- Duplicate chunk classes (chunk.js, chunkCore.js) → Fix in Phase 6
- Monolithic main.js (997 lines) → Split in Phase 6
- No frustum culling → Defer to feature work
- Manual mesh regeneration after block edit → Fix in Phase 7
- External CDN for simplex-noise → Fix in Phase 8
- Scattered DEBUG flags → Replace in Phase 8

---

## Session Continuity

**Last session:** 2026-03-21T20:23:51.488Z

**Context decisions:**
- Incremental import routing with no compat layer
- Manual game testing after each module extraction
- Class-based for stateful components, functional for utils

**Phase 6-01 decisions:**
- Single source of truth for chunk constants in src/constants.js
- Chunk class over ChunkCore (replaced ChunkCore usage in chunkWorker.js)
- Math utilities extracted to src/math/ module with barrel exports

**Phase 6-02 decisions:**
- InputHandler as central input manager with callbacks for block events
- BlockEditor handles raycasting and shared mesh update logic
- Camera as pure stateful component for position/rotation/movement
- main.js as orchestration layer using injected instances

**Next action:** Phase 6 complete - ready for Phase 7 (Bug Fixes)

---

## Files

- `.planning/PROJECT.md` - Core project context (updated for v1.1)
- `.planning/REQUIREMENTS.md` - v1.0 requirements + v1.1 requirements
- `.planning/ROADMAP.md` - v1.0 roadmap + v1.1 roadmap
- `.planning/STATE.md` - Current state with v1.1 tracking
- `.planning/MILESTONES.md` - Milestone history
- `.planning/research/SUMMARY.md` - v1.0 research findings
- `.planning/phases/06-code-structure/06-CONTEXT.md` - Phase 6 decisions

---

*State updated: 2026-03-21 after Phase 6 Plans 01-02 complete*
