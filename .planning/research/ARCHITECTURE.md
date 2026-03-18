# Architecture Research

**Domain:** WebGL2 Voxel Rendering Systems
**Researched:** 2026-03-17
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Camera    │  │   Input     │  │     Animation Loop      │  │
│  │   System    │  │   Handler   │  │     (requestAnimation   │  │
│  └──────┬──────┘  └──────┬──────┘  │      Frame)             │  │
│         │                │          └────────────┬────────────┘  │
├─────────┴────────────────┴───────────────────────┴───────────────┤
│                      Rendering Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   WebGL2 Renderer                          │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐              │  │
│  │  │  Shader   │  │   VAO     │  │   VBO     │              │  │
│  │  │  Program  │  │  Manager  │  │  Manager  │              │  │
│  │  └───────────┘  └───────────┘  └───────────┘              │  │
│  └─────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      World Management Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │   Chunk         │  │   Chunk         │  │   Mesh         │   │
│  │   Manager       │  │   World        │  │   Generator    │   │
│  │   (loading/     │  │   (coords,     │  │   (greedy/     │   │
│  │    unloading)   │  │    hash map)   │  │    culled)     │   │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘   │
│           │                      │                   │            │
├───────────┴──────────────────────┴───────────────────┴────────────┤
│                      Worker Layer (Web Workers)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Chunk Generation    │  Terrain    │  Greedy Meshing         │  │
│  │  Worker Pool         │  Generator  │  Worker                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **WebGL2 Context** | Initialize WebGL2, manage canvas, handle context loss | `canvas.getContext('webgl2')` with error handling |
| **Shader Program** | Compile GLSL vertex/fragment shaders, manage uniforms | Separate shader compilation, program linking, uniform cache |
| **VAO Manager** | Create/bind Vertex Array Objects per chunk mesh | One VAO per chunk, stores attribute state |
| **VBO Manager** | Create/bind Vertex Buffer Objects for mesh data | Interleaved or separate buffers for position/normal/color/uv |
| **Chunk Manager** | Track loaded chunks, handle loading/unloading based on distance | Hash map keyed by chunk coords, render distance config |
| **Chunk World** | Store chunk data, neighbor lookup, boundary handling | 3D array per chunk, coordinate conversion utilities |
| **Mesh Generator** | Convert voxel data to renderable geometry | Greedy meshing algorithm for optimized face count |
| **Worker Pool** | Manage Web Workers for parallel chunk generation | Task queue with worker pool, message passing |
| **Camera System** | View/projection matrices, movement, input handling | Custom matrix math (can reuse existing camera.js) |
| **Input Handler** | Mouse/keyboard for player control, block interaction | Pointer lock, raycasting for block placement |

## Recommended Project Structure

```
voxx-js/
├── src/
│   ├── gl/
│   │   ├── context.js        # WebGL2 context initialization
│   │   ├── shaders.js        # Shader compilation/linking
│   │   ├── program.js        # Shader program wrapper
│   │   ├── vao.js            # VAO management
│   │   ├── vbo.js            # VBO/buffer management
│   │   └── renderer.js       # Main render loop orchestration
│   ├── world/
│   │   ├── chunkManager.js   # Chunk loading/unloading
│   │   ├── chunk.js          # Chunk data structure
│   │   └── meshGenerator.js  # Voxel → mesh conversion
│   ├── workers/
│   │   ├── workerPool.js     # Worker management
│   │   └── chunkWorker.js    # Terrain + meshing in worker
│   ├── camera/
│   │   └── camera.js         # (existing - keep as-is)
│   └── config.js             # (existing - keep as-is)
├── index.html
└── main.js
```

### Structure Rationale

- **`gl/`:** Isolates all WebGL2-specific code, makes it swappable
- **`world/`:** Contains chunk logic independent of rendering backend
- **`workers/`:** Parallel generation remains unchanged from existing architecture
- **`camera/`:** Reuse existing camera.js (already has custom matrix math)

## Architectural Patterns

### Pattern 1: VAO-Per-Chunk Rendering

**What:** Each chunk's mesh has its own VAO containing all necessary attributes
**When:** Standard voxel rendering with chunk-based world
**Trade-offs:**
- Pro: Simple to implement, easy chunk disposal
- Pro: Each chunk can be rendered independently
- Con: Many draw calls (one per chunk)
- Con: Driver overhead with thousands of chunks

**Example:**
```javascript
// Create VAO for chunk
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Position buffer
const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

// Normal buffer
const normBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

// Color buffer
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(null);
```

### Pattern 2: Greedy Meshing

**What:** Merge adjacent faces of same type into larger quads, reducing triangle count
**When:** Most voxel engines (Minecraft-like)
**Trade-offs:**
- Pro: 50-90% reduction in triangle count vs naive culling
- Con: More complex algorithm
- Con: Loses per-vertex AO information
- Con: Texture atlas UV mapping complexity increases

**Implementation:** Existing chunk.js already uses greedy meshing - this transfers directly

### Pattern 3: Instanced Rendering (Advanced)

**What:** Single cube mesh rendered many times with per-instance transforms
**When:** Very large number of sparse voxels, dynamic scenes
**Trade-offs:**
- Pro: Single draw call for all voxels
- Pro: Efficient for sparse worlds
- Con: Requires separate draw for each block type
- Con: Complex texture atlas management
- Con: Doesn't work well with greedy meshing

**Not recommended for initial refactor** - chunk meshing is sufficient for Minecraft-style games

### Pattern 4: Vertex Pool (Advanced)

**What:** Single large VBO containing all chunk vertices, dynamically updated
**When:** Very high chunk counts, minimizing driver overhead
**Trade-offs:**
- Pro: Single VAO/VBO for entire world
- Pro: Lower driver overhead
- Con: Complex memory management
- Con: Requires persistent mapped buffers (WebGL2)
- Con: More complex chunk updates

