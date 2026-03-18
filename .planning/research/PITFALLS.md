# Pitfalls Research

**Domain:** WebGL2 Voxel Rendering Refactor (Three.js → Raw WebGL2)
**Researched:** 2026-03-17
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Buffer Re-upload Every Frame

**What goes wrong:**
Performance tanks to single-digit FPS. GPU usage stays low while CPU pegs at 100%. Rendering becomes unusable.

**Why it happens:**
Developers create buffers with `gl.DYNAMIC_DRAW` or `gl.STREAM_DRAW` and call `gl.bufferData()` or `gl.bufferSubData()` every frame, not realizing this defeats the entire purpose of GPU-side buffers. Three.js hides this automatically; raw WebGL requires explicit buffer lifecycle management.

**How to avoid:**
- Use `gl.STATIC_DRAW` for chunk meshes that don't change
- Use `gl.DYNAMIC_DRAW` only for frequently-updated geometry (e.g., block selection outline)
- Create buffers once, update only when chunk mesh data actually changes

**Warning signs:**
- Frame time correlates with visible chunk count (should be near-constant with static meshes)
- CPU profiling shows repeated `bufferData` calls in render loop
- GPU utilization below 30% despite heavy rendering

**Phase to address:**
Phase 2: Core Rendering Pipeline — buffer strategy is foundational

---

### Pitfall 2: Chunk Boundary Gaps (Missing Faces)

**What goes wrong:**
Visible seams and gaps appear between adjacent chunks. Voxels at chunk edges render incorrectly or not at all.

**Why it happens:**
Greedy meshing only sees voxels within a single chunk. When a chunk's edge voxel is solid but the neighboring chunk's edge voxel is also solid, the shared face should be culled—but the mesher can't check across chunk boundaries. Additionally, float precision issues in vertex positions cause micro-gaps.

**How to avoid:**
- Check neighbor chunk data during meshing for edge faces
- Add 1-voxel padding/overlap at chunk boundaries, or explicitly handle boundary conditions
- Use slight vertex overlap (0.001 units) to prevent z-fighting at seams

**Warning signs:**
- Gaps visible at chunk coordinates divisible by chunk size (32)
- Artifacts appear/disappear when camera moves slightly
- Greedy meshing passes but rendering shows holes

**Phase to address:**
Phase 2: Core Rendering Pipeline — mesh generation crosses into core pipeline

---

### Pitfall 3: Not Using VAOs (Vertex Array Objects)

**What goes wrong:**
Draw call overhead kills performance. With 500+ chunks, each requiring 10+ WebGL calls to set up attributes, frame times explode.

**Why it happens:**
Three.js abstracts this away. Raw WebGL requires manually binding each VBO (position, normal, color, UV) and setting attribute pointers before every draw call. Without VAOs, this happens every frame for every chunk.

**How to avoid:**
- Create one VAO per chunk that encapsulates all vertex attribute state
- Bind chunk VAO with single `gl.bindVertexArray(chunk.vao)` before drawing
- WebGL2 makes VAOs core—no extension needed

**Warning signs:**
- 5000+ WebGL calls per frame (should be <1000 with VAOs)
- Performance doesn't improve with better GPU
- Code has repeated attribute binding logic in render loop

**Phase to address:**
Phase 2: Core Rendering Pipeline — VAO strategy is core infrastructure

---

### Pitfall 4: Memory Leaks on Chunk Unload

**What goes wrong:**
Browser tab crashes after playing for 5-10 minutes. Memory usage grows unbounded. GPU memory exhausted.

**Why it happens:**
When chunks unload, developers forget to call `gl.deleteBuffer()` and `gl.deleteVertexArray()`. WebGL resources aren't garbage-collected like JS objects—they persist until explicitly deleted.

**How to avoid:**
- Track all GPU resources in a registry
- On chunk unload: delete buffers, delete VAO, clear registry entry
- Implement `dispose()` pattern matching Three.js resource cleanup

**Warning signs:**
- Memory in Chrome Task Manager grows continuously during play
- `renderer.info.memory` would show leaked objects (Three.js concept)
- Performance degrades over time, not from start

**Phase to address:**
Phase 2: Core Rendering Pipeline — resource management is foundational

---

### Pitfall 5: Shader Compilation Failures

**What goes wrong:**
Black screen, no errors in console. Or cryptic WebGL warnings that don't point to the actual shader line.

**Why it happens:**
GLSL in WebGL2 requires `#version 300 es` for modern features. Missing precision qualifiers (`precision highp float;`) cause shader rejection. Type mismatches between vertex/fragment shaders fail silently in some browsers.

**How to avoid:**
- Start with minimal working shaders, add features incrementally
- Check `gl.getShaderParameter(shader, gl.COMPILE_STATUS)` after each compilation
- Use `gl.getShaderInfoLog(shader)` to debug compilation errors
- Add `precision highp float;` to fragment shader top

**Warning signs:**
- Console shows shader compile warnings
- Black rendering with no visible geometry
- Works in one browser, fails in another ( Safari particularly strict)

