# External Integrations

**Analysis Date:** 2026-03-16

## APIs & External Services

**None detected** - This is a standalone, client-side voxel engine with no external service dependencies.

All functionality is implemented using browser-native APIs:

**Browser APIs Used:**
- WebGL 1.0 (`canvas.getContext('webgl')`) - `src/core/engine.js` lines 29-30
- DOM API (`document.getElementById`, `document.addEventListener`) - `src/core/engine.js` line 7, `src/player/player.js` lines 49-65
- Canvas API (`canvas.width`, `canvas.height`) - `src/core/engine.js` lines 12-13
- Pointer Lock API (`canvas.requestPointerLock`, `document.exitPointerLock`) - `src/player/player.js` lines 258-273
- RequestAnimationFrame (`requestAnimationFrame`) - `src/core/engine.js` line 102

## Data Storage

**Databases:**
- None - All data stored in-memory using JavaScript `Map` objects
  - Chunk storage: `src/chunks/chunk-manager.js` line 8
  - World storage: `src/core/world.js` line 7

**File Storage:**
- None - No file I/O operations detected
- Placeholder comments suggest future IndexedDB implementation (`src/core/world.js` lines 180, 187)

**Caching:**
- None - No caching mechanisms detected

## Authentication & Identity

**Auth Provider:**
- None - Single-user client-side application

## Monitoring & Observability

**Error Tracking:**
- None - Only `console.error()` calls for WebGL initialization failures (`src/core/engine.js` line 47, `src/core/renderer.js` line 95, line 124)

**Logs:**
- `console.log()` statements throughout for debugging purposes:
  - `src/core/engine.js` lines 45, 77, 121
  - `src/chunks/chunk-manager.js` lines 14, 64, 90
  - `src/chunks/chunk.js` line 21
  - `src/core/world.js` lines 11, 38
  - `src/player/player.js` line 38

## CI/CD & Deployment

**Hosting:**
- Static file hosting (any web server)
- Development: `npx serve .` (per README)

**CI Pipeline:**
- None detected (no CI configuration files)

## Environment Configuration

**Required env vars:**
- None

**Secrets location:**
- None required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Libraries

**None detected** - No imports of external packages found in any source files. All code is vanilla JavaScript.

## Network Communication

**None detected** - No `fetch`, `XMLHttpRequest`, or WebSocket usage found. The engine runs entirely client-side.

## Potential Future Integrations

Based on commented code in `src/core/world.js` lines 178-189, there are plans for:

**Planned Storage:**
- IndexedDB for world persistence (`src/core/world.js` line 180)
- No current implementation

**Planned Features (from README):**
- `build-atlas.js` script (mentioned in README line 10) - not present in codebase

---

*Integration audit: 2026-03-16*
