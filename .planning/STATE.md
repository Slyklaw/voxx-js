# State: Voxel Engine

**Last updated:** 2026-03-21

## Project Reference

**Core value:** Players can explore an infinite procedural voxel world and modify blocks in real-time with smooth controls.

**Extension goal:** Add survival mechanics (health, hunger, inventory, day/night, mobs) on top of existing voxel engine.

**Current phase:** Roadmap created, ready for Phase 1 planning

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | Roadmap (pre-Phase 1) |
| Current Plan | None (roadmap created) |
| Status | Not started |
| Progress | 0/5 phases complete |

**Progress Bar:** [░░░░░░░░░░] 0% (0 of 5 phases)

---

## Phase Status

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | Persistence Foundation | PERS-01 to PERS-05 | Not started |
| 2 | Survival Core | PLAY-01 to PLAY-05, HUNG-01 to HUNG-05 | Not started |
| 3 | Inventory System | INV-01 to INV-06 | Not started |
| 4 | Day/Night Cycle | DAY-01 to DAY-06 | Not started |
| 5 | Hostile Mobs | MOBS-01 to MOBS-05 | Not started |

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

### Critical Pitfalls (from research)

1. IndexedDB quota eviction wipes entire database silently
2. IndexedDB writes not flushed to disk (need explicit sync)
3. Partial serialization on save/load (need explicit schema)
4. Block edit mesh mismatch after load (existing bug to fix in Phase 1)
5. Hunger as punishment (must be buff-based from start)

### Research Flags

- **Phase 2:** Hunger buff values and depletion rates need playtesting
- **Phase 4:** Shadow swimming prevention needs browser verification
- **Phase 5:** AI pathfinding for infinite voxel worlds may need alternatives to A*

---

## Session Continuity

**Next action:** `/gsd-plan-phase 1` to plan Persistence Foundation

---

## Files

- `.planning/PROJECT.md` - Core project context
- `.planning/REQUIREMENTS.md` - 31 v1 requirements
- `.planning/ROADMAP.md` - This roadmap
- `.planning/research/SUMMARY.md` - Research findings

---

*State initialized: 2026-03-21*
