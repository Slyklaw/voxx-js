# Roadmap: Voxx-JS

## Milestones

- ✅ **v1.0 WebGL2 Refactor** — Phases 1-5 (shipped 2026-03-17)
- ✅ **v1.1 Block Editing** — Phases 6-8 (shipped 2026-03-18)
- ✅ **v1.2 Texture Atlas** — Phases 9-10 (shipped 2026-03-19)
- 🚧 **v1.3 Tech Debt Removal** — Planning in progress

## Phases

<details>
<summary>✅ v1.0 WebGL2 Refactor (Phases 1-5) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: WebGL2 Context & Shaders (1/1 plans) — completed 2026-03-17
- [x] Phase 2: Core Rendering Pipeline (2/2 plans) — completed 2026-03-17
- [x] Phase 3: Chunk Mesh Integration (1/1 plans) — completed 2026-03-17
- [x] Phase 4: Camera & Controls Integration (1/1 plans) — completed 2026-03-17
- [x] Phase 5: Polish & Performance (1/1 plans) — completed 2026-03-18

</details>

<details>
<summary>✅ v1.1 Block Editing (Phases 6-8) — SHIPPED 2026-03-18</summary>

- [x] Phase 6: Block Targeting & Interaction (3/3 plans) — completed 2026-03-18
- [x] Phase 7: Block Inventory (1/1 plans) — completed 2026-03-18
- [x] Phase 8: Chunk Updates & Persistence (1/1 plans) — completed 2026-03-18

</details>

<details>
<summary>✅ v1.2 Texture Atlas (Phases 9-10) — SHIPPED 2026-03-19</summary>

- [x] Phase 9: Texture Loading Verification (1/1 plans) — completed 2026-03-18
- [x] Phase 9.5: Minimal Texture Test (1/1 plans) — completed 2026-03-19
- [x] Phase 10: Texture Rendering Validation (1/1 plans) — completed 2026-03-19

**Key accomplishments:**
- Implemented full texture pipeline (vertex format, shaders, UV generation)
- All 5 block types render with correct atlas textures
- Debug logging for pipeline verification

</details>

### 🚧 v1.3 Tech Debt Removal (Planning)

- [ ] **Phase 11: Code Deduplication** — Extract shared mesh module, consolidate chunk classes, remove unused ChunkManager
- [ ] **Phase 12: Dead Code Removal** — Remove test artifacts, debug functions, commented code blocks
- [ ] **Phase 13: Configuration & Memory** — Centralize atlas config, add WebGL resource cleanup
- [ ] **Phase 14: Dependency Vendoring** — Vendor simplex-noise locally

---

## Phase Details

### Phase 11: Code Deduplication

**Goal**: Eliminate duplicated mesh generation logic and consolidate chunk implementations

**Depends on**: Nothing (first phase of milestone)

**Requirements**: DEBT-01, DEBT-02, DEBT-03

**Success Criteria** (what must be TRUE):
1. Single mesh generation module exists at `src/mesh.js` or similar
2. Both chunk.js and chunkWorker.js import from shared module
3. ChunkCore class removed or merged with Chunk
4. src/chunk/chunkManager.js removed
5. Greedy meshing produces identical output (verified by visual inspection)

**Plans**: TBD

---

### Phase 12: Dead Code Removal

**Goal**: Remove test artifacts, debug utilities, and commented code blocks

**Depends on**: Phase 11

**Requirements**: DEBT-04, DEBT-05, DEBT-06, DEBT-07, DEBT-08

**Success Criteria** (what must be TRUE):
1. createMockChunkMesh() function removed from render.js
2. src/gl/test-render.js removed or empty
3. No commented debug blocks remain in chunk.js, chunkWorker.js, blocks.js
4. Texture/UV logging disabled or removed from chunk generation
5. One-time debug indicators removed from blocks.js, renderer.js

**Plans**: TBD

---

### Phase 13: Configuration & Memory

**Goal**: Centralize configuration and fix memory leaks

**Depends on**: Phase 12

**Requirements**: DEBT-09, DEBT-10, DEBT-11, DEBT-12

**Success Criteria** (what must be TRUE):
1. Atlas dimensions defined in config.js only
2. All chunk dimension constants from config.js
3. chunk.dispose() properly deletes VAO, VBO, IBO buffers
4. context.js has non-empty context loss handler stub
5. No hardcoded magic numbers for atlas or chunk sizes in other files

**Plans**: TBD

---

### Phase 14: Dependency Vendoring

**Goal**: Eliminate CDN dependency for simplex-noise library

**Depends on**: Phase 13

**Requirements**: DEBT-13, DEBT-14

**Success Criteria** (what must be TRUE):
1. simplex-noise.js exists as local file in voxx-js/
2. All imports (world.js, biomes.js, chunkWorker.js) use local file
3. No CDN URL references to simplex-noise remain
4. World generation works identically with local library
5. Library file added to version control

**Plans**: TBD

---

## Progress

```
v1.0 WebGL2 Refactor:    ████████████████████ 100% ✓
v1.1 Block Editing:      ████████████████████ 100% ✓
v1.2 Texture Atlas:      ████████████████████ 100% ✓
v1.3 Tech Debt Removal:  ░░░░░░░░░░░░░░░░░░░░ 0%
```

**Overall:** 10 phases, 12 plans complete (v1.0-v1.2)

---

*Last updated: 2026-03-18 during v1.3 initialization*
