# Roadmap: Voxx JS

## Overview

This roadmap transforms the existing functional voxel engine into a polished, maintainable quality release. We start by fixing the broken UI features (compass and clock), then optimize performance for smoother gameplay, and finally improve code quality and add test coverage for long-term maintainability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: UI Fixes** - Get compass and clock UI elements fully functional
- [ ] **Phase 2: Performance Optimization** - Improve rendering pipeline and reduce memory footprint
- [ ] **Phase 3: Code Quality & Testing** - Refactor for maintainability and add unit tests

## Phase Details

### Phase 1: UI Fixes
**Goal**: Functional compass and clock UI elements that provide real-time feedback to the player
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
   1. User can see compass needle pointing to cardinal direction (N/S/E/W) as they rotate camera
   2. User can see player facing direction indicator (e.g., "NW", "SE") updating in real-time
   3. User can see clock display showing day/night cycle progress (e.g., "Dawn", "Day", "Dusk", "Night")
   4. User can observe visual indicator of time progression (e.g., sun/moon position in sky)
**Plans**: TBD

### Phase 2: Performance Optimization
**Goal**: Improved performance for smoother rendering and reduced memory usage
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
   1. User experiences higher and more stable frame rates while exploring the world
   2. User observes reduced stuttering during chunk loading
   3. User can verify memory usage is lower over extended play sessions (via browser dev tools)
   4. User sees fewer draw calls reported in debug mode (if enabled)
**Plans**: TBD

### Phase 3: Code Quality & Testing
**Goal**: Maintainable codebase with basic test coverage
**Depends on**: Phase 2
**Requirements**: REFA-01, REFA-02, TEST-01
**Success Criteria** (what must be TRUE):
   1. Developer can easily locate and understand magic numbers (they are now named constants)
   2. Developer sees proper error messages when worker communication fails
   3. Developer can run unit tests for chunk generation and meshing algorithms and see results
   4. Developer can refactor code without breaking existing functionality (tests pass)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Fixes | 0/TBD | Not started | - |
| 2. Performance Optimization | 0/TBD | Not started | - |
| 3. Code Quality & Testing | 0/TBD | Not started | - |