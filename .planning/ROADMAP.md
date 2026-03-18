# Roadmap: Voxx-JS WebGL2 Refactor

**Project:** voxx-js  
**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.  

---

## Milestones

- ✅ **v1.0 WebGL2 Refactor** — Phases 1-5 (shipped 2026-03-18)
- ✅ **v1.1 Block Editing** — Phases 6-8 (completed 2026-03-18)

---

## Phases

<details>
<summary>✅ v1.0 WebGL2 Refactor (Phases 1-5) — SHIPPED 2026-03-18</summary>

- [x] Phase 1: WebGL2 Context & Shaders (1/1 plan) — completed 2026-03-17
- [x] Phase 2: Core Rendering Pipeline (2/2 plans) — completed 2026-03-17
- [x] Phase 3: Chunk Mesh Integration (1/1 plan) — completed 2026-03-17
- [x] Phase 4: Camera & Controls Integration (1/1 plan) — completed 2026-03-17
- [x] Phase 5: Polish & Performance (1/1 plan) — completed 2026-03-18

[Full details in milestones/v1.0-ROADMAP.md]

</details>

<details>
<summary>🚧 v1.1 Block Editing (Phases 6-8)</summary>

  - [x] Phase 6: Block Targeting & Interaction (3 requirements)
- [x] Phase 7: Block Inventory (1 requirement)
- [x] Phase 8: Chunk Updates & Persistence (2 requirements)

</details>

---

## Phase Details

### Phase 6: Block Targeting & Interaction

**Goal**: Users can target, break, and place blocks in the world

**Depends on**: Phase 5 (v1.0 complete with camera/controls)

**Requirements**: EDIT-01, EDIT-02, EDIT-03

**Success Criteria** (what must be TRUE):
1. When player looks at a block, a visible outline appears around that block
2. Left-clicking removes the targeted block and opens a space
3. Right-clicking places the selected block type on the face adjacent to the targeted block

**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Block targeting with raycast and selection outline (completed 2026-03-18)
- [x] 06-02-PLAN.md — Left-click block breaking (EDIT-01)
- [x] 06-03-PLAN.md — Right-click block placement (EDIT-02) — completed 2026-03-18

---

### Phase 7: Block Inventory

**Goal**: Users can select which block type to place

**Depends on**: Phase 6

**Requirements**: INV-01

**Success Criteria** (what must be TRUE):
1. Pressing keys 1-9 selects the corresponding block type
2. A UI element shows which block type is currently selected
3. Right-clicking places the currently selected block type

**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Keyboard block selection (1-9) with UI feedback (completed 2026-03-18)

---

### Phase 8: Chunk Updates & Persistence

**Goal**: Block changes are visible and survive within the session

**Depends on**: Phase 6, Phase 7

**Requirements**: CHUNK-01, PERSIST-01

**Success Criteria** (what must be TRUE):
1. Breaking or placing a block immediately updates the chunk mesh to show the change
2. Modified blocks persist until the page is reloaded
3. Chunk mesh rebuilds do not cause noticeable frame drops

**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Verify and optimize chunk updates and persistence (completed 2026-03-18)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. WebGL2 Context & Shaders | v1.0 | 1/1 | Complete | 2026-03-17 |
| 2. Core Rendering Pipeline | v1.0 | 2/2 | Complete | 2026-03-17 |
| 3. Chunk Mesh Integration | v1.0 | 1/1 | Complete | 2026-03-17 |
| 4. Camera & Controls Integration | v1.0 | 1/1 | Complete | 2026-03-17 |
| 5. Polish & Performance | v1.0 | 1/1 | Complete | 2026-03-18 |
| 6. Block Targeting & Interaction | v1.1 | 1/1 | Complete | 2026-03-18 |
| 7. Block Inventory | v1.1 | 1/1 | Complete | 2026-03-18 |
| 8. Chunk Updates & Persistence | v1.1 | 1/1 | Complete | 2026-03-18 |

---

*Roadmap created: 2026-03-18 for v1.1 Block Editing milestone*
