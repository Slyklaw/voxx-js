# Stack Research

**Domain:** WebGL2 Voxel Rendering
**Researched:** 2026-03-17
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|-----------|---------|---------|-----------------|
| Raw WebGL2 | Native | Direct GPU rendering | Eliminates Three.js dependency (~600KB savings), provides direct control over render pipeline, essential for learning low-level graphics |
| GLSL ES 3.00 | Built-in | Shader language | WebGL2 default, enables VAOs, instancing, UBO support without extensions |
| VAO | WebGL2 native | Vertex Array Objects | **Critical for voxel rendering.** Binds all vertex state in one object. Each chunk gets one VAO. Reduces draw call setup from ~10 lines to 1. Standard in WebGL2 (no extension needed). |
| Instanced Rendering | WebGL2 native | drawArraysInstanced/drawElementsInstanced | Use for particles, floating text, not block faces. With greedy meshing, chunk meshes are already optimized. |
| UBO | WebGL2 native | Uniform Buffer Objects | Share camera, projection, lighting uniforms across all chunks without redundant uploads. Single buffer update per frame. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TWGL.js | 7.x | Boilerplate reducer | Optional. Use if raw WebGL verbosity slows development. Provides shader compilation helpers, buffer creation, attribute binding. Does NOT impose structure—works alongside raw WebGL calls. |
| glMatrix | 4.x | Matrix math | For view/projection matrices. Lightweight (6KB). Already used implicitly by Three.js internally. Replace with custom or glMatrix for raw WebGL2. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| WebGL2 Fundamentls | Reference | https://webgl2fundamentals.org — authoritative, current |
| WebGL Inspector | Debugging | Browser DevTools or https://github.com/games.greggman/webgl-inspector |

## WebGL2 Features Explained

### VAO (Vertex Array Object)
**What:** Encapsulates vertex attribute state (buffers, strides, offsets, enabled states) in a single bindable object.

**Why for voxels:**
```javascript
// Without VAO: ~10 WebGL calls per chunk per frame
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, offset);
gl.enableVertexAttribArray(posLoc);
// ... repeat for normal, uv, color...

// With VAO: 1 call per chunk
gl.bindVertexArray(chunkVAO);
gl.drawElementsInstanced(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0, 1);
```
Your codebase has 8+ chunk render distance = potentially 500+ visible chunks. VAO reduces per-frame setup dramatically.

### Instanced Rendering
**What:** Single draw call renders N copies of geometry with per-instance data.

**Why for voxels:** Use for:
- Particles (breaking blocks, ambient dust)
- Floating text labels
- Hand/item held by player

**Don't use for:** Block faces with greedy meshing. Greedy mesh already merges faces into quads. Each chunk = one mesh = one draw call. Instancing would add overhead without benefit.

### UBO (Uniform Buffer Object)
**What:** GPU-side storage for uniforms, shared across all programs.

**Why for voxels:**
```glsl
// In shader
layout(std140) uniform GlobalUniforms {
    mat4 u_projection;
    mat4 u_view;
    vec3 u_lightDir;
    float u_time;
};
```
Single buffer upload per frame. All chunks share. No redundant uniform uploads.

## Installation

```javascript
// No npm needed - ES modules from CDN

// Option 1: Pure raw WebGL2 (recommended for learning)
const gl = canvas.getContext('webgl2');

// Option 2: With TWGL helper (optional)
import * as twgl from 'https://unpkg.com/twgl.js@7.x/dist/twgl-full.mjs';

// Matrix library (optional)
import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@4.x/+esm';
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Raw WebGL2 | Babylon.js | If you want a full framework with physics, materials, scenes |
| Raw WebGL2 | Three.js (current) | If you need ready-made loaders, post-processing, complex materials |
| TWGL.js | Regenerator | If you want more abstraction than TWGL but less than Three.js |
| glMatrix | Three.js math | If keeping Three.js for math while replacing renderer |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| WebGL1 | No native VAO/instancing (requires extensions). Extra code paths. | WebGL2 (required for this refactor) |
| Pure per-block instancing | With greedy meshing, blocks are already merged. Instance data overhead > benefit. | Chunk-based mesh rendering |
| Three.js MeshStandardMaterial | Overhead for simple colored blocks. Doesn't leverage custom shader knowledge. | Custom GLSL shaders for voxel-specific lighting (ambient occlusion, face-based shading) |
| Deferred rendering | Overkill for voxel engine. Forward rendering with depth testing works fine. | Simple forward rendering |

## Stack Patterns by Variant

**If goal is maximum performance:**
- Raw WebGL2 + custom shaders + chunk VAOs + UBO batching
- Minimal JS per frame: just bind VAO and draw

**If goal is learning WebGL2:**
- Raw WebGL2 + TWGL for boilerplate reduction
- Write custom shaders to understand GPU pipeline

**If goal is rapid development:**
- Consider keeping Three.js but using raw WebGL2 materials/shaders
- Or: Babylon.js with WebGL2 backend

## Version Compatibility

| Feature | WebGL2 Required | Notes |
|---------|-----------------|-------|
| VAO | Yes | Native in WebGL2 |
| Instancing | Yes | drawArraysInstanced/drawElementsInstanced |
| UBO | Yes | All uniform buffers |
| GLSL 3.00 ES | Yes | Vertex/fragment shader syntax |
| Multiple render targets | Yes | For future post-processing |

## Architecture for Voxx-JS Refactor

### Recommended Approach

1. **Keep chunk-based world** — existing architecture is sound
2. **Each chunk → One VAO** — encapsulates mesh + attributes
3. **Greedy mesh → VBO + IBO** — already have algorithm, adapt to raw WebGL2 buffers
4. **UBO for globals** — projection, view, light direction
5. **Per-chunk uniforms** — model matrix, chunk position offset
6. **Custom GLSL shaders** — simple Lambert or flat shading for colored blocks

### Migration Path

```
Three.js Renderer          →  Raw WebGL2
Three.js Geometry          →  VBO + IBO
Three.js Material          →  Custom GLSL shaders
Three.js Mesh              →  VAO + draw call
Object3D transform         →  Uniforms or baked into vertex data
```

### Render Loop (Target)

```javascript
// Per frame
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, globalUBO);  // camera, light

for (const chunk of visibleChunks) {
    gl.bindVertexArray(chunk.vao);
    gl.uniformMatrix4fv(modelLoc, false, chunk.modelMatrix);
    gl.drawElements(gl.TRIANGLES, chunk.indexCount, gl.UNSIGNED_SHORT, 0);
}
```

## Sources

- WebGL2 Fundamentals (webgl2fundamentals.org) — HIGH confidence
- WebGL2 Instanced Drawing (webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html) — HIGH confidence
- Voxel Performance: Instancing vs Chunking (medium.com/@claygarrett) — MEDIUM confidence
- TWGL.js Documentation (twgljs.org) — HIGH confidence
- VAO best practices for voxel engines (gamedev.stackexchange.com) — MEDIUM confidence

---

*Stack research for: WebGL2 voxel rendering refactor*
*Researched: 2026-03-17*
