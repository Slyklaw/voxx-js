# Architecture Research

**Domain:** Voxel Game Survival Mechanics, Inventory & Persistence
**Researched:** 2026-03-21
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UI Layer                                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   HUD       │  │  Inventory  │  │  Hotbar     │  │  Stats    │ │
│  │  (health,   │  │   Screen    │  │  (1-9 keys) │  │  Panel    │ │
│  │   hunger)   │  │  (grid UI)  │  │             │  │           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘ │
│         │                │                │               │        │
├─────────┴────────────────┴────────────────┴───────────────┴────────┤
│                      Game State Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │    PlayerState      │  │   Inventory      │  │   DayNight    │ │
│  │  - health           │  │   - hotbar[]     │  │   - time      │ │
│  │  - hunger           │  │   - storage[]    │  │   - sunAngle  │ │
│  │  - position         │  │   - selected     │  │   - phase     │ │
│  └──────────┬──────────┘  └────────┬─────────┘  └───────┬────────┘ │
│             │                      │                    │          │
├─────────────┴──────────────────────┴────────────────────┴──────────┤
│                      Persistence Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PersistenceManager (IndexedDB)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│  │
│  │  │ WorldStore  │  │PlayerStore  │  │  ChunkCacheStore       ││  │
│  │  │ (chunks)    │  │(inventory,  │  │  (pregenerated)         ││  │
│  │  │             │  │  stats)     │  │                         ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    Existing Engine Layer (unchanged)                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────┐ │
│  │   World         │  │   Renderer     │  │   WorkerPool         │ │
│  │  (chunks,       │  │  (WebGL2,      │  │  (chunk generation)  │ │
│  │   terrain)      │  │   deferred)    │  │                       │ │
│  └─────────────────┘  └─────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `PersistenceManager` | All IndexedDB operations, save/load orchestration | Singleton, wraps IDB with promises |
| `WorldStore` | Chunk voxel data persistence | Key: `"chunk_${x}_${z}"`, value: Uint8Array |
| `PlayerStore` | Player state (health, hunger, inventory, position) | Single record per save file |
| `Inventory` | Item storage, hotbar management, stack operations | Array of `{type, count, metadata}` |
| `PlayerState` | Health, hunger, position, status effects | Observable state object |
| `DayNightCycle` | Time progression, sun position, lighting updates | Updates shader uniforms |
| `HUD` | Render health bar, hunger bar, hotbar selection | Canvas 2D overlay or DOM |
| `InventoryUI` | Grid display, drag-drop, item selection | DOM-based modal |

## Recommended Project Structure

```
src/
├── game/                           # Game logic (new)
│   ├── player/
│   │   ├── playerState.js          # Health, hunger, position
│   │   └── playerController.js    # Movement, collision
│   ├── inventory/
│   │   ├── inventory.js            # Hotbar, storage, operations
│   │   ├── itemRegistry.js        # Block→item mappings
│   │   └── crafting.js            # Recipe system (future)
│   ├── survival/
│   │   ├── healthSystem.js        # Damage, healing, regeneration
│   │   ├── hungerSystem.js        # Hunger decay, food consumption
│   │   └── statusEffects.js      # Poison, saturation, etc.
│   ├── time/
│   │   └── dayNightCycle.js       # Time progression, lighting
│   └── ui/
│       ├── hud.js                  # Health/hunger bars
│       ├── hotbar.js               # 1-9 selection UI
│       └── inventoryScreen.js     # Full inventory modal
├── persistence/                    # Save/load system (new)
│   ├── persistenceManager.js       # IndexedDB orchestration
│   ├── worldStore.js              # Chunk serialization
│   ├── playerStore.js             # Player data serialization
│   └── storageAdapter.js          # IDB wrapper with promises
├── world.js                       # Existing - add chunk dirty tracking
├── src/gl/render.js               # Existing - add time uniform
├── src/shaders/                   # Existing - add time-based lighting
└── main.js                        # Existing - hook in new systems
```

### Structure Rationale

- **`game/survival/`:** Health and hunger are separate concerns from inventory - they tick independently and affect player differently
- **`game/inventory/`:** Item handling is distinct from block handling - different properties (stackable vs. placed)
- **`persistence/`:** Separate from game logic - allows swapping storage backend (IDB → localStorage → server)
- **`game/time/`:** Day/night affects rendering but not gameplay mechanics - separate from survival

## Architectural Patterns

### Pattern 1: Observable Game State

**What:** Central state object with change callbacks, decoupled from rendering
**When to use:** Player health, hunger, inventory change need to trigger UI updates
**Trade-offs:** Memory overhead vs. clean reactivity

```javascript
// Example: playerState.js
class PlayerState {
  constructor() {
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.maxHunger = 20;
    this.listeners = new Set();
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.notify();
  }

  eat(foodValue) {
    this.hunger = Math.min(this.maxHunger, this.hunger + foodValue);
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }
}
```

### Pattern 2: Dirty Chunk Tracking

**What:** Only save chunks that have been modified by player
**When to use:** Large worlds where saving every chunk is expensive
**Trade-offs:** Memory for dirty flags vs. I/O savings

```javascript
// In chunk.js - add dirty flag
class Chunk {
  constructor(x, z) {
    this.voxels = new Uint8Array(16 * 256 * 16);
    this.dirty = false;  // NEW: track modifications
  }

  setVoxel(x, y, z, type) {
    this.voxels[idx] = type;
    this.dirty = true;   // Mark dirty on modification
  }
}
```

### Pattern 3: Async Batch Persistence

**What:** Queue writes and flush periodically, not on every change
**When to use:** Frequent block changes would cause I/O thrashing
**Trade-offs:** Potential data loss on crash vs. performance

