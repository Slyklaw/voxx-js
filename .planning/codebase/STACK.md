# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- JavaScript (ES2020+) - Core engine, rendering, game logic
- GLSL ES 3.0 - Vertex and fragment shaders

## Runtime

**Environment:**
- Browser (WebGL2-capable) - Direct browser execution
- No Node.js server required - Static file deployment

**Package Manager:**
- None (no package.json)
- Dependencies loaded via CDN

## Frameworks

**Core:**
- WebGL2 API - 3D rendering
- Browser Canvas API - Rendering surface

**Build/Dev:**
- None - No build step required
- ES Modules via `<script type="module">`

## Key Dependencies

**External Libraries:**
- simplex-noise@4.0.3 (CDN: jsDelivr) - Procedural terrain generation
  - Used in: `chunkWorker.js`, `world.js`, `biomes.js`
  - URL: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`

**Asset Files:**
- `textures-atlas.png` (1024x512) - Block textures sprite sheet

## Graphics Stack

**Shader Language:** GLSL ES 3.0 (WebGL2)

**Shader Programs:**
- Voxel shader - Block rendering with lighting and textures
- Sky shader - Gradient sky with day/night cycle
- Selection shader - Wireframe block highlighting

**Rendering Features:**
- WebGL2 VAO/VBO - Vertex array and buffer objects
- UBO (Uniform Buffer Objects) - Camera and global uniforms
- Texture atlas - Single 1024x512 texture for all blocks
- Nearest-neighbor filtering - Pixel art rendering
- Face culling - Back-face culling optimization
- Depth testing - Proper occlusion

## Configuration

**Environment:**
- Browser defaults (no .env files)
- Runtime configuration via `config.js`

**Key Configurations:**
- `RENDER_CONFIG` - FOV, near/far planes, fog distance
- `LIGHTING_CONFIG` - Ambient/directional light settings
- `PLAYER_CONFIG` - Movement speed, reach distance
- `SUN_CYCLE_CONFIG` - Day/night cycle timing

## Platform Requirements

**Development:**
- Modern browser with WebGL2 support (Chrome 56+, Firefox 51+, Safari 15+)

**Production:**
- Static file hosting (any web server or CDN)
- No server-side requirements

---

*Stack analysis: 2026-03-18*
