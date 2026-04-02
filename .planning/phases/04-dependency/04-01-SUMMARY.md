---
phase: 04-dependency
plan: 01
subsystem: infra
tags: [simplex-noise, self-hosting, esm, offline]

# Dependency graph
requires: []
provides:
  - Self-hosted simplex-noise library (no CDN dependency)
  - Offline-capable terrain generation
  - Updated import paths in world.js, biomes.js, chunkWorker.js
affects: [shadow-mapping, terrain-generation]

# Tech tracking
tech-stack:
  added: [simplex-noise (vendored ESM build)]
  patterns: [local lib/ directory for vendored third-party ESM modules]

key-files:
  created: [voxx-js/lib/simplex-noise.js, voxx-js/lib/simplex-noise.ts]
  modified: [voxx-js/world.js, voxx-js/biomes.js, voxx-js/chunkWorker.js]

key-decisions:
  - "Vendored simplex-noise ESM build instead of keeping CDN import"
  - "Copied TypeScript source for debugging reference"
  - "Excluded .map file to avoid unnecessary CDN source references"

patterns-established:
  - "Vendored dependencies: voxx-js/lib/ directory for self-hosted third-party ESM modules"

requirements-completed: [DEPS-01]

# Metrics
duration: 1 min
completed: 2026-04-02
---

# Phase 04 Plan 01: Self-host simplex-noise Summary

**Self-hosted simplex-noise by vendoring ESM build from node_modules to voxx-js/lib/, eliminating CDN dependency for offline-capable terrain generation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T10:12:20Z
- **Completed:** 2026-04-02T10:13:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Vendored simplex-noise ESM build (466 lines) with MIT license header preserved
- Updated all 3 import statements from CDN URLs to local relative paths
- Zero CDN references to simplex-noise remain in source files
- Application terrain generation produces identical results (same library version)

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy simplex-noise ESM build to local lib directory** - `83fa855` (feat)
2. **Task 2: Update all 3 import statements from CDN to local file** - `e3c4de6` (fix)

**Plan metadata:** pending

## Files Created/Modified

- `voxx-js/lib/simplex-noise.js` - Vendored ESM build of simplex-noise v4.0.3 with MIT license
- `voxx-js/lib/simplex-noise.ts` - TypeScript source for debugging reference
- `voxx-js/world.js` - Updated import from './lib/simplex-noise.js'
- `voxx-js/biomes.js` - Updated import from './lib/simplex-noise.js'
- `voxx-js/chunkWorker.js` - Updated import from '../lib/simplex-noise.js'

## Decisions Made

- Copied TypeScript source alongside ESM build for future debugging
- Excluded .map file as it references CDN source and is unnecessary for self-hosted build

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CDN dependency eliminated, ready for shadow mapping phase
- Terrain generation unchanged — identical noise output guaranteed (same library version)

---

*Phase: 04-dependency*
*Completed: 2026-04-02*
