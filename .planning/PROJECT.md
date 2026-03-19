# Voxx JS

## What This Is

A browser-based 3D voxel engine built with WebGL2 and Web Workers, featuring procedural terrain generation, chunk-based rendering, and block editing. The codebase is a client-side JavaScript application with no build tools, using ES6 modules and CDN dependencies.

## Core Value

The core voxel engine provides a stable, performant foundation for exploration and building. While enhancing quality and fixing UI features, the engine's performance and reliability must be maintained.

## Requirements

### Validated

<!-- Existing capabilities confirmed by codebase analysis. -->

- ✓ Chunk-based world with procedural terrain generation (via Web Workers)
- ✓ WebGL2 rendering with greedy meshing algorithm
- ✓ Block placement and destruction with immediate mesh updates
- ✓ Dynamic day/night lighting cycle
- ✓ Multi-threaded chunk generation using worker pool
- ✓ Configurable render distance, performance settings, and debug modes
- ✓ Input handling for movement, camera control, and block editing

### Active

<!-- Current scope for this quality enhancement initiative. -->

- [ ] **UI-01**: Hook up compass feature to display cardinal directions and player facing
- [ ] **UI-02**: Hook up clock feature to display day/night cycle progress
- [ ] **PERF-01**: Identify and optimize performance bottlenecks in chunk loading and rendering
- [ ] **REFA-01**: Refactor codebase for better maintainability and readability
- [ ] **TEST-01**: Add test coverage for critical components (chunk generation, meshing, worker communication)

### Out of Scope

- Real-time multiplayer networking — out of scope for single-player engine
- Server-side components — pure client-side application
- Mobile app optimization — focus on desktop browser performance
- Advanced physics simulation — voxel placement is sufficient
- Complete rewrite to TypeScript — incremental improvements only

## Context

This is a brownfield project with an existing codebase that implements a functional voxel engine. The engine has known issues (see `.planning/codebase/CONCERNS.md`) including commented debug code, hardcoded test terrain, and potential race conditions. The UI features (compass and clock) were partially implemented but are currently non-functional due to missing data connections. Performance improvements should focus on chunk loading and rendering pipeline.

## Constraints

- **Technology stack**: Must remain pure JavaScript (no TypeScript) with ES6 modules and WebGL2
- **Build system**: No bundler or transpilation — raw source served directly
- **Dependencies**: Minimize external dependencies; current CDN dependency (simplex-noise) is acceptable
- **Compatibility**: Support modern browsers with WebGL2 (Chrome 56+, Firefox 51+, Safari 15+)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep existing architecture (Web Workers, chunk system) | Core performance is solid; improvements should be incremental | — Pending |
| Fix UI before major refactoring | User's primary goal is to get compass/clock working | — Pending |
| Performance improvements as secondary priority | User indicated performance as most important other quality improvement | — Pending |
| No constraints on refactoring approach | User explicitly selected "No constraints" | — Pending |

---
*Last updated: 2026-03-19 after initialization*