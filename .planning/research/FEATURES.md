# Feature Landscape

**Domain:** Browser-based voxel engine (Minecraft-like)
**Researched:** 2026-03-16

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Block placement & removal | Core interaction in any voxel game | Medium | Requires raycasting, world mutation, mesh updating. |
| Collision detection | Prevent walking through blocks | Medium | Needs physics integration (AABB) or custom solution. |
| World persistence | Save/load worlds locally | Low | IndexedDB via Dexie; already stubbed in codebase. |
| Inventory system | Select blocks to place | Low | Simple UI overlay; 9‑slot hotbar typical. |
| Seeded terrain generation | Deterministic worlds | Low | Replace Math.random with seeded RNG (simplex‑noise). |
| Chunk‑based loading | Infinite world illusion | High | Already implemented; needs throttling and memory pooling. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Ambient occlusion shading | Visual depth without complex lighting | Medium | Use `ao‑mesher` or implement in shader. |
| WebGL 2.0 with fallback | Better performance, modern features | Low | Already planned; upgrade renderer. |
| Real‑time shadows | Immersive lighting | High | Requires shadow mapping; optional. |
| Multiplayer (future) | Shared worlds | Very High | Out of scope for v1. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complex cave systems | Adds generation complexity; out of scope | Basic terrain only (height‑map). |
| Mobile touch controls | Desktop‑first focus | Keyboard/mouse only. |
| Sound effects | Visual‑only experience | No audio. |
| Modding/plugin system | Fixed feature set | Provide clear API if needed later. |

## Feature Dependencies

```
Block placement → Collision detection (need raycast to target block)
Inventory → Block placement (need selected block type)
Persistence → World generation (save generated chunks)
Seeded RNG → Terrain generation (deterministic)
Chunk loading → Persistence (load saved chunks)
```

## MVP Recommendation

Prioritize:
1. Seeded terrain generation (replace existing non‑deterministic generation)
2. Collision detection (player vs blocks)
3. Block placement & removal (core interaction)

Defer: Ambient occlusion, shadows, multiplayer – after core loop is stable.

## Sources

- Voxx‑js PROJECT.md (existing requirements)
- Common voxel game expectations (Minecraft, Minetest)
- noa‑engine feature list (bloxd.io, Minecraft Classic)

---
*Feature landscape for: voxel engine*
*Researched: 2026-03-16*