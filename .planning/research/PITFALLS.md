# Pitfalls Research

**Domain:** Browser-based WebGL2 voxel engine with save/load, inventory, survival mechanics, and day/night cycle
**Researched:** 2026-03-21
**Confidence:** MEDIUM

Research draws from community discussions, post-mortems, official docs, and known issues in similar projects. Several findings are from non-voxel game dev communities but apply to this domain.

## Critical Pitfalls

### Pitfall 1: Silent IndexedDB Data Loss via Quota Eviction

**What goes wrong:**
All world data disappears silently when the browser's origin storage quota is exceeded. The browser evicts the entire IndexedDB database for the origin — not just excess data.

**Why it happens:**
Browsers allocate storage per origin (scheme + host + port). Chrome evicts the entire origin's storage (IndexedDB, Cache API, localStorage) when quota is exceeded. This is invisible until it happens — the app continues working, then next session all data is gone. World data for a voxel game grows unboundedly as players explore.

**Consequences:**
- Player loses entire world with no warning
- Lost hours of building/exploration
- Users blame the game, not the browser

**Warning signs:**
- Storage quota monitoring not implemented
- No `navigator.storage.persist()` call at startup
- No size caps or cleanup strategy for chunk storage
- No user-facing storage usage display

**Prevention:**
1. Request persistent storage at startup: `await navigator.storage.persist()`
2. Monitor storage quota: `navigator.storage.estimate()`
3. Implement chunk size limits or cleanup of unvisited chunks
4. Display storage usage in UI
5. Warn users when approaching quota (e.g., >80% of available)

**Phase to address:** Save/Load phase — must be foundational, not retrofitted.

---

### Pitfall 2: IndexedDB Writes Not Flushed Until Page Close

**What goes wrong:**
Data written to IndexedDB during gameplay is held in a browser write buffer and not committed to disk. If the tab crashes, is closed unexpectedly, or even just navigated away from, data is lost despite appearing saved.

**Why it happens:**
IndexedDB's internal file system (used in WebGL/asm.js builds) buffers writes and only flushes on page unload, scene changes, or explicit sync calls. This is a browser-level behavior, not a bug in the persistence layer.

**Consequences:**
- Player saves, sees confirmation, then tab crashes — save is gone
- Autosave never commits to disk
- Confusing "save works in editor but not in build" scenarios

**Warning signs:**
- No `FS.syncfs()` call after write operations
- Saves appear to work in development but fail in production builds
- No explicit flush/sync mechanism after IndexedDB operations

**Prevention:**
1. Use `navigator.storage.persist()` + `sync()` after critical writes
2. Implement explicit flush: write to a temp file, then rename (atomic write pattern)
3. Add autosave interval that also triggers sync
4. Warn players to use the browser's built-in "close tab" behavior, not just navigate away

**Phase to address:** Save/Load phase.

---

### Pitfall 3: Save File Corruption from Partial Serialization

**What goes wrong:**
Player saves, game updates, then saved data fails to load because some game object wasn't included in the serialization. Or: world data serializes but player inventory state does not, or vice versa.

**Why it happens:**
Developers serialize the obvious (player position, world chunks) but forget: WebGL resource handles, Web Worker state, UI state, entity component data, day/night time, hunger/health values. Voxel games have complex interconnected state across rendering, physics, game logic, and workers.

**Consequences:**
- Load produces a broken/inconsistent world state
- Missing player inventory on load
- Chunks reference blocks that don't exist
- Null pointer errors on load

**Warning signs:**
- No automated serialization testing (save/load cycle in tests)
- Game state split across multiple non-connected modules
- No explicit "what state must be saved" document
- Web Workers handle game logic without serialization hooks

**Prevention:**
1. Write a `GameState` schema listing every field that must persist
2. Use explicit serialization for each system, no automatic reflection
3. Implement save/load roundtrip tests: save → load → verify → save again
4. Keep game state centralized or at least documented at boundaries
5. Version save files: `{ version: 1, data: {...} }`

**Phase to address:** Save/Load phase — design the serialization schema before writing persistence code.

---

### Pitfall 4: Full Mesh Regeneration on Block Edit Breaks Save/Load

