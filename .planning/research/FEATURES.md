# Feature Research

**Domain:** WebGL2 Voxel Rendering (Three.js Replacement)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features required to match existing Three.js voxel renderer functionality. Missing these = visual/functional regression.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WebGL2 Context Initialization | Canvas setup, WebGL2 context creation with antialiasing | LOW | Direct WebGL2RenderingContext, fallback to error if unsupported |
| Vertex Buffer Management | Chunk mesh geometry storage (positions, normals, UVs, colors) | MEDIUM | VAOs, VBOs for each attribute, dynamic updates |
| Shader Program Pipeline | Custom GLSL vertex/fragment shaders for block rendering | MEDIUM | Compile, link, error handling, uniform binding |
| Perspective Projection | Match Three.js 75° FOV camera projection | LOW | Already implemented in camera.js, reuse |
| View Matrix Computation | FPS camera with yaw/pitch rotation | LOW | Already implemented in camera.js, reuse |
| Matrix Uniforms | Pass view/projection matrices to shaders | LOW | gl.uniformMatrix4fv |
| Directional Lighting | Diffuse lighting from sun position | LOW | Already in shaders.js, directional dot product |
| Ambient Lighting | Base illumination level | LOW | Already in shaders.js, ambient color uniform |
| Texture Atlas Sampling | Block textures from sprite sheet | MEDIUM | sampler2D, UV coordinate mapping per block type |
| Face Culling | Hide hidden voxel faces (greedy meshed) | LOW | gl.enable(gl.CULL_FACE), gl.cullFace(gl.BACK) |
| Depth Testing | Correct fragment ordering | LOW | gl.enable(gl.DEPTH_TEST) |
| Sky Dome Rendering | Gradient sky with sun/moon positions | MEDIUM | Inverted sphere geometry, separate shader program |
| Block Selection Outline | Magenta wireframe on targeted block | LOW | Separate draw call, BoxGeometry replacement |
| Chunk Mesh Updates | Dynamic rebuild on block place/remove | MEDIUM | Regenerate VBOs, re-upload to GPU |
| Resource Disposal | Memory cleanup on chunk unload | LOW | gl.deleteBuffer, proper cleanup pattern |

### Differentiators (Competitive Advantage)

Features that go beyond matching Three.js, providing performance or capability improvements.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Instanced Rendering | Draw identical blocks once, instance many | HIGH | WebGL2 instanced arrays, reduce draw calls by 100x |
| Compute Shader Meshing | GPU-based greedy meshing | HIGH | Transform feedback or compute shaders |
| Dynamic LOD | Distance-based chunk detail | MEDIUM | Multiple mesh resolutions |
| Frustum Culling | Skip off-screen chunks | LOW-MEDIUM | Test chunk bounds against view frustum |
| Occlusion Culling | Skip hidden chunks behind others | MEDIUM | Software or hierarchical occlusion |
| GPU Particles | Block break/place effects on GPU | MEDIUM | Instanced point sprites |
| Post-Processing | Bloom, depth of field, color grading | MEDIUM | Multi-pass rendering pipeline |
| PBR Materials | Physically-based rendering | HIGH | Metallic-roughness model |
| Voxel Global Illumination | Real-time GI approximation | HIGH | Light probes, voxel-based GI |
| Procedural Textures | Shader-based block textures | MEDIUM | Noise functions in fragment shader |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Shadows | Realistic lighting | High GPU cost, complex to implement correctly | Baked lighting or simple shadow mapping later |
| Real-time Global Illumination | Realistic lighting | Extremely expensive, may drop below 60fps | Deferred to v2+ |
| Advanced Post-Processing | Visual polish | Adds render passes, complexity | Add incrementally after core stable |
| Multi-threaded Rendering | Performance | WebGL2 not thread-safe, requires SharedArrayBuffer | Worker-based chunk generation already exists |
| Physics Integration | Block collisions | Out of scope per PROJECT.md, free-flight camera | Keep deferred |

## Feature Dependencies

```
WebGL2 Context
    └──Shader Program Pipeline
            └──Directional Lighting
            └──Ambient Lighting  
            └──Texture Atlas Sampling
            └──Sky Dome Rendering

Vertex Buffer Management
    └──Chunk Mesh Updates
            └──Block Selection Outline

View Matrix Computation
    └──Perspective Projection

Instanced Rendering (Differentiator)
    └──Requires: WebGL2 Context
    └──Enables: GPU Particles (Differentiator)
```

