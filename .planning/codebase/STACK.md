# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- JavaScript (ES2022+) - All source code, pure vanilla implementation
- GLSL - WebGL2 shaders for rendering

**Secondary:**
- HTML5 - Entry point and UI structure
- CSS3 - Styling for debug UI and HUD elements

## Runtime

**Environment:**
- Browser (WebGL2 required) - Chrome, Firefox, Edge, Safari with WebGL2 support

**Package Manager:**
- npm (Node.js) - Only for development dependencies
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None - Vanilla JavaScript implementation
- WebGL2 - GPU-accelerated 3D rendering

**Testing:**
- Vitest ^1.6.0 - Unit and integration testing
- JSDOM ^29.0.1 - DOM simulation for browser API tests

**Build/Dev:**
- http-server - Static file serving for development
- No build pipeline - Runs directly in browser via ES modules

## Key Dependencies

**Critical:**
- simplex-noise ^4.0.3 - Procedural terrain generation via CDN (jsdelivr)
  - Loaded from: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Used in: `biomes.js`, `world.js`, `chunkWorker.js`

**Infrastructure:**
- None - No backend, no server-side dependencies

## Configuration

**Environment:**
- No .env files - Pure client-side, no environment variables
- Runtime configuration via `config.js`

**Build:**
- `vitest.config.js` - Test runner configuration
- No build tool (webpack, vite, rollup) required

## Project Structure

```
voxx-js/
├── index.html           # Entry point, UI structure
├── style.css            # UI styling
├── config.js            # Runtime configuration constants
├── world.js             # World generation orchestration
├── biomes.js            # Biome definitions and height generation
├── chunk.js             # Chunk data structure
├── chunkCore.js         # Chunk size constants
├── chunkWorker.js       # Web Worker for chunk generation
├── blocks.js            # Block type definitions
├── greedyMesh.js        # Mesh optimization (Greedy meshing)
├── workerPool.js        # Worker thread management
├── textures-atlas.png   # Texture atlas for blocks
├── src/
│   ├── main.js          # Main entry, game loop, input handling
│   ├── gl/
│   │   ├── context.js   # WebGL2 context initialization
│   │   ├── render.js    # Rendering pipeline
│   │   ├── buffers.js   # VBO/VAO management
│   │   ├── shaders.js   # GLSL shader compilation
│   │   ├── fbo.js       # Framebuffer objects
│   │   ├── ubo.js       # Uniform buffer objects
│   │   ├── frustum.js   # Frustum culling
│   │   └── performance.js # FPS/timing utilities
│   ├── chunk/
│   │   └── chunkManager.js # Chunk lifecycle management
│   └── shaders/
│       ├── voxel.js     # Main voxel shader
│       ├── ssao.js      # Screen-space ambient occlusion
│       ├── shadow.js    # Shadow mapping
│       ├── sky.js       # Sky rendering
│       ├── blur.js      # Post-process blur
│       ├── composite.js # Final compositing
│       └── selection.js # Block selection outline
└── tests/
    ├── setup.js         # Test configuration
    ├── unit/            # Unit tests
    └── integration/     # Integration tests
```

## Platform Requirements

**Development:**
- Node.js - For npm dependencies and test runner
- Modern browser with WebGL2 support

**Production:**
- Modern browser with WebGL2 support
- No server required - Can be served from any static host or opened directly

---

*Stack analysis: 2026-03-21*
