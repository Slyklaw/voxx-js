# Requirements: Voxx JS

**Defined:** 2026-03-20
**Core Value:** The core voxel engine provides a stable, performant foundation for exploration and building.

## v1 Requirements

Requirements for Beautiful Lighting milestone. Each maps to roadmap phases.

### Sky Rendering

- [x] **SKY-01**: Sky gradient displays with at least 5 color stops (night, dawn, day, dusk, night)
- [x] **SKY-02**: Sky colors smoothly interpolate based on time-of-day progression
- [x] **SKY-03**: Sky gradient includes visible horizon color tinting

### Dynamic Sunlight

- [ ] **SUN-01**: Sun light direction vector updates based on time-of-day (east → zenith → west)
- [ ] **SUN-02**: Sun light color changes throughout day cycle (orange dawn → white noon → orange dusk → blue night)
- [ ] **SUN-03**: Sun light intensity varies (brighter at noon, dimmer at dawn/dusk, minimal at night)

### Ambient Occlusion

- [ ] **AO-01**: Blocks display subtle shading at edges where adjacent blocks meet (per-face AO)
- [ ] **AO-02**: AO strength is configurable and can be tuned via config.js

### Lighting Integration

- [ ] **LITE-01**: All lighting changes use Uniform Buffer Objects (UBOs) for efficient updates
- [ ] **LITE-02**: Existing day/night cycle time value drives all lighting calculations

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Lighting

- **LITE-03**: Underground darkness based on distance to sky
- **LITE-04**: Block light sources (torches, lanterns) with light propagation
- **LITE-05**: Dynamic shadows cast by terrain geometry

### Enhanced AO

- **AO-03**: Per-vertex ambient occlusion with optimized greedy mesh compatibility
- **AO-04**: Screen-space ambient occlusion (SSAO) post-processing option

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time shadows | Complex, requires shadow maps — defer to v2 |
| Volumetric fog/lights | Performance intensive, not core to voxel aesthetic |
| PBR materials | Engine uses simple block textures |
| Ray-traced lighting | Not WebGL2 capable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKY-01 | Phase 4 | Complete |
| SKY-02 | Phase 4 | Complete |
| SKY-03 | Phase 4 | Complete |
| SUN-01 | Phase 5 | Pending |
| SUN-02 | Phase 5 | Pending |
| SUN-03 | Phase 5 | Pending |
| AO-01 | Phase 6 | Pending |
| AO-02 | Phase 6 | Pending |
| LITE-01 | Phase 5 | Pending |
| LITE-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Complete: 0
- Pending: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after v1.1 roadmap created*
