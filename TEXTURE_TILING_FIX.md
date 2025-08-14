# Texture Tiling Fix for Greedy Meshing

## Problem
The shader wasn't tiling textures correctly across blocks when greedy meshing combined multiple blocks into larger quads. Instead of repeating the texture pattern, it was stretching the texture across the entire surface.

## Root Cause
The UV coordinate calculation in `chunk.js` was incorrectly scaling texture coordinates within the texture atlas bounds, causing stretching instead of proper tiling.

## Solution
Implemented a proper texture tiling system that works with the texture atlas:

### 1. Updated Vertex Shader (`shaders.js`)
- Added `textureBounds` attribute to pass texture atlas bounds (u1, v1, u2, v2) to each vertex
- This allows the fragment shader to know the exact bounds of each texture within the atlas

### 2. Updated Fragment Shader (`shaders.js`)
- Modified to properly handle tiled UV coordinates within texture atlas bounds
- Uses `fract()` to get the fractional part of UV coordinates for tiling
- Maps the fractional coordinates back to the correct texture bounds in the atlas

### 3. Updated Chunk Mesh Generation (`chunk.js`)
- Added `textureBounds` array to store texture bounds for each vertex
- Modified UV coordinate calculation to pass quad dimensions (w, h) as UV coordinates
- The shader handles the actual tiling within the texture bounds
- Added texture bounds attribute to geometry creation

### 4. Key Changes in UV Calculation
**Before (stretching):**
```javascript
const tiledU2 = u1 + (uRange * Math.min(w, 1));
const tiledV2 = v1 + (vRange * Math.min(h, 1));
```

**After (proper tiling):**
```javascript
// Pass quad dimensions as UV coordinates
uvs.push(0, 0, w, 0, 0, h, w, h);
// Pass texture bounds as separate attribute
textureBounds.push(u1, v1, u2, v2);
```

## How It Works
1. **Vertex Stage**: Each vertex receives its position in "quad space" (0 to w, 0 to h) and the texture's atlas bounds
2. **Fragment Stage**: The shader uses `fract()` to tile the coordinates, then maps them to the correct atlas bounds
3. **Result**: Textures repeat properly across large greedy-meshed surfaces while staying within their atlas bounds

## Files Modified
- `shaders.js` - Updated vertex and fragment shaders
- `chunk.js` - Updated mesh generation and UV calculation
- `test-texture-tiling.html` - Created test file to verify the fix

## Testing
Load `index.html` or `test-texture-tiling.html` and look for:
- Properly tiled textures on large flat surfaces (especially grass and dirt)
- No texture stretching across greedy-meshed areas
- Consistent texture patterns regardless of surface size

The fix ensures that textures tile correctly while maintaining compatibility with the existing texture atlas system.