# Technology Stack

**Analysis Date:** 2026-03-16

## Languages

**Primary:**
- JavaScript (ES6 modules) - All source code in `src/` directory

**Secondary:**
- GLSL - Inline shaders in `src/core/renderer.js`
- HTML - Entry point `index.html`

## Runtime

**Environment:**
- Browser (WebGL capable)

**Package Manager:**
- None detected (no `package.json`, lockfile missing)

**Build/Dev Tools:**
- None detected (no bundler, transpiler, or dev server configuration)
- Simple static file serving via `npx serve .` (per README)

## Frameworks

**Core:**
- None - Pure vanilla JavaScript implementation

**Testing:**
- None detected (no test files or test runner configuration)

**Graphics:**
- WebGL 1.0 via browser's native `canvas.getContext('webgl')` (see `src/core/engine.js` lines 29-30)
- Custom shaders in `src/core/renderer.js` lines 38-82

## Key Dependencies

**Critical:**
- None - All functionality implemented from scratch

**Infrastructure:**
- None

## Configuration

**Environment:**
- No environment variables required
- No `.env` files detected

**Build:**
- No build configuration files (no webpack, vite, rollup, etc.)
- No TypeScript configuration (no `tsconfig.json`)
- No linting/formatting configuration (no `.eslintrc`, `.prettierrc`)

## Platform Requirements

**Development:**
- Modern web browser with WebGL support
- Static file server (e.g., `npx serve .`)

**Production:**
- Static web hosting (any web server)
- No server-side runtime required

## Project Structure

```
voxx-js/
├── index.html                 # Entry point, loads engine.js as ES module
├── src/
│   ├── core/
│   │   ├── engine.js          # Main engine class, WebGL initialization
│   │   ├── renderer.js        # WebGL rendering system with shaders
│   │   └── world.js           # World/terrain generation
│   ├── chunks/
│   │   ├── chunk.js           # Chunk data structure
│   │   └── chunk-manager.js   # Chunk loading/unloading system
│   └── player/
│       └── player.js          # Player controller and physics
└── README.md                  # Build notes
```

## Technology Characteristics

**WebGL Implementation:**
- Manual matrix math for projection/model-view (`src/core/renderer.js` lines 337-364)
- Vertex, texture coordinate, and normal buffers (`src/core/renderer.js` lines 136-282)
- Simple Phong-like lighting in fragment shader (`src/core/renderer.js` lines 69-78)

**Architecture Pattern:**
- ES6 module system with dynamic imports (`src/core/engine.js` lines 57-67)
- Single responsibility classes (Engine, World, Renderer, Player, Chunk, ChunkManager)
- No external library dependencies

**State Management:**
- In-memory chunk storage using `Map` (`src/chunks/chunk-manager.js` line 8, `src/core/world.js` line 7)
- No persistence implementation (commented placeholders in `src/core/world.js` lines 178-189)

**Input Handling:**
- Native DOM event listeners for keyboard and mouse (`src/player/player.js` lines 48-66)
- Pointer Lock API for mouse capture (`src/player/player.js` lines 257-273)

---

*Stack analysis: 2026-03-16*
