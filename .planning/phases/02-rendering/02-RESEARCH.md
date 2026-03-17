# Phase 2: Rendering Research

## Goal
Deliver performant WebGL 2.0 rendering with intelligent chunk visibility and loading management

## Requirements
- PERF-01: Only chunks within camera frustum are rendered (occluded chunks not drawn)
- PERF-03: Chunk loading respects distance threshold and hysteresis (no jitter at boundaries)
- PERF-04: Renderer attempts WebGL 2.0, falls back to WebGL 1.0 if unavailable
- PERF-05: Multiple chunks batched into fewer draw calls (vertex pooling active)
- FEAT-05: Chunk loading throttling and memory pooling
- TEST-05: Renderer matrix math calculations pass unit tests

## Recommended Stack
From global research:
- **Three.js (0.183.2)**: 3D rendering and scene management — industry standard with WebGL2 support
- **WebGL 2.0**: Modern features, better performance, compute shaders (optional)
- **Custom WebGL**: Fine-grained control, used in existing codebase

## Architecture Patterns

### Rendering Pipeline
1. **Voxel-to-mesh conversion**: Greedy meshing or culled meshing to reduce geometry
2. **Vertex pooling**: Merge chunk geometries into single buffer to reduce draw calls
3. **Frustum culling**: Only render chunks within camera view
4. **Distance-based loading**: Load chunks based on player position with hysteresis

### Performance Pitfalls to Avoid
1. **Naive chunk rendering** — Separate VAO/VBO per chunk causes excessive draw calls (>100 chunks). Solution: vertex pooling and merged VBOs early.
2. **Blocking main thread with mesh generation** — 50-200ms freezes when loading chunks. Solution: Web Workers and task queuing.
3. **Memory leaks from WebGL resources** — Browser tab grows until crash; buffers/textures not deleted on chunk unload. Solution: explicit cleanup and FinalizationRegistry.
4. **No frustum culling** — Rendering all chunks wastes GPU. Solution: implement frustum culling per chunk.
5. **No chunk loading throttle** — Loading/unloading every frame causes jitter. Solution: distance threshold and hysteresis.

## Technology Considerations

### Three.js vs Custom WebGL
- **Three.js**: Higher-level, easier to implement, includes features like scene graph, camera, lighting. Adds ~600KB to bundle.
- **Custom WebGL**: Lower-level, more control, smaller bundle. Already implemented in codebase.
- **Recommendation**: Extend existing custom WebGL implementation with WebGL 2.0 features. Consider Three.js for rapid prototyping but may add unnecessary complexity.

### WebGL 2.0 Features to Adopt
- **Instanced rendering**: Draw multiple cubes with single draw call
- **Uniform buffer objects**: Efficient uniform updates
- **Vertex array objects**: Encapsulate vertex attribute state
- **Transform feedback**: GPU-side particle effects (optional)

### Chunk Mesh Generation
- **Greedy meshing**: Merge adjacent same-type voxels into larger faces
- **Culled meshing**: Only render exposed faces (face culling)
- **Chunk meshing**: Generate mesh per chunk, update when voxels change
- **Web Workers**: Offload mesh generation to background thread

## Implementation Phases

### Phase 2.1: WebGL 2.0 Upgrade
- Detect WebGL 2.0 support, fallback to WebGL 1.0
- Update shader syntax to GLSL 3.00 ES where possible
- Add vertex array objects for better performance

### Phase 2.2: Chunk Mesh Generation
- Implement greedy/culled meshing algorithm
- Generate mesh data per chunk (vertices, normals, texture coords)
- Update mesh when voxels change

### Phase 2.3: Vertex Pooling
- Merge chunk meshes into single vertex buffer
- Implement chunk-to-vertex mapping
- Update pooled vertices when chunk mesh changes

### Phase 2.4: Frustum Culling
- Implement frustum planes calculation
- Test each chunk bounding box against frustum
- Skip rendering for out-of-view chunks

### Phase 2.5: Distance-Based Loading
- Implement chunk loading based on player position
- Add hysteresis to prevent boundary jitter
- Throttle chunk loading to once per N frames

### Phase 2.6: Testing & Optimization
- Add unit tests for matrix math, frustum calculations
- Benchmark with 500+ chunks
- Profile and optimize hot paths

## Sources
- [Nick's Blog: High Performance Voxel Engine](https://nickthecook.wordpress.com/) — vertex pooling, performance pitfalls
- [max-mapper/voxel-engine DeepWiki](https://deepwiki.com/max-mapper/voxel-engine/) — core architecture, subsystems
- [Three.js documentation](https://threejs.org/docs/) — WebGL 2.0 features, instanced rendering
- [WebGL 2.0 Specification](https://www.khronos.org/registry/webgl/specs/latest/2.0/) — modern features