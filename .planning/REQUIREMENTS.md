# Requirements: Voxx-js Voxel Engine

**Defined:** 2026-03-16
**Core Value:** Deliver a stable, performant voxel engine with core gameplay features (block placement, collision detection, persistence).

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Tech Debt

- [ ] **TECH-01**: Eliminate duplicate world data structures (World vs ChunkManager) — consolidate chunk management into ChunkManager only
- [x] **TECH-02**: Extract hardcoded constants (CHUNK_SIZE = 32) to shared constants module
- [ ] **TECH-03**: Add error handling to async module loading in Engine.initSystems()
- [ ] **TECH-04**: Implement stub methods (loadWorld, saveWorld, update persistence) with IndexedDB
- [ ] **TECH-05**: Fix event listener memory leaks in Player class — add cleanup method
- [ ] **TECH-06**: Implement logging levels, disable debug logs in production
- [x] **TECH-07**: Add package.json with dependencies (Three.js, Cannon-es, Simplex-noise, Dexie)

### Bug Fixes

- [ ] **BUG-01**: Fix non-deterministic world generation — replace Math.random with seeded RNG (simplex-noise)
- [ ] **BUG-02**: Fix diagonal movement physics normalization — ensure diagonal movement not faster than straight
- [ ] **BUG-03**: Implement collision detection — player cannot walk through blocks or fall through floor
- [ ] **BUG-04**: Add input validation for voxel coordinates to prevent array index out of bounds

### Missing Features (Core)

- [ ] **FEAT-01**: Implement block placement and removal via raycasting
- [ ] **FEAT-02**: Add world persistence using IndexedDB (save/load chunks)
- [ ] **FEAT-03**: Implement inventory system (9-slot hotbar for block selection)
- [ ] **FEAT-04**: Add seeded terrain generation (deterministic worlds)
- [ ] **FEAT-05**: Implement chunk loading throttling and memory pooling

### Performance Improvements

- [ ] **PERF-01**: Add frustum culling for rendering — only render visible chunks
- [ ] **PERF-02**: Implement chunk object pooling to reduce memory allocations
- [ ] **PERF-03**: Add chunk loading hysteresis and distance threshold
- [ ] **PERF-04**: Upgrade to WebGL 2.0 with WebGL 1.0 fallback
- [ ] **PERF-05**: Implement vertex pooling to reduce draw calls (avoid naive chunk rendering)

### Security Considerations

- [ ] **SEC-01**: Add validation at World level for coordinate inputs
- [ ] **SEC-02**: Ensure event listeners are properly removed on cleanup

### Test Coverage

- [x] **TEST-01**: Add test framework and basic test structure
- [ ] **TEST-02**: Write tests for world generation determinism
- [ ] **TEST-03**: Write tests for chunk coordinate calculations
- [ ] **TEST-04**: Write tests for player physics calculations
- [ ] **TEST-05**: Write tests for renderer matrix math

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Differentiators

- **DIFF-01**: Ambient occlusion shading for visual depth
- **DIFF-02**: Real-time shadows (shadow mapping)
- **DIFF-03**: Advanced terrain features (caves, structures)
- **DIFF-04**: Mobile touch controls
- **DIFF-05**: Sound effects and audio

### Advanced Features

- **ADV-01**: Multiplayer networking
- **ADV-02**: Modding/plugin system
- **ADV-03**: Advanced biome system
- **ADV-04**: Dynamic lighting
- **ADV-05**: Particle effects

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer | High complexity, single-player focus for v1 |
| Advanced lighting/shadows | Keep rendering simple for performance |
| Complex terrain features | Basic terrain only |
| Mobile touch controls | Desktop-first with keyboard/mouse |
| Sound effects | Visual experience only |
| Modding/plugin system | Fixed feature set for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TECH-01 | Phase 1 | Pending |
| TECH-02 | Phase 1 | Complete |
| TECH-03 | Phase 1 | Pending |
| TECH-04 | Phase 5 | Pending |
| TECH-05 | Phase 1 | Pending |
| TECH-06 | Phase 1 | Pending |
| TECH-07 | Phase 1 | Complete |
| BUG-01 | Phase 1 | Pending |
| BUG-02 | Phase 3 | Pending |
| BUG-03 | Phase 3 | Pending |
| BUG-04 | Phase 1 | Pending |
| FEAT-01 | Phase 4 | Pending |
| FEAT-02 | Phase 5 | Pending |
| FEAT-03 | Phase 4 | Pending |
| FEAT-04 | Phase 4 | Pending |
| FEAT-05 | Phase 2 | Pending |
| PERF-01 | Phase 2 | Pending |
| PERF-02 | Phase 5 | Pending |
| PERF-03 | Phase 2 | Pending |
| PERF-04 | Phase 2 | Pending |
| PERF-05 | Phase 2 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*