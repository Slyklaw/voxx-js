# Roadmap: voxx-js

**Created:** 2026-03-27
**Current milestone:** v2.0 Shadows
**Last updated:** 2026-04-02

## Milestones

- ✅ **v1.0 WebGL Foundation** — Phases 1-3 (shipped 2026-04-01)
- 📋 **v2.0 Shadows** — Phases 4-6 (planning)

---

## Phases

- [x] **Phase 1: WebGL Foundation** — Fix memory leaks and context loss handling
- [x] **Phase 2: Worker System** — Resolve worker termination and sync issues
- [x] **Phase 3: Performance** — Optimize render loop and chunk management
- [ ] **Phase 4: Dependency** — Self-host simplex-noise dependency
- [ ] **Phase 5: Core Shadows** — Directional shadow map with hard edges from sun position
- [ ] **Phase 6: Shadow Integration** — Full render distance coverage, sun tracking, and performance

---

## Phase Details

### Phase 1: WebGL Foundation (Complete)
**Goal**: Fix memory leaks and context loss handling
**Depends on**: Nothing (first phase)
**Requirements**: GL-01, GL-02, GL-03
**Success Criteria** (what must be TRUE):
  1. WebGL resources are tracked and cleaned up without memory leaks
  2. Application recovers automatically from WebGL context loss without page reload
  3. FPS is monitored and warnings logged when dropping below 50fps
**Plans**: 3/3 complete

### Phase 2: Worker System (Complete)
**Goal**: Resolve worker termination and mesh synchronization issues
**Depends on**: Phase 1
**Requirements**: WRK-01, WRK-02
**Success Criteria** (what must be TRUE):
  1. Workers terminate gracefully only after completing in-progress jobs
  2. Chunk mesh state machine prevents race conditions between workers and main thread
**Plans**: 2/2 complete

### Phase 3: Performance (Complete)
**Goal**: Optimize render loop and chunk management
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Chunks render via instanced rendering with shader-based transforms
  2. Only visible chunks are processed using grid-based spatial culling
  3. Neighbor calculations use cached dirty flags for incremental rebuilds
**Plans**: 4/4 complete

### Phase 4: Dependency
**Goal**: Remove external CDN dependency by self-hosting simplex-noise
**Depends on**: Nothing (can execute independently, but ordered first for clean baseline)
**Requirements**: DEPS-01
**Success Criteria** (what must be TRUE):
  1. Application loads simplex-noise from local files instead of CDN
  2. Terrain generation produces identical results after migration (no behavioral change)
  3. Application works offline without network access to external CDNs
**Plans**: 1 plan

### Phase 5: Core Shadows
**Goal**: Render directional shadows from the sun position with hard edges
**Depends on**: Phase 4 (or nothing — DEPS-01 is independent)
**Requirements**: SHADOW-01, SHADOW-03, SHADOW-04, SHADOW-07
**Success Criteria** (what must be TRUE):
  1. A shadow map framebuffer is created and managed by the resource registry (no leaks)
  2. Scene geometry casts shadows in the direction of the sun/light
  3. Shadow edges are hard (no soft/blur filtering applied)
  4. Shadow map uses a fixed resolution quality default with no UI toggle
**Plans**: TBD

### Phase 6: Shadow Integration
**Goal**: Shadows cover full render distance, track sun movement, and maintain 60fps
**Depends on**: Phase 5
**Requirements**: SHADOW-02, SHADOW-05, SHADOW-06, SHADOW-08
**Success Criteria** (what must be TRUE):
  1. All visible chunks within render distance cast and receive shadows
  2. Shadow map integrates into the existing deferred rendering GBuffer pipeline
  3. Shadows update in real-time as the sun moves during the day/night cycle
  4. Frame rate stays at 60fps on mid-range hardware with shadows enabled at default settings
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. WebGL Foundation | 3/3 | Complete | 2026-03-28 |
| 2. Worker System | 2/2 | Complete | 2026-03-28 |
| 3. Performance | 4/4 | Complete | 2026-03-28 |
| 4. Dependency | 0/1 | Not started | - |
| 5. Core Shadows | 0/3 | Not started | - |
| 6. Shadow Integration | 0/3 | Not started | - |

---

*Last updated: 2026-04-02 for v2.0 Shadows milestone*
