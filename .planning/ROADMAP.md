# Roadmap: Voxx-JS v1.2 Texture Atlas

**Milestone:** v1.2 Texture Atlas
**Created:** 2026-03-18
**Depth:** Quick
**Total Phases:** 2
**Requirements:** 11 (TEX-01 through TEX-11)

## Milestone Goal

Activate the existing texture atlas implementation to render blocks with proper textures from textures-atlas.png. The code already exists in renderer.js, shaders.js, blocks.js, and chunk.js from v1.0 but was kept inactive.

## Previous Milestones

- ✅ **v1.0 WebGL2 Refactor** — Phases 1-5 (shipped 2026-03-18)
- ✅ **v1.1 Block Editing** — Phases 6-8 (shipped 2026-03-18)

## Phases

- [ ] **Phase 9: Texture Loading Verification** - Activate and debug texture atlas loading pipeline
- [ ] **Phase 10: Texture Rendering Validation** - Verify textures render correctly on all block types

## Phase Details

### Phase 9: Texture Loading Verification

**Goal:** Texture atlas loads successfully and is ready for rendering

**Depends on:** Nothing (first phase of this milestone)

**Requirements:** TEX-01, TEX-02, TEX-03

**Success Criteria** (what must be TRUE):
1. Browser console shows no errors during texture atlas (textures-atlas.png) load
2. Atlas dimensions are captured and passed to shader uniform variables
3. Console logs confirm texture loaded with correct width/height dimensions

**Plans:** 1 plan

Plans:
- [x] 09-01-PLAN.md — Verify texture loading infrastructure

---

### Phase 10: Texture Rendering Validation

**Goal:** Blocks display correct textures from atlas with proper UV mapping

**Depends on:** Phase 9 (texture must load before rendering can be verified)

**Requirements:** TEX-04, TEX-05, TEX-06, TEX-07, TEX-08, TEX-09, TEX-10, TEX-11

**Success Criteria** (what must be TRUE):
1. All blocks display textures from atlas instead of flat vertex colors
2. Each block type shows its designated texture from atlasPos in blocks.js
3. Grass blocks show green top, dirt+grass sides, and dirt bottom
4. UV coordinates tile correctly across block faces (textures repeat, not stretch)
5. Texture orientation is correct (not mirrored or rotated)
6. Greedy-meshed quads display textures consistently across merged faces
7. All 5 solid block types (Stone, Dirt, Grass, Water, Snow) render with correct textures
8. Air blocks remain fully transparent with no texture applied

**Plans:** TBD

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. WebGL2 Context & Shaders | v1.0 | 1/1 | Complete | 2026-03-17 |
| 2. Core Rendering Pipeline | v1.0 | 2/2 | Complete | 2026-03-17 |
| 3. Chunk Mesh Integration | v1.0 | 1/1 | Complete | 2026-03-17 |
| 4. Camera & Controls Integration | v1.0 | 1/1 | Complete | 2026-03-17 |
| 5. Polish & Performance | v1.0 | 1/1 | Complete | 2026-03-18 |
| 6. Block Targeting & Interaction | v1.1 | 3/3 | Complete | 2026-03-18 |
| 7. Block Inventory | v1.1 | 1/1 | Complete | 2026-03-18 |
| 8. Chunk Updates & Persistence | v1.1 | 1/1 | Complete | 2026-03-18 |
| 9. Texture Loading Verification | v1.2 | 1/1 | Planned | - |
| 10. Texture Rendering Validation | v1.2 | 0 | Not started | - |

## Coverage Map

| Requirement | Phase | Description |
|-------------|-------|-------------|
| TEX-01 | Phase 9 | Texture atlas loads without errors |
| TEX-02 | Phase 9 | Atlas dimensions passed to uniforms |
| TEX-03 | Phase 9 | Console confirms successful load |
| TEX-04 | Phase 10 | Blocks render with textures, not colors |
| TEX-05 | Phase 10 | Correct texture per block type |
| TEX-06 | Phase 10 | Different faces show appropriate textures |
| TEX-07 | Phase 10 | UV coordinates tile properly |
| TEX-08 | Phase 10 | Texture orientation correct |
| TEX-09 | Phase 10 | Greedy mesh displays textures consistently |
| TEX-10 | Phase 10 | All 5 block types with correct textures |
| TEX-11 | Phase 10 | Air blocks remain transparent |

**Coverage:** 11/11 requirements mapped ✓

---

*Last updated: 2026-03-18*
