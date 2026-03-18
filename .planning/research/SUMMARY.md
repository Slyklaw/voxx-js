# Project Research Summary

**Project:** voxx-js
**Domain:** WebGL2 Voxel Rendering (Three.js Replacement)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

This project is a WebGL2 voxel rendering refactor to replace the Three.js dependency (~600KB savings) with raw WebGL2, providing direct GPU control essential for learning low-level graphics. The research establishes that voxel engines with chunk-based worlds are best served by a VAO-per-chunk rendering pattern combined with greedy meshing—already implemented in the existing codebase. The recommended approach prioritizes minimal JS per frame: create VAOs once per chunk, bind and draw with single calls, avoiding the critical pitfall of buffer re-uploads that tank performance. Key risks center on WebGL resource management (memory leaks on chunk unload), shader compilation errors, and chunk boundary gaps. All research indicates HIGH confidence; the stack is well-documented at webgl2fundamentals.org and the existing codebase already implements key architectural patterns (greedy meshing, Web Workers).

## Key Findings

### Recommended Stack

**Core technologies:**
- **Raw WebGL2** — Native GPU rendering eliminates Three.js dependency (~600KB savings), provides direct control over render pipeline. Required for this refactor.
- **GLSL ES 3.00** — WebGL2 default shader language, enables VAOs, instancing, UBO support without extensions.
- **VAO (Vertex Array Objects)** — **Critical.** Each chunk gets one VAO binding all vertex state. Reduces draw call setup from ~10 lines to 1 call. Native in WebGL2.
- **UBO (Uniform Buffer Objects)** — Share camera, projection, lighting uniforms across all chunks without redundant uploads. Single buffer update per frame.
- **glMatrix** — Lightweight (6KB) matrix math library for view/projection matrices.

**What NOT to use:**
- WebGL1 — Requires extensions for VAO/instancing, extra code paths
- Pure per-block instancing — With greedy meshing, blocks already merged; instance overhead exceeds benefit
- Three.js MeshStandardMaterial — Overhead for simple colored blocks
- Deferred rendering — Overkill for voxel engine

### Expected Features

**Must have (table stakes):**
- WebGL2 context initialization with antialiasing
- Vertex buffer management (VAO/VBO per chunk)
- Custom GLSL shader pipeline matching current functionality
- Camera matrices (view/projection) — reuse existing camera.js
- Directional + ambient lighting
- Texture atlas sampling for block types
- Sky dome rendering
- Block selection outline (wireframe)
- Chunk mesh updates on block place/remove
- Resource disposal (GPU memory cleanup)

**Should have (competitive):**
- Frustum culling — skip off-screen chunks (add in v1.x)
- Wireframe debug mode

**Defer (v2+):**
- Instanced rendering — 100x draw call reduction potential
- Compute shader meshing — GPU-based geometry
- Post-processing effects — bloom, color grading
- PBR materials
- Shadow mapping

### Architecture Approach

The recommended architecture isolates WebGL2 code in a dedicated `gl/` module, keeping rendering backend swappable. Each chunk gets one VAO containing all vertex attributes (position, normal, color, UV). The existing greedy meshing algorithm transfers directly to output WebGL buffers. Web Workers for chunk generation remain unchanged from current architecture. Camera system (camera.js) reuses existing view/projection matrix implementation.

**Major components:**
1. **WebGL2 Context** — Initialize canvas, manage context, handle context loss
2. **Shader Program Pipeline** — Compile GLSL, manage uniforms, cache locations
3. **VAO Manager** — Create/bind Vertex Array Objects per chunk mesh
4. **VBO Manager** — Create/bind buffers for position/normal/color/uv data
5. **Chunk Manager** — Track loaded chunks, handle loading/unloading by distance

### Critical Pitfalls

1. **Buffer re-upload every frame** — Performance tanks to single-digit FPS. Use `gl.STATIC_DRAW` for chunk meshes, create buffers once, update only when data changes.

2. **Chunk boundary gaps** — Visible seams between chunks. Check neighbor chunk data during meshing, add 1-voxel padding at boundaries, prevent z-fighting with slight vertex overlap.

3. **Not using VAOs** — Draw call overhead kills performance with 500+ chunks. Create one VAO per chunk, bind with single call before drawing.

4. **Memory leaks on chunk unload** — Browser crashes after 5-10 minutes. Track all GPU resources, call `gl.deleteBuffer()` and `gl.deleteVertexArray()` on chunk unload.

