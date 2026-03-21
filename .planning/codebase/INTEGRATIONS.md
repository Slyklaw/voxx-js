# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**CDN Resources:**
- simplex-noise ^4.0.3
  - Source: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Purpose: Procedural noise generation for terrain
  - Used in: `biomes.js`, `world.js`, `chunkWorker.js`
  - Fallback: Could be bundled locally if CDN unavailable

## Data Storage

**Databases:**
- None - No persistent data storage

**File Storage:**
- None - No file operations

**Caching:**
- None - No caching layer

## Authentication & Identity

**Auth Provider:**
- None - No authentication system
- Browser pointer lock API used for FPS controls

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking (Sentry, etc.)

**Logs:**
- Console logging only (`console.log`, `console.error`)
- `dev.log` file present (development artifact)

## CI/CD & Deployment

**Hosting:**
- Static files only
- Can be served from any static hosting (GitHub Pages, Netlify, S3, nginx, Apache)
- No backend server required

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None - No environment variables used

**Secrets location:**
- Not applicable - No secrets in this project

## Webhooks & Callbacks

**Incoming:**
- None - No incoming webhooks

**Outgoing:**
- None - No outgoing HTTP requests

## Browser APIs Used

**Graphics:**
- WebGL2 - 3D rendering pipeline
  - VBO/VAO for geometry
  - FBO for render targets
  - UBO for uniform blocks
  - GLSL shaders (vertex + fragment)

**Input:**
- Pointer Lock API - Mouse capture for FPS controls
- Keyboard events - Movement (WASD, SPACE, SHIFT)
- Mouse events - Camera control, block selection

**Workers:**
- Web Workers - Offload chunk generation to background threads
- WorkerPool pattern in `workerPool.js`

**Utilities:**
- requestAnimationFrame - Game loop
- Performance API - FPS tracking in `src/gl/performance.js`

---

*Integration audit: 2026-03-21*
