# Architecture

**Analysis Date:** 2026-03-22

## Pattern Overview

**Overall:** Modular, layered architecture with clear separation of concerns for a WebGL2 voxel rendering engine.

**Key Characteristics:**
- Separation of rendering logic from game logic
- Modular subsystem design (camera, input, rendering, world)
- Event-driven input handling
- Data-oriented chunk management
- Pipeline-based rendering approach

## Layers

**Presentation Layer:**
- Purpose: Handles WebGL2 rendering context and visualization
- Location: `voxx-js/src/gl/`
- Contains: Context management, shaders, buffers, rendering pipeline, performance monitoring
- Depends on: None (lowest level)
- Used by: All rendering-related systems

**Game Logic Layer:**
- Purpose: Manages voxel world generation, chunk management, and game state
- Location: `voxx-js/src/` (world.js, biomes.js, chunk/)
- Contains: World generation, chunk management, biome calculations, voxel data
- Depends on: Math utilities
- Used by: Rendering layer for voxel data, Input layer for modifications

**Interaction Layer:**
- Purpose: Handles user input and translates to game actions
- Location: `voxx-js/src/input/` and `voxx-js/src/blockEditor/`
- Contains: Input handling, block placement/removal logic, UI integration
- Depends on: Game Logic Layer
- Used by: Main application loop

**Application Layer:**
- Purpose: Coordinates systems and maintains main render loop
- Location: `voxx-js/src/main.js`
- Contains: Initialization, main loop, system coordination, global state
- Depends on: All other layers
- Used by: Browser entry point

## Data Flow

**Initialization Flow:**
1. HTML loads `index.html` which executes `main.js`
2. main.js initializes WebGL context via `gl/context.js`
3. Systems initialized in order: World, BiomeCalculator, Camera, BlockEditor, InputHandler
4. Context loss/recovery handlers registered
5. Main render loop started with `requestAnimationFrame(render)`

**Main Loop Flow (per frame):**
1. Calculate delta time
2. Update camera movement from keyboard input
3. Update camera rotation from mouse input
4. Update block targeting via raycast from camera
5. Update sun cycle/time of day (if not paused)
6. Update world (chunk loading/unloading based on player position)
7. Update chunk meshes for changed/new chunks
8. Create view and projection matrices
9. Clear buffers and set render state
10. Update camera and time uniforms in shaders
11. Render visible chunks to GBuffer (with optional wireframe/debug modes)
12. Render sky if no chunks visible
13. Render block outline if targeting a block
14. Performance logging and frame timing
15. Request next animation frame

**Chunk Modification Flow:**
1. User clicks (handled by InputHandler)
2. InputHandler calls appropriate BlockEditor callback (place/destroy)
3. BlockEditor modifies World chunk data
4. Chunk marks mesh as dirty
5. Next frame, syncChunkToWebGL recreates WebGL mesh from chunk data
6. Chunk mesh added to chunkMeshes Map for rendering

**Rendering Pipeline Flow:**
1. Vertex data flows from chunk mesh VBOs
2. Vertex shader transforms positions via model/view/projection matrices
3. Fragment shader applies lighting, textures, SSAO, and color grading
4. Output to GBuffer (position, normal, albedo)
5. Post-processing: SSAO, blur, composite with sky
6. Final output to canvas

## Key Abstractions

**World:**
- Purpose: Represents the infinite voxel world, manages chunks
- Examples: `voxx-js/src/world.js`
- Pattern: Singleton-like manager with chunk caching and generation

**BiomeCalculator:**
- Purpose: Determines biome types and height maps for world generation
- Examples: `voxx-js/src/biomes.js`
- Pattern: Pure function-based noise calculation with caching

**Chunk:**
- Purpose: 16x16x16 section of voxel data with mesh generation
- Examples: Implemented within World class, managed by `chunkManager.js`
- Pattern: Data chunk with delayed mesh generation

**Camera:**
- Purpose: 3D viewpoint with movement and rotation controls
- Examples: `voxx-js/src/camera/Camera.js`
- Pattern: First-person controller with vector-based movement

**InputHandler:**
- Purpose: Captures and translates browser input to game actions
- Examples: `voxx-js/src/input/InputHandler.js`
- Pattern: Decoupled input system with callback injection

**BlockEditor:**
- Purpose: Handles block placement and destruction logic
- Examples: `voxx-js/src/blockEditor/BlockEditor.js`
- Pattern: Facade over World for user-friendly block operations

## Entry Points

**Main Entry Point:**
- Location: `voxx-js/src/main.js`
- Triggers: Browser loads index.html
- Responsibilities: 
  - WebGL context initialization
  - System object creation (World, Camera, etc.)
  - Main animation loop coordination
  - Event listener setup (resize, UI buttons)
  - Global state management

**WebGL Context Entry:**
- Location: `voxx-js/src/gl/context.js`
- Triggers: Called from main.js during initialization
- Responsibilities:
  - Canvas WebGL2 context creation
  - Context loss/restoration handling
  - Resource registration for cleanup/recovery

**Worker Entry Point:**
- Location: `voxx-js/src/chunkWorker.js`
- Triggers: Spawned by main thread for chunk mesh generation
- Responsibilities:
  - Off-thread chunk mesh creation
  - Transfer of mesh data back to main thread

## Error Handling

**Strategy:** Defensive programming with context recovery and graceful degradation

**Patterns:**
- Context loss detection and recovery via `isContextLost()` and registered handlers
- Null checking for WebGL resources before use
- Try/catch around WebGL operations that might fail
- Console error logging for debugging
- Graceful handling of missing textures or shaders

## Cross-Cutting Concerns

**Logging:** 
- Approach: Conditional console logging based on DEBUG flag in config.js
- Pattern: `if (DEBUG) console.log('[Tag] message')`

**Validation:** 
- Approach: Input sanitization and bounds checking
- Patterns: Chunk coordinate validation, input range clamping

**Authentication:** 
- Approach: Not applicable (local-only application)

**Resource Management:**
- Approach: Explicit WebGL resource creation/deletion
- Patterns: Context loss handlers dispose/recreate buffers, textures, programs
- Memory management: Chunk meshes stored in Map and cleaned when chunks unloaded

---

*Architecture analysis: 2026-03-22*