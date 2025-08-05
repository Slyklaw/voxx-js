# voxx-js

A voxel-based world generation engine with both Three.js and WebGPU implementations.

## Versions

### Three.js Version (Original)
- File: `index.html`
- Uses Three.js for rendering
- Compatible with all modern browsers
- Full feature set including shadows, lighting, and biome generation

### WebGPU Version (New)
- File: `webgpu-index.html`
- Native WebGPU implementation for improved performance
- Requires WebGPU-compatible browser (Chrome 113+, Edge 113+)
- See `WEBGPU_CONVERSION.md` for detailed information

## Features

- Infinite procedural world generation
- Biome-based terrain with smooth blending
- Dynamic day/night cycle with realistic lighting
- Block placement and destruction
- Greedy meshing for optimized rendering
- Worker-based chunk generation (Three.js version)

## Controls

- **Click** to enter play mode
- **WASD** for movement
- **Space/Shift** for vertical movement
- **Mouse** to look around
- **Mouse wheel** to select blocks
- **Left click** to destroy blocks
- **Right click** to place blocks

## Getting Started

1. Clone the repository
2. Serve the files using a local web server
3. Open `index.html` for Three.js version or `webgpu-index.html` for WebGPU version

For WebGPU version, ensure your browser supports WebGPU and it's enabled in browser flags if necessary.