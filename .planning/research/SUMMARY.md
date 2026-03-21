# Project Research Summary

**Project:** Voxel Engine
**Domain:** Browser-based WebGL2 voxel survival game
**Researched:** 2026-03-21
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project is a browser-based voxel world engine built on vanilla JavaScript and WebGL2, already delivering procedural terrain generation, deferred shading with SSAO and shadows, greedy meshing, and Web Worker-based chunk processing. The research identifies five major systems to add for a complete survival experience: **world persistence** (IndexedDB), **inventory and hotbar**, **survival mechanics** (health/hunger), **day/night cycle**, and **hostile mobs**. The existing codebase provides a solid foundation, but significant architectural work remains before these systems are viable.

The recommended approach prioritizes persistence first—because nothing else matters if progress isn't saved—then survival state (health/hunger), then inventory, then day/night visuals, then hostile mobs to complete the core loop. Key pitfalls center on IndexedDB quota management, ensuring writes actually flush to disk, serializing Web Worker state, and fixing a pre-existing mesh regeneration bug in block editing. The architecture research provides clear patterns (observable state, dirty chunk tracking, async batch persistence) and explicit anti-patterns to avoid. Confidence is high on features and architecture based on community-validated patterns; confidence is lower on the browser-specific IndexedDB edge cases which need in-browser testing.

## Key Findings

### Recommended Stack

The existing codebase is well-aligned with expert recommendations. Vanilla JavaScript (ES2022+) with no framework is correct—frameworks add overhead and reduce WebGL control. WebGL2 is the right choice for SSAO, shadow mapping, and multi-pass deferred shading (all already working). Web Workers for chunk generation are confirmed working and should be extended for persistence. IndexedDB is the standard browser persistence approach, but it requires careful handling of quota eviction, write flushing, and schema versioning.

**Core technologies:**
- **Vanilla JavaScript (ES2022+)** — full WebGL2 control, no overhead — confirmed correct choice
- **WebGL2 with deferred shading** — SSAO, shadow mapping, multi-pass — already implemented and working
- **Web Workers** — chunk generation off main thread — already working, extend for persistence
- **IndexedDB** — browser-native persistence — correct choice, but requires careful implementation to avoid silent data loss
- **simplex-noise ^4.0.3** — procedural terrain generation — already in use via CDN

### Expected Features

**Must have (table stakes):**
- **World Persistence (Save/Load)** — Non-negotiable. Players spend hours building; losing progress means they don't return. IndexedDB with chunk + player state, auto-save.
- **Inventory + Hotbar** — 1-9 key selection, stack management, visual hotbar UI. Hotbar-first (not full grid inventory) keeps scope minimal.
- **Block Drop Collection** — Destroyed blocks become collectible items. Stack merging. Low complexity, high engagement.
- **Day/Night Cycle** — Game-time cycle (10-min), not real-time. Lighting shifts, sun/moon rendering. No gameplay effects in v1 beyond ambient light.
- **Health + Hunger** — 10 points each. Hunger depletes over time; eating restores it. **Hunger must be buff-based, not death-based** — full hunger grants HP regen bonuses, empty hunger is neutral not deadly.
- **Basic Hostile Mobs (2-3 types)** — Pathfinding, spawn at night, contact damage. Expand after core loop validated.

**Should have (competitive):**
- **Crafting System** — Workbench station, basic tool recipes (pickaxe, axe, sword), material tiers. High complexity; defer to v1.x.
- **Stamina System** — Sprint drain, jump cost. Tactical movement depth. Medium complexity.
- **Equipment/Gear** — Armor reduces damage, tools increase block speed. Visible progression.
- **Cooking/Food Processing** — Multiple food types with different saturation/buff values.

**Defer (v2+):**
- **Temperature/Weather** — Biome-specific effects. High complexity, adds depth but doesn't create the loop.
- **Quest/GPS System** — Marker tracking, NPC dialogue. Adds structure for players who want direction.
- **Multiplayer Foundation** — WebSocket-based co-op. Per PROJECT.md roadmap.
- **Advanced World Generation** — Caves, structures, ore veins. Deferred per PROJECT.md constraints.

### Architecture Approach

