# Requirements: Voxx-JS Tech Debt Removal

**Defined:** 2026-03-18
**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.
**Milestone:** v1.3 Tech Debt Removal

## v1.3 Requirements

Tech debt removal and code cleanup. Each maps to roadmap phases.

### Code Cleanup

- [ ] **DEBT-01**: Extract shared mesh generation module to eliminate duplication between chunk.js and chunkWorker.js
- [ ] **DEBT-02**: Consolidate ChunkCore and Chunk classes into single implementation
- [ ] **DEBT-03**: Remove unused ChunkManager module (src/chunk/chunkManager.js)
- [ ] **DEBT-04**: Remove test cube function and related dead code from render.js
- [ ] **DEBT-05**: Remove test-render.js module if unused in main flow
- [ ] **DEBT-06**: Remove commented debug code blocks from source files

### Console Cleanup

- [ ] **DEBT-07**: Remove or disable texture/UV logging that causes console spam during chunk generation
- [ ] **DEBT-08**: Remove one-time debug indicators from blocks.js, chunk.js, renderer.js

### Configuration Centralization

- [ ] **DEBT-09**: Move atlas dimensions (1024x512, 16x16 tiles) to config.js, update all references
- [ ] **DEBT-10**: Verify all hardcoded chunk dimensions use config constants

### Memory Management

- [ ] **DEBT-11**: Add proper WebGL resource cleanup (VAO, VBO, IBO deletion) in chunk dispose()
- [ ] **DEBT-12**: Add context loss recovery stub implementation in context.js

### Dependency Management

- [ ] **DEBT-13**: Vendor simplex-noise library locally (copy from CDN to local file)
- [ ] **DEBT-14**: Remove CDN imports of simplex-noise, update to local import

## v2 Requirements

Deferred to future milestones.

### Performance

- **PERF-01**: Implement frustum culling for visible chunks only
- **PERF-02**: Add incremental mesh updates for single block changes
- **PERF-03**: Optimize greedy meshing algorithm

### Persistence

- **PERS-01**: Save world state to localStorage
- **PERS-02**: Load world state from localStorage on startup

### Testing

- **TEST-01**: Add testing infrastructure (Jest or similar)
- **TEST-02**: Unit tests for chunk generation
- **TEST-03**: Unit tests for mesh generation

### Features

- **FEAT-01**: Block physics (falling sand, water flow)
- **FEAT-02**: Multiple biomes with unique terrain
- **FEAT-03**: Day/night cycle toggle

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Build system / bundling | No-build is intentional constraint for learning |
| Minification | Same as above |
| Multiplayer | Requires server infrastructure |
| Physics/collisions | Free-flight camera for exploration |
| Mobile support | Desktop-first |
| Asset pipeline | Manual texture editing is acceptable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 1 | Pending |
| DEBT-02 | Phase 1 | Pending |
| DEBT-03 | Phase 1 | Pending |
| DEBT-04 | Phase 2 | Pending |
| DEBT-05 | Phase 2 | Pending |
| DEBT-06 | Phase 2 | Pending |
| DEBT-07 | Phase 2 | Pending |
| DEBT-08 | Phase 2 | Pending |
| DEBT-09 | Phase 3 | Pending |
| DEBT-10 | Phase 3 | Pending |
| DEBT-11 | Phase 3 | Pending |
| DEBT-12 | Phase 3 | Pending |
| DEBT-13 | Phase 4 | Pending |
| DEBT-14 | Phase 4 | Pending |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after codebase mapping*
