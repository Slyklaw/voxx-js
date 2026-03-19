# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- JavaScript (ES6+) - 100% of codebase, no TypeScript
- GLSL 3.00 ES - WebGL2 shaders

**Secondary:**
- HTML5 - Single page application structure (`index.html`)
- CSS3 - UI styling (`style.css`)

## Runtime

**Environment:**
- Browser runtime (modern browsers with WebGL2 support)
- ES6 Modules via `<script type="module">`
- Web Workers for multi-threaded chunk generation

**Package Manager:**
- None - No package.json, no npm/yarn
- CDN-only dependency loading

**Build System:**
- None - No bundler (webpack, vite, etc.)
- Direct ES6 module imports/exports
- No transpilation (raw source served)

## Frameworks

**Core:**
- WebGL2 - 3D rendering API (`canvas.getContext('webgl2')` in `src/gl/context.js`)
- Custom game engine - No framework, all custom implementation

**Testing:**
- Not detected - No test framework or test files

**Build/Dev:**
- Not applicable - No build tooling

## Key Dependencies

**Critical:**
- `simplex-noise@4.0.3` - Procedural terrain generation
  - Loaded from CDN: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Used in: `world.js`, `chunkWorker.js`, `biomes.js`
  - Import: `import { createNoise2D } from '...'`

**Infrastructure:**
- None - Pure client-side application

## Configuration

**Environment:**
- Not applicable - No environment variables or .env files
- All configuration in `config.js` with exported constants

**Build:**
- Not applicable - No build configuration files

## Platform Requirements

**Development:**
- Modern browser with WebGL2 support (Chrome 56+, Firefox 51+, Safari 15+)
- Local file server or web server for ES6 module loading
- Hardware concurrency support for Web Workers (`navigator.hardwareConcurrency`)

**Production:**
- Static file hosting (any web server)
- No server-side components
- No database requirements

## Architecture Characteristics

**Performance:**
- Multi-threaded chunk generation via Web Workers (`workerPool.js`, `chunkWorker.js`)
- Greedy meshing algorithm for efficient rendering (`greedyMesh.js`)
- WebGL2 with VAOs, VBOs, and UBOs for optimal GPU performance
- Chunk-based loading/unloading based on render distance

**Rendering:**
- Custom WebGL2 renderer (`src/gl/render.js`)
- GLSL 3.00 ES shaders for voxels, sky, and selection
- Texture atlas support (`textures-atlas.png`)
- Dynamic lighting with day/night cycle
- Wireframe and debug color modes

---

*Stack analysis: 2026-03-19*
