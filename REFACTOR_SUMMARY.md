# Texture System Refactoring Summary

## Overview
Refactored the renderer and shaders to decouple texture selection from block types and support dynamic plugin-based texture loading. The system now uses individual textures instead of a texture atlas to better support runtime block additions.

## Key Changes

### 1. Shader Refactoring (`shaders.js`)
- **Before**: Shaders had hardcoded block type logic with individual texture uniforms for each block type and face
- **After**: Shaders use individual texture arrays with dynamic mapping
- Uses `blockType` and `faceType` attributes to determine which texture to sample
- Supports up to 32 individual textures with conditional sampling (WebGL 1.0 compatible)
- Dynamic texture mapping array maps `(blockType, faceType)` pairs to texture indices

### 2. Renderer Refactoring (`renderer.js`)
- **Before**: Created individual textures for each block type and face, passed as separate uniforms
- **After**: Creates individual Three.js DataTextures from raw byte arrays
- `createTextureSystem()`: Builds individual textures and mapping systems
- `createBlockMaterial()`: Creates materials with individual texture uniforms
- Added `addBlockTexture()` method for dynamic texture addition (plugin support)
- Maintains separate mappings for block types and texture indices

### 3. Chunk Generation Refactoring (`chunk.js`)
- **Before**: Generated hardcoded block type attributes
- **After**: Generates `blockType` and `faceType` attributes based on texture system mapping
- Block types are mapped from block IDs using the texture system's block type mapping
- Face types are determined during mesh generation (0=top, 1=sides, 2=bottom)
- No post-processing needed - attributes are set correctly during generation

### 4. Individual Texture System
- Each texture is stored as a separate Three.js DataTexture
- Texture mapping system maps `(blockId, face)` pairs to texture indices
- Block type mapping system maps block IDs to shader block type indices
- Shader texture mapping array provides efficient lookup in shaders
- Supports up to 32 textures and 21 block types (64 mappings total)

## Benefits

1. **Plugin Compatibility**: Perfect for dynamic block addition - no atlas rebuilding needed
2. **Decoupling**: Shaders have no knowledge of specific block types
3. **Extensibility**: Easy to add new blocks at runtime via `addBlockTexture()`
4. **Maintainability**: Clean separation between rendering and game logic
5. **Performance**: Individual textures avoid atlas management overhead
6. **Memory Efficiency**: Only loads textures that are actually used

## Technical Details

### Individual Texture Management
- Each texture is created as a Three.js DataTexture from raw byte arrays
- Textures are stored in an array and referenced by index
- Default white texture at index 0 for fallback cases
- Texture properties: RepeatWrapping, NearestFilter for pixel-perfect rendering

### Shader Texture Sampling
```glsl
// Dynamic texture lookup using conditionals (WebGL 1.0 compatible)
int mappingIndex = blockIndex * 3 + face;
int textureIndex = textureMapping[mappingIndex];

if (textureIndex == 1) return texture2D(blockTextures[1], uv);
else if (textureIndex == 2) return texture2D(blockTextures[2], uv);
// ... up to 32 textures
```

### Dynamic Texture Addition
```javascript
// Add new texture for plugin blocks
renderer.addBlockTexture('custom_block', 'top', textureData, 16, 16);
```

### Mapping Systems
- **Block Type Mapping**: `blockId → blockTypeIndex` (for shader attributes)
- **Texture Mapping**: `"blockId_face" → textureIndex` (for texture lookup)
- **Shader Mapping**: `blockType * 3 + faceType → textureIndex` (for shader uniforms)

## Files Modified
- `shaders.js`: Individual texture array system with conditional sampling
- `renderer.js`: Individual texture management and dynamic addition support
- `chunk.js`: Block type and face type attribute generation

## Plugin Support
The system now fully supports dynamic block addition:
1. Plugins can call `renderer.addBlockTexture()` to add new textures
2. Block type mappings are automatically updated
3. Existing materials are updated with new textures
4. No shader recompilation or atlas rebuilding required

## Testing
Use `test-refactor.html` to verify the refactoring works correctly and textures are properly loaded as individual textures.
