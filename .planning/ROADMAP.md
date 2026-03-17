# Roadmap: Voxx-js Voxel Engine

## Overview

Five phases transform the existing codebase from a prototype with technical debt into a stable, performant voxel engine with core gameplay features. The journey starts with architectural cleanup, progresses through rendering and physics foundations, delivers the core interaction loop (block placement/removal), and concludes with world persistence.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Clean architecture, seeded RNG, error handling, basic tests
- [ ] **Phase 2: Rendering** - WebGL 2.0, frustum culling, chunk loading optimization
- [ ] **Phase 3: Physics** - Collision detection, player movement fixes, physics tests
- [ ] **Phase 4: World & Interaction** - Block placement/removal, inventory, terrain generation
- [ ] **Phase 5: Persistence** - World save/load, chunk pooling, comprehensive tests

## Phase Details

### Phase 1: Foundation
**Goal**: Establish a clean, deterministic codebase architecture with proper error handling and event management
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-05, TECH-06, TECH-07, BUG-01, BUG-04, SEC-01, SEC-02, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. ChunkManager is the single source of truth for voxel data (no duplicate World structures)
  2. All constants (CHUNK_SIZE, etc.) defined in shared module, zero hardcoded values
  3. World generation produces identical terrain on reload with same seed
  4. Console shows organized log messages with levels (DEBUG, INFO, WARN, ERROR)
  5. No uncaught promise rejections during module loading or chunk operations
  6. All coordinate inputs validated before array access (no out-of-bounds errors)
  7. Event listeners cleaned up when Player/Chunk objects are destroyed
**Plans**: 7 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Create constants module and initialize Jest (TECH-02, TECH-07, TEST-01)
- [x] 01-02-PLAN.md — Implement logging and error handling (TECH-03, TECH-06)
- [x] 01-03-PLAN.md — Consolidate ChunkManager as single source (TECH-01, BUG-04, SEC-01)
- [x] 01-04-PLAN.md — Fix Player event listener cleanup (TECH-05, SEC-02)
- [x] 01-05-PLAN.md — Replace Math.random with seeded PRNG (BUG-01)
- [x] 01-06-PLAN.md — Add tests for Chunk and Engine (TEST-02, TEST-03)
- [ ] 01-07-PLAN.md — Add world generation determinism test and fix logging inconsistencies (TEST-02)

### Phase 2: Rendering
**Goal**: Deliver performant WebGL 2.0 rendering with intelligent chunk visibility and loading management
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-03, PERF-04, PERF-05, FEAT-05, TEST-05
**Success Criteria** (what must be TRUE):
  1. Only chunks within camera frustum are rendered (occluded chunks not drawn)
  2. Chunk loading respects distance threshold and hysteresis (no jitter at boundaries)
  3. Renderer attempts WebGL 2.0, falls back to WebGL 1.0 if unavailable
  4. Multiple chunks batched into fewer draw calls (vertex pooling active)
  5. Renderer matrix math calculations pass unit tests
**Plans**: TBD

### Phase 3: Physics
**Goal**: Implement accurate collision detection and fix player movement physics
**Depends on**: Phase 2
**Requirements**: BUG-02, BUG-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Diagonal movement speed equals straight movement (no speed advantage)
  2. Player cannot walk through solid blocks
  3. Player cannot fall through floor or world boundary
  4. Player slides along walls when moving diagonally into obstacles
  5. Physics calculation tests pass (velocity, collision response)
**Plans**: TBD

### Phase 4: World & Interaction
**Goal**: Enable core gameplay loop - block placement, removal, inventory, and terrain variety
**Depends on**: Phase 3
**Requirements**: FEAT-01, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):
  1. Player can place blocks adjacent to existing blocks via click
  2. Player can remove/break blocks via click
  3. Player can select different block types from 9-slot hotbar
  4. Seeded terrain generation produces varied, reproducible landscapes
**Plans**: TBD

### Phase 5: Persistence
**Goal**: Enable users to save and reload their worlds, with optimized memory management
**Depends on**: Phase 4
**Requirements**: TECH-04, FEAT-02, PERF-02
**Success Criteria** (what must be TRUE):
  1. Player can save current world state to browser storage
  2. Player can load previously saved world with all blocks intact
  3. World data persists across browser sessions (close and reopen)
  4. Chunks reused from object pool instead of allocating new objects
  5. Save/load operations don't cause visible stutter
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/7 | Complete | 2026-03-17 |
| 2. Rendering | 0/TBD | Not started | - |
| 3. Physics | 0/TBD | Not started | - |
| 4. World & Interaction | 0/TBD | Not started | - |
| 5. Persistence | 0/TBD | Not started | - |

## Coverage Map

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1 - Foundation | TECH-01, TECH-02, TECH-03, TECH-05, TECH-06, TECH-07, BUG-01, BUG-04, SEC-01, SEC-02, TEST-01, TEST-02, TEST-03 | 13 |
| 2 - Rendering | PERF-01, PERF-03, PERF-04, PERF-05, FEAT-05, TEST-05 | 6 |
| 3 - Physics | BUG-02, BUG-03, TEST-04 | 3 |
| 4 - World & Interaction | FEAT-01, FEAT-03, FEAT-04 | 3 |
| 5 - Persistence | TECH-04, FEAT-02, PERF-02 | 3 |

**Coverage:** 28/28 requirements mapped ✓
**No orphaned requirements**

---

*Roadmap created: 2026-03-16*
*Depth: comprehensive (from config.json)*