The architecture follows a layered approach: UI layer (HUD, hotbar, inventory screen) → Game State layer (PlayerState, Inventory, DayNight) → Persistence layer (IndexedDB-backed WorldStore, PlayerStore, ChunkCacheStore). Key patterns are **Observable Game State** (state changes emit events, UI subscribes), **Dirty Chunk Tracking** (only modified chunks are serialized), and **Async Batch Persistence** (writes queue and flush every 5-10 seconds). Anti-patterns to avoid: saving on every block change, storing full chunk objects (mesh + data), hotbar and inventory as separate systems, and monolithic player state objects.

The recommended project structure places game logic under `src/game/` (player/, inventory/, survival/, time/, ui/) and persistence under `src/persistence/` (persistenceManager.js, worldStore.js, playerStore.js, storageAdapter.js). The existing engine layer (World, Renderer, WorkerPool) is unchanged but extended with dirty tracking and time uniforms.

**Major components:**
1. **PersistenceManager** — IndexedDB orchestration, dirty chunk tracking, batch flush — the foundation everything else depends on
2. **PlayerState + HealthSystem + HungerSystem** — Observable survival state that the UI subscribes to
3. **Inventory + Hotbar** — Item storage with 0-8 hotbar slots, item registry, block-to-item mapping
4. **DayNightCycle** — Time progression updating shader uniforms for ambient color and sun angle
5. **HostileMobs** — Simple pathfinding AI, spawn management tied to night phase

### Critical Pitfalls

1. **IndexedDB Silent Data Loss via Quota Eviction** — When browser quota is exceeded, the entire IndexedDB database is silently wiped. Prevention: call `navigator.storage.persist()` at startup, monitor quota with `navigator.storage.estimate()`, display storage usage, warn at >80%. **Must be foundational, not retrofitted.**

2. **IndexedDB Writes Not Flushed to Disk** — Data appears saved but isn't committed to disk until tab close. Prevention: explicit `sync()` calls after critical writes, atomic write pattern (write to temp, rename), autosave interval with sync.

3. **Partial Serialization on Save/Load** — Saving player position but not inventory, or chunks but not day/night time. Prevention: write explicit GameState schema, implement save/load roundtrip tests, version save files, centralize what must persist.

4. **Block Edit Mesh Mismatch After Load** — Existing codebase has a bug (src/main.js lines 695-803): block edits trigger manual mesh regeneration that sometimes requires chunk refresh, causing loaded chunks to show incorrect geometry. Prevention: fix this bug before building save/load, ensure mesh geometry is fully derived from block data on load.

5. **Hunger/Thirst as Punishment Instead of Preparation** — Hunger drains constantly and causes death, creating a "maintenance tax." Prevention: design hunger as a buff system—full hunger grants bonuses (extra HP regen, faster stamina), empty hunger is neutral not deadly. Death only from threats (falls, combat, hazards).

## Implications for Roadmap

Based on research, the following phase structure balances dependencies, architectural patterns, and risk mitigation:

### Phase 1: Pre-Work + Persistence Foundation
**Rationale:** World persistence is the foundation everything else builds on, but the existing block edit mesh bug must be fixed first or save/load will produce broken worlds. IndexedDB must be implemented correctly from day one to avoid silent data loss.

**Delivers:**
- Fix existing block edit mesh regeneration bug (src/main.js lines 695-803)
- `storageAdapter.js` — Promise-based IndexedDB wrapper
- `persistenceManager.js` — Flush logic, dirty chunk tracking
- `playerStore.js` — Save/load player data (position, health, hunger, inventory)
- `worldStore.js` — Chunk voxel data serialization (Uint8Array only, not mesh data)
- Worker queue draining before save, clean worker restart on load
- `navigator.storage.persist()` at startup + quota monitoring
- Save/load roundtrip tests

**Addresses:** World Persistence (P1 feature)
**Avoids:** IndexedDB quota eviction, write flush failure, partial serialization, block edit mesh mismatch, worker state loss

---

### Phase 2: Player State & Survival Core
**Rationale:** Survival mechanics (health/hunger) are independent of inventory and don't need persistence yet. They establish the core tension loop and can be tested in isolation before integrating with other systems.

