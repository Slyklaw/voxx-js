# Project Research Summary

**Project:** Voxx JS
**Domain:** WebGL2 Voxel Engine Lighting
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

Voxx JS is a browser-based 3D voxel engine using WebGL2, currently at v1.0 with procedural terrain, chunk rendering, and block editing. The v1.1 milestone aims to add "Beautiful Lighting" — dynamic sunlight, ambient occlusion, and smooth sky gradients. Expert implementations in the voxel game domain (Minecraft, community projects) prioritize shader-based directional lighting with time-of-day color cycles, vertex-based ambient occlusion computed during mesh generation, and multi-stop sky gradients for atmospheric transitions.

The research recommends a phased approach: start with sky gradients (lowest risk, high visual impact), then dynamic sunlight with time-varying colors, and finally ambient occlusion (highest risk due to greedy‑meshing conflicts). The stack should use GLSL 3.30 (WebGL2) with floating‑point textures for HDR, multiple render targets for deferred passes, and textureGather for SSAO optimization. The architecture suggests a new `LightingManager` to centralize calculations, extending existing shaders and mesh generation to support ambient occlusion.

Key risks include greedy‑meshing efficiency loss if per‑vertex AO is added, sky‑gradient banding due to limited precision, and uniform‑update overhead. These can be mitigated by deferring vertex AO to v2+, using at least 5‑6 color stops with dithering, and batching uniforms via UBOs. The recommended MVP (v1.1) focuses on dynamic sun direction, time‑varying sky colors, and colored dawn/dusk — delivering noticeable visual improvement without architectural overhaul.

## Key Findings

### Recommended Stack

**Core technologies:**
- **GLSL 3.30 (WebGL2)**: Required shading language; supports floating‑point textures, MRT, textureGather for SSAO.
- **Floating‑point textures (EXT_color_buffer_float)**: Essential for HDR lighting and smooth light falloff.
- **Multiple Render Targets (MRT)**: Native WebGL2 feature for clean deferred passes (SSAO/glow) without extra framebuffers.
- **textureGather**: GLSL 3.30 function for hardware‑accelerated hemisphere sampling in SSAO.

**Implementation approaches:**
- **Dynamic sunlight**: Directional light with animated uniform (position, color, intensity) for time‑of‑day lighting.
- **Voxel AO**: Per‑vertex occlusion computed from 26‑neighbor lookup at chunk generation (Minecraft‑style).
- **Sky gradient**: Procedural shader with lerp between day/night/sunrise/sunset colors.

**What to avoid:**
- SSAO as first AO approach (expensive for WebGL2, overkill for blocky aesthetic).
- Ray‑traced GI (requires compute/WebGPU).
- Light propagation via JS (too slow, blocks main thread).
- Full deferred rendering pipeline (adds unnecessary complexity).

### Expected Features

**Must have (table stakes):**
- **Dynamic sunlight direction** — users expect sun angle to animate with day/night cycle.
- **Smooth sky gradient** — binary day/night sky looks jarring; multi‑stop gradients are expected.
- **Face‑dependent lighting** — top faces should get more light than side/bottom (already implemented).
- **Underground darkness** — caves/interiors should be darker than surface (requires light propagation).

**Should have (differentiators):**
- **Vertex‑based ambient occlusion (VAO)** — adds depth/cavity shadowing between blocks, makes terrain feel solid.
- **Colored sunset/sunrise** — dramatic dawn/dusk colors for emotional atmosphere.
- **Sun disc rendering** — visual confirmation of sun position.
- **Time‑varying sky tint on blocks** — blocks take on warm/cool tint from sky color.

**Defer (v2+):**
- **Screen‑space AO (SSAO)** — post‑processing shadowing; artifacts common in voxel art style.
- **Emissive block lights (torches)** — requires full light propagation system.
- **Real‑time raytraced shadows** — not available in WebGL2.
- **Global illumination (VXGI)** — very high complexity, requires compute shaders.

### Architecture Approach

The existing architecture consists of config constants, shader programs (voxel, sky, selection), a render pipeline with UBOs, and greedy mesh generation. The recommended architecture introduces a central `LightingManager` to compute sun position/color and AO values, then updates shader uniforms via UBO. Components to modify: `sky.js` (add 6‑phase gradient), `voxel.js` (add sun color/intensity and AO attribute), `greedyMesh.js` (compute per‑vertex AO), `config.js` (extend vertex format), `buffers.js` (add AO attribute binding), `render.js` (integrate LightingManager), and `ubo.js` (expand global UBO).

**Major components:**
1. **LightingManager** — centralized calculations for sun position, sun color phases, and AO values.
2. **Extended sky shader** — 6‑phase color interpolation (night, dawn, sunrise, day, sunset, dusk) with dithering to avoid banding.
3. **Modified voxel shader** — uses `uSunColor`, `uSunIntensity`, and `aAO` vertex attribute for ambient occlusion.
4. **Adapted greedy mesh** — computes AO per vertex, splits quads when AO values vary (greedy algorithm compromise).

