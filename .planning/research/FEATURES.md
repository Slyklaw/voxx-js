# Feature Research

**Domain:** Voxel Engine Lighting — Dynamic Sunlight, Ambient Occlusion, Sky Gradients
**Researched:** 2026-03-19
**Confidence:** HIGH (existing codebase verified, established patterns from Minecraft/community)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a voxel engine with lighting. Missing these = product feels like a v1 demo.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Dynamic sunlight direction** | Sun moves across sky in day/night cycle — light angle must follow | MEDIUM | Already has `SUN_CYCLE_CONFIG` with elevation angles. Shader uses `uLightDirection` uniform. Need: animate light dir based on time-of-day. |
| **Underground darkness** | Caves/interiors should be darker than surface | HIGH | Requires light propagation from sky down through transparent blocks. Voxelize uses 4-bit light values (0-15). Grass/dirt are opaque — sunlight stops at first opaque block. |
| **Smooth sky gradient** | Binary day/night sky looks jarring | MEDIUM | Already has basic 2-color gradient mix. Need: multi-stop gradients for dawn/dusk, horizon glow, sunset tinting. |
| **Face-dependent lighting** | Top faces should get more light than side/bottom | LOW | Already implemented via `vNormal` dot product in fragment shader. Top faces lit by sun direction. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but create visual "wow."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Vertex-based ambient occlusion (VAO)** | Adds depth/cavity shadowing between blocks — makes terrain feel solid not flat | HIGH | Requires per-vertex AO values baked into mesh. Greedy meshing complicates this (quad merging breaks vertex AO continuity). Each vertex samples 3 neighbor voxels to determine occlusion. Source: Andre Blunt 2025, Jed037 2024. |
| **Screen-space AO (SSAO)** | Post-processing shadowing in corners/cavities — GPU-based, no mesh changes | MEDIUM | Requires depth buffer + GLSL kernel sampling. Artifacts common in voxel art style (Hard to tune for blocky geometry). Many devs prefer VAO over SSAO for voxels per r/VoxelGameDev 2025. |
| **Colored sunset/sunrise** | Dramatic dawn/dusk colors — emotional atmosphere | LOW | Extend sky shader with 4-6 color stops mapped to time-of-day. Bezier interpolation between phases. |
| **Sun disc rendering** | Visual confirmation of sun position | LOW | Add sun sphere/sprite in sky shader, position derived from light direction uniform. |
| **Time-varying sky tint on blocks** | Blocks take on warm/cool tint from sky color | LOW | Blend `uAmbient` and `uDiffuse` colors with sky gradient colors based on time-of-day. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time raytraced shadows** | Ultimate visual fidelity | Not available in WebGL2 (no hardware RT). Software raytracing too slow for browser. | Cascaded shadow maps (complex), or skip shadows entirely (Minecraft vanilla does). |
| **Global illumination (VXGI, Voxel Cone Tracing)** | Soft bouncing light in caves | Very high complexity, requires compute shaders, 3D voxelization, multi-bounce simulation. | Pre-baked cave lighting, or accept dark caves. |
| **Per-block emissive lights (torches)** | Player-placed light sources | Requires light propagation system + block type handling. Interacts complexly with sunlight propagation. | Defer to post-v1.1. |
| **Per-pixel SSAO on greedy mesh** | Smoother AO than vertex-based | Greedy mesh merges faces — edge AO bleeds across merged quads. Requires mesh topology changes. | Stick with vertex AO or skip AO entirely. |

## Feature Dependencies

```
[Sun Light Direction] ──────> [Underground Darkness]
       │                             │
       │                     requires lightmap data
       v                             v
[Block Face Lighting]          [Mesh vertex data]
       │                             │
       v                             v
[Time-of-Day Sky Tint]  <─── [Sky Gradient Shader]
       │
       v
[Colored Dawn/Dusk] ──> [Sun Disc]
```

### Dependency Notes

- **Dynamic sunlight direction requires:** Modifying `uLightDirection` uniform each frame based on `SUN_CYCLE_CONFIG` time.
- **Underground darkness requires:** Storing per-voxel light values (sunlight 0-15, block light 0-15), propagating from sky downward, blocking at opaque voxels. Requires extending `chunk.voxels` data structure and mesh generation to include light data per vertex.
- **Vertex AO requires:** Modifying `greedyMesh.js` to compute AO per-vertex (not per-face), storing AO in vertex color or new attribute, updating fragment shader to multiply base color by AO.
- **Sky gradients build on existing:** `src/shaders/sky.js` already has 4 color uniforms. Extend with more stops and interpolation logic.
- **VAO conflicts with greedy mesh at HIGH complexity:** Greedy meshing merges adjacent same-type quads, which breaks vertex-level AO continuity. Solutions: (1) disable greedy merging for AO-enabled chunks, (2) split quads at AO boundaries, (3) accept per-face (not per-vertex) AO as compromise.

## MVP Definition

### Launch With (v1.1)

