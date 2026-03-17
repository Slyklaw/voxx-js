# Architecture Research

**Domain:** Voxel Engine
**Researched:** 2026-03-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Player  │  │ Input   │  │ UI/HUD  │  │ Game    │        │
│  │ Control │  │ System  │  │         │  │ Logic   │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                       Core Engine                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │               World Management                      │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │    │
│  │  │ Chunk   │  │ Voxel   │  │ World   │              │    │
│  │  │ Manager │  │ Data    │  │ Generate│              │    │
│  │  └─────────┘  └─────────┘  └─────────┘              │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                       Systems Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Physics  │  │ Render   │  │ Event    │                   │
│  │ & Collide│  │ Pipeline │  │ System   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Storage  │  │ Asset    │  │ Config   │                   │
│  │ (IndexedDB)│ │ Manager  │  │ Manager  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **World Management** | Manages chunk-based world storage, coordinate transformations, chunk loading/unloading | Map of chunks keyed by chunk coordinates, each chunk contains voxel array (3D grid) |
| **Chunk Manager** | Loads/unloads chunks based on player position, maintains view distance, handles async generation | Distance-based streaming, async generation queue, dirty chunk tracking |
| **Voxel Data** | Stores individual voxel types and properties, provides get/set API | 1D or 3D arrays within chunks, voxel IDs mapping to block types |
| **World Generator** | Generates terrain using noise functions, procedural rules, custom generation functions | Seeded RNG, noise functions (Perlin, Simplex), heightmap generation |
| **Rendering Pipeline** | Converts voxel data to meshes, applies materials, renders scene | Greedy meshing or culled meshing, WebGL/WebGPU shaders, texture atlases |
| **Physics & Collision** | Handles player movement, gravity, collision detection with voxels, object physics | AABB collision, raycasting, velocity integration, friction/gravity constants |
| **Event System** | Decouples components via events (setBlock, renderChunk, tick) | EventEmitter pattern, pub/sub for world changes and game events |
| **Player Control** | Handles first-person camera, movement, input processing | Pointer lock for mouse, keyboard input, camera matrices |
| **Inventory & Interaction** | Block selection, placement/removal, item management | Hotbar UI, raycast for block targeting, inventory data structure |
| **Persistence** | Saves/loads world data to/from storage (IndexedDB, file) | Serialization of chunk data, chunk caching, async loading |
| **Asset Manager** | Loads textures, shaders, sound assets, manages material system | Texture atlasing, material caching, shader compilation |

## Recommended Project Structure

```
src/
├── core/               # Core engine orchestration
│   ├── engine.js       # Main engine class, game loop
│   ├── world.js        # World management system
│   └── renderer.js     # WebGL rendering pipeline
├── chunks/             # Chunk-based world storage
│   ├── chunk-manager.js # Dynamic chunk loading/unloading
│   ├── chunk.js        # Single chunk data structure
│   └── mesh-generator.js # Voxel to mesh conversion
├── player/             # Player control and physics
│   ├── player.js       # First-person controller
│   ├── physics.js      # Collision detection, gravity
│   └── camera.js       # View matrix management
├── world/              # World generation and manipulation
│   ├── generator.js    # Terrain generation algorithms
│   ├── voxel-data.js   # Voxel type definitions and storage
│   └── persistence.js  # Save/load world to IndexedDB
├── input/              # Input handling
│   ├── keyboard.js     # Keyboard state and events
│   ├── mouse.js        # Mouse look and clicks
│   └── controls.js     # Key bindings and actions
├── rendering/          # Advanced rendering features
│   ├── shaders/        # GLSL shader sources
│   ├── materials.js    # Material system and texture atlasing
│   └── lighting.js     # Lighting and fog
├── ui/                 # User interface
│   ├── hud.js          # In-game HUD
│   ├── inventory.js    # Inventory UI and logic
│   └── debug.js        # Debug overlays
└── utils/              # Shared utilities
    ├── math.js         # Vector/matrix math
    ├── noise.js        # Noise functions
    └── constants.js    # Shared constants (CHUNK_SIZE, etc.)
```

