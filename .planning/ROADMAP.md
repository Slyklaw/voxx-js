# Roadmap: voxx-js

**Created:** 2026-03-27
**Current milestone:** v2.1 Cleanup
**Last updated:** 2026-11-03

## Milestones

- ✅ **v1.0 WebGL Foundation** — Phases 1-3 (shipped 2026-04-01)
- ✅ **v2.0 Shadows** — Phases 4-6 (shipped 2026-11-03)
- 🚧 **v2.1 Cleanup** — Phases 7-9 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 WebGL Foundation (Phases 1-3) — SHIPPED 2026-04-01</summary>

- [x] Phase 1: WebGL Foundation (3/3 plans) — completed 2026-03-28
- [x] Phase 2: Worker System (2/2 plans) — completed 2026-03-28
- [x] Phase 3: Performance (4/4 plans) — completed 2026-03-28

</details>

<details>
<summary>✅ v2.0 Shadows (Phases 4-6) — SHIPPED 2026-11-03</summary>

- [x] Phase 4: Dependency (1/1 plan) — completed 2026-04-02
- [x] Phase 5: Core Shadows (1/1 plan) — completed 2026-04-02
- [x] Phase 6: Shadow Integration (2/2 plans) — completed 2026-04-03

</details>

### v2.1 Cleanup (In Progress)

- [x] **Phase 7: State Encapsulation** — Encapsulate global state in modules (main.js, render.js) (completed 2026-11-04)
- [x] **Phase 8: WebGL Resource Manager** — Centralize WebGL resource creation and disposal (completed 2026-11-04)
- [ ] **Phase 9: Code Hygiene & Module Boundaries** — Remove dead code and clarify module boundaries

---

## Phase Details

### Phase 7: State Encapsulation
**Goal**: Encapsulate global state in modules, eliminating global variable pollution in main.js and render.js
**Depends on**: Nothing (first phase of milestone)
**Requirements**: QUAL-01
**Success Criteria** (what must be TRUE):
  1. No mutable state is declared as a global (`window`/top-level `var`/`let`) in main.js or render.js; state lives in module scope
  2. Modules expose state via explicit exports and receive dependencies through function parameters/imports
  3. All existing Vitest tests pass without modification
  4. Application runs with no behavioral regression in a manual browser smoke test
**Plans**: TBD

### Phase 8: WebGL Resource Manager
**Goal**: Centralize WebGL resource creation and disposal in a single resource manager
**Depends on**: Phase 7
**Requirements**: QUAL-02
**Success Criteria** (what must be TRUE):
  1. A single module owns creation and disposal of WebGL resources (buffers, textures, framebuffers, programs)
  2. Resource lifecycle integrates with the existing context registry (no leaks on context loss)
  3. All existing Vitest tests pass without modification
  4. Application runs with no behavioral regression in a manual browser smoke test
**Plans**: TBD

### Phase 9: Code Hygiene & Module Boundaries
**Goal**: Remove dead code and clarify module boundaries to enforce the layered architecture
**Depends on**: Phase 8
**Requirements**: CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. Unused code, exports, and stale comments are removed; no dead branches remain
  2. Module imports respect the layered architecture (Presentation/Game Logic/Interaction/Application); no circular dependencies
  3. All existing Vitest tests pass without modification
  4. Application runs with no behavioral regression in a manual browser smoke test
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. WebGL Foundation | v1.0 | 3/3 | Complete | 2026-03-28 |
| 2. Worker System | v1.0 | 2/2 | Complete | 2026-03-28 |
| 3. Performance | v1.0 | 4/4 | Complete | 2026-03-28 |
| 4. Dependency | v2.0 | 1/1 | Complete | 2026-04-02 |
| 5. Core Shadows | v2.0 | 1/1 | Complete | 2026-04-02 |
| 6. Shadow Integration | v2.0 | 2/2 | Complete | 2026-04-03 |
| 7. State Encapsulation | v2.1 | 2/2 | Complete | 2026-11-04 || 8. WebGL Resource Manager | v2.1 | 1/1 | Complete | 2026-11-04 || 9. Code Hygiene & Module Boundaries | v2.1 | 0/? | Not started | — |

---
*Last updated: 2026-11-03 for v2.1 Cleanup milestone*