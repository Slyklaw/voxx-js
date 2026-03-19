# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- JavaScript (ES2022) - Core game engine, all source files
- GLSL ES 3.0 - WebGL2 vertex and fragment shaders

**Secondary:**
- HTML5 - Entry point and UI markup
- CSS3 - Styling for HUD elements

## Runtime

**Environment:**
- Web Browser (WebGL2 capable)
- No Node.js runtime required for execution
- Module-based ES modules for bundling

**Package Manager:**
- None (no npm/yarn/package.json)
- Dependencies loaded via CDN imports

## Frameworks

**Rendering:**
- WebGL2 (native browser API) - GPU-accelerated 3D rendering
- Custom shader system - GLSL ES 3.0 vertex/fragment shaders

**Concurrency:**
- Web Workers API - Off-main-thread chunk generation
- WorkerPool pattern - Manages worker lifecycle and task distribution

**Noise Generation:**
- simplex-noise@4.0.3 (CDN) - Procedural terrain generation

## Key Dependencies

**CDN-hosted (imported via URL):**
- `simplex-noise@4.0.3` from `cdn.jsdelivr.net` - Perlin/Simplex noise for terrain heightmaps and biomes

**Built-in browser APIs:**
- WebGL2 - `canvas.getContext('webgl2')`
- Web Workers - `new Worker()` with module type
- Pointer Lock API - First-person camera controls
- requestAnimationFrame - Game loop
- Canvas API - 2D/3D rendering context

## Configuration

**Environment:**
- No environment variables
- All configuration in `voxx-js/config.js` constants

**Key config constants** (`voxx-js/config.js`):
- `RENDER_CONFIG` - FOV (75), near/far planes, fog distances
- `PLAYER_CONFIG` - Move speed (20), max reach (10), spawn position
- `SUN_CYCLE_CONFIG` - Day/night cycle timing (720s total)
- `LIGHTING_CONFIG` - Ambient, directional, fill light settings

**Build:**
- No build step required
- Direct browser loading via ES modules
- Entry point: `voxx-js/index.html` → `voxx-js/src/main.js`

## Platform Requirements

**Development:**
- Modern browser with WebGL2 support (Chrome 56+, Firefox 51+, Safari 15+)
- Local HTTP server for ES module imports (no file:// protocol)

**Production:**
- Any web server capable of serving static files
- No server-side requirements

---

*Stack analysis: 2026-03-18*