### Structure Rationale

- **core/:** Central orchestration, keeps engine logic separate from subsystems
- **chunks/:** Dedicated to chunk management, isolating world storage concerns
- **player/:** Encapsulates player-specific logic, easier to modify controls
- **world/:** World generation and voxel data, separate from rendering/physics
- **input/:** Decouples input from game logic, supports remapping
- **rendering/:** Graphics-specific code, separate from voxel logic
- **ui/:** UI components, separate from engine core
- **utils/:** Shared code, prevents duplication

## Architectural Patterns

### Pattern 1: Chunk-Based Streaming

**What:** Divide world into fixed-size chunks, load/unload based on player proximity
**When to use:** Infinite or large worlds, memory constraints
**Trade-offs:** + Memory efficient, enables procedural generation; - Complexity, cross-chunk operations harder

**Example:**
```javascript
class ChunkManager {
  loadChunksAround(playerPos) {
    const chunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    // Generate chunks within view distance
    for (let dx = -viewDist; dx <= viewDist; dx++) {
      const chunk = this.getChunk(chunkX + dx, chunkZ);
      if (!chunk) this.generateChunk(chunkX + dx, chunkZ);
    }
  }
}
```

### Pattern 2: Event-Driven Updates

**What:** Use events to notify systems of world changes (block placed, chunk loaded)
**When to use:** Multiple systems need to react to same event (rendering, physics, persistence)
**Trade-offs:** + Decoupled systems, easier to extend; - Indirect flow, debugging harder

**Example:**
```javascript
world.on('setBlock', (pos, oldBlock, newBlock) => {
  renderer.markChunkDirty(chunkCoord);
  physics.updateCollision(pos);
  persistence.markChunkDirty(chunkCoord);
});
```

### Pattern 3: Greedy Meshing

**What:** Merge adjacent voxel faces into larger faces to reduce triangle count
**When to use:** Performance-critical rendering of blocky voxel worlds
**Trade-offs:** + Dramatic performance improvement, fewer draw calls; - More complex mesh generation

**Example:**
```javascript
function greedyMesher(chunk) {
  // Scan for runs of identical voxels, merge faces
  // Output optimized mesh geometry
}
```

## Data Flow

### Request Flow

```
[User Input (WASD, Mouse)]
    ↓
[Player Control] → [Physics System] → [World Collision]
    ↓              ↓                     ↓
[Camera Update] ← [Position Update] ← [Voxel Query]
```

### State Management

```
[World Data (Chunks)]
    ↓ (subscribe to changes)
[Event System] → [Rendering Pipeline] → [WebGL]
    ↓                  ↓                  ↓
[Persistence] ← [Chunk Meshes] ← [GPU Buffers]
```

### Key Data Flows

1. **Block Interaction Flow:** Player raycast → world.getVoxel → inventory selection → world.setVoxel → event 'setBlock' → renderer.markChunkDirty → physics.updateCollision
2. **Chunk Loading Flow:** Player moves → chunkManager.loadChunksAround → generator.generateChunk → event 'chunkLoaded' → renderer.createChunkMesh → persistence.scheduleSave
3. **Physics Flow:** Player input → physics.applyVelocity → collision检测 (AABB vs voxels) → position adjustment → camera update

## Build Order Implications

Based on component dependencies, the following build order is recommended for incremental development:

1. **Core Engine + World Management** — Establishes game loop, chunk storage, basic voxel get/set. Required for everything else.
2. **Rendering Pipeline** — Basic mesh generation (culled meshing) and WebGL rendering. Provides visual feedback.
3. **Player Control + Input** — First-person camera, keyboard/mouse input. Enables interaction.
4. **Physics & Collision** — Basic AABB collision detection, gravity, movement. Makes movement realistic.
5. **World Generator** — Procedural terrain generation, noise functions. Provides interesting world.
6. **Block Interaction** — Raycasting, block placement/removal, inventory system. Core gameplay.
7. **Persistence** — Save/load chunks to IndexedDB. Enables world continuity.
8. **Advanced Rendering** — Greedy meshing, lighting, fog, shaders. Visual polish.
9. **UI/HUD** — Inventory UI, debug overlays, menus. Final polish.

