# Milestones

## v1.0 WebGL2 Refactor (Shipped: 2026-03-17)

**Phases completed:** 5 phases, 6 plans

**Key accomplishments:**
- Refactored rendering from Three.js to raw WebGL2 (600KB removed)
- Implemented procedural terrain with biome-based coloring
- Built first-person WASD + mouse controls
- Added day/night sky cycle
- Implemented greedy meshing for optimized geometry
- Web Worker parallel chunk generation

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`

---

## v1.1 Block Editing (Shipped: 2026-03-18)

**Phases completed:** 3 phases (6-8), 5 plans

**Key accomplishments:**
- Complete block interaction system with raycast targeting, left-click destruction, and right-click placement
- Keyboard-driven block selection (1-5) with visual UI feedback and glow effects
- Optimized chunk updates with frame-budgeted throttling and in-memory voxel persistence

**Shipped Features:**
- Block targeting with magenta wireframe outline
- Left-click to break blocks
- Right-click to place blocks
- Block type inventory (5 types) with keyboard selection
- Real-time chunk mesh updates without frame drops

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`

---

## v1.2 Texture Atlas (Shipped: 2026-03-19)

**Phases completed:** 3 phases (9, 9.5, 10), 3 plans

**Key accomplishments:**
- Implemented full texture pipeline (vertex format, shaders, UV generation)
- All 5 block types render with correct atlas textures
- UV wrapping and X-face rotation for Minecraft-style orientation
- Debug logging for pipeline verification

**Shipped Features:**
- Texture atlas (1024x512, 16x16 tiles) with 5 block types
- Vertex format extended to 14 floats with UV at offset 36
- Fragment shader texture sampling with wrapping
- Atlas positions defined for Stone, Dirt, Grass, Water, Snow

**Archive:** `.planning/milestones/v1.2-ROADMAP.md`

---
