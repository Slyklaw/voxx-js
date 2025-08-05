# voxx-js

A voxel-based world generation engine with WebGPU implementation.

## Versions

### WebGPU
- File: `index.html`
- Native WebGPU implementation for improved performance
- Requires WebGPU-compatible browser (Chrome 113+, Edge 113+)
- See `WEBGPU_CONVERSION.md` for detailed information

## Features

- Infinite procedural world generation
- Biome-based terrain with smooth blending
- Dynamic day/night cycle with realistic lighting
- Block placement and destruction
- Greedy meshing for optimized rendering
- Worker-based chunk generation

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
3. Open `index.html`

For WebGPU version, ensure your browser supports WebGPU and it's enabled in browser flags if necessary.
