# Domain Pitfalls

**Domain:** WebGL2 Voxel Engine Lighting
**Researched:** 2026-03-19
**Confidence:** HIGH (based on community reports, real-world implementations, and existing codebase analysis)

## Critical Pitfalls

### Pitfall 1: Greedy Mesh-AO Conflict

**What goes wrong:**
Adding per-vertex ambient occlusion (AO) values drastically reduces greedy meshing efficiency. Because each vertex of a quad can have different AO values, and greedy merging requires identical attributes, faces that would normally merge are kept separate. This leads to 2-5x more vertices and triangles, negating the performance gains of greedy meshing.

**Why it happens:**
Greedy meshing merges adjacent coplanar faces with identical attributes. AO values are computed per-vertex based on neighbor occupancy, so vertices at corners of terrain have different occlusion than vertices in open areas. Even slight differences prevent merging.

**How to avoid:**
- **Option A:** Use per-face AO (average of four vertices) instead of per-vertex AO. This allows greedy merging to continue but reduces AO quality.
- **Option B:** Split quads at AO boundaries (like Minecraft does) but maintain greedy merging for same-AO regions. Requires modified greedy algorithm.
- **Option C:** Skip vertex AO entirely and rely on screen-space AO (SSAO) as a post-process (though SSAO has its own artifacts in voxel art style).
- **Decision:** For Voxx JS v1.1, defer vertex AO to v2+ and focus on dynamic sunlight and sky gradients first. If implementing AO later, use per-face AO as compromise.

**Warning signs:**
- Mesh generation time increases significantly after adding AO
- Triangle count jumps by 300%+ in complex terrain
- Frame rate drops despite same visible geometry

**Phase to address:**
Phase 3 (Ambient Occlusion) – requires architectural decision on AO approach before implementation.

---

### Pitfall 2: Light Propagation Overkill

**What goes wrong:**
Implementing full Minecraft-style flood-fill light propagation (storing per-voxel light values, propagating through chunks) when only dynamic sunlight is needed. This adds massive complexity (light updates on block changes, chunk rebuilding, data storage) without proportional visual benefit for a simple day/night cycle.

**Why it happens:**
Developers assume "realistic lighting" requires full light propagation. Minecraft does it, but it's a core gameplay mechanic for torch placement. For visual atmosphere only, shader-based directional light with time-of-day colors is sufficient.

**How to avoid:**
- Use shader-based directional sunlight with time-varying color and intensity.
- Compute ambient occlusion separately (pre-baked at mesh generation) rather than as part of light propagation.
- If underground darkness is needed later, consider simple vertical light falloff (y-coordinate based) rather than full propagation.

**Warning signs:**
- Spending weeks implementing light queue, propagation algorithms, chunk light borders
- Need to modify voxel data structure to store light values
- Block edits requiring light recalculation (complex async updates)

**Phase to address:**
Phase 2 (Dynamic Sunlight) – use simple shader uniforms, defer full propagation to v2+ if needed.

---

### Pitfall 3: Sky Gradient Banding

**What goes wrong:**
Smooth sky gradients exhibit visible color banding due to limited precision in WebGL2 (8-bit per channel) and insufficient color stops. This creates distracting horizontal lines in the sky, especially during sunset/sunrise transitions.

**Why it happens:**
- Using linear interpolation between too few color stops (e.g., only day/night)
- Not accounting for gamma correction in gradient calculations
- Low precision (mediump) in fragment shader

**How to avoid:**
- Use at least 5-6 color stops for sky gradient (night, dawn, day, dusk, night)
- Implement dithering in the fragment shader to break up banding
- Use highp precision for sky gradient calculations
- Consider pre-computing a 1D texture lookup for gradient (texture-based gradient)

**Warning signs:**
- Visible horizontal lines in sky during color transitions
- Color steps appear during day/night cycle
- Banding more pronounced on mobile devices

**Phase to address:**
Phase 1 (Sky Gradients) – implement proper interpolation and dithering from start.

---

### Pitfall 4: Uniform Update Overhead

**What goes wrong:**
Updating multiple lighting uniforms per frame (sun direction, color, intensity, sky colors) individually causes WebGL state changes and driver overhead. This can become a bottleneck when combined with other per-frame updates.

**Why it happens:**
Naive implementation calls `gl.uniform3fv()` etc. for each uniform separately. Each uniform update is a driver call.

**How to avoid:**
- Use Uniform Buffer Objects (UBOs) to batch all lighting uniforms into a single buffer update.
- Update UBO only when values actually change (not every frame if sun moves slowly).
- Structure uniforms as a struct in GLSL for efficient packing.

**Warning signs:**
- Frame rate drops when adding multiple light uniforms
- Profiling shows high time in uniform updates
- Performance worse on integrated GPUs

**Phase to address:**
Phase 2 (Dynamic Sunlight) – implement UBO from start, not per-uniform updates.

---

### Pitfall 5: Vertex Format Breakage

**What goes wrong:**
Changing vertex format (adding AO attribute) breaks existing meshes and requires regenerating all chunk meshes. This can cause visual glitches during transition and requires careful versioning.

**Why it happens:**
Vertex attribute layout is hardcoded in shaders and VAO setup. Adding new attributes changes stride and offsets, making old vertex buffers incompatible.

