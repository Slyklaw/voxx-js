# Project Overview

Create a 3D voxel terrain engine using `three.js`. The world will be composed of 1-meter cubes and generated using a noise function. The engine should support "infinite" terrain through dynamic loading and unloading of chunks (32x32x32 voxels).

**Core Features:**
- **Rendering:** Use `three.js`.
- **World:** Chunk-based, procedurally generated using noise.
- **Controls:** First-person camera with WASD for horizontal movement, Space/Shift for vertical movement, and mouse for looking. Camera tilt (roll) should be disabled.
- **Performance:** Include an FPS counter and design for performance from the start.

# Voxel Terrain Engine Implementation Checklist

This checklist is structured into milestones to provide a clear development path from a basic prototype to a feature-rich engine.

## Milestone 1: The Basics (MVP)
- [x] **Project Setup:**
    - [x] Initialize project with a build tool (e.g., Vite).
    - [x] Install `three.js` and a noise library (e.g., `simplex-noise`).
- [x] **Scene Setup:**
    - [x] Create a basic `three.js` scene: `Scene`, `PerspectiveCamera`, `WebGLRenderer`.
    - [x] Add basic lighting (e.g., `AmbientLight`, `DirectionalLight`).
    - [x] Add an FPS counter (e.g., `stats.js`).
- [x] **Player Controls:**
    - [x] Implement first-person controls (`PointerLockControls`).
    - [x] Map WASD for horizontal movement.
    - [x] Map Space/Left Shift for vertical movement.
- [x] **Initial World Generation:**
    - [x] Implement a `Chunk` class (e.g., 32x32x32).
    - [x] Use a simple noise function to define a height map.
    - [x] Generate and display a single chunk of terrain using simple `BoxGeometry` for each voxel.

## Milestone 2: Core Engine Features
- [ ] **Infinite World:**
    - [ ] Create a `World` class to manage chunks.
    - [ ] Dynamically load/unload chunks based on camera position.
    - [ ] Implement a chunk pooling system to reuse chunk objects.
- [x] **Performance Optimization: Meshing**
    - [x] Implement "Greedy Meshing" or "Culled Meshing" to combine adjacent voxel faces into a single geometry. This is a crucial step to move beyond rendering individual cubes.
    - [x] Perform chunk meshing in a Web Worker to avoid blocking the main thread.
- [ ] **Improved Terrain Generation:**
    - [ ] Use fractal noise (multiple octaves) for more interesting terrain.
    - [ ] Make world generation seed-based.
- [ ] **Materials and Textures:**
    - [ ] Create a texture atlas for different block types (e.g., grass, dirt, stone).
    - [ ] Apply textures to voxels based on rules (e.g., height, biome).

## Milestone 3: Advanced Features & Polish
- [ ] **Advanced World Generation:**
    - [ ] Implement a simple biome system (e.g., based on temperature/humidity noise maps).
    - [ ] Add 3D noise for cave generation.
    - [ ] Add water at a fixed level.
- [ ] **Rendering Enhancements:**
    - [ ] Add shadows (`DirectionalLight.castShadow`).
    - [ ] Implement scene fog (`Scene.fog`) for atmospheric effect.
    - [ ] Create a simple day/night cycle by rotating the directional light.
    - [ ] Implement water rendering with transparency and shaders.
- [ ] **Interaction:**
    - [ ] Implement voxel editing (adding/removing blocks) via raycasting.
    - [ ] Add basic AABB (Axis-Aligned Bounding Box) collision detection with the terrain.
- [ ] **UI:**
    - [ ] Add a debug UI (e.g., `lil-gui`) to tweak parameters like noise settings, render distance, etc.

## Milestone 4: Future Goals
- [ ] **Performance:**
    - [ ] Implement a Level of Detail (LOD) system for distant chunks.
    - [ ] Optimize chunk generation and meshing further.
- [ ] **Gameplay & World:**
    - [ ] Integrate a physics engine (e.g., `cannon-es`, `rapier.js`) for more robust collisions and entities.
    - [ ] Implement world saving and loading to `IndexedDB`.

## Quality Assurance
- [ ] Performance testing with large worlds
- [ ] Visual inspection of terrain features
- [ ] Memory usage profiling
- [ ] Cross-browser compatibility testing
