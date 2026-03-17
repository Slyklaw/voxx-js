# Technology Stack

**Project:** Voxx-js Voxel Engine
**Researched:** 2026-03-16
**Confidence:** MEDIUM (based on ecosystem analysis, limited authoritative sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Three.js | 0.183.2 (Feb 2026) | 3D rendering, scene management, raycasting | Industry standard for WebGL; huge ecosystem; used by many voxel engines (e.g., Blockerzz). Provides built-in raycasting, geometry helpers, and WebGL2 support. |
| Cannon-es | 0.20.0 (Aug 2022) | Collision detection, physics simulation | Maintained fork of Cannon.js; lightweight; supports AABB and sphere collisions suitable for voxel worlds. Actively maintained (last update 2022). |
| Simplex-noise | 4.0.3 (Jul 2024) | Procedural terrain generation | Fast, compact, deterministic noise for height maps and biome variation. Works in browser and Node. |
| Dexie | 4.3.0 (Dec 2025) | IndexedDB persistence wrapper | Minimalistic wrapper that simplifies async IndexedDB operations; battle‑tested in production. |
| Vanilla HTML/CSS | N/A | Inventory UI, HUD | No extra library needed; simple DOM overlays keep bundle small and avoid framework lock‑in. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| voxel-physics-engine | 0.13.0 (Aug 2022) | Voxel‑specific collision, stepping, sliding | If you need a turnkey voxel‑aware physics solution instead of general‑purpose Cannon‑es. |
| fast‑voxel‑raycast | 0.1.1 (Oct 2015) | Fast ray‑voxel intersection | If you need a simple ray‑cast algorithm for block selection (though rolling your own is often easier). |
| idb | 8.0.0 (Nov 2023) | Low‑level IndexedDB promises | If you prefer a thinner wrapper than Dexie. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Dev server, HMR, bundling | Optional but recommended for modern ES‑module development; can be added later without breaking vanilla‑JS constraint. |
| ESLint | Code quality | Enforce consistent style; integrate with editor. |
| jsDoc | API documentation | Generate docs from source comments. |

## Installation

```bash
# Core (if using npm)
npm install three cannon-es simplex-noise dexie

# Optional voxel physics
npm install voxel-physics-engine

# Dev dependencies
npm install -D vite eslint jsdoc
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Three.js | Babylon.js (7.x) | If you prefer a more game‑engine‑like API with built‑in physics; Babylon is also a solid choice (used by noa‑engine). |
| Cannon-es | Ammo.js (0.0.10) | If you need Bullet‑level physics (e.g., complex rigid bodies). Ammo is a direct port of Bullet but outdated (2016). |
| Dexie | idb | If you want a thinner abstraction and are comfortable with raw IndexedDB promises. |
| Vanilla HTML/CSS | React/Vue | If you need a complex, interactive UI (not typical for a voxel HUD). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Original voxel-engine (0.20.2) | Unmaintained since 2015; depends on Three.js 0.54. | Three.js + custom voxel logic or noa‑engine. |
| Cannon.js (0.6.2) | Unmaintained since 2015; superseded by Cannon‑es. | Cannon‑es (0.20.0). |
| Raw WebGL 1.0 only | Limits shader capabilities; makes debugging harder. | Three.js (handles WebGL2 fallback) or at least upgrade to WebGL2 with a thin wrapper. |
| Simple localStorage for world storage | Size limit (~5 MB), synchronous, not transactional. | IndexedDB via Dexie. |
| Monolithic game engines (Unity WebGL) | Huge bundle size, overkill for a browser voxel engine. | Lightweight libraries listed above. |

## Stack Patterns by Variant

**If you must stay vanilla JS (no build step):**
- Use Three.js via CDN (`<script type="importmap">`).
- Use Cannon‑es via CDN.
- Load Dexie from a CDN or use raw IndexedDB.
- Write all game logic in ES modules.

**If you can add a build step:**
- Use Vite for fast dev server and bundling.
- Import modules directly (Three.js, Cannon‑es, etc.).
- Add hot module replacement for quicker iteration.

**If you need maximum performance:**
- Consider a custom WebGL renderer (as Voxx‑js already has).
- Use a dedicated voxel mesher (e.g., `ao‑mesher` for ambient occlusion).
- Implement physics with simple AABB checks (no full engine).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| three@0.183.2 | cannon-es@0.20.0 | Both support ES modules; no known conflicts. |
| simplex-noise@4.0.3 | Any ES module environment | Zero dependencies. |
| dexie@4.3.0 | IndexedDB‑supporting browsers | Works in all modern browsers. |

## Sources

- [Three.js npm](https://www.npmjs.com/package/three) – version 0.183.2, updated 2026‑02‑28 (MEDIUM confidence).
- [Cannon‑es npm](https://www.npmjs.com/package/cannon-es) – version 0.20.0, updated 2022‑08‑12 (HIGH confidence).
- [Simplex‑noise npm](https://www.npmjs.com/package/simplex-noise) – version 4.0.3, updated 2024‑07‑26 (HIGH confidence).
- [Dexie npm](https://www.npmjs.com/package/dexie) – version 4.3.0, updated 2025‑12‑20 (HIGH confidence).
- [noa‑engine GitHub](https://github.com/fenomas/noa) – uses Babylon.js, successful voxel engine (MEDIUM confidence).
- [Blockerzz blog](https://blog.quizalize.com/2026/02/12/building-the-worlds-most-advanced-3d-voxel-engine-for-the-browser) – uses Three.js (MEDIUM confidence).
- [voxel‑physics‑engine npm](https://www.npmjs.com/package/voxel-physics-engine) – version 0.13.0, updated 2022‑08‑27 (LOW confidence).

---
*Stack research for: voxel engine (browser‑based)*
*Researched: 2026‑03‑16*