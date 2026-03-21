# Roadmap: Voxel Engine

**Created:** 2026-03-21
**Depth:** standard
**Coverage:** 31/31 v1 requirements mapped + 11/11 v1.1 requirements mapped

## Phases

- [ ] **Phase 1: Persistence Foundation** - World saves to IndexedDB, auto-save, manual save, load on refresh, quota monitoring
- [ ] **Phase 2: Survival Core** - Health/hunger systems, HUD, fall damage, death/respawn, regen when fed
- [ ] **Phase 3: Inventory System** - Hotbar (1-9), slot selection, block placement, block pickup, stack merging, persistence
- [ ] **Phase 4: Day/Night Cycle** - Game time progression, ambient lighting, sky transitions, shadow direction, SSAO scaling, time persistence
- [ ] **Phase 5: Hostile Mobs** - Night spawning, pathfinding, contact damage, block-kill, difficulty scaling
- [ ] **Phase 6: Code Structure** - Consolidate chunks, split main.js, extract BlockEditor, create math utils
- [ ] **Phase 7: Bug Fixes** - Remove flat terrain hack, fix biome blending, fix mesh regeneration, fix stale worker
- [ ] **Phase 8: Reliability** - Bundle simplex-noise locally, add logging utility, replace DEBUG console.log

---

## v1.0 Phase Details

### Phase 1: Persistence Foundation

**Goal:** World state persists to IndexedDB with auto-save, manual save, and load on refresh

**Depends on:** Nothing (first phase)

**Requirements:** PERS-01, PERS-02, PERS-03, PERS-04, PERS-05

**Success Criteria** (what must be TRUE):
1. World state saves automatically to IndexedDB every 5 seconds without player action
2. Player can manually save via pause menu or hotkey and receives confirmation
3. World state loads on page refresh, resuming exact player position
4. Storage quota is monitored and user is warned at >80% usage
5. Browser persistent storage is requested at startup for durability

**Plans:** TBD

---

### Phase 2: Survival Core

**Goal:** Player has health and hunger systems with HUD, damage sources, and death/respawn

**Depends on:** Phase 1

**Requirements:** PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, HUNG-01, HUNG-02, HUNG-03, HUNG-04, HUNG-05

**Success Criteria** (what must be TRUE):
1. Health displays as 10 hearts in HUD and updates in real-time
2. Hunger displays as 10 drumsticks in HUD and depletes over game ticks
3. Player takes damage from falls (proximity to ground checked) and HP decreases
4. Player dies at 0 HP and respawns at world spawn point
5. Health regenerates slowly when hunger is above 80%
6. Player can eat food items from inventory to restore hunger
7. Eating food provides a visible buff (increased HP regen rate)
8. Full hunger grants visual feedback (subtle glow or particle)
9. Empty hunger is neutral (no death, no penalty beyond no regen)

**Plans:** TBD

---

### Phase 3: Inventory System

**Goal:** Player has hotbar inventory with block placement and pickup

**Depends on:** Phase 1, Phase 2

**Requirements:** INV-01, INV-02, INV-03, INV-04, INV-05, INV-06

**Success Criteria** (what must be TRUE):
1. Hotbar displays 9 slots with keys 1-9 mapped visually
2. Selected hotbar slot is visually highlighted
3. Left-click places the selected block type from hotbar
4. Player can pick up blocks from world into inventory (right-click)
5. Block stacks merge when placing on same block type
6. Inventory persists across sessions (loaded with world state)

**Plans:** TBD

---

### Phase 4: Day/Night Cycle

**Goal:** Game time progresses through day and night with visual lighting changes

**Depends on:** Phase 1

**Requirements:** DAY-01, DAY-02, DAY-03, DAY-04, DAY-05, DAY-06

**Success Criteria** (what must be TRUE):
1. Game time continuously progresses through day and night phases
2. Ambient lighting changes smoothly based on time of day
3. Sky color transitions between day (blue), sunset (orange), and night (dark blue)
4. Shadow direction shifts based on sun position in sky
5. SSAO contribution scales with ambient light level (less at night)
6. Game time is saved and restored correctly on world load

**Plans:** TBD

---

### Phase 5: Hostile Mobs

**Goal:** Mobs spawn at night, pathfind toward player, deal damage, and can be killed

