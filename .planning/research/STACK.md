# Stack Research

**Domain:** WebGL2 Voxel Engine Lighting
**Researched:** 2026-03-19
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|------------------|
| GLSL | 3.30 (WebGL2) | Shading language | Required for WebGL2; supports floating-point textures, MRT, textureGather for SSAO |
| Floating-point textures | EXT_color_buffer_float | HDR lighting | Essential for smooth light falloff and post-processing |
| Multiple Render Targets | WebGL2 native | Deferred passes | Cleanest for SSAO/glow passes without extra framebuffers |
| textureGather | GLSL 3.30 | SSAO sampling | Hardware-accelerated hemisphere sampling |

### Lighting Implementation

| Approach | Technique | When to Use |
|----------|------------|-------------|
| **Dynamic Sunlight** | Directional light with animated uniform (position, color, intensity) | Primary time-of-day lighting |
| **Voxel AO** | Per-vertex occlusion computed from 26-neighbor lookup | Minecraft-style, per-block occlusion |
| **Sky Gradient** | Procedural shader with lerp between day/night/sunrise/sunset colors | Background atmosphere |

## Implementation Details

### Dynamic Sunlight (Shader-based)

```glsl
// Vertex: pass world position and normal
// Fragment:
uniform float u_timeOfDay; // 0.0 - 1.0
uniform vec3 u_sunDirection;

vec3 getSunlightColor(float t) {
    // lerp between: night(0.1), sunrise(0.8), noon(1.0), sunset(0.8), night(0.1)
    float intensity = sin(t * 6.28318) * 0.5 + 0.5;
    vec3 color = mix(nightColor, dayColor, intensity);
    return color * intensity;
}
```

### Voxel-based Ambient Occlusion

| Method | Complexity | Performance | Quality |
|--------|------------|-------------|---------|
| Vertex AO (26-neighbor) | Low | Fast (per-mesh) | Good for blocks |
| SSAO | High | Moderate | High (screen-space) |

**Recommendation:** Voxel AO first — computed at chunk generation, stored as vertex attribute. This is what Minecraft uses and works well with existing greedy meshing.

**Integration point:** Add occlusion values to vertex buffer during mesh generation:
- Each vertex gets AO value (0.0-1.0) based on exposed edges
- 4 vertices of a quad can have different AO for corner shadowing

### Sky Gradient

```glsl
// Full-screen quad or skybox shader
uniform float u_timeOfDay;
uniform vec3 u_skyZenith;    // Top color
uniform vec3 u_skyHorizon;   // Horizon color
uniform vec3 u_sunDirection;

void main() {
    float sunHeight = u_sunDirection.y;
    vec3 dayZenith = vec3(0.2, 0.5, 0.9);
    vec3 dayHorizon = vec3(0.6, 0.8, 1.0);
    vec3 nightZenith = vec3(0.02, 0.02, 0.08);
    vec3 nightHorizon = vec3(0.05, 0.05, 0.15);
    vec3 sunsetHorizon = vec3(0.9, 0.4, 0.2);
    
    // Interpolate based on time
    vec3 zenith = mix(nightZenith, dayZenith, smoothstep(-0.2, 0.3, sunHeight));
    vec3 horizon = mix(nightHorizon, dayHorizon, smoothstep(-0.2, 0.3, sunHeight));
    // Add sunset peak
    horizon = mix(horizon, sunsetHorizon, smoothstep(0.0, 0.2, sunHeight) * smoothstep(0.5, 0.2, sunHeight));
    
    float y = gl_FragCoord.y / u_resolution.y;
    gl_FragColor = vec4(mix(horizon, zenith, y), 1.0);
}
```

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **SSAO as first AO approach** | Expensive for WebGL2 without compute shaders; overkill for blocky aesthetic | Voxel-based vertex AO |
| **Ray-traced GI** | Requires compute/WebGPU; not supported in WebGL2 | Voxel AO + baked lightmaps |
| **Light propagation via JS** | Too slow; blocks main thread | Shader-based sunlight + precomputed AO |
| **Deferred rendering full pipeline** | Adds complexity; not needed for simple voxel rendering | Forward rendering with post-process pass |

## Stack Patterns by Variant

**If targeting mobile/limited performance:**
- Skip SSAO entirely
- Use simpler 3-step sky gradient (day/night + linear lerp)
- Reduce AO resolution to half

**If targeting desktop with headroom:**
- Add SSAO as post-process after main render
- Use 5+ stop sky gradient with sunset/golden hour
- Consider volumetric fog as future enhancement

## Version Compatibility

| Feature | WebGL2 | Notes |
|---------|--------|-------|
| GLSL 3.30 | Required | Chrome 56+, FF 51+, Safari 15+ |
| Float textures | EXT_color_buffer_float | Most modern browsers support |
| MRT | Native | Clean multi-pass without FBO switching |
| textureGather | GLSL 3.30 | SSAO optimization |

## Integration Points

### Existing Pipeline Integration

1. **Time uniform** → Connect to existing day/night cycle system (pass current time to all shaders)
2. **Vertex AO** → Add during greedy mesh generation (modify vertex color attribute)
3. **Sky shader** → Replace/reuse existing background clear or add as fullscreen draw
4. **Sun direction** → Derived from existing sun position calculation

### Files to Modify

- Shader files (vertex/fragment for blocks, sky)
- Mesh generator (add AO attribute)
- Render loop (add sky pass, optionally SSAO pass)
- Time/lighting uniforms

## Sources

- 0fps.net — "Voxel lighting" — Cellular automaton lighting in WebGL
- WebGL2 SSAO Example (tsherif.github.io) — WebGL2 native SSAO implementation
- Minecraft Wiki — Light propagation mechanics
- Reddit r/VoxelGameDev — SSAO vs Voxel AO comparison
- Medium (Andre Blunt) — Vertex AO for voxel games implementation
- Wolkenwelten project — Live WebGL voxel implementation

---
*Stack research for: Beautiful Lighting milestone*
*Researched: 2026-03-19*