```javascript
// persistenceManager.js
class PersistenceManager {
  constructor() {
    this.dirtyChunks = new Map();  // x,z -> chunk
    this.flushInterval = 5000;     // 5 second flush
    this.startAutoFlush();
  }

  markChunkDirty(chunk) {
    this.dirtyChunks.set(`${chunk.x},${chunk.z}`, chunk);
  }

  async flush() {
    const chunks = [...this.dirtyChunks.values()];
    this.dirtyChunks.clear();
    await this.worldStore.saveChunks(chunks);
  }
}
```

### Pattern 4: Time-Based Shader Uniforms

**What:** Pass time/sun angle to shaders for dynamic lighting
**When to use:** Day/night cycle requires ambient color changes
**Trade-offs:** Shader complexity vs. visual quality

```javascript
// In src/gl/render.js - update render loop
function renderVoxelsToGBuffer(gl, camera, timeOfDay) {
  const sunAngle = timeOfDay.getSunAngle();  // 0-2π
  const ambientColor = timeOfDay.getAmbientColor();
  
  gl.uniform3f(ambientLoc, ambientColor.r, ambientColor.g, ambientColor.b);
  gl.uniform1f(sunAngleLoc, sunAngle);
}
```

## Data Flow

### Block Breaking Flow

```
[Player right-click] → [Raycast to chunk] → [chunk.setVoxel()]
    → [mark chunk dirty] → [add to drop item]
    → [Inventory.addItem(blockToItem(type))]
    → [UI update: hotbar count]
```

### Save Flow

```
[Auto-skill timer] → [PersistenceManager.flush()]
    → [Get dirty chunks from World]
    → [Serialize: compress voxel array]
    → [WorldStore.put("chunk_x_z", data)]
    → [PlayerStore.put(playerState)]
```

### Load Flow

```
[On startup] → [PersistenceManager.init()]
    → [PlayerStore.get() → hydrate PlayerState]
    → [WorldStore.getChunksInRadius(playerPos)]
    → [World.loadChunks() → regenerate meshes]
```

### Day/Night Cycle Flow

```
[requestAnimationFrame] → [DayNightCycle.update(deltaTime)]
    → [time += deltaTime]
    → [if (time >= dayLength) time = 0]
    → [update sun angle uniform]
    → [update ambient light color]
    → [if (phase changed) update sky gradient]
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single player, local | Single WorldStore, no compression needed |
| 10+ save files | Add save file selector UI, version schema |
| Large world (1000+ chunks) | Async chunk loading, cache LRU for loaded |
| Frequent saves | Batch writes, only dirty chunks |

### Scaling Priorities

1. **First bottleneck:** Chunk serialization size → Compress with Run-Length Encoding for empty air
2. **Second bottleneck:** IndexedDB write latency → Batch writes, use transactions properly
3. **Third bottleneck:** Load time → Pre-cache nearby chunks on save, background loading on load

## Anti-Patterns

### Anti-Pattern 1: Save on Every Block Change

**What people do:** Call `save()` immediately after each `setVoxel()`
**Why it's wrong:** IndexedDB is async but still slow; 100+ writes/sec kills performance
**Do this instead:** Mark chunk dirty, flush on timer (5-10 seconds)

### Anti-Pattern 2: Store Full Chunk Object in IndexedDB

**What people do:** `JSON.stringify(chunk)` including mesh, neighbors, etc.
**Why it's wrong:** Massive bloat; mesh regenerates anyway; circular references
**Do this instead:** Store only `voxels` (Uint8Array), regenerate on load

### Anti-Pattern 3: Hotbar and Inventory as Separate Systems

**What people do:** Duplicate logic for hotbar vs inventory storage
**Why it's wrong:** Items move between them; UI code doubles
**Do this instead:** Single Inventory with "hotbar slots 0-8" and "storage slots 9+"

### Anti-Pattern 4: Monolithic Player State

**What people do:** One big object for all player data
**Why it's wrong:** Hard to partial-load, version migrations are painful
**Do this instead:** Separate stores for persistent (inventory) vs. ephemeral (position)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| IndexedDB | Promise wrapper (idb-style) | Use raw API or lightweight wrapper |
| WebGL2 | Uniform updates via render.js | Time → ambient color, sun position |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| World ↔ Persistence | Dirty flag callbacks | World notifies PM of modified chunks |
| PlayerState ↔ UI | Observer pattern | UI subscribes to state changes |
| Inventory ↔ Hotbar | Shared array reference | 0-8 = hotbar, 9+ = storage |
| DayNight ↔ Renderer | Uniform updates | Pass to render.js per-frame |

## Build Order

**Phase 1: Persistence Foundation**
- `storageAdapter.js` - Promise-based IndexedDB wrapper
- `persistenceManager.js` - Flush logic, dirty tracking
- `playerStore.js` - Save/load player data
- Reason: Other systems depend on save/load

**Phase 2: Player State**
- `playerState.js` - Observable health/hunger
- `healthSystem.js`, `hungerSystem.js` - Tick logic
- `hud.js` - Visual display
- Reason: Survival mechanics need state before UI

**Phase 3: Inventory**
- `itemRegistry.js` - Block↔item mapping
- `inventory.js` - Item storage logic
- `hotbar.js` - 1-9 selection
- Reason: Requires playerState for tool effectiveness

**Phase 4: Day/Night**
- `dayNightCycle.js` - Time progression
- Shader uniform updates
- Reason: Visual only, no game logic dependency

---

*Architecture research for: Voxel Game Survival & Persistence*
*Researched: 2026-03-21*