**Delivers:**
- `playerState.js` — Observable state (health, hunger, position, status)
- `healthSystem.js` — Damage sources, HP regeneration when well-fed, death/respawn
- `hungerSystem.js` — Hunger depletion over time, food consumption, buff-based design
- `hud.js` — Health bar, hunger bar, visual feedback
- Survival mechanics work without persistence for initial testing

**Addresses:** Health + Hunger (P1 features)
**Avoids:** Hunger as punishment (buff-based design from the start)
**Research Flag:** The buff-based hunger design (per Hytale analysis) needs playtesting validation—may need iteration on specific buff values and depletion rates.

---

### Phase 3: Inventory System
**Rationale:** Inventory is the gateway system—it enables block drops, crafting, equipment, and food. It depends on playerState for tool effectiveness and must be designed with data/UI separation from the start.

**Delivers:**
- `itemRegistry.js` — Block-to-item mappings
- `inventory.js` — Hotbar slots 0-8, storage slots 9+, `addItem()`, `removeItem()`, `hasItem()`, `getCount()`
- `hotbar.js` — 1-9 selection UI, visual selection indicator
- Block drop collection — destroyed blocks become collectible items
- Inventory state integrates into PlayerStore for persistence
- `InventoryData` (pure data, serializable) separate from `InventoryUI` (DOM rendering only)

**Addresses:** Inventory + Hotbar (P1), Block Drop Collection (P1)
**Avoids:** Inventory UI tightly coupled to game logic
**Note:** Full inventory grid screen is anti-pattern for v1. Hotbar-focused design only.

---

### Phase 4: Day/Night Cycle
**Rationale:** Day/night is visual-only in v1 (no gameplay effects like mob spawning), making it safe to implement after survival state exists but before mobs. It requires shader work that needs careful testing.

**Delivers:**
- `dayNightCycle.js` — Game-time progression, sun/moon position, phase tracking
- Shader uniform updates for ambient color, sun angle
- Shadow map anchored to world coordinates (NOT player-relative) — prevents shadow swimming
- SSAO contribution scales with ambient light level
- Fog color blends with sky color across all times of day
- `gameTime` stored in save, restored on load

**Addresses:** Day/Night Cycle (P1 feature)
**Avoids:** Shadow swimming, SSAO breaking at night, fog/sky color mismatch
**Research Flag:** Shadow swimming prevention needs verification during implementation—the recommended approach (world-anchored directional light, large orthographic frustum) must be tested with actual camera movement.

---

### Phase 5: Hostile Mobs & Core Loop Completion
**Rationale:** Mobs require health system (Phase 2) and day/night cycle (Phase 4) already working. This is the final piece that creates the survival tension loop—without hostile mobs at night, survival is passive.

**Delivers:**
- 2-3 basic hostile mob types with simple pathfinding
- Mob spawn management tied to night phase
- Contact damage to player (health system already exists)
- Player can fight (future: tools/weapons) or flee
- Mobs integrate with persistence (mob state saved/restored)

**Addresses:** Basic Hostile Mobs (P1 feature)
**Depends on:** Health system (Phase 2), Day/Night (Phase 4)

---

### Phase 1.5 (or v1.x): Crafting & Equipment
**Delivers:** Workbench station, basic tool recipes, material tiers (wood → stone), armor system, cooking/food processing.

**Addresses:** Crafting System (P2), Cooking/Food (P2), Equipment/Gear (P2)
**Rationale:** Crafting requires block drops (Phase 3) and is a natural expansion after the core survival loop is validated.

### Phase Ordering Rationale

