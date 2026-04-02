# 05-01: PCF → Hard Shadow Conversion

## Objective
Convert existing PCF soft shadow filtering to hard shadows in the voxel fragment shader.

## Tasks Completed

### Task 1: Replace PCF soft shadow filtering with hard shadow lookup
- Modified `ShadowCalculation()` in `voxx-js/src/shaders/voxel.js`
- Replaced 3x3 PCF kernel (9 texture samples) with single texture() lookup
- Removed `texelSize` variable and nested for loops
- Kept perspective divide, [0,1] range transform, out-of-bounds checks, and bias calculation intact

### Task 2: Verify shadow map infrastructure meets SHADOW-04 and SHADOW-07
- Confirmed `createShadowMapFBO(gl, 4096)` call in render.js line 500
- Confirmed `registerContextResources` in fbo.js lines 364-373 for context loss recovery
- Verified NO UI toggle for shadow quality exists in codebase
- Added debug log: `console.log(\`[FBO] Shadow map created: ${size}x${size}\`)`

## Key Files Modified
- `voxx-js/src/shaders/voxel.js` - Hard shadow implementation
- `voxx-js/src/gl/fbo.js` - Debug log addition

## Verification
- [x] No PCF loop in ShadowCalculation function (grep returns 0 matches)
- [x] Single texture() lookup for shadow sampling
- [x] Shadow map at 4096 resolution confirmed
- [x] Resource registry lifecycle confirmed
- [x] No UI toggle for shadow quality

## Commits
- `feat(05-01): convert PCF soft shadows to hard shadow lookup`