**Not recommended for initial refactor** - VAO-per-chunk is simpler and performs well

## Data Flow

### Render Flow

```
main.js animate()
    ↓
renderer.render(chunks, camera)
    ↓
┌─────────────────────────────────────────────┐
│ 1. Update View/Projection Matrices           │
│    - camera.getViewMatrix()                  │
│    - camera.getProjectionMatrix()           │
│    - Upload to shader uniforms              │
├─────────────────────────────────────────────┤
│ 2. For Each Visible Chunk                  │
│    - Bind chunk VAO                         │
│    - Set model matrix uniform               │
│    - gl.drawElements()                     │
└─────────────────────────────────────────────┘
    ↓
glfwSwapBuffers() (handled by browser)
```

### Chunk Update Flow

```
Player modifies block
    ↓
World.setBlock(x, y, z, blockType)
    ↓
Mark chunk dirty
    ↓
Enqueue chunk to worker pool
    ↓
Worker: greedyMesh(voxelData) → {positions, normals, colors, indices}
    ↓
PostMessage back to main thread
    ↓
Renderer: delete old VAO, create new VAO with updated buffers
```

### Key Data Flows

1. **Chunk Loading:** `world.getChunk(x,z)` → worker → mesh data → VAO creation
2. **Block Modification:** `setBlock()` → mark dirty → worker remesh → VAO update
3. **Chunk Unloading:** Remove VAO (gl.deleteVertexArray), delete buffers, remove from world

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 8 chunks (default) | VAO-per-chunk works fine, ~64 draw calls |
| 16 chunks render distance | Still fine, ~256 draw calls |
| 32 chunks render distance | Consider chunk mesh batching |
| 64+ chunks | Consider vertex pooling, frustum culling |

### Scaling Priorities

1. **First bottleneck:** Draw call count
   - Fix: Chunk mesh batching or greedy meshing (already done)
2. **Second bottleneck:** Chunk mesh rebuild time
   - Fix: Web Workers (already implemented in existing codebase)
3. **Third bottleneck:** GPU memory
   - Fix: Aggressive chunk unloading, texture compression

## Anti-Patterns

### Anti-Pattern 1: Immediate Mode Rendering

**What people do:** Recreate WebGL objects every frame
**Why it's wrong:** Massive CPU overhead, garbage collection stutters
**Do this instead:** Create VAOs/VBOs once, update only when chunk data changes

### Anti-Pattern 2: Single Large Buffer

**What people do:** One VBO for entire world
**Why it's wrong:** Complex memory management, entire world must rebuild on any change
**Do this instead:** VAO-per-chunk allows independent chunk updates

### Anti-Pattern 3: No Chunk Culling

**What people do:** Render all faces including internal faces
**Why it's wrong:** 6x unnecessary geometry
**Do this instead:** Only emit faces adjacent to air (existing greedy meshing does this)

### Anti-Pattern 4: Synchronous Chunk Generation

**What people do:** Generate terrain/meshes on main thread
**Why it's wrong:** Frame drops during world generation
**Do this instead:** Web Workers (already implemented - keep this pattern)

## Integration Points

### Existing Codebase (to reuse)

| Module | Integration Point | Notes |
|--------|-------------------|-------|
| `camera.js` | Pass to renderer | Already has view/projection matrices |
| `chunk.js` | Adapt meshing output | Modify to output WebGL buffers instead of Three.js |
| `chunkWorker.js` | Keep as-is | Already generates mesh data |
| `workerPool.js` | Keep as-is | Already manages workers |
| `biomes.js` | Keep as-is | Terrain generation unchanged |
| `config.js` | Keep as-is | Add WebGL-specific config |
| `sky.js` | Replace with custom shader | Or keep Three.js for sky only |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `world` ↔ `gl` | Mesh data arrays | World generates arrays, GL uploads to GPU |
| `main` ↔ `workers` | PostMessage | Chunk coords → mesh data |
| `renderer` ↔ `camera` | Matrix uniforms | View/projection matrices |

## Build Order Implications

**Critical path for implementation:**

1. **Phase 1: WebGL Context & Shaders**
   - Create context, compile shaders
   - Verify before proceeding
   
2. **Phase 2: Buffer Infrastructure**
   - VAO/VBO management classes
   - Test with simple geometry

3. **Phase 3: Chunk Mesh Transfer**
   - Adapt chunk.js to output WebGL buffers
   - Connect worker output to renderer

4. **Phase 4: Integration**
   - Hook into main.js animation loop
   - Add block modification handling

5. **Phase 5: Polish**
   - Sky rendering
   - Selection highlighting
   - Performance tuning

**No circular dependencies:** World layer has no WebGL imports; GL layer receives data only.

## Sources

- [WebGL2 Fundamentals - Instanced Drawing](https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html) - HIGH
- [WebGL2 Voxels - Mr Speaker](https://github.com/mrspeaker/webgl2-voxels) - MEDIUM
- [VoxelJS Chunking Magic - Mozilla](https://blog.mozvr.com/voxeljs-chunking-magic/) - HIGH
- [Let's Make a Voxel Engine - Chunks](https://sites.google.com/site/letsmakeavoxelengine/home/chunks) - MEDIUM
- [Geometry Instancing with WebGL 2](https://www.saschawillems.de/blog/2015/04/25/geometry-instancing-with-webgl-2/) - HIGH
- [High Performance Voxel Engine: Vertex Pooling](https://nickmcd.me/2021/04/04/high-performance-voxel-engine/) - MEDIUM

---

*Architecture research for WebGL2 voxel rendering refactor*
*Researched: 2026-03-17*
