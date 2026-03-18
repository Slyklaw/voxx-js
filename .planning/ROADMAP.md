# Roadmap: Voxx-JS WebGL2 Refactor

**Project:** voxx-js  
**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.  
**Depth:** Quick (3-5 phases)

---

## Phases

- [ ] **Phase 1: WebGL2 Context & Shaders** - Foundation for rendering
- [ ] **Phase 2: Core Rendering Pipeline** - VAO/VBO infrastructure and rendering
- [ ] **Phase 3: Chunk Mesh Integration** - Connect world data to GPU
- [ ] **Phase 4: Camera & Controls Integration** - First-person view
- [ ] **Phase 5: Polish & Performance** - Optimization and verification

---

## Phase Details

### Phase 1: WebGL2 Context & Shaders

**Goal:** Application creates WebGL2 context with working shader pipeline

**Depends on:** Nothing (first phase)

**Requirements:** WEBGL-01, WEBGL-02, WEBGL-03

**Success Criteria** (what must be TRUE):
1. WebGL2 context initializes on canvas with antialiasing enabled
2. Vertex and fragment shaders compile without errors and link into programs
3. Application handles WebGL2 context loss and recovers rendering state
4. At least one test triangle renders to verify pipeline works

**Plans:** 1 plan

Plans:
- [ ] 01-01-PLAN.md — Set up WebGL2 rendering context with working shader pipeline

---

### Phase 2: Core Rendering Pipeline

**Goal:** Core rendering infrastructure with VAO-per-chunk pattern

**Depends on:** Phase 1

**Requirements:** RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06

**Success Criteria** (what must be TRUE):
1. Vertex buffer objects store chunk geometry data in GPU memory
2. Vertex array objects bind per-chunk with single draw call setup
3. Uniform buffer objects share camera, projection, and lighting across all shaders
4. Colored blocks render using vertex colors (no textures required)
5. Sky dome renders with day/night cycle colors
6. Block selection outline renders as wireframe around targeted block

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — VBO/VAO buffer infrastructure and colored block rendering
- [ ] 02-02-PLAN.md — UBO for shared globals, sky dome, and block selection outline

---

### Phase 3: Chunk Mesh Integration

**Goal:** Chunk mesh data flows from world generation to GPU buffers

**Depends on:** Phase 2

**Requirements:** CHUNK-01, CHUNK-02, CHUNK-03

**Success Criteria** (what must be TRUE):
1. Chunk mesh data transfers to WebGL2 buffers using STATIC_DRAW
2. Block placement triggers mesh rebuild for affected chunks only
3. Block removal triggers mesh rebuild for affected chunks only
4. Chunk disposal properly cleans up GPU memory (buffers and VAOs deleted)

**Plans:** TBD

---

### Phase 4: Camera & Controls Integration

**Goal:** First-person camera controls integrated with WebGL2 renderer

**Depends on:** Phase 3

**Requirements:** CAMERA-01, CAMERA-02, CAMERA-03

**Success Criteria** (what must be TRUE):
1. View matrix computes correctly from camera position and orientation
2. Projection matrix (perspective) computes with proper FOV and aspect ratio
3. First-person camera controls respond to keyboard/mouse input
4. Camera movement updates view matrix in render loop each frame

**Plans:** TBD

---

### Phase 5: Polish & Performance

**Goal:** Maintains 60fps with 8+ chunk render distance

**Depends on:** Phase 4

**Requirements:** PERF-01, PERF-02

**Success Criteria** (what must be TRUE):
1. Application maintains 60fps with render distance of 8+ chunks
2. Only modified chunks rebuild meshes; unchanged chunks retain buffers
3. No visible seams between chunks (boundary gaps resolved)
4. Resource disposal verified—no memory growth over 10+ minutes of play

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. WebGL2 Context & Shaders | 1/1 | Planned | - |
| 2. Core Rendering Pipeline | 0/2 | Not started | - |
| 3. Chunk Mesh Integration | 0/1 | Not started | - |
| 4. Camera & Controls Integration | 0/1 | Not started | - |
| 5. Polish & Performance | 0/1 | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| WEBGL-01 | Phase 1 |
| WEBGL-02 | Phase 1 |
| WEBGL-03 | Phase 1 |
| RENDER-01 | Phase 2 |
| RENDER-02 | Phase 2 |
| RENDER-03 | Phase 2 |
| RENDER-04 | Phase 2 |
| RENDER-05 | Phase 2 |
| RENDER-06 | Phase 2 |
| CHUNK-01 | Phase 3 |
| CHUNK-02 | Phase 3 |
| CHUNK-03 | Phase 3 |
| CAMERA-01 | Phase 4 |
| CAMERA-02 | Phase 4 |
| CAMERA-03 | Phase 4 |
| PERF-01 | Phase 5 |
| PERF-02 | Phase 5 |

---

*Roadmap created: 2026-03-17*