### Dependency Graph
```
Core Engine
   ├── World Management
   ├── Rendering Pipeline
   ├── Player Control
   │     └── Input System
   ├── Physics & Collision
   │     └── World Management (queries)
   ├── World Generator
   │     └── World Management
   ├── Block Interaction
   │     ├── Physics & Collision (raycast)
   │     └── World Management (setVoxel)
   ├── Persistence
   │     └── World Management (chunk serialization)
   └── UI/HUD
         └── Player Control (inventory)
```

### Notes
- Early phases should avoid cross-system coupling; use events for later integration.
- Physics can be stubbed initially (no collision) and refined after rendering works.
- Persistence can be deferred until after block interaction is stable.
- Greedy meshing is an optimization; implement after basic rendering works.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single-threaded, simple chunk management, in-memory storage |
| 1k-100k users | Web Workers for generation/meshing, IndexedDB persistence, LOD system |
| 100k+ users | Server-side chunk caching, WebGL 2.0 compute shaders, multi-threaded meshing |

### Scaling Priorities

1. **First bottleneck:** Mesh generation CPU usage → Implement greedy meshing, Web Workers
2. **Second bottleneck:** Memory consumption → Implement chunk pooling, LOD, compression

## Anti-Patterns

### Anti-Pattern 1: Monolithic Game Class

**What people do:** Put all logic in one massive Game class (world, rendering, physics, input)
**Why it's wrong:** Tight coupling, hard to test, modify, or extend
**Do this instead:** Separate concerns into dedicated systems with clear interfaces

### Anti-Pattern 2: Synchronous World Generation

**What people do:** Generate entire world synchronously on load
**Why it's wrong:** Freezes UI, limits world size, poor user experience
**Do this instead:** Async chunk generation with progressive loading, priority queue

### Anti-Pattern 3: Naive Collision Detection

**What people do:** Check collision against every voxel in world
**Why it's wrong:** O(n) performance, impossible for large worlds
**Do this instead:** AABB vs chunk, then raycast or grid-based voxel checks

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| IndexedDB | Async read/write chunks | Use request queues, transaction batching |
| WebGL | Direct API calls | Handle context loss, shader compilation fallbacks |
| Audio API | Event-driven triggers | Optional, separate from core loop |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| World ↔ Rendering | Events (setBlock, chunkLoaded) | Rendering subscribes to world changes |
| Physics ↔ World | Direct queries (getVoxel) | Physics needs fast voxel access |
| Player ↔ Input | Callbacks/streams | Input events flow to player actions |
| Persistence ↔ World | Async load/save queue | Prevent blocking main thread |

## Sources

- [max-mapper/voxel-engine DeepWiki](https://deepwiki.com/max-mapper/voxel-engine/2-core-engine-architecture) — Core architecture, subsystems, event system
- [Zylann/godot_voxel DeepWiki](https://deepwiki.com/Zylann/godot_voxel/2-core-architecture) — Module organization, data flow, threading model
- [Let's Make a Voxel Engine](https://sites.google.com/site/letsmakeavoxelengine/) — Step-by-step components (chunks, collision, physics)
- [The Perfect Voxel Engine](https://voxely.net/blog/the-perfect-voxel-engine/) — Modular data formats, conversion pipelines
- [Exploring Cubyz](https://typevar.dev/articles/PixelGuys/Cubyz) — LOD, meshing, procedural generation
- Existing voxx-js codebase analysis — Current component structure, gaps

---
*Architecture research for: Voxel Engine*
*Researched: 2026-03-16*