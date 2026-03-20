# Roadmap: Voxx JS v1.1 Beautiful Lighting

## Overview

Voxx JS v1.1 builds on the stable v1.0 foundation by adding beautiful lighting features: smooth sky gradients, dynamic sunlight that follows the day/night cycle, and ambient occlusion for depth perception. These enhancements will dramatically improve the visual atmosphere while maintaining performance through efficient WebGL2 techniques like Uniform Buffer Objects.

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-20)
- 🚧 **v1.1 Beautiful Lighting** - Phases 4-6 (Phases 4-5 complete, Phase 6 pending)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-20</summary>

### Phase 1: UI Fixes
**Goal**: Compass and clock UI elements fully functional
**Plans**: 2 plans

Plans:
- [x] 01-01: Fix compass display and direction tracking
- [x] 01-02: Fix clock display and day/night cycle indicator

### Phase 2: Performance Optimization
**Goal**: Optimized rendering pipeline and reduced memory footprint
**Plans**: 2 plans

Plans:
- [x] 02-01: Implement buffer pooling and draw call tracking
- [x] 02-02: Optimize chunk loading and memory management

### Phase 3: Code Quality & Testing
**Goal**: Improved code quality with comprehensive test coverage
**Plans**: 1 plan

Plans:
- [x] 03-01: Extract magic numbers, improve error handling, add unit tests

</details>

### 🚧 v1.1 Beautiful Lighting (In Progress)

**Milestone Goal:** Enhanced visual atmosphere through dynamic lighting, ambient occlusion, and smooth sky transitions

#### Phase 4: Sky Gradients
**Goal**: Users see smooth, atmospheric sky transitions that reflect time of day
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: SKY-01, SKY-02, SKY-03
**Success Criteria** (what must be TRUE):
1. User sees at least 5 distinct color stops in the sky (night, dawn, day, dusk, night)
2. Sky colors interpolate smoothly as time progresses (no abrupt changes)
3. Horizon area shows tinting that blends with sky colors
**Plans**: 2 plans

Plans:
- [x] 04-01: Implement multi-stop sky gradient shader with dithering
- [x] 04-02: Verify sky gradient meets visual quality criteria

#### Phase 5: Dynamic Sunlight ✅ COMPLETE
**Goal**: Users see sunlight that changes direction, color, and intensity in sync with time-of-day
**Depends on**: Phase 4
**Requirements**: SUN-01, SUN-02, SUN-03, LITE-01, LITE-02
**Success Criteria** (what must be TRUE):
1. ✅ Sunlight direction moves from east to zenith to west as time passes
2. ✅ Sunlight color shifts from orange dawn to white noon to orange dusk to blue night
3. ✅ Sunlight intensity peaks at noon and dims at dawn/dusk and night
4. ✅ Lighting updates use Uniform Buffer Objects (UBOs) to minimize performance impact
5. ✅ All lighting changes are driven by existing day/night cycle time value

Plans:
- [x] 05-01: Add light color/intensity uniforms to voxel shader
- [x] 05-02: Create sun config with direction/color/intensity stops
- [x] 05-03: Implement getSunInfo() for dynamic lighting interpolation
- [x] 05-04: Update updateTimeOfDay() to pass dynamic lighting

#### Phase 6: Ambient Occlusion
**Goal**: Users perceive depth and solidity through subtle shading at block edges
**Depends on**: Phase 5
**Requirements**: AO-01, AO-02
**Success Criteria** (what must be TRUE):
1. Blocks display subtle shading at edges where adjacent blocks meet (per-face AO)
2. AO strength can be adjusted via config.js without recompiling
**Plans**: TBD

Plans:
- [ ] 06-01: Implement per-face ambient occlusion in greedy mesh generation
- [ ] 06-02: Add AO configuration to config.js and integrate into shaders

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. UI Fixes | v1.0 | 2/2 | Complete | 2026-03-20 |
| 2. Performance | v1.0 | 2/2 | Complete | 2026-03-20 |
| 3. Code Quality | v1.0 | 1/1 | Complete | 2026-03-20 |
| 4. Sky Gradients | v1.1 | 2/2 | Complete | 2026-03-20 |
| 5. Dynamic Sunlight | v1.1 | 4/4 | Complete | 2026-03-20 |
| 6. Ambient Occlusion | v1.1 | 0/2 | Not started | - |