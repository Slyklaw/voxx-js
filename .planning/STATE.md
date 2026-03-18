# State: Voxx-JS WebGL2 Refactor

**Last Updated:** 2026-03-17

---

## Project Reference

**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

**Current Focus:** Phase 1: WebGL2 Context & Shaders

**Mode:** yolo

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | Not started (awaiting planning) |
| **Plan** | None |
| **Status** | Ready for Phase 1 planning |
| **Progress** | 0 / 5 phases |

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Frame Rate | 60fps | N/A (pre-refactor) |
| Render Distance | 8+ chunks | N/A |
| Bundle Size | < 100KB (vs 600KB Three.js) | N/A |

---

## Accumulated Context

### Decisions

- Using raw WebGL2 (not WebGL1) for native VAO/instancing support
- VAO-per-chunk pattern for efficient draw calls
- UBO for shared globals (camera, projection, lighting)
- glMatrix for matrix math (lightweight 6KB)
- ES Modules with CDN loading (no build system)

### Known Blockers

- None yet (pristine refactor)

### Technical Debt

- Three.js renderer still in place (will be replaced)
- Existing chunk.js, camera.js, workerPool.js remain unchanged

---

## Session Continuity

### What's Been Done

1. Project initialized with core value and constraints
2. Requirements defined (17 v1 requirements across 6 categories)
3. Research completed (WebGL2 patterns, pitfalls, architecture)
4. Roadmap created (5 phases derived from requirements)

### What's Next

1. Plan Phase 1: WebGL2 Context & Shaders
2. Execute Phase 1 implementation
3. Verify success criteria before advancing

---

## Phase Status

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | WebGL2 Context & Shaders | WEBGL-01, 02, 03 | Not started |
| 2 | Core Rendering Pipeline | RENDER-01 to 06 | Not started |
| 3 | Chunk Mesh Integration | CHUNK-01, 02, 03 | Not started |
| 4 | Camera & Controls Integration | CAMERA-01, 02, 03 | Not started |
| 5 | Polish & Performance | PERF-01, 02 | Not started |

---

*State updated: 2026-03-17*