**What goes wrong:**
After adding save/load, block edits appear to work but the saved mesh geometry doesn't match the saved block data. Or: after loading, modified chunks show incorrect geometry.

**Why it happens:**
The existing codebase already has this bug (`src/main.js` lines 695-803) — block edits trigger manual mesh regeneration that sometimes requires chunk refresh. Combined with save/load, the regeneration logic may fire before or after the save completes, producing mismatches. Greedy meshing state may also not be serializable.

**Consequences:**
- Blocks the player placed are invisible or show wrong faces after load
- Meshes reference block IDs that don't match world data
- Chunk seams appear at load boundaries

**Warning signs:**
- Block edits use manual `regenerateMesh()` calls instead of incremental updates
- Mesh geometry is derived at render time, not stored
- No "mesh version" tracking per chunk
- Greedy meshing state is in-memory only

**Prevention:**
1. Fix the existing block edit mesh bug before save/load
2. Ensure mesh geometry is fully derived from block data on load (no cached state)
3. Track chunk modification timestamps to force regeneration when needed
4. After loading, iterate all chunks and regenerate meshes from block data

**Phase to address:** Fix existing block edit bugs as pre-work for Save/Load phase.

---

### Pitfall 5: Hunger/Thirst as Punishment Instead of Preparation

**What goes wrong:**
Hunger/thirst bars drain constantly and cause death if ignored. Players experience this as a "maintenance tax" — a chore that interrupts gameplay rather than enhances it. Players quit or mod out the system.

**Why it happens:**
Industry default since Minecraft. The logic is "if you don't eat, you die" which creates negative feedback. Modern games (Valheim, Hytale design docs) show "buff-based" systems work better: eating doesn't prevent death, it grants powerful bonuses.

**Consequences:**
- Survival mode feels tedious, not challenging
- Players avoid survival mode entirely
- Negative reviews citing "pointless eating mechanic"

**Warning signs:**
- Hunger depletes every second regardless of player activity
- Death from starvation is faster than death from combat
- No food variety or strategic depth
- Eating just resets a timer

**Prevention:**
1. Design hunger as a buff system: full hunger grants bonuses (extra HP regen, faster stamina), empty hunger is neutral not deadly
2. Have death only occur from actual threats (falls, combat, hazards), not stat depletion
3. Make food acquisition meaningful through variety (berries for quick hunger, cooked meals for long buffs)
4. Tie hunger/food to gameplay decisions: "should I explore more or eat first?" not "eat or die"

**Phase to address:** Survival mechanics phase.

---

### Pitfall 6: Day/Night Shadow Swimming

**What goes wrong:**
Shadows flicker, swim, and jitter during player movement. The shadow map moves with the player instead of staying anchored to the world, creating a nauseating strobe effect.

**Why it happens:**
In infinite voxel worlds, the directional light source follows the player. When the light position changes with camera movement, the shadow map projection shifts, causing shadow edges to swim across surfaces. This is a well-documented issue in Minecraft-style engines.

**Consequences:**
- Unplayable visuals, motion sickness in severe cases
- Shadows look broken at any camera movement speed
- Breaks immersion entirely

**Warning signs:**
- Shadow map uses player-relative projection
- No shadow bias adjustment for the sun/moon light direction
- Single directional light that tracks camera position

**Prevention:**
1. Anchor the directional light to world coordinates, not camera coordinates
2. Use a very large orthographic projection frustum for the shadow map
3. Add bias values carefully to prevent shadow acne while minimizing swimming
4. Consider cascade shadow maps or only shadow-casting from the sun at specific times
5. During night, shadows should come from moon — still world-anchored

**Phase to address:** Day/Night cycle phase.

---

### Pitfall 7: Lighting Changes Break SSAO and Post-Processing

**What goes wrong:**
Adding day/night cycles breaks SSAO, causes black/dark patches during night transitions, or the post-processing looks completely wrong at different times of day. Deferred rendering pipelines are particularly sensitive to lighting changes.

**Why it happens:**
The existing codebase has SSAO via deferred shading. SSAO samples the G-buffer with scene depth/normal data. When sun angle changes, the AO contribution may no longer match the new lighting, or the AO intensity needs to scale with ambient light levels. Fog color changes can also make SSAO artifacts glaringly visible.

