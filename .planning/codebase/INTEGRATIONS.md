# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Noise Generation:**
- Simplex Noise (simplex-noise@4.0.3)
  - Purpose: Procedural terrain height and biome generation
  - SDK/Client: ES Module imported via CDN
  - Auth: None (public CDN)
  - Location in code: `world.js`, `chunkWorker.js`, `biomes.js`

## Data Storage

**Databases:**
- Not applicable - All data in-memory

**File Storage:**
- Local assets only:
  - `textures-atlas.png` - Block texture atlas (static asset)
  - `index.html` - Application entry point
  - `style.css` - UI styles

**Caching:**
- Not applicable - No caching layer

## Authentication & Identity

**Auth Provider:**
- Not applicable - No authentication

## Monitoring & Observability

**Error Tracking:**
- Console logging only - `console.log`, `console.error` throughout codebase
- Debug mode toggle in UI (wireframe, debug colors)

**Logs:**
- Console output with prefixed tags:
  - `[WebGL2]` - WebGL resource management
  - `[BlockEdit]` - Block editing operations
  - `[Debug]` - Debug mode changes
  - `[Camera]` - Camera operations
  - `[Renderer]` - Rendering errors
  - `[ChunkWorker]` - Worker thread operations
  - `[World]` - World management

## CI/CD & Deployment

**Hosting:**
- Static file hosting (any HTTP server)
- No build step required

**CI Pipeline:**
- Not detected - No CI/CD configuration files

## Environment Configuration

**Required env vars:**
- Not applicable - No environment variables

**Secrets location:**
- Not applicable - No secrets

## Webhooks & Callbacks

**Incoming:**
- Not applicable - No server endpoints

**Outgoing:**
- Not applicable - No external API calls

## Browser APIs Used

**Core:**
- WebGL2 - 3D rendering (`canvas.getContext('webgl2')` in `src/gl/context.js`)
- Web Workers - Multi-threaded chunk generation (`new Worker()` in `workerPool.js`)
- Pointer Lock API - First-person camera control (`canvas.requestPointerLock()`)
- RequestAnimationFrame - Render loop (`requestAnimationFrame(render)` in `src/main.js`)
- Performance API - FPS tracking and timing (`performance.now()` in `src/gl/performance.js`)

**DOM APIs:**
- Document object model manipulation for UI updates
- Event listeners for input handling (keyboard, mouse, wheel)
- Canvas element for WebGL rendering

## Asset Dependencies

**Static Files:**
- `textures-atlas.png` - Block texture atlas loaded via `loadTextureAtlas()` in `src/gl/render.js`
  - Path relative to `index.html`
  - Contains textures for stone, dirt, grass, water, snow, and other block types

## CDN Dependencies

**External Libraries:**
- jsDelivr CDN - `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Risk: External dependency, potential availability issues
  - Mitigation: Could bundle locally if needed

## No External Integrations

This project is a self-contained, client-side WebGL2 voxel engine with:
- No backend server
- No database
- No user authentication
- No external API calls (beyond CDN)
- No third-party services (analytics, tracking, etc.)
- No build pipeline dependencies

All functionality is implemented locally with only simplex-noise loaded from CDN.

---

*Integration audit: 2026-03-19*
