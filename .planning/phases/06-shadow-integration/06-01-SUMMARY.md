---
phase: 06-shadow-integration
plan: 01
type: execute
wave: 1
autonomous: true
requirements: [SHADOW-02, SHADOW-05]
subsystem: shadow-mapping
tags: [shadow, frustum, culling, performance]
tech_stack:
  added: []
  modified: [WebGL2, JavaScript ES modules]
patterns: [frustum culling, dynamic projection sizing]
key_files:
  created: []
  modified:
    - voxx-js/src/main.js
    - voxx-js/src/gl/render.js
key_decisions:
  - "Exposed frustum params via window._shadowFrustumSize/_shadowFarPlane for cross-module access"
  - "Used NDC-space bounds checking for frustum culling (simpler than world-space AABB test)"
  - "Dynamic frustum size: renderDist * CHUNK_WIDTH + 64 provides 320-unit half-size for RD=8"
duration: "2 min"
completed: "2026-04-02"
---

# Phase 06 Plan 01: Expand Shadow Frustum + Frustum Culling Summary

**One-liner:** Dynamic shadow frustum sizing and per-chunk frustum culling for shadow pass

## Tasks Completed

### Task 1: Expand shadow frustum to cover full render distance
- Imported `getRenderDistance` from chunkManager and `CHUNK_WIDTH` from constants
- Replaced hardcoded `size = 64.0` with dynamic `renderDist * CHUNK_WIDTH + 64` (320 for RD=8)
- Increased far plane from `dist * 2.0` to `renderDist * CHUNK_WIDTH * 1.5` (384 for RD=8)
- Exposed frustum parameters on `window._shadowFrustumSize` and `window._shadowFarPlane`

**Verification:** `grep` confirms size is no longer hardcoded to 64.0. Computed size = 320 ≥ 256 ✓

### Task 2: Add frustum culling to shadow pass
- Added `isChunkInShadowFrustum(chunk, lightSpaceMatrix, frustumSize, near, far)` helper function
- Transforms chunk center to light-space using the lightSpaceMatrix
- Checks NDC coordinates against [-1, 1] bounds for all three axes
- Shadow pass loop now skips chunks outside frustum before bindChunk/draw call

**Verification:** Function exists and is called in shadow pass loop before bindChunk ✓

## Commits
1. `feat(06-01): expand shadow frustum to cover full render distance` (3650d67)
2. `feat(06-01): add frustum culling to shadow pass` (da5e661)

## Deviations from Plan

None - plan executed exactly as written.

## Next

Ready for 06-02 (shadow timing metrics + sun tracking verification)
