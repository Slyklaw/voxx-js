# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- JavaScript (ES2020+) - Core voxel engine implementation

**Secondary:**
- GLSL (embedded) - Custom vertex and fragment shaders for block rendering

## Runtime

**Environment:**
- Web Browser (modern browsers with WebGL support)
- Client-side only (no server-side runtime required)

**Module System:**
- ES Modules (native browser support)
- Loaded via `<script type="module">` in `index.html`

## Frameworks

**3D Rendering:**
- Three.js v0.179.0 - WebGL rendering engine
  - Loaded from: `https://unpkg.com/three@0.179.0/build/three.module.js`
  - Used for: Scene graph, camera, renderer, lighting, geometry, materials

**Procedural Generation:**
- simplex-noise v4.0.3 - Perlin/Simplex noise for terrain generation
  - Loaded from: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Used for: Biome generation, terrain heightmaps, world seeding

**Build/Dev:**
- None (no build system)
- Direct browser execution via ES Modules
- No transpilation required

## Key Dependencies

**Rendering:**
- three.js (v0.179.0) - Core 3D engine
  - `voxx-js/renderer.js`
  - `voxx-js/sky.js`
  - `voxx-js/chunk.js`

**Noise Generation:**
- simplex-noise (v4.0.3) - Procedural generation
  - `voxx-js/world.js` - World chunk generation
  - `voxx-js/biomes.js` - Biome calculations
  - `voxx-js/chunkWorker.js` - Background chunk processing

## Configuration

**Environment:**
- No build-time environment variables
- Runtime configuration via `config.js` constants

**Build:**
- No build configuration files
- No package.json or npm dependencies
- Direct CDN loading of ES modules

**Runtime Config Files:**
- `voxx-js/config.js` - Main configuration constants
  - RENDER_CONFIG: FOV, near/far planes, fog settings
  - LIGHTING_CONFIG: Ambient and directional light settings
  - PLAYER_CONFIG: Movement speed, reach distance, spawn position
  - SUN_CYCLE_CONFIG: Day/night cycle timing
  - SKY_COLORS: Time-of-day color transitions
  - UI_CONFIG: Biome display update intervals

## Platform Requirements

**Development:**
- Modern browser with ES Modules support
- WebGL support required
- VS Code or any text editor
- No local server required (can open index.html directly)

**Production:**
- Static file hosting (any web server)
- No server-side processing required
- CDN for Three.js and simplex-noise (or self-hosted)

---

*Stack analysis: 2026-03-17*
