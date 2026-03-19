# Requirements: Voxx-JS Tech Debt Cleanup

**Defined:** 2026-03-18
**Core Value:** Improve code quality and reliability without breaking existing functionality.

## v1 Requirements

Requirements for tech debt cleanup. Each maps to roadmap phases.

### Cleanup (Dead Code)

- [x] **CLEAN-01**: Remove Three.js references from `chunk.js` (comments, dead properties)
- [x] **CLEAN-02**: Remove or document `src/gl/test-render.js` purpose
- [x] **CLEAN-03**: Remove unused `World.generateChunk()` method from `world.js`
- [x] **CLEAN-04**: Remove remaining debug log statements from production paths

### Deduplication

- [x] **DEDUP-01**: Extract greedy meshing to shared utility module
- [x] **DEDUP-02**: Consolidate chunk constants to single source, import where needed

### Bug Fixes

- [x] **BUG-01**: Fix block selection mismatch — mousewheel uses count=5 but keys 1-9 work
- [x] **BUG-02**: Connect render distance UI buttons to actual render distance parameter
- [x] **BUG-03**: Implement WebGL context loss/restore handler in `context.js`
- [x] **BUG-04**: Fix block selector UI to update with scroll changes

### Performance

- [ ] **PERF-01**: Add debug flag to disable console.log statements in production
- [ ] **PERF-02**: Replace worker pool callback ID generation with collision-safe approach
- [ ] **PERF-03**: Add bounds assertions for block type lookups in debug mode

### Validation

- [ ] **VAL-01**: Add debug mode assertion for invalid block types
- [ ] **VAL-02**: Add input bounds checking for camera position and rotation

## v2 Requirements

Deferred to future work.

### Quality

- **TEST-01**: Add unit tests for terrain generation
- **TEST-02**: Add unit tests for greedy meshing algorithm
- **TEST-03**: Add integration tests for worker communication

### Features

- **FEAT-01**: Implement collision detection
- **FEAT-02**: Add world persistence (save/load)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Lighting/shadows | Visual polish, not tech debt |
| Mobile WebGL1 fallback | Low priority, current users have modern browsers |
| LOD system | Deferred to performance optimization phase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 1 | Complete |
| CLEAN-02 | Phase 1 | Complete |
| CLEAN-03 | Phase 1 | Complete |
| CLEAN-04 | Phase 1 | Complete |
| DEDUP-01 | Phase 2 | Complete |
| DEDUP-02 | Phase 2 | Complete |
| BUG-01 | Phase 3 | Complete |
| BUG-02 | Phase 3 | Complete |
| BUG-03 | Phase 3 | Complete |
| BUG-04 | Phase 3 | Complete |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |
| VAL-01 | Phase 4 | Pending |
| VAL-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Complete: 10
- Pending: 5 (PERF-01, PERF-02, PERF-03, VAL-01, VAL-02)

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