**How to avoid:**
- Version vertex format (add `VERTEX_FORMAT_VERSION` constant).
- Keep old format for existing chunks, regenerate only affected chunks.
- Implement fallback: if AO attribute missing, use default value (1.0).
- Update `MESH_CONFIG.VERTEX_SIZE` and `MESH_CONFIG.STRIDE_BYTES` in config.js.

**Warning signs:**
- Glitched rendering after adding new vertex attribute
- "Black triangles" or missing faces
- Console errors about vertex attribute mismatch

**Phase to address:**
Phase 3 (Ambient Occlusion) – plan vertex format change with migration strategy.

---

## Moderate Pitfalls

### Pitfall 6: Sun Direction Calculation Errors

**What goes wrong:**
Incorrect sun position calculation leads to lighting that doesn't match visual sky position (sun appears in sky but light comes from wrong direction). This breaks immersion.

**How to avoid:**
- Derive sun direction from existing `SUN_CYCLE_CONFIG` elevation angles.
- Normalize sun direction vector.
- Test at multiple times of day (sunrise, noon, sunset, night).
- Use spherical coordinates: `sunDir = vec3(cos(elevation)*cos(azimuth), sin(elevation), cos(elevation)*sin(azimuth))`.

---

### Pitfall 7: AO Value Range Mismatch

**What goes wrong:**
Ambient occlusion values computed in mesh generation don't match expected range in fragment shader (0.0-1.0 vs 0-3 integer). This causes overly dark or bright corners.

**How to avoid:**
- Normalize AO counts (0-3 neighbors) to 0.0-1.0 range in mesh generator.
- Use consistent formula: `ao = 1.0 - (neighborCount / 3.0)`.
- Test with known configurations (open face vs corner vs edge).

---

### Pitfall 8: Sky Shader Precision Issues

**What goes wrong:**
Sky gradient calculations using mediump precision cause visual artifacts on mobile devices. Colors appear quantized or shifted.

**How to avoid:**
- Use `highp` precision for sky gradient calculations.
- Test on mobile devices with WebGL2 support.
- Consider using 16-bit float textures if available.

---

## Minor Pitfalls

### Pitfall 9: Uniform Naming Conflicts

**What goes wrong:**
Adding new lighting uniforms with names that conflict with existing uniforms (e.g., `uColor` used for both sky and block shaders) causes unexpected behavior.

**How to avoid:**
- Use prefixed uniform names: `uSkyZenithColor`, `uBlockSunColor`.
- Check uniform locations after linking to catch duplicates.

---

### Pitfall 10: Missing Time Normalization

**What goes wrong:**
Time-of-day uniform passed as raw millisecond timestamp instead of normalized 0.0-1.0 value, causing lighting to flicker or jump.

**How to avoid:**
- Normalize time: `timeOfDay = (timestamp % DAY_DURATION) / DAY_DURATION`.
- Ensure consistent normalization across sky and voxel shaders.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| **Hardcoded sky colors** | Quick implementation | Can't adjust without shader changes | Only for initial prototype |
| **Per-uniform updates** | Simple code | Performance overhead | When uniform count < 5 |
| **Linear gradient interpolation** | Easy to code | Banding artifacts | Never for final product |
| **Skip UBOs** | Less setup complexity | Scalability issues | Small projects with few uniforms |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Excessive vertex count from AO** | Low FPS, high memory usage | Use per-face AO or defer AO | At ~100k vertices |
| **Sky shader overdraw** | High fragment shader cost | Render sky as fullscreen quad after scene | On mobile devices |
| **Uniform thrashing** | Frame spikes | Batch updates via UBO | When updating >10 uniforms per frame |
| **Light propagation recomputation** | Lag on block edits | Defer or simplify | When editing large caves |

## "Looks Done But Isn't" Checklist

- [ ] **Dynamic sunlight:** Sun direction changes, but color/intensity doesn't match time-of-day (needs color interpolation)
- [ ] **Sky gradient:** Gradient appears but has banding artifacts (needs dithering or more stops)
- [ ] **Ambient occlusion:** AO values computed but not applied in fragment shader (missing multiply step)
- [ ] **Time synchronization:** Sky and block lighting use different time calculations (need shared time uniform)

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Greedy mesh-AO conflict | Phase 3 (AO) | Check vertex count before/after AO addition |
| Light propagation overkill | Phase 2 (Sunlight) | Verify no voxel light storage added |
| Sky gradient banding | Phase 1 (Sky) | Test gradient on mobile for banding |
| Uniform update overhead | Phase 2 (Sunlight) | Profile frame time with/without UBO |
| Vertex format breakage | Phase 3 (AO) | Test mesh regeneration with old chunks |

## Sources

- Reddit r/VoxelGameDev discussion "My greedy mesh divide on ambient occlusion and shadow" (March 2026) — firsthand account of greedy mesh-AO conflict
- 0fps.net "Voxel lighting" — flood fill lighting complexities and optimizations
- Jamango blog "How We Rebuilt Jamango!'s Lighting from the Ground Up" (July 2025) — performance pitfalls in browser voxel engines
- WebGL2 Fundamentals "SkyBox" — sky rendering techniques and precision issues
- Community consensus from multiple devlogs on vertex AO vs greedy meshing tradeoffs

---
*Pitfalls research for: WebGL2 Voxel Engine Lighting*
*Researched: 2026-03-19*