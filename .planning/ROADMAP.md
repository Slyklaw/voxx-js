# Roadmap: voxx-js

**Created:** 2026-03-27
**Phases:** 5
**Requirements:** 13 (all mapped)

## Phases

- [ ] **Phase 1: WebGL Foundation** — Fix memory leaks and context loss handling
- [ ] **Phase 2: Worker System** — Resolve worker termination and sync issues
- [ ] **Phase 3: Performance** — Optimize render loop and chunk management
- [ ] **Phase 4: User Experience** — Add loading progress and quality settings
- [ ] **Phase 5: Code Quality** — Refactor globals and self-host dependencies

---

## Phase Details

### Phase 1: WebGL Foundation

**Goal:** Fix memory leaks and context loss handling for stable long-term rendering

**Depends on:** Nothing (first phase)

**Requirements:** GL-01, GL-02, GL-03

**Success Criteria** (what must be TRUE):
  1. User can play for 30+ minutes without memory usage increasing
  2. Context loss is detected within 1 second and resources are recreated
  3. Frame rate stays above 50fps during normal gameplay

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Resource registration & memory management (GL-01)
- [x] 01-02-PLAN.md — Context loss handling with UI (GL-02)
- [x] 01-03-PLAN.md — Performance monitoring (GL-03)

---

### Phase 2: Worker System

**Goal:** Fix worker termination race conditions and chunk mesh synchronization

**Depends on:** Phase 1

**Requirements:** WRK-01, WRK-02

**Success Criteria** (what must be TRUE):
  1. Rapid chunk loading/unloading does not produce console errors
  2. Block changes always result in correct mesh updates within 1 frame
  3. Worker termination waits for in-progress jobs to complete

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Graceful worker termination (WRK-01)
- [ ] 02-02-PLAN.md — Mesh synchronization (WRK-02)

---

### Phase 3: Performance

**Goal:** Optimize render loop and chunk visibility for smooth 60fps rendering

**Depends on:** Phase 2

**Requirements:** PERF-01, PERF-02, PERF-03

**Success Criteria** (what must be TRUE):
  1. Matrix calculations run in vertex shaders (verifiable via shader inspection)
  2. Chunk visibility only updates when camera moves significantly
  3. Neighbor calculations are cached and don't repeat per chunk load

**Plans:** TBD

---

### Phase 4: User Experience

**Goal:** Add missing user-facing features for polished experience

**Depends on:** Phase 3

**Requirements:** UX-01, UX-02

**Success Criteria** (what must be TRUE):
  1. Loading screen shows progress percentage during initial world generation
  2. User can toggle SSAO on/off via UI
  3. User can adjust render distance (4, 8, 12, 16 chunks)

**Plans:** TBD

---

### Phase 5: Code Quality

**Goal:** Refactor global state and address dependency risks

**Depends on:** Phase 4

**Requirements:** QUAL-01, QUAL-02, DEPS-01

**Success Criteria** (what must be TRUE):
  1. main.js has 3 or fewer global variables
  2. All WebGL resources are managed through a centralized ResourceManager class
  3. simplex-noise is loaded from local file, not CDN

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
| 1. WebGL Foundation | 3/3 | Complete | 2026-03-28 |
| 2. Worker System | 1/2 | In Progress | - |
| 3. Performance | 0/1 | Not started | - |
| 4. User Experience | 0/1 | Not started | - |
| 5. Code Quality | 0/1 | Not started | - |

---

*Roadmap created: 2026-03-27*
*5 phases, 13 requirements mapped*
