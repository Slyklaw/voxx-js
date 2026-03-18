# State: Voxx-JS Block Editing

**Last Updated:** 2026-03-18

---

## Project Reference

**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

**Current Milestone:** v1.1 Block Editing

**Mode:** yolo

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | Not started (defining requirements) |
| **Plan** | — |
| **Status** | Defining requirements |
| **Progress** | 0 / ? phases |

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Frame Rate | 60fps | 60fps |
| Block Edit Latency | < 16ms | N/A |
| Chunk Rebuild | < 50ms | N/A |

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

- No block persistence yet (world resets on reload)
- Chunk mesh rebuild not optimized (full rebuild on edit)
- No undo/redo for block edits

---

## Session Continuity

### What's Been Done

1. v1.0 milestone completed — WebGL2 refactor shipped (2026-03-18)
2. Core rendering pipeline functional with 60fps performance
3. Procedural terrain, controls, day/night cycle, debug UI

### What's Next

1. Define requirements for block editing features
2. Create roadmap with phases
3. Plan Phase 1: Core block operations

---

*State updated: 2026-03-18*
