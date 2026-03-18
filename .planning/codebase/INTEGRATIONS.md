# External Integrations

**Analysis Date:** 2026-03-17

## APIs & External Services

**CDN Libraries (loaded at runtime):**
- Three.js - 3D rendering
  - Source: `https://unpkg.com/three@0.179.0/build/three.module.js`
  - Purpose: WebGL scene rendering, camera, lighting, geometry

- simplex-noise - Procedural generation
  - Source: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Purpose: Terrain heightmap generation, biome noise calculations

## Data Storage

**Runtime State:**
- In-memory JavaScript objects (no persistence)
- World state stored in `World` class instances

**File Storage:**
- None (stateless application)
- Textures loaded as images: `textures-atlas.png`

**Caching:**
- None (no caching layer)

## Authentication & Identity

**Authentication:**
- Not applicable
- Single-player voxel game with no user accounts
- No authentication providers required

## Monitoring & Observability

**Error Tracking:**
- Browser console logging only
- No external error tracking services

**Logs:**
- Console.log statements in `main.js`:
  - "Voxel Engine initialized successfully"
  - Error messages via console.error
- No structured logging system

## CI/CD & Deployment

**Hosting:**
- Static file hosting (any HTTP server)
- Examples: nginx, Apache, GitHub Pages, Vercel, Netlify

**CI Pipeline:**
- None detected
- No automated builds or tests

## Environment Configuration

**Required Configuration:**
- None (no environment variables)
- All configuration via hardcoded constants in `config.js`

**Secrets:**
- None (no secrets required)

## Webhooks & Callbacks

**Incoming:**
- None (no incoming webhooks)
- No server-side component

**Outgoing:**
- None (no outgoing webhooks or API calls)
- All processing happens client-side

## Local Resources

**Texture Assets:**
- `voxx-js/textures-atlas.png` - Block texture atlas (171KB)
  - Contains: Stone, dirt, grass, water, snow textures

**Shader Code:**
- Embedded in `voxx-js/shaders.js`:
  - CHUNK_VERTEX_SHADER - Block vertex transformation
  - CHUNK_FRAGMENT_SHADER - Block lighting and texturing

---

*Integration audit: 2026-03-17*