### Dependency Notes

- **WebGL2 Context requires Shader Pipeline:** Must compile/link shader programs before rendering
- **Instanced Rendering requires WebGL2:** Uses gl.drawArraysInstanced, WebGL2-only
- **Chunk Mesh Updates depend on Vertex Buffer Management:** Must upload new geometry to GPU
- **GPU Particles would enhance Instanced Rendering:** Both use instance drawing

## MVP Definition

### Launch With (v1 - WebGL2 Replacement)

What's needed to replace Three.js while maintaining identical visuals and performance.

- [x] WebGL2 Context with antialiasing — Canvas setup, context creation
- [x] Vertex Buffer Management — VAO/VBO handling for chunk meshes
- [x] Shader Program Pipeline — GLSL shaders matching current functionality
- [x] Camera (View + Projection) — Already implemented in camera.js
- [x] Directional + Ambient Lighting — Existing shader logic
- [x] Texture Atlas Sampling — Block texture rendering
- [x] Face Culling + Depth Testing — Standard rendering state
- [x] Sky Dome — Gradient sky matching current sky.js
- [x] Block Selection Outline — Wireframe targeting
- [x] Chunk Mesh Updates — Dynamic rebuild on edit
- [x] Resource Disposal — Memory management

### Add After Validation (v1.x)

Features to add once core rendering is stable and working.

- [ ] Frustum Culling — Skip rendering off-screen chunks (performance)
- [ ] Wireframe Debug Mode — Already exists in Three.js version

### Future Consideration (v2+)

Features that require a stable, performant core first.

- [ ] Instanced Rendering — 100x draw call reduction
- [ ] Compute Shader Meshing — GPU-based geometry generation
- [ ] Post-Processing Effects — Bloom, color grading
- [ ] PBR Materials — Advanced rendering
- [ ] Shadows — Shadow mapping

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| WebGL2 Context | HIGH | LOW | P1 |
| Shader Pipeline | HIGH | MEDIUM | P1 |
| Vertex Buffers | HIGH | MEDIUM | P1 |
| Camera Matrices | HIGH | LOW | P1 |
| Lighting | HIGH | LOW | P1 |
| Texture Atlas | HIGH | MEDIUM | P1 |
| Sky Dome | HIGH | MEDIUM | P1 |
| Block Outline | HIGH | LOW | P1 |
| Chunk Updates | HIGH | MEDIUM | P1 |
| Resource Cleanup | MEDIUM | LOW | P1 |
| Frustum Culling | HIGH | MEDIUM | P2 |
| Instanced Rendering | HIGH | HIGH | P3 |
| Shadows | MEDIUM | HIGH | P3 |
| Post-Processing | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (table stakes)
- P2: Should have, add when possible (performance)
- P3: Nice to have, future consideration (differentiators)

## Competitor Feature Analysis

| Feature | Three.js | Craft.js | Voxel.js | Our Approach |
|---------|----------|----------|----------|--------------|
| Basic Rendering | ✓ Built-in | ✓ Built-in | ✓ Built-in | Match with WebGL2 |
| Greedy Meshing | External | External | Built-in | Already have (chunk.js) |
| Instanced Drawing | Optional | Unknown | Unknown | Add in v2+ |
| Chunk Culling | External | Unknown | Unknown | Add in v1.x |
| Shadows | Built-in | External | External | Defer to v2+ |
| Compute Shaders | WebGPU only | Unknown | Unknown | Future exploration |

## Sources

- Three.js r179 source (renderer.js, shaders.js, sky.js)
- WebGL2 Fundamentals: https://webgl2fundamentals.org/
- WebGL2 Specification: https://www.khronos.org/registry/webgl/specs/latest/2.0/
- Real-Time Rendering blog: https://www.realtimerendering.com/blog/webgl-2-new-features/
- Existing voxx-js camera.js (view/projection matrix implementation)
- Existing voxx-js chunk.js (greedy meshing)

---

*Feature research for: WebGL2 Voxel Rendering Refactor*
*Researched: 2026-03-17*
