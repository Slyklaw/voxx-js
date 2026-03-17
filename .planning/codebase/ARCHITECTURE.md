# Architecture

**Analysis Date:** 2026-03-16

## Pattern Overview

**Overall:** Modular system architecture with component-based design.

**Key Characteristics:**
- Separation of concerns into distinct systems (World, Renderer, Player, Chunk management)
- Dynamic module loading via ES6 import()
- Simple main loop with requestAnimationFrame
- WebGL-based rendering with direct canvas manipulation
- Chunk-based world storage with 32x32x32 voxel blocks

## Layers

**Engine Core:**
- Purpose: Orchestrates the main game loop and system initialization
- Location: `src/core/engine.js`
- Contains: Engine class with WebGL initialization, system setup, render loop
- Depends on: Canvas element, dynamic imports of World, Renderer, Player
- Used by: Browser (instantiated on page load)

**World Management:**
- Purpose: Handles voxel data storage, generation, and retrieval
- Location: `src/core/world.js`, `src/chunks/`
- Contains: World class (chunk storage, terrain generation), ChunkManager class (chunk loading/unloading), Chunk class (voxel container)
- Depends on: None (standalone)
- Used by: Engine (instantiates World), Renderer (accesses voxel data)

**Rendering System:**
- Purpose: WebGL rendering of voxel world
- Location: `src/core/renderer.js`
- Contains: Renderer class (shaders, buffers, matrices, draw calls)
- Depends on: WebGL context, canvas
- Used by: Engine (instantiates Renderer)

**Player System:**
- Purpose: Player movement, physics, and input handling
- Location: `src/player/player.js`
- Contains: Player class (position, rotation, velocity, input controls)
- Depends on: DOM events (keyboard, mouse)
- Used by: Engine (instantiates Player)

**Graphics Resources:**
- Purpose: Placeholder for shader and texture assets
- Location: `src/graphics/shaders/`, `src/graphics/textures/`
- Contains: Empty directories (intended for future content)
- Depends on: N/A
- Used by: Renderer (would load assets)

## Data Flow

**Main Game Loop:**

1. Engine initializes WebGL context and systems (World, Renderer, Player)
2. Engine starts render loop via requestAnimationFrame
3. Each frame: clear canvas → update World → render via Renderer
4. Player handles input and updates position/rotation
5. World generates/manages chunks based on player position
6. Renderer draws cube geometry with shader-based lighting

**Chunk Loading Flow:**

1. Player position updates (via input)
2. World.getChunk() called for chunk coordinates
3. If chunk not found, ChunkManager.loadChunksAround() generates new chunks
4. Chunk data stored in Map keyed by "x,y,z" string
5. Renderer accesses voxel data for rendering

**State Management:**
- Player state: position, rotation, velocity, input flags
- World state: chunk map, chunk size (32), world seed
- Renderer state: WebGL buffers, shader program, matrices
- All state is mutable and directly accessible within systems

## Key Abstractions

**Engine:**
- Purpose: Main orchestrator and entry point
- Examples: `src/core/engine.js`
- Pattern: Singleton-like (instantiated once)

**World:**
- Purpose: Voxel world storage and generation
- Examples: `src/core/world.js`
- Pattern: Chunk-based storage with noise generation

**Chunk:**
- Purpose: 32x32x32 voxel container
- Examples: `src/chunks/chunk.js`
- Pattern: Array-based storage with coordinate mapping

**Renderer:**
- Purpose: WebGL rendering pipeline
- Examples: `src/core/renderer.js`
- Pattern: Shader program with vertex/index buffers

**Player:**
- Purpose: First-person controller with physics
- Examples: `src/player/player.js`
- Pattern: State machine with input mapping

**ChunkManager:**
- Purpose: Dynamic chunk loading/unloading
- Examples: `src/chunks/chunk-manager.js`
- Pattern: Map-based cache with view distance management

## Entry Points

**Browser Entry:**
- Location: `index.html`
- Triggers: Window load event
- Responsibilities: Loads engine module, creates canvas

**Engine Module:**
- Location: `src/core/engine.js`
- Triggers: DOMContentLoaded (window load)
- Responsibilities: Instantiate Engine, start game loop

## Error Handling

**Strategy:** Basic console logging with error propagation.

**Patterns:**
- WebGL initialization failure: throw error after console.error
- Shader compilation failure: console.error with info log
- No try-catch in main loop (errors propagate to console)
- Bounds checking in chunk operations (returns null/false)

## Cross-Cutting Concerns

**Logging:** All systems use console.log/console.error for debugging.
**Validation:** Input bounds checking in chunk operations (getVoxel, setVoxel).
**Authentication:** Not applicable (single-player client-side engine).

---

*Architecture analysis: 2026-03-16*