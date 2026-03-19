# External Integrations

**Analysis Date:** 2026-03-18

## External Libraries

**Procedural Generation:**
- simplex-noise - Terrain/world generation algorithm
  - CDN: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Used by: `chunkWorker.js`, `world.js`, `biomes.js`

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
- Textures: `voxx-js/textures-atlas.png` (sprite sheet)
- Configuration: `voxx-js/config.js` (runtime constants)

## Authentication & Identity

**Auth Provider:**
- None (single-player local game)

## Monitoring & Observability

**Error Tracking:**
- Browser console logging only
- No external error tracking services

**Logs:**
- `console.log()` for debug output
- Performance metrics via `performance.js`

## CI/CD & Deployment

**Hosting:**
- Static file deployment
- Any web server (nginx, Apache, Netlify, Vercel, GitHub Pages)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None (no server-side configuration)

**Secrets location:**
- None (no secrets required)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Browser APIs Used

**Graphics:**
- WebGL2 - 3D rendering context
- Canvas 2D - (UI overlays only)

**Input:**
- Pointer Lock API - Mouse capture for FPS controls
- Keyboard Events - Movement and interaction
- Mouse Events - Look and block editing

**Performance:**
- requestAnimationFrame - Render loop
- Web Workers - Chunk generation (off main thread)
- performance.now() - FPS/metrics tracking

**File Loading:**
- Image() constructor - Texture atlas loading
- crossOrigin attribute - CORS-enabled texture loading

## No External Integrations

This project is fully self-contained:
- No backend server
- No database
- No external APIs
- No authentication services
- No analytics
- No cloud storage

All data (terrain, blocks) is generated procedurally and exists only in browser memory.

---

*Integration audit: 2026-03-18*