5. **Shader compilation failures** — Black screen with no visible errors. Check `gl.getShaderParameter()` after compilation, use `gl.getShaderInfoLog()` to debug, add `precision highp float;` to fragment shader.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: WebGL2 Context & Shaders
**Rationale:** Shaders are foundational—must compile before anything renders. Early verification prevents wasted work.
**Delivers:** WebGL2 context, GLSL vertex/fragment shaders for block rendering, sky dome shader, selection outline shader
**Addresses:** Feature - Shader Pipeline, Shader Program; Pitfall - Shader compilation failures
**Avoids:** Black screen from shader errors

### Phase 2: Core Rendering Pipeline
**Rationale:** Buffer infrastructure is where most performance pitfalls occur. VAO-per-chunk pattern is critical for voxel rendering performance.
**Delivers:** VAO/VBO management classes, chunk mesh rendering, render loop skeleton
**Addresses:** Feature - Vertex Buffer Management, Chunk Updates; Pitfall - Buffer re-upload, No VAOs, Memory leaks, Chunk boundary gaps
**Avoids:** Single-digit FPS from buffer thrashing, memory crashes from uncleared GPU resources

### Phase 3: Chunk Mesh Integration
**Rationale:** Must connect existing chunk.js meshing output to WebGL buffers. Requires adapting greedy meshing to output VBO data.
**Delivers:** Chunk mesh to GPU pipeline, dynamic rebuild on block place/remove
**Addresses:** Feature - Chunk Mesh Updates; Architecture - Data flow from world to GPU
**Avoids:** Rebuilding entire world on any block change

### Phase 4: Main Loop Integration
**Rationale:** Hook into existing main.js animation loop, connect camera matrices, add block interaction
**Delivers:** Working voxel renderer replacing Three.js, block placement/removal, sky dome rendering
**Addresses:** Feature - Camera, Lighting, Sky Dome, Block Selection
**Avoids:** Integration gaps between rendering and game logic

### Phase 5: Polish & Performance
**Rationale:** Final integration items and optimizations after core works
**Delivers:** Selection highlighting, frustum culling, wireframe debug mode, resource disposal verification
**Addresses:** Feature - Frustum Culling (v1.x); Pitfall verification
**Avoids:** Rendering off-screen chunks at scale

### Phase Ordering Rationale

- **Phase 1 → 2 → 3 follows data flow:** Shaders compile first, then buffers infrastructure, then connect world data to GPU
- **Phase 2 (core pipeline) addresses 4 of 5 critical pitfalls:** Buffer strategy, VAOs, memory leaks, boundary gaps—all foundational
- **Phase 4 integrates with existing codebase:** Camera.js, chunk.js, main.js—existing modules guide the integration
- **Phase 5 adds performance:** Frustum culling requires visible chunks to exist first

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Chunk Mesh Integration):** May need research on optimal buffer formats (interleaved vs separate), mesh update strategies
- **Phase 4 (Integration):** Cross-boundary testing between world and GL layers may reveal integration issues

Phases with standard patterns (skip research-phase):
- **Phase 1:** WebGL2 fundamentals well-documented at webgl2fundamentals.org
- **Phase 2:** VAO/VBO patterns are standard for WebGL2, no research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WebGL2 fundamentals documented at authoritative sources (webgl2fundamentals.org), TWGL/glMatrix are stable libraries |
| Features | HIGH | Table stakes derived from existing Three.js implementation; differentiators based on industry standards |
| Architecture | HIGH | VAO-per-chunk pattern is standard for voxel engines; existing codebase already has greedy meshing and workers |
| Pitfalls | MEDIUM | All pitfalls documented with prevention strategies, but some (boundary gaps) depend on implementation specifics |

**Overall confidence:** HIGH

### Gaps to Address

- **Buffer format optimization:** Research needed during Phase 3 on interleaved vs separate VBOs for chunk meshes—depends on update frequency patterns
- **Chunk boundary implementation:** Existing chunk.js neighbor lookup needs verification for edge face culling across boundaries

## Sources

### Primary (HIGH confidence)
- WebGL2 Fundamentals (webgl2fundamentals.org) — authoritative, current WebGL2 documentation
- WebGL2 Specification (khronos.org) — official WebGL2 API reference
- Existing voxx-js codebase — chunk.js (greedy meshing), camera.js (matrices), workerPool.js (parallel generation)

### Secondary (MEDIUM confidence)
- Greedy meshing in JavaScript (jameshylands.co.uk) — meshing algorithm details
- VoxelJS Chunking Magic (Mozilla) — chunk architecture patterns
- Geometry Instancing with WebGL 2 (saschawillems.de) — advanced rendering patterns
- 100 Three.js Tips That Actually Improve Performance (2026) — performance patterns

### Tertiary (LOW confidence)
- Mr Speaker WebGL2 Voxels (GitHub) — example implementation, needs validation against project specifics

---

*Research completed: 2026-03-17*
*Ready for roadmap: yes*
