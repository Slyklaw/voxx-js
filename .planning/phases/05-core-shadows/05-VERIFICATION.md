---
status: passed
phase: 5
date: 2026-04-02
---

# Phase 5: Core Shadows — Verification

**Verified:** 2026-04-02
**Status:** passed

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SHADOW-01 | ✓ Met | Shadow map created at render.js:500, light direction from sun position via `updateTimeOfDay()` |
| SHADOW-03 | ✓ Met | PCF kernel replaced with single texture lookup in voxel.js:105 |
| SHADOW-04 | ✓ Met | Shadow map at 4096 resolution (render.js:500), no UI toggle exists |
| SHADOW-07 | ✓ Met | `registerContextResources` in fbo.js:364-373 for context loss recovery |

## Must-Haves Verified

### Truths
- [x] Scene geometry casts hard shadows in the direction of the sun/light
  - `ShadowCalculation()` uses `uLightDirection` uniform, updated by `updateTimeOfDay()` with sun position
- [x] Shadow edges are crisp with no soft/blur filtering
  - Single `texture()` lookup at voxel.js:105 — no PCF kernel, no averaging
- [x] Shadow map framebuffer is managed by resource registry (no leaks)
  - `registerContextResources` called in fbo.js with dispose/init handlers
- [x] Shadow map uses fixed 4096 resolution with no UI toggle
  - `createShadowMapFBO(gl, 4096)` at render.js:500, no shadow quality controls in codebase

### Artifacts
- [x] `voxx-js/src/shaders/voxel.js` — Contains `ShadowCalculation` with hard shadow lookup
  - Pattern match: `texture(uShadowMap, vec3(projCoords.xy, projCoords.z - bias))` at line 105
- [x] `voxx-js/src/gl/fbo.js` — Contains `createShadowMapFBO` with resource registry lifecycle
  - Debug log added: `[FBO] Shadow map created: ${size}x${size}`

## Code Verification

```bash
# PCF loop removed (0 matches)
grep -c "for (int x = -1" voxx-js/src/shaders/voxel.js → 0

# Single texture lookup present
grep "texture(uShadowMap, vec3(projCoords.xy" voxx-js/src/shaders/voxel.js → match at line 105

# Shadow map at 4096
grep "createShadowMapFBO(gl, 4096)" voxx-js/src/gl/render.js → match at line 500

# Resource registry lifecycle
grep "registerContextResources" voxx-js/src/gl/fbo.js → 3 matches (G-buffer, SSAO, shadow map)

# No UI toggle for shadow quality
grep -ri "shadow.*quality\|shadow.*toggle" voxx-js/src/ → no matches
```

## Commits
- `feat(05-01): convert PCF soft shadows to hard shadow lookup`
- `docs(05-01): add execution summary for hard shadow conversion`

## Human Verification

Visit the application and verify:
1. Shadows are cast in the direction of the sun (changes with time of day)
2. Shadow edges are hard/crisp — no blur or soft filtering
3. No shadow quality settings in UI
4. Application runs without WebGL errors

## Notes

Phase 5 covers only hard shadow conversion. Phase 6 (Shadow Integration) will cover:
- SHADOW-02: Full render distance shadow coverage
- SHADOW-05: Deferred rendering pipeline integration
- SHADOW-06: Shadow updates during day/night cycle
- SHADOW-08: Performance at 60fps
