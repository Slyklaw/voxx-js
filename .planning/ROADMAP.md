# Roadmap: Voxx-JS Tech Debt Cleanup

## Summary

**Phases:** 4
**Depth:** quick
**Coverage:** 15/15 requirements mapped ✓

## Phases

- [x] **Phase 1: Dead Code Removal** - Remove Three.js refs, unused modules, legacy methods
- [x] **Phase 2: Deduplication** - Extract shared greedy meshing, consolidate constants
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

**Plans:** 1 - 01-dead-code-removal-PLAN.md (4 tasks)

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

**Plans:** 1 - 02-deduplication-PLAN.md (5 tasks)

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

**Plans:** 1 - 02-deduplication-PLAN.md (5 tasks including verification)

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

**Plans:** 1 - 02-deduplication-PLAN.md (5 tasks including verification)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dead Code Removal | 1/1 | Complete | 2026-03-18 |
| 2. Deduplication | 1/1 | Complete | 2026-03-18 |
| 3. Bug Fixes | 0/1 | Not started | - |
| 4. Performance & Validation | 0/1 | Not started | - |

---

*Roadmap created: 2026-03-18*