Minimum viable beautiful lighting — visible improvement without architectural overhaul.

- [ ] **Dynamic sun direction** — animate `uLightDirection` based on sun cycle time. Shader already supports it. Cost: ~20 lines JS.
- [ ] **Time-varying sky colors** — extend sky shader with 4+ time-keyed color phases (night, dawn, day, dusk). Shader already has uniform plumbing. Cost: ~30 lines GLSL + JS color lookup.
- [ ] **Colored dawn/dusk** — orange/pink horizon tint at sunrise/sunset. Extends sky gradient. Cost: same PR as sky colors.

### Add After Validation (v1.x)

- [ ] **Underground darkness** — Trigger: users notice caves look as bright as surface. Requires lightmap data structure, propagation algorithm, per-vertex light in mesh. Significant complexity.
- [ ] **Sun disc** — Trigger: users want to confirm sun position visually. Simple billboard or shader math. LOW complexity.

### Future Consideration (v2+)

- [ ] **Vertex ambient occlusion** — Requires resolving greedy-mesh conflict. HIGH complexity.
- [ ] **SSAO** — Requires render-to-texture + depth buffer + GLSL post-process. MEDIUM-HIGH.
- [ ] **Emissive block lights** — Requires full light propagation system. HIGH.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dynamic sun direction | HIGH | LOW | P1 |
| Sky gradient phases | HIGH | LOW | P1 |
| Colored dawn/dusk | MEDIUM | LOW | P1 |
| Underground darkness | MEDIUM | HIGH | P2 |
| Sun disc | MEDIUM | LOW | P2 |
| Vertex AO | HIGH | HIGH | P3 |
| SSAO | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Minecraft (Java) | Minecraft (Bedrock) | Our Approach |
|---------|------------------|----------------------|---------------|
| Dynamic sunlight | Yes — sun angle animates | Yes | Same — already have direction uniform |
| Underground darkness | Yes — full light propagation (0-15) | Yes | Not yet — P2 |
| Vertex AO | Yes — since 1.8 with sweeten/smooth | Yes | Not yet — P3 |
| Sky gradient | Yes — 6 color stops, atmospheric | Simplified | Need to match — P1 |
| SSAO | No | No | Optional P3 |
| Emissive lights | Yes — torches, glowstone | Yes | Not planned — v2+ |

**Key insight:** Minecraft's lighting system is deeply integrated — lightmap is stored in chunk data, propagated on block change, and read during mesh generation. This is a significant architectural decision (P2+ effort).

## Existing Codebase Integration Points

### Greedy Mesh (`greedyMesh.js`)
- Generates `positions`, `normals`, `colors`, `uvs`, `indices` Float32Arrays
- Vertex format: pos(3) + color(3) + normal(3) + uv(2) + tileBase(2) + variant(1) = 14 floats
- For AO: add `ao` attribute (1 float per vertex, value 0.0-1.0)
- For lightmap: need to pass light value per vertex (sunlight + block light = 1-2 bytes)

### Voxel Shader (`src/shaders/voxel.js`)
- Already has `uLightDirection`, `uAmbient`, `uDiffuse` uniforms
- Fragment shader: `vec3 finalColor = baseColor * (ambient + diffuse)`
- Extension point: multiply by `vAO` (vertex attribute) or `vSunlight` uniform

### Sky Shader (`src/shaders/sky.js`)
- Already has `uTimeOfDay` (0-1), 4 color uniforms (day/night top/bottom)
- Extend: add `uDawnColor`, `uDuskColor`, `uSunPosition` uniforms
- Fragment shader: interpolate across 4+ time phases

### Render Loop (`src/main.js`)
- `sunCycleTime` already tracks day progress
- `getDayPhase()` already categorizes into Dawn/Day/Dusk/Night
- `renderSky()` already passes `timeOfDay` to shader

## Sources

- Andre Blunt, "Vertex Ambient Occlusion for Voxel Games" (2025) — https://medium.com/@andrebluntindie/vertex-ambient-occlusion-for-voxel-games-the-principle-and-implementation-e5340bd62845
- Jed037, "Per Vertex Ambient Occlusion for Surface Nets Meshes" (2024) — https://jedjoud10.github.io/blog/per-vertex-ao-surface-nets/
- Teknologicus, Vorxel devlogs on dynamic sunlight (2025) — https://teknologicus.itch.io/vorxel
- Voxelize docs, LightUtils class — https://docs.voxelize.io/api/client/classes/LightUtils
- mackycheese21, "Minecraft-Style Voxel Sunlight Algorithm" (StackExchange 2019) — https://gamedev.stackexchange.com/questions/170011/
- NeoForged, "A New Block Model Lighting Pipeline" (2025) — https://neoforged.net/news/enhanced-ao
- r/VoxelGameDev community discussion on SSAO vs VAO (2025) — https://www.reddit.com/r/VoxelGameDev/

---
*Feature research for: Voxx JS v1.1 Beautiful Lighting*
*Researched: 2026-03-19*
