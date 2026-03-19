# Roadmap: Voxx-JS Tech Debt Cleanup

## Milestones

- ✅ **v1.0 Tech Debt Cleanup** — Phases 1-4 (shipped 2026-03-19)

## Current Phase

No active phases. See `.planning/milestones/` for completed milestones.

## Archived Milestones

<details>
<summary>✅ v1.0 Tech Debt Cleanup — SHIPPED 2026-03-19</summary>

### Summary
15/15 requirements complete. Removed dead code, deduplicated greedy meshing, fixed 4 bugs, added debug infrastructure.

### Phase 1: Dead Code Removal ✓
- Removed Three.js references from chunk.js
- Deleted orphaned test-render.js
- Removed unused generateChunk() method
- Guarded console.log with DEBUG flag

### Phase 2: Deduplication ✓
- Created shared greedyMesh.js (~450 lines)
- Consolidated chunk constants in chunkCore.js
- Both chunk.js and chunkWorker.js refactored

### Phase 3: Bug Fixes ✓
- BUG-01: Block selection 1-9 via mousewheel
- BUG-02: Render distance UI connected
- BUG-03: WebGL context loss recovery
- BUG-04: Block selector UI updates

### Phase 4: Performance & Validation ✓
- Worker callback IDs use incrementing counter
- Block type assertions in debug mode
- Camera bounds checking added

**Stats:** 4 phases, 4 plans, ~25 commits, 1 new file (greedyMesh.js)

</details>

---

*For v1.0 details, see `.planning/milestones/v1.0-ROADMAP.md`*
