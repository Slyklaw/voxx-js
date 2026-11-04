# Phase 08 Plan 01: WebGL Resource Manager

## Summary
Added centralized WebGL resource manager module `src/gl/resourceManager.js` owning creation/disposal of WebGL resources (buffers, textures, framebuffers, programs, VAOs). Tracks resources in a Set/Map and registers dispose/init hooks with the context registry for context-loss recovery. Exported `ResourceManager` class, `createResourceManager` factory, and singleton `resourceManager` bound to shared gl. Integrated non-breaking imports into `src/gl/render.js` and `src/main.js`.

## Verification
- `node --check` passes
- Vitest: 45/45 tests pass
- Module importable in Node (gl guarded to null)

## Commit
refactor(08-01): add webgl resource manager