### Critical Pitfalls

1. **Greedy mesh‑AO conflict** — Adding per‑vertex AO drastically reduces greedy meshing efficiency (2‑5x more vertices). Mitigation: use per‑face AO or defer vertex AO to v2+.
2. **Light propagation overkill** — Implementing full Minecraft‑style flood‑fill when only dynamic sunlight is needed. Mitigation: use shader‑based directional sunlight; defer full propagation to v2+.
3. **Sky gradient banding** — Visible color bands due to limited precision and insufficient color stops. Mitigation: use 5‑6 color stops, dithering, and highp precision.
4. **Uniform update overhead** — Updating multiple uniforms per frame causes driver overhead. Mitigation: batch uniforms via UBOs.
5. **Vertex format breakage** — Changing vertex format (adding AO) breaks existing meshes. Mitigation: version vertex format, regenerate only affected chunks.

## Implications for Roadmap

Based on research, the roadmap should follow three phases, each building on the previous, with increasing complexity and risk.

### Phase 1: Sky Gradients
**Rationale:** Lowest risk, high visual impact, no dependency on other features. Improves atmosphere immediately and establishes shader patterns for later phases.
**Delivers:** Multi‑stop sky gradient with dawn/dusk colors, dithering to prevent banding.
**Addresses:** Smooth sky gradient (table stake), colored dawn/dusk (differentiator).
**Avoids:** Sky gradient banding pitfall (uses dithering and highp precision).

### Phase 2: Dynamic Sunlight
**Rationale:** Builds on sky phase; adds directional light that matches sky colors. Uses existing `uLightDirection` uniform and `SUN_CYCLE_CONFIG`.
**Delives:** Animated sun direction, time‑varying sun color/intensity, integrated with sky colors.
**Uses:** GLSL 3.30, UBOs for batched uniform updates.
**Implements:** `LightingManager` component for centralized lighting calculations.
**Addresses:** Dynamic sunlight direction (table stake), time‑varying sky tint on blocks (differentiator).
**Avoids:** Light propagation overkill (uses shader uniforms), uniform update overhead (uses UBOs).

### Phase 3: Ambient Occlusion
**Rationale:** Highest risk due to greedy‑meshing conflict; should come last after core lighting is stable. Requires vertex format change and mesh generation modifications.
**Delivers:** Vertex‑based ambient occlusion (per‑face compromise) for depth and shadow definition.
**Addresses:** Vertex AO (differentiator), underground darkness (table stake) if light propagation is simplified.
**Avoids:** Greedy mesh‑AO conflict (use per‑face AO), vertex format breakage (version vertex format).

### Phase Ordering Rationale
- **Sky first** because it's independent, low risk, and provides immediate visual improvement.
- **Sunlight second** because it depends on time‑of‑day system already in place and uses the same shader uniform patterns.
- **AO last** because it's architecturally invasive (vertex format change, greedy‑mesh adaptation) and has the highest risk of performance regression.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Ambient Occlusion):** Complex greedy‑mesh adaptation, per‑face vs per‑vertex AO tradeoffs, vertex format migration strategy.

Phases with standard patterns (skip research‑phase):
- **Phase 1 (Sky Gradients):** Well‑documented gradient interpolation and dithering techniques.
- **Phase 2 (Dynamic Sunlight):** Established pattern of directional light uniforms and UBO batching.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on WebGL2 specifications, community consensus, and existing codebase verification. |
| Features | HIGH | Table stakes derived from user expectations and competitor analysis (Minecraft). |
| Architecture | HIGH | Recommended pattern aligns with existing codebase and proven voxel engine designs. |
| Pitfalls | HIGH | Pitfalls sourced from firsthand developer reports and real‑world implementations. |

**Overall confidence:** HIGH

### Gaps to Address

- **Underground darkness light propagation:** Research suggests deferring full propagation, but a simplified approach (vertical falloff) needs validation during implementation.
- **Greedy‑mesh AO compromise:** Per‑face AO quality vs performance tradeoff requires prototype testing; may need adjustment after Phase 3 starts.
- **Mobile performance:** Sky gradient and AO may need tuning for mobile devices; no mobile‑specific research was conducted.

## Sources

### Primary (HIGH confidence)
- WebGL2 specification — GLSL 3.30 features, MRT, float textures.
- Minecraft wiki and community implementations — light propagation, vertex AO algorithms.
- Real‑world voxel engine devlogs (Vorxel, Wolkenwelten) — practical lighting implementations.

### Secondary (MEDIUM confidence)
- Reddit r/VoxelGameDev discussions — SSAO vs VAO tradeoffs, greedy‑mesh conflicts.
- Medium articles by Andre Blunt, Jed037 — vertex AO implementation details.
- WebGL2 SSAO example (tsherif.github.io) — native SSAO implementation.

### Tertiary (LOW confidence)
- StackOverflow answers on sunlight algorithms — varying quality, but consensus aligns with recommended approach.

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*