**Consequences:**
- SSAO looks wrong at night (too dark, or disappears entirely)
- Post-processing artifacts become visible during transitions
- Deferred pipeline breaks during extreme lighting (noon vs midnight)

**Warning signs:**
- SSAO intensity is hardcoded, doesn't respond to ambient light
- No fog color blending tied to time of day
- Post-processing shaders don't receive time-of-day uniforms

**Prevention:**
1. Design post-processing to respond to time-of-day uniforms
2. Scale SSAO contribution based on ambient light level (brighter = stronger AO)
3. Blend fog color with sky color in sync with day/night cycle
4. Test post-processing at multiple times of day, not just day scenarios

**Phase to address:** Day/Night cycle phase.

---

### Pitfall 8: Inventory System Tightly Coupled to UI

**What goes wrong:**
Inventory works fine while UI is on screen but breaks in headless/test scenarios, or UI state leaks into save data. Refactoring the inventory display breaks the underlying data model.

**Why it happens:**
Developers implement inventory UI and inventory data in the same class/module. UI events directly mutate inventory state without a clean abstraction. This is the #1 mistake in inventory system tutorials.

**Consequences:**
- Cannot test inventory logic without rendering UI
- UI changes break game logic
- Save/load inventory requires serializing UI state too
- Hard to add crafting, trading, or containers later

**Warning signs:**
- Single class/module handles both inventory data and inventory UI
- UI directly accesses internal block IDs or counts
- No event system for inventory changes
- Inventory slot rendering code mixed with item count logic

**Prevention:**
1. Separate `InventoryData` (pure data, serializable) from `InventoryUI` (rendering only)
2. Use an event/pub-sub system: inventory changes emit events, UI subscribes
3. Design inventory API around verbs: `addItem()`, `removeItem()`, `hasItem()`, `getCount()`
4. Test inventory data independently of UI

**Phase to address:** Inventory phase — design data model first, UI second.

---

### Pitfall 9: Web Worker State Lost on Save

**What goes wrong:**
Chunks currently generate in Web Workers. After save/load, worker state is lost, or saved chunk data doesn't match what the workers think is loaded. Worker pending callbacks accumulate during load, causing memory leaks.

**Why it happens:**
Workers maintain their own copy of chunk data. If the main thread serializes chunk data from the main thread's state but the workers have modified their local copies, the saves are inconsistent. Pending worker callbacks from pre-save operations may fire after load and corrupt state.

**Consequences:**
- Chunk data mismatch between saved state and worker state
- Memory leaks from orphaned worker callbacks after load
- Race conditions between worker responses and loaded world state

**Warning signs:**
- Workers hold their own chunk data copies (not just job queues)
- No worker message cleanup on save/load
- pendingCallbacks in workerPool.js grows unbounded during normal play
- No synchronization between worker state and serialized state

**Prevention:**
1. Design save/load to drain all worker queues before saving
2. On load, terminate existing workers and restart with loaded state
3. Don't let workers hold independent chunk data — workers should be pure job processors, not state holders
4. Clear `pendingCallbacks` Map on load