- **Phase 1 (Pre-work + Persistence) comes first** because every other system needs saved state to be meaningful. Without persistence, players lose everything on refresh.
- **Phase 2 (Survival State) before Phase 3 (Inventory)** because health/hunger are independent systems that can be tested in isolation. Adding inventory complexity before survival is validated wastes effort.
- **Phase 3 (Inventory) after Survival State** because inventory depends on playerState for tool effectiveness and the item-to-block mapping is cleaner once survival mechanics exist.
- **Phase 4 (Day/Night) before Phase 5 (Mobs)** because day/night is a prerequisite for hostile mob spawning logic, and the shader work can be tested independently.
- **Mobs are last** because they require both survival state (to take damage) and day/night (to know when to spawn) already working.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Survival Core):** Buff-based hunger design needs playtesting—specific buff values and depletion rates aren't established in the genre. May need `/gsd-research-phase` for tuning parameters.
- **Phase 4 (Day/Night):** Shadow swimming prevention (world-anchored light, large frustum) needs browser-specific verification. SSAO scaling with ambient light requires shader parameter tuning.
- **Phase 5 (Mobs):** AI pathfinding approaches for browser-based voxel games have limited documentation—may need research on A* alternatives for infinite worlds.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Persistence):** Observable patterns, dirty tracking, batch persistence are well-documented across game dev communities.
- **Phase 3 (Inventory):** Data/UI separation, hotbar management, stack operations are standard patterns with clear anti-patterns documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing codebase is well-aligned with expert recommendations. Vanilla JS + WebGL2 confirmed correct. |
| Features | MEDIUM-HIGH | Backed by analysis of 8+ shipped games (Minecraft, Vintage Story, Hytale, Voxile, Core Keeper, etc.). Competitor feature table is comprehensive. |
| Architecture | MEDIUM | Patterns are well-documented and standard. Integration points are clear. Confidence reduced because the existing codebase has pre-existing bugs (block edit mesh, duplicate chunk classes) that affect implementation. |
| Pitfalls | MEDIUM | Backed by community post-mortems and technical documentation. IndexedDB edge cases (quota eviction, write flush) are verified. Some pitfalls are browser-specific and need in-browser testing. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Stack research file missing:** `.planning/research/STACK.md` was not produced by parallel researchers. Technology stack was extracted from `.planning/codebase/STACK.md` (codebase analysis). This is acceptable since the codebase analysis confirms the stack, but a dedicated research file with version recommendations would be valuable.
- **Hunger depletion rate:** Specific tick rate and depletion values for hunger system are not established. Need playtesting to determine whether hunger depletes every second, every 30 seconds, or based on activity.
- **Buff system specifics:** The research recommends buff-based hunger (full hunger = bonuses) but doesn't specify which buffs. Need design decisions on: HP regen rate when fed, stamina efficiency bonus, damage resistance, etc.
- **Mob AI approach:** Pathfinding for infinite voxel worlds is a known hard problem. A* over all loaded chunks is expensive; grid-based approaches need evaluation against this specific use case.
- **IndexedDB edge cases:** Browser-specific behavior around quota eviction and write flushing needs in-browser verification. The "Looks Done But Isn't" checklist in PITFALLS.md must be executed during Phase 1.

## Sources

### Primary (HIGH confidence)
- Minecraft (Mojang) — genre standard, feature baseline
- Vintage Story (vintagestory.at) — process-crafting differentiation, temperature systems
- Hytale (Hypixel Studios) — blueprint crafting, stamina combat, RPG-lite progression, buff-based hunger analysis
- Voxile (VoxRay Games, Steam EA 2025) — ray-traced voxel survival, full save system
- Core Keeper (Pugiato, 1.0 2026) — survival sandbox with boss progression
- MDN Web Docs — IndexedDB API patterns
- web.dev — IndexedDB Best Practices (2024)

### Secondary (MEDIUM confidence)
- IndexedDB data loss root causes (DEV Community, 2026-03-03) — quota eviction behavior
- Teardown quicksave design notes (Voxagon Blog) — async batch persistence patterns
- r/gamedev save/load discussion (Reddit, 2025) — community patterns
- Godot Voxel plugin save/load docs (VoxelPlugin, 2024) — cross-engine validation
- Inventory system mistakes (RetroVem, 2025) — data/UI separation patterns
- Shadow mapping problems OpenGL (Stack Overflow, 2022) — shadow swimming prevention
- r/SurvivalGaming — hunger mechanics feedback (2026)

### Tertiary (LOW confidence)
- Voxel engine optimization (YouTube, 2025) — day/night shader tuning, needs verification
- Cubic World, Rising World, Terraria — supplementary feature analysis, less directly applicable

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
