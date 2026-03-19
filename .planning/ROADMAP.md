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

- [x] **Phase 9: Texture Loading Verification** - ~~Activate and debug~~ **Discovered not implemented**
- [x] **Phase 9.5: Minimal Texture Test** - **Implemented full texture pipeline**
- [x] **Phase 10: Texture Rendering Validation** - **All textures rendering correctly**

## Phase Details

### Phase 9: Texture Loading Verification

**Goal:** ~~Texture atlas loads successfully~~ **Discovery: Not implemented**

**Depends on:** Nothing (first phase of this milestone)

**Requirements:** TEX-01, TEX-02, TEX-03

**Status:** Completed with incorrect verification - code didn't actually exist

**Plans:** 1 plan (invalid - based on false assumption)
- ~~09-01-PLAN.md~~ Verify texture loading infrastructure ← **This plan was wrong**

---

### Phase 9.5: Minimal Texture Test ⭐ NEW

**Goal:** Get ANY texture displaying from atlas (not flat vertex colors)

**Depends on:** Nothing (starting fresh with actual implementation)

**Requirements:** TEX-01 through TEX-11 (all texture requirements)

**Root Cause:** Texture pipeline never implemented:
- Shaders have no texture sampling
- Vertex format has no UV coordinates
- Renderer has no texture loading

**Plans:** 1 plan
- [x] 09.5-01-PLAN.md — Minimal texture implementation ✅

**Success Criteria** (what must be TRUE):
1. Vertex format extended from 9 to 11 floats (adding UV)
2. Vertex shader accepts `aUV` attribute and passes `vUV` to fragment
3. Fragment shader samples `texture(uTextureAtlas, vUV)` instead of flat color
4. UV coordinates generated in chunk mesh based on atlas positions
5. Texture atlas loaded from textures-atlas.png
6. Blocks show SOME texture (may be wrong texture, but not flat gray)

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
| 9. Texture Loading Verification | v1.2 | 1/1 | **Invalid** | 2026-03-18 |
| 9.5. Minimal Texture Test | v1.2 | 1/1 | **Complete** | 2026-03-19 |
| 10. Texture Rendering Validation | v1.2 | 1/1 | **Complete** | 2026-03-18 |

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

## Notes

### 2026-03-18: Critical Discovery

The texture pipeline documented in phases 9-10 **does not exist**:
- Shaders (`voxx-js/src/shaders/voxel.js`) have NO texture sampling
- Vertex format (`voxx-js/src/gl/buffers.js`) has NO UV coordinates
- Renderer (`voxx-js/src/gl/render.js`) has NO texture loading
- Block definitions (`voxx-js/blocks.js`) have `atlasPos` but nothing uses them

Previous verification was checking code comments, not functionality.

**Resolution:** New Phase 9.5 created to implement minimal working texture pipeline.

---

*Last updated: 2026-03-19*
