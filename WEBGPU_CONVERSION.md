# WebGPU Voxel Engine Conversion

This project has been converted from Three.js to native WebGPU for improved performance and modern graphics API usage.

## Files Added

### Core WebGPU Implementation
- `webgpu/webgpu-renderer.js` - Main WebGPU renderer replacing Three.js WebGLRenderer
- `webgpu/webgpu-camera.js` - Custom camera implementation with matrix calculations
- `webgpu/webgpu-chunk.js` - WebGPU-based chunk rendering with native buffers
- `webgpu/webgpu-world.js` - World management using WebGPU chunks

### Main Application
- `webgpu-main.js` - Main application file using WebGPU instead of Three.js
- `webgpu-index.html` - HTML file for the WebGPU version

## Key Changes

### Renderer
- Replaced Three.js WebGLRenderer with native WebGPU implementation
- Custom vertex and fragment shaders written in WGSL (WebGPU Shading Language)
- Direct GPU buffer management for vertices, indices, and uniforms
- Compute shader pipeline for potential future chunk generation optimization

### Camera System
- Custom camera implementation with manual matrix calculations
- Perspective projection and view matrix computation
- First-person controls with pointer lock

### Chunk Rendering
- Direct WebGPU buffer creation for mesh data
- Greedy meshing algorithm adapted for WebGPU vertex format
- Interleaved vertex data (position + normal + color)

### Lighting
- Simplified lighting model in WGSL shaders
- Directional light with ambient lighting
- Sun cycle system maintained from original

## Browser Support

WebGPU requires:
- Chrome 113+ or Edge 113+ with WebGPU enabled
- Firefox Nightly with WebGPU enabled
- Safari Technology Preview with WebGPU enabled

## Performance Benefits

- Direct GPU memory management
- Reduced JavaScript overhead
- Native GPU compute capabilities for future optimizations
- Better control over rendering pipeline

## Usage

1. Open `webgpu-index.html` in a WebGPU-compatible browser
2. Click to enter pointer lock mode
3. Use WASD for movement, Space/Shift for vertical movement
4. Mouse wheel to select blocks (future feature)

## Future Enhancements

- Compute shader-based chunk generation
- GPU-based frustum culling
- Advanced lighting and shadows
- Texture atlasing
- Instanced rendering for vegetation

## Fallback

The original Three.js version remains available in `index.html` for browsers without WebGPU support.