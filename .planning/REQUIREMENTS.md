# Requirements: voxx-js

**Defined:** 2026-04-02
**Core Value:** High-performance browser-based voxel world rendering with smooth frame rates and rich visual features

## v1 Requirements

Requirements for v2.0 Shadows milestone. Each maps to roadmap phases.

### Shadow Mapping

- [ ] **SHADOW-01**: Directional shadow map rendered from sun position (light direction matches day/night cycle)
- [ ] **SHADOW-02**: Shadows cover full render distance (all visible chunks cast and receive shadows)
- [ ] **SHADOW-03**: Hard shadow edges (no PCF soft filtering)
- [ ] **SHADOW-04**: Shadow map resolution set to a quality default (no UI toggle)
- [ ] **SHADOW-05**: Shadow map integrates with existing deferred rendering pipeline
- [ ] **SHADOW-06**: Shadow map updates as sun moves during day/night cycle
- [ ] **SHADOW-07**: Shadow map framebuffer created and managed by resource registry (no memory leaks)

### Performance

- [ ] **SHADOW-08**: Shadow rendering maintains 60fps on mid-range hardware with default settings

### Dependencies

- [ ] **DEPS-01**: Self-host simplex-noise dependency

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### User Experience

- **UX-01**: Add resource loading progress indicator during world generation
- **UX-02**: Add graphics quality settings (render distance, SSAO toggle)

### Code Quality

- **QUAL-01**: Encapsulate global state in modules
- **QUAL-02**: Implement centralized WebGL resource manager

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Soft shadows (PCF filtering) | Hard shadows sufficient for v2.0, soft adds complexity |
| Cascaded shadow maps (CSM) | Single shadow map is simpler and adequate for this milestone |
| Shadow quality UI toggle | Defer to UX-02 (graphics quality settings) |
| Multiplayer/network play | Requires significant infrastructure |
| Save/load world persistence | Defer to future |
| Physics simulation | Defer to future |
| Mob/NPC entities | Defer to future |
| Audio system | Defer to future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPS-01 | Phase 4 | Pending |
| SHADOW-01 | Phase 5 | Pending |
| SHADOW-03 | Phase 5 | Pending |
| SHADOW-04 | Phase 5 | Pending |
| SHADOW-07 | Phase 5 | Pending |
| SHADOW-02 | Phase 6 | Pending |
| SHADOW-05 | Phase 6 | Pending |
| SHADOW-06 | Phase 6 | Pending |
| SHADOW-08 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
