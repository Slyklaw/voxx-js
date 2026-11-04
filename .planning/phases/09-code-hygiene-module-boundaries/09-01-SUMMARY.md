# Phase 09 Plan 01: Code Hygiene & Module Boundaries

## Summary
Cleaned dead code and stale comments in `src/main.js` and `src/gl/render.js`. Removed unused imports, stale comments (moved-into-appState notes, debug-only commented lines), and dead test-cube helpers (`createCubeMesh`, `createMockChunkMesh`) confirmed unused via grep. No behavior change; window.* globals preserved.

## Verification
- Vitest: 45/45 tests pass

## Commit
refactor(09-01): code hygiene and module boundaries