**Phase to address:** Save/Load phase — requires architectural decision about worker state ownership.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|------------------|----------------|-----------------|
| Save only block IDs, not mesh data | Smaller save files | Mesh must regenerate from scratch on load, slow | Only if chunk regeneration is fast |
| Skip save file versioning | Faster to ship | Cannot handle schema changes, old saves break | MVP only |
| Store full chunk meshes in save | Faster load (no regeneration) | Massive save files, desync with block data | Never — source of truth must be blocks |
| Hardcode chunk size 16×256×16 | Simpler math everywhere | Cannot optimize or support different chunk sizes | Only if never changing |
| Single global inventory object | Easy to access | Cannot support containers, trading, dropped items | MVP only |
| Day/night as visual-only (no gameplay effect) | Simpler to implement | Players sleep through nights, no tension | MVP only |
| Ignore OneDrive/CloudSync on Windows | Simpler save path | Saves corrupt or fail silently on Windows | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| IndexedDB + Web Workers | Workers write to IndexedDB independently, causing race conditions | All writes go through main thread's persistence layer |
| Save/Load + Day/Night | Time of day resets to noon on load | Store `gameTime` in save, restore on load |
| Save/Load + Block Edits | Saving mid-edit produces corrupted state | Lock saves during edit operations or queue them |
| IndexedDB + Browser Tabs | Multiple tabs write to same database, causing lock errors | Use `versionchange` events to close stale connections |
| Day/Night + Shadow Map | Shadow map regenerated every frame regardless of sun angle change | Only update shadow matrix when sun has moved enough |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Saving every block edit to IndexedDB | Massive lag spike on every block place/destroy | Batch writes: accumulate changes, save every N seconds or on chunk unload | >1 edit per second |
| Full chunk re-render on every frame during night transition | FPS drops to 30 during dusk/dawn | Use GPU-side lighting interpolation, not CPU-side mesh updates | Any frame rate sensitive player |
| Inventory UI updates every frame | CPU overhead from DOM manipulation | Update inventory UI only on change events | Large inventories, many items |
| Loading world regenerates ALL chunk meshes synchronously | Browser hangs for 5-30 seconds | Stream chunk loads: generate N chunks per frame, prioritize visible | Large worlds (>100 loaded chunks) |
| SSAO recomputed every frame | GPU bottleneck | Compute SSAO once per time-of-day phase, not per frame | Any GPU-limited scenario |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No input validation on loaded save data | Malicious/corrupted save causes crash or exploit | Validate all loaded values against schema before applying |
| Save file names from user input | Path traversal attacks | Sanitize all save identifiers, use internal IDs not filenames |
| No size limit on loaded chunk data | DoS via inflated save files | Cap chunk data size per save, reject malformed data |
| Player position from save not clamped | Out-of-bounds coordinates cause undefined behavior | Clamp loaded position to world bounds on load |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No save confirmation feedback | Players don't know if save worked | Clear "Saving..." → "Saved!" with timestamp |
| Manual mesh regeneration visible | Chunks "pop" or flash after block edit | Use double-buffering or smooth transition for mesh updates |
| Night arrives without warning | Player stranded in dark, dies unexpectedly | Advance notice: sky darkens gradually, HUD warning at low light |
| Inventory full with no indication | Player picks up items that vanish | Clear feedback when inventory is full, highlight the full slot |
| Survival death = hard reset | Losing everything is frustrating, not challenging | Death should have consequences (drop items, respawn at base) but not full world reset |
| Hunger depletes in creative mode | Creative players annoyed by irrelevant meters | Survival stats only apply in survival mode |

## "Looks Done But Isn't" Checklist

- [ ] **Save/Load:** Save actually commits to disk (verify via DevTools > Application > IndexedDB, close tab, reopen, load)
- [ ] **Save/Load:** World chunks regenerate correctly from block data on load (verify with modified terrain)
- [ ] **Save/Load:** Player position, health, hunger, inventory all restored on load
- [ ] **Save/Load:** Old saves still load after game updates (version migration tested)
- [ ] **Inventory:** Block counts persist through save/load
- [ ] **Inventory:** Full inventory prevents picking up more items with clear feedback
- [ ] **Survival:** Hunger is buff-based, not death-based (eating is preparation, not survival)
- [ ] **Survival:** Health regeneration works when hunger is high
- [ ] **Day/Night:** Shadow swimming is absent or minimal during camera movement
- [ ] **Day/Night:** SSAO scales with ambient light level (not washed out at night, not invisible at day)
- [ ] **Day/Night:** Fog color matches sky color at all times of day
- [ ] **Day/Night:** Day/night cycle advances correctly when tab is in background (or paused)
- [ ] **Integration:** Saving while day/night is transitioning produces consistent results
- [ ] **Integration:** Block edits during autosave don't corrupt world data

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IndexedDB quota exceeded | HIGH | Data is gone. Prevention is the only strategy. Offer export-to-file as backup. |
| Corrupted save file | HIGH | Detect via version/checksum. Maintain backup save. Auto-backup before each save. |
| Worker state desync after load | MEDIUM | Terminate workers on load, restart with clean state |
| Block edit mesh not visible after load | MEDIUM | Force chunk remesh on load from block data |
| SSAO broken at night | LOW | Adjust AO uniforms by time-of-day in shader |
| Shadow swimming | MEDIUM | Increase shadow frustum size, adjust bias, consider cascade shadows |
| Inventory UI state in save file | LOW | Separate UI state from data, re-derive UI state from data on load |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IndexedDB quota eviction | Save/Load (foundational) | Monitor storage quota, test near-quota scenarios |
| IndexedDB write flush | Save/Load (foundational) | Force crash after save, verify data persisted |
| Partial serialization | Save/Load (design) | Automated save/load roundtrip tests |
| Block edit mesh mismatch | Pre-work (fix existing bug) | Block edit → save → load → verify block visible |
| Hunger as punishment | Survival Mechanics | Play session: food should feel like preparation not tax |
| Shadow swimming | Day/Night Cycle | Move camera in all directions, verify shadows stable |
| SSAO breaks at night | Day/Night Cycle | Screenshot at noon, dusk, midnight — compare quality |
| Inventory UI coupled | Inventory (architecture) | Change UI without touching data layer, verify logic unchanged |
| Worker state on save | Save/Load (architecture) | Save during heavy worker activity, load and verify consistency |

