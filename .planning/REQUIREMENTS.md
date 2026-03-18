# Requirements: Voxx-JS WebGL2 Refactor

**Defined:** 2026-03-17
**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### WebGL2 Infrastructure

- [x] **WEBGL-01**: Application creates WebGL2 rendering context
- [x] **WEBGL-02**: Shader pipeline compiles vertex and fragment shaders
- [x] **WEBGL-03**: Application handles WebGL2 context loss and recovery

### Rendering Pipeline

- [x] **RENDER-01**: Vertex buffer (VBO) infrastructure for chunk geometry
- [x] **RENDER-02**: Vertex array object (VAO) per chunk for efficient binding
- [x] **RENDER-03**: Uniform buffer objects (UBO) for shared globals (camera, projection, light)
- [x] **RENDER-04**: Colored block rendering using vertex colors
- [x] **RENDER-05**: Sky dome rendering with day/night cycle colors
- [x] **RENDER-06**: Block selection outline rendering

### Chunk Integration

- [ ] **CHUNK-01**: Chunk mesh data transferred to WebGL2 buffers
- [ ] **CHUNK-02**: Chunk mesh updates when blocks placed/removed
- [ ] **CHUNK-03**: Chunk disposal and GPU memory cleanup on unload

### Camera & Controls

- [ ] **CAMERA-01**: View matrix computation and uploading
- [ ] **CAMERA-02**: Projection matrix computation (perspective)
- [ ] **CAMERA-03**: First-person camera control maintained

### Performance

- [ ] **PERF-01**: Maintains 60fps with 8+ chunk render distance
- [ ] **PERF-02**: Efficient buffer updates (only changed chunks)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Rendering

- **ADVAN-01**: Frustum culling for off-screen chunks
- **ADVAN-02**: Instanced rendering for particles/floating text
- **ADVAN-03**: LOD (Level of Detail) for distant chunks
- **ADVAN-04**: Post-processing effects (fog, ambient occlusion)

### Textures

- **TEXTR-01**: Texture atlas for block types
- **TEXTR-02**: Texture sampling in shaders

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer | Requires server infrastructure |
| Real-time shadows | Too expensive for v1 |
| Physics/collisions | Free-flight camera for exploration |
| Mobile support | Desktop-first |
| Advanced lighting (GI) | Deferred to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WEBGL-01 | Phase 1 | Complete |
| WEBGL-02 | Phase 1 | Complete |
| WEBGL-03 | Phase 1 | Complete |
| RENDER-01 | Phase 2 | Complete |
| RENDER-02 | Phase 2 | Complete |
| RENDER-03 | Phase 2 | Complete |
| RENDER-04 | Phase 2 | Complete |
| RENDER-05 | Phase 2 | Complete |
| RENDER-06 | Phase 2 | Complete |
| CHUNK-01 | Phase 3 | Pending |
| CHUNK-02 | Phase 3 | Pending |
| CHUNK-03 | Phase 3 | Pending |
| CAMERA-01 | Phase 4 | Pending |
| CAMERA-02 | Phase 4 | Pending |
| CAMERA-03 | Phase 4 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after research synthesis*
