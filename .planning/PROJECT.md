# Voxx JS

## What This Is

A browser-based 3D voxel engine built with WebGL2 and Web Workers, featuring procedural terrain generation, chunk-based rendering, and block editing. The codebase is a client-side JavaScript application with no build tools, using ES6 modules and CDN dependencies.

## Core Value

The core voxel engine provides a stable, performant foundation for exploration and building. The v1.0 release delivers a polished, maintainable foundation with working UI, optimized performance, and test coverage.

## Requirements

### Validated (v1.0)

- ✓ **UI-01**: Compass displays cardinal directions and player facing direction
- ✓ **UI-02**: Clock displays day/night cycle progress with visual indicator
- ✓ **PERF-01**: Optimized rendering pipeline with buffer pooling and draw call tracking
- ✓ **PERF-02**: Reduced memory footprint through buffer pooling and proper cleanup
- ✓ **REFA-01**: Magic numbers extracted to named constants (MESH_CONFIG, ATLAS_CONFIG, WORKER_CONFIG, BLOCK_CONFIG, BIOME_TUNING)
- ✓ **REFA-02**: Improved error handling in worker pool with worker recreation support
- ✓ **TEST-01**: 34 unit tests for chunk generation, biomes, and greedy mesh algorithms

### Active

<!-- Next milestone goals - to be defined -->

### Out of Scope

- Real-time multiplayer networking — out of scope for single-player engine
- Server-side components — pure client-side application
- Mobile app optimization — focus on desktop browser performance
- Advanced physics simulation — voxel placement is sufficient
- Complete rewrite to TypeScript — incremental improvements only

## Context

**Current state (v1.0):** The voxel engine now has fully functional UI elements (compass, clock), performance optimizations (buffer pooling, staged loading, hot chunk retention), and test coverage. The codebase is more maintainable with named constants and improved error handling.

**Tech stack:** Pure JavaScript with ES6 modules, WebGL2, Web Workers, CDN dependencies (simplex-noise)

## Constraints

- **Technology stack**: Must remain pure JavaScript (no TypeScript) with ES6 modules and WebGL2
- **Build system**: No bundler or transpilation — raw source served directly
- **Dependencies**: Minimize external dependencies; current CDN dependency (simplex-noise) is acceptable
- **Compatibility**: Support modern browsers with WebGL2 (Chrome 56+, Firefox 51+, Safari 15+)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep existing architecture (Web Workers, chunk system) | Core performance is solid; improvements should be incremental | ✓ Confirmed in v1.0 |
| Fix UI before major refactoring | User's primary goal is to get compass/clock working | ✓ Completed |
| Performance improvements as secondary priority | User indicated performance as most important other quality improvement | ✓ Completed |
| No constraints on refactoring approach | User explicitly selected "No constraints" | ✓ 6 files updated with constants |

---
*Last updated: 2026-03-20 after v1.0 milestone*