## Sources

- [IndexedDB data loss root causes](https://dev.to/denyherianto/why-your-indexeddb-data-keeps-disappearing-1m0a) — DEV Community, 2026-03-03
- [Teardown quicksave design notes](https://blog.voxagon.se/2020/11/18/teardown-quicksave.html) — Voxagon Blog (Dennis Gustafsson)
- [r/gamedev save/load discussion](https://www.reddit.com/r/gamedev/comments/1kg4c7u/damn_i_had_no_idea_saving_and_loading_was_tough/) — Reddit, 2025
- [Godot Voxel plugin save/load docs](https://docs.voxelplugin.com/1.2-legacy/core-systems/voxelworld/save-and-load) — VoxelPlugin, 2024
- [Hytale hunger system analysis](https://www.hytalelobby.com/blog/hytale-hunger-system-why-buffs-beat-starvation-mechanics) — 2025-12-15
- [Voxel engine lighting seam bug](https://seedworldgame.wordpress.com/2015/02/16/voxel-lighting-problem-solved/) — Project SeedWorld, 2015
- [Shadow mapping problems OpenGL](https://stackoverflow.com/questions/72249684/how-to-fix-shadow-mapping-problems-resolution-shadow-swimming-sawtooth-open) — Stack Overflow, 2022
- [Voxel Tycoon common mistakes](https://voxeltycoon.fandom.com/wiki/How_to_play:_Common_mistakes_and_tips) — Voxel Tycoon Wiki
- [Godot voxel instance persistence issue](https://github.com/Zylann/godot_voxel/issues/764) — 2025
- [Voxel game lighting artifacts (gamedev.stackexchange)](https://gamedev.stackexchange.com/questions/51614/how-to-solve-artifacts-caused-by-vertex-lighting-in-my-voxel-engine) — 2013
- [Why hunger mechanics feel bad](https://www.reddit.com/r/SurvivalGaming/comments/1rvcbip/mechanics/) — Reddit, 2026-03-16
- [Inventory system mistakes (RetroVem)](https://retrovem.com/2025/02/14/optimizing-video-game-inventory-systems/) — 2025-02-14
- [Unity inventory system guide](https://toxigon.com/how-to-create-a-inventory-system-in-unity3d) — Toxigon, 2025-10-07
- [Unreal UE5 inventory lessons](https://www.spongehammer.com/unreal-engine-5-inventory-system-cpp-guide/) — Spongehammer, 2025-09-04
- [Day/night cycle pitfalls](https://meegle.com/en_us/topics/game-engine/game-engine-for-day-night-cycles) — Meegle, 2025
- [Voxel devlog day/night + shadow map](https://www.youtube.com/watch?v=X36Y2MitN4U) — Cuzzo, 2025-04-07
- [Voxel engine optimization (day/night)](https://www.youtube.com/watch?v=eUNS2njeoT4) — fuckAAAgreed, 2025-11-18

---
*Pitfalls research for: WebGL2 voxel engine — save/load, inventory, survival mechanics, day/night cycle*
*Researched: 2026-03-21*
