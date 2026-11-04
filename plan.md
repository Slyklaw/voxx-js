# voxx-js Cleanup & Quality Plan

Decisions:
1. Canonical chunk size: 32 (`CHUNK_WIDTH`).
2. `src/chunk/chunkManager.js`: delete.
3. Tooling: keep dependency-light; no ESLint/Prettier/CI added now.
4. Move root core modules into `src/`.

## Phase 0 — Baseline & Safety ✅ Completed
- Run `npm run test:run`; record baseline (45 tests passing).
- Run `npm run dev`; manual smoke: chunks render, camera, block edit, no console errors.
- Document smoke checklist in README or `docs/smoke.md`.

Verification: tests pass; app renders.

## Phase 1 — Unify Chunk Model to 32 ✅ Completed
- In `src/gl/render.js`, replace `CHUNK_SIZE` usage with `CHUNK_WIDTH` from `src/constants.js`.
- Replace `defaultChunkManager.getVisibleChunks(...)` camera path with `appState.world.getVisibleChunks()`.
- Replace `defaultChunkManager.getRenderDistance()` with `appState.renderDistance`.
- Remove imports of `chunkManager`.

Verification: `npm run test:run`; manual render smoke; geometry at correct world positions.

## Phase 2 — Delete `src/chunk/chunkManager.js` ✅ Completed
- Remove file and all imports (`src/main.js`, `src/gl/render.js`).
- Remove `src/chunk/` directory if empty.
- Update AGENTS.md if needed.

Verification: no import errors; tests pass.

## Phase 3 — Move Root Core Modules into `src/` ✅ Completed
Move:
- `chunk.js` -> `src/core/chunk.js`
- `world.js` -> `src/core/world.js`
- `biomes.js` -> `src/core/biomes.js`
- `blocks.js` -> `src/core/blocks.js`
- `greedyMesh.js` -> `src/core/greedyMesh.js`
- `config.js` -> `src/core/config.js`

Update:
- All imports in `src/`, `tests/`, `chunkWorker.js`, `workerPool.js` usage.
- `index.html` still loads `src/main.js`.
- Test paths (`../../chunk.js` -> `../../src/core/chunk.js`).

Verification: `npm run test:run`; `npm run dev` smoke.

## Phase 4 — Remove Dead Code & Global Coupling ✅ Completed (InputHandler coupling removed)
- Remove unused exports/functions discovered after moves.
- Replace `window.*` globals (`toggleWireframe`, `setRenderDistance`, `_shadowFrustumSize`) with `appState`/module callbacks.
- Remove commented-out debug blocks and stale atlas logging.
- Reduce `console.log` to `DEBUG`-gated only.

Verification: lint not available; manual smoke; tests pass.

## Phase 5 — Test Coverage Expansion
- Add unit tests for `World` chunk lifecycle.
- Add tests for render offset math (32-based).
- Add `BlockEditor` targeting tests with mocked world.
- Add coverage threshold in `vitest.config.js` after baseline.

Verification: `npm run test:run -- --coverage`.

## Phase 6 — Rendering & Runtime Quality
- Remove broken camera-based visibility path leftovers.
- Review `disposeWebGLResources` for leaks.
- Throttle chunk rebuilds and verify worker cancellation edge cases.
- Long-run smoke test (5+ min) for memory/context loss.

Verification: manual long-run smoke; tests pass.

## Recommended Order
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6.

## Risks
- Offset changes can shift all geometry.
- Module moves affect many imports/tests.
- Worker pool race conditions during cleanup.

## Tracking
Tackle one phase per PR/commit. After each phase run tests and manual smoke.