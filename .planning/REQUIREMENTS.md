# Requirements: voxx-js

**Defined:** 2026-11-03
**Core Value:** High-performance browser-based voxel world rendering with smooth frame rates and rich visual features

## v1 Requirements

Requirements for milestone v2.1 (Cleanup). Each maps to roadmap phases.

### State Management

- [ ] **QUAL-01**: Encapsulate global state in modules (main.js, render.js)

### Resource Management

- [ ] **QUAL-02**: Centralize WebGL resource creation and disposal in a resource manager

### Code Hygiene

- [ ] **CLEAN-01**: Remove dead code, unused exports, and stale comments

### Architecture

- [ ] **CLEAN-02**: Clarify module boundaries to enforce layered architecture

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### State Management

- **STATE-02**: Consolidate mutable state into per-module state objects
- **STATE-03**: Remove implicit global dependencies by passing dependencies explicitly

### Resource Management

- **RES-02**: Ensure every WebGL resource is registered with the context registry
- **RES-03**: Add disposal hooks for new resource types

### Code Hygiene

- **HYG-02**: Remove stray console.logs and debug leftovers
- **HYG-03**: Standardize naming conventions across modules

### Architecture

- **ARCH-02**: Split oversized modules into focused files
- **ARCH-03**: Reduce coupling between game logic and rendering

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer/network play | Requires significant infrastructure |
| Save/load world persistence | Defer to future |
| Physics simulation (falling blocks, collisions) | Defer to future |
| Mob/NPC entities | Defer to future |
| Audio system | Defer to future |
| New major features | This milestone is cleanup/refactor only; minor fixes allowed |
| UX-01 loading progress indicator | Deferred to a future UX milestone |
| UX-02 graphics quality settings | Deferred to a future UX milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUAL-01 | Phase 7 | Pending |
| QUAL-02 | Phase 8 | Pending |
| CLEAN-01 | Phase 9 | Pending |
| CLEAN-02 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-03*
*Last updated: 2026-11-03 after initial definition*