**Depends on:** Phase 2, Phase 4

**Requirements:** MOBS-01, MOBS-02, MOBS-03, MOBS-04, MOBS-05

**Success Criteria** (what must be TRUE):
1. Mobs spawn at night within render distance of player
2. Mobs pathfind toward player when within detection range
3. Mobs deal contact damage to player and health decreases
4. Player can kill mobs by placing blocks on them (block crush)
5. Mob spawn count scales with difficulty setting

**Plans:** TBD

---

## v1.1 Phase Details (Code Cleanup)

### Phase 6: Code Structure

**Goal:** Codebase is modular with clear separation of concerns

**Depends on:** Nothing (independent of v1.0 phases)

**Requirements:** STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-04

**Success Criteria** (what must be TRUE):
1. Single Chunk class exists (src/chunk.js) without duplicate chunkCore.js
2. main.js (997 lines) is split into separate modules: InputHandler, BlockEditor, Camera, Renderer
3. BlockEditor class handles shared mesh update logic for placeBlock/destroyBlock
4. Math utilities module exists at src/math/utils.js with matrix operations
5. All modules import correctly and voxel engine runs without module errors

**Plans:** TBD

---

### Phase 7: Bug Fixes

**Goal:** Terrain generation and block editing work correctly without known issues

**Depends on:** Phase 6 (requires modular structure to safely refactor)

**Requirements:** FIX-01, FIX-02, FIX-03, FIX-04

**Success Criteria** (what must be TRUE):
1. Terrain varies with elevation naturally (forced flat terrain hack removed from biomes.js)
2. Biome transitions are smooth with gradual blending (no harsh visual edges)
3. Block edits appear immediately in world (no manual chunk refresh needed)
4. Fast camera movement doesn't cause visual glitches from stale worker requests

**Plans:** TBD

---

### Phase 8: Reliability

**Goal:** External dependencies are bundled locally and logging is consistent

**Depends on:** Phase 6 (requires module structure for new logger module)

**Requirements:** RELI-01, RELI-02, RELI-03

**Success Criteria** (what must be TRUE):
1. simplex-noise@4.0.3 is installed locally via npm (no CDN script tag in index.html)
2. Logger utility exists with levels: debug, info, warn, error
3. All DEBUG console.log calls are replaced with proper logger.debug() or logger.info()
4. Application runs in browser with structured logs showing level prefixes

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Persistence Foundation | 0/5 | Not started | - |
| 2. Survival Core | 0/9 | Not started | - |
| 3. Inventory System | 0/6 | Not started | - |
| 4. Day/Night Cycle | 0/6 | Not started | - |
| 5. Hostile Mobs | 0/5 | Not started | - |
| 6. Code Structure | 0/5 | Not started | - |
| 7. Bug Fixes | 0/4 | Not started | - |
| 8. Reliability | 0/4 | Not started | - |

---

## Coverage

### v1.0 Requirements

| Category | Requirements | Phase |
|----------|--------------|-------|
| Persistence | PERS-01, PERS-02, PERS-03, PERS-04, PERS-05 | Phase 1 |
| Player State | PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05 | Phase 2 |
| Hunger | HUNG-01, HUNG-02, HUNG-03, HUNG-04, HUNG-05 | Phase 2 |
| Inventory | INV-01, INV-02, INV-03, INV-04, INV-05, INV-06 | Phase 3 |
| Day/Night | DAY-01, DAY-02, DAY-03, DAY-04, DAY-05, DAY-06 | Phase 4 |
| Mobs | MOBS-01, MOBS-02, MOBS-03, MOBS-04, MOBS-05 | Phase 5 |

**Total:** 31/31 v1 requirements mapped ✓

### v1.1 Requirements (Code Cleanup)

| Category | Requirements | Phase |
|----------|--------------|-------|
| Code Structure | STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-04 | Phase 6 |
| Bug Fixes | FIX-01, FIX-02, FIX-03, FIX-04 | Phase 7 |
| Reliability | RELI-01, RELI-02, RELI-03 | Phase 8 |

**Total:** 11/11 v1.1 requirements mapped ✓

**Grand Total:** 42/42 requirements mapped ✓

---

*Last updated: 2026-03-21 after v1.1 roadmap created*
