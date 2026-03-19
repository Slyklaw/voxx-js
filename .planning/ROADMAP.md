# Roadmap: Voxx-JS Tech Debt Cleanup

## Summary

**Phases:** 4
**Depth:** quick
**Coverage:** 15/15 requirements mapped ✓

## Phases

- [ ] **Phase 1: Dead Code Removal** - Remove Three.js refs, unused modules, legacy methods
- [ ] **Phase 2: Deduplication** - Extract shared greedy meshing, consolidate constants
- [ ] **Phase 3: Bug Fixes** - Fix block selection, render distance, context loss handler
- [ ] **Phase 4: Performance & Validation** - Debug flags, assertions, input bounds checking

---

## Phase Details

### Phase 1: Dead Code Removal

**Goal:** Remove dead code and unused artifacts to reduce maintenance burden

**Depends on:** Nothing (first phase)

**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04

**Success Criteria** (what must be TRUE):
1. `voxx-js/chunk.js` contains no Three.js references (comments or properties)
2. `voxx-js/src/gl/test-render.js` is either removed or has documented purpose
3. `voxx-js/world.js` does not contain unused `generateChunk()` method
4. All `console.log` calls are guarded by debug flag check

**Plans:** TBD

---

### Phase 2: Deduplication

**Goal:** Unify duplicated code to prevent future divergence

**Depends on:** Phase 1

**Requirements:** DEDUP-01, DEDUP-02

**Success Criteria** (what must be TRUE):
1. Greedy meshing algorithm exists in exactly one location, imported where needed
2. Chunk dimension constants defined once, imported by all consumers
3. Both `chunk.js` and `chunkWorker.js` use shared greedy meshing utility
4. No compilation or runtime errors after refactoring

**Plans:** TBD

---

### Phase 3: Bug Fixes

**Goal:** Fix known bugs identified in codebase audit

**Depends on:** Phase 2

**Requirements:** BUG-01, BUG-02, BUG-03, BUG-04

**Success Criteria** (what must be TRUE):
1. Mousewheel block selection allows selecting blocks 1-9 (matching keyboard support)
2. Render distance UI buttons actually change the visible chunk count
3. WebGL context loss triggers recovery sequence, application continues after restore
4. Block selector UI visually reflects current selected block

**Plans:** TBD

---

### Phase 4: Performance & Validation

**Goal:** Add debug infrastructure and input validation

**Depends on:** Phase 3

**Requirements:** PERF-01, PERF-02, PERF-03, VAL-01, VAL-02

**Success Criteria** (what must be TRUE):
1. Debug mode flag exists and controls console.log output
2. Worker pool callback IDs use incrementing counter (no collision risk)
3. Invalid block types trigger assertion in debug mode
4. Camera position/rotation values are bounds-checked

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dead Code Removal | 0/1 | Not started | - |
| 2. Deduplication | 0/1 | Not started | - |
| 3. Bug Fixes | 0/1 | Not started | - |
| 4. Performance & Validation | 0/1 | Not started | - |

---

*Roadmap created: 2026-03-18*
