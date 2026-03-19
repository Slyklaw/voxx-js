# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Noise Generation:**
- simplex-noise@4.0.3 - Procedural terrain generation
  - Import: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Usage: Terrain heightmaps in `voxx-js/world.js`, `voxx-js/chunkWorker.js`, `voxx-js/biomes.js`

**Browser APIs (no external services):**
- WebGL2 - Native GPU rendering
- Web Workers - Off-main-thread computation
- Pointer Lock API - Mouse capture for FPS controls

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
- Assets loaded from relative paths:
  - `voxx-js/textures-atlas.png` - Block texture atlas (1024x512)
  - `voxx-js/style.css` - UI styling

**Runtime State:**
- In-memory only
- World chunks stored in JavaScript Map (`world.chunks`)
- No persistence or save/load functionality

## Authentication & Identity

**Auth Provider:**
- None (single-player local experience)

## Monitoring & Observability

**Error Tracking:**
- None (no external service)

**Logs:**
- `console.log()` / `console.error()` for development debugging
- FPS counter rendered in UI (`#debug-ui .debug-fps`)

**Performance Monitoring:**
- Custom performance module in `voxx-js/src/gl/performance.js`
- Tracks: FPS, render timing, chunk counts

## CI/CD & Deployment

**Hosting:**
- Static file hosting (any web server)
- No specialized deployment target

**CI Pipeline:**
- None

## Environment Configuration

**Required env vars:**
- None

**Secrets location:**
- None (no external services requiring credentials)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-03-18*