**Phase to address:**
Phase 1: Shaders & Materials — shaders are first milestone

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One giant VBO for all chunks | Simple initial setup | Must rebuild entire buffer on any change | Never for voxel engines |
| Recreating VAOs each frame | Avoids tracking state | 10x+ performance loss | Never |
| No resource tracking | Faster initial coding | Memory leaks, crashes | Only in throwaway prototype |
| Hardcoded chunk size in shaders | Avoids uniform passes | Can't change without code changes | Acceptable for v1 only |
| Single shader for all block types | Simpler codebase | Can't optimize per-block-type rendering | Acceptable for colored blocks |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WebGL2 Context | Not checking `canvas.getContext('webgl2')` | Fallback to error message, WebGL2 required for this project |
| Extension detection | Assuming all WebGL2 features universally available | Check `gl.getExtension()` for features used, handle gracefully |
| Canvas resize | Not updating viewport and projection matrix | Listen to resize, update both viewport and camera projection |
| Context loss | Not handling `webglcontextlost` event | Save state, restore on `webglcontextrestored`, or warn user |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Draw call per block | 1000+ draw calls | Greedy meshing + VAO-per-chunk | Above 16 chunks render distance |
| Uniform upload per chunk | CPU-bound, high driver overhead | Use Uniform Buffer Objects (UBO) for shared uniforms | Above 32 chunks |
| Re-meshing on every block change | Stutter during block placement | Only re-mesh affected chunk, use DYNAMIC_DRAW | Any block modification |
| No frustum culling | Rendering off-screen chunks | Test chunk AABB against view frustum | Above 8 chunks render distance |
| No chunk mesh culling | Rendering hidden chunks | Distance-based + occlusion checks | Above 16 chunks render distance |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Shader source from user input | Shader injection | Never pass user input directly to shader compilation |
| Loading textures from arbitrary URLs | Data exfiltration via textures | Only load from trusted sources, validate CORS |
| No WebGL error checking | Silent failures mask bugs | Wrap WebGL calls, check `gl.getError()` in debug mode |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Long load times without feedback | User thinks app is broken | Show loading indicator, chunk progress |
| Frame drops during chunk load | Stuttering breaks immersion | Preload chunks ahead, use workers (already exists) |
| No error message on WebGL2 failure | User sees blank screen | Clear error message explaining WebGL2 requirement |

---

## "Looks Done But Isn't" Checklist

- [ ] **Rendering:** Chunk meshes appear but check — are VAOs actually being used? Verify draw call count.
- [ ] **Memory:** Chunks unload visually but check — are GPU buffers deleted? Profile memory over time.
- [ ] **Performance:** Runs fine at low render distance but check — does it scale? Test at target render distance (8+ chunks).
- [ ] **Boundaries:** Small test world looks fine but check — do edge chunks have gaps? Test chunk coordinate boundaries.
- [ ] **Block changes:** Placing blocks works but check — does only the affected chunk re-mesh? Verify no full-world rebuilds.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Buffer re-upload | LOW | Change buffer usage hint, verify with profiler |
| Boundary gaps | MEDIUM | Add neighbor lookup in mesher, test edge cases |
| No VAOs | LOW | Refactor to VAO-per-chunk pattern |
| Memory leaks | MEDIUM | Add dispose tracking, iterate loaded chunks to clean up |
| Shader errors | LOW | Start minimal, add incrementally, check compile logs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Buffer re-upload every frame | Phase 2: Core Rendering Pipeline | Profile frame times, check for bufferData in render loop |
| Chunk boundary gaps | Phase 2: Core Rendering Pipeline | Test at chunk boundaries, visual inspection |
| Not using VAOs | Phase 2: Core Rendering Pipeline | Count WebGL calls per frame, should be <1000 |
| Memory leaks | Phase 2: Core Rendering Pipeline | Monitor memory over 5-10 min play session |
| Shader compilation | Phase 1: Shaders & Materials | Test in multiple browsers, check shader logs |
| Missing frustum culling | Phase 3: Performance Optimization | Profile at max render distance |
| No chunk mesh culling | Phase 3: Performance Optimization | Count visible chunks vs. rendered chunks |

---

## Sources

- [WebGL2 Fundamentals - Instanced Drawing](https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html) — HIGH
- [Greedy meshing in javascript](https://www.jameshylands.co.uk/2022/10/greedy-meshing-in-javascript.html) — MEDIUM
- [VoxelJS Chunking Magic - Mozilla](https://blog.mozvr.com/voxeljs-chunking-magic/) — HIGH
- [Missing faces at ends of voxel chunks - Stack Exchange](https://gamedev.stackexchange.com/questions/211272/missing-faces-at-ends-of-voxel-chunks) — MEDIUM
- [WebGL2 Optimization - WebGL2 Fundamentals](https://webgl2fundamentals.org/) — HIGH
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) — MEDIUM
- Existing voxx-js architecture analysis in `.planning/codebase/ARCHITECTURE.md` — HIGH

---

*Pitfalls research for: WebGL2 Voxel Rendering Refactor*
*Researched: 2026-03-17*
