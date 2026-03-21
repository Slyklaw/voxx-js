# Feature Research: Voxel Survival Game

**Domain:** Browser-based voxel survival game with WebGL2 rendering
**Researched:** 2026-03-21
**Confidence:** MEDIUM-HIGH

Research draws from analysis of Minecraft, Terraria, Vintage Story, Hytale, Voxile, Core Keeper, Cube World, Rising World, and general survival-crafting genre patterns. Specific browser/IndexedDB patterns verified from MDN and web.dev.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **World Persistence (Save/Load)** | Players spend hours building terrain and structures; losing that progress means they leave and don't return. This is the single most critical table-stakes feature. | HIGH | IndexedDB-backed; must survive page refresh, browser close, device restart. Chunk modifications + player state need atomic saves. Web Workers should handle serialization off the main thread. |
| **Inventory + Hotbar** | Players need to carry gathered blocks and crafted items. The 1-9 number key hotbar is the genre convention (Minecraft standard). | MEDIUM | Needs stack management (max stack sizes), block type tracking, and visual hotbar UI with selection indicator. |
| **Block Drop Collection** | When a block is destroyed, players expect to pick up the resulting item. Without this, mining is purposeless — blocks vanish with no reward. | LOW | Drop entity in world → player proximity pickup. Stack merging with existing inventory. |
| **Day/Night Cycle** | Creates natural gameplay rhythm (build during day, survive at night). Drives exploration pacing and mob spawning timing. | MEDIUM | Lighting color temperature shifts, sun/moon rendering, ambient light level changes. Should run on game time (e.g., 10-minute full cycle), not real time. |
| **Health System** | Players need to feel at risk. Falls, hostile mobs, and environmental hazards must threaten the player or survival is meaningless. | MEDIUM | Health bar UI, damage sources (fall, mob), health regeneration when well-fed, death state (respawn). |
| **Hunger System** | The core pressure loop that drives resource gathering. Without hunger, players have no reason to seek food or farm — the survival loop collapses. | LOW | Saturation depletes first, then hunger. Eating food restores both. Depleting hunger drains health. 10 hunger points (Minecraft convention) is sufficient. |
| **Basic Mobs/Enemies** | Nighttime is threatening because hostile mobs spawn. Without enemies, day/night cycle is purely cosmetic. | MEDIUM | Simple hostile mobs (zombies, skeletons) that pathfind toward player and deal contact damage. Even 2-3 mob types creates the survival tension. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued and memorable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Crafting System** | Turns gathering into a progression loop. Players who finish early-game crafting feel real advancement. Recipe discovery is satisfying. | HIGH | Grid-based or workbench crafting. Tools/weapons/armor with material tiers (wood → stone → iron). Crafting stations placed in world. This is where Vintage Story and Hytale differentiate most from Minecraft. |
| **Stamina System** | Physical constraints make movement feel weighty. Sprinting, jumping, and attacking consuming stamina adds tactical depth (Hytale's model). | MEDIUM | Stamina bar, depletes on sprint/attack/jump, regenerates when idle. Forcing players to walk instead of sprint creates tension. |
| **Equipment/Gear** | Armor reduces damage taken; tools increase block break speed. Visible progression through gear upgrades gives satisfaction. | MEDIUM | Armor value reduces incoming damage. Tool tiers (pickaxe speed). Visual changes to player model or hand-held items. |
| **Temperature/Weather** | Forces biome awareness and clothing/building decisions. Vintage Story's temperature system is a major differentiator. | HIGH | Cold biomes drain warmth; need fire/clothing. Heat biomes cause dehydration. Weather (rain) affects visibility and adds ambiance. |
| **Cooking/Processed Food** | Raw food is early game; cooked food is mid game. Multiple food types with different saturation/buff values create farming depth. | LOW-MEDIUM | Placeable campfire as cooking station. Smelting ores and cooking food share furnace mechanics. Different food items with varying restoration values. |
| **Quest/GPS Marker System** | Hytale-style quest markers give players direction. Even simple "collect X" or "visit location Y" quests create purpose beyond sandbox. | MEDIUM | NPC dialogue, marker on minimap/compass, quest log UI. Gives structure to open-ended survival. |
| **Multiplayer Foundation (Co-op)** | Voxile and Core Keeper show co-op survival is a major draw. Friends building together is sticky. | HIGH | WebSocket architecture for state sync, player avatar rendering, inventory sharing. Deferred per PROJECT.md. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Complex Inventory Tetris** | Players compare to Minecraft's 27-slot grid. | Grid-based inventory is notoriously frustrating in games with many item types. Bad UI kills pacing. | Hotbar-focused with limited stacks. Add a simple crafting grid overlay instead of a full inventory screen. |
| **Real-time Day/Night** | Immersion appeal. | Makes gameplay pacing unpredictable. Short play sessions result in 20 minutes of night with nothing accomplished. Long sessions become tedious. | Game-time cycle (e.g., 10-min day, 5-min night). Player-controlled speed toggle if needed. |
| **PvP Without Consent** | MMO/raid excitement. | Without opt-in systems, PvP turns into ganking that destroys casual/solo players' progress. | PvP arenas or zones that require consent. Focus on PvE survival. |
| **Infinite World Without Persistence** | Minecraft sets this expectation. | Procedurally infinite worlds with no persistence mean every session is new. Players won't invest in a world they can't trust to exist tomorrow. | Finite world with persistence. Infinite generation is only valuable if you can save and return. |
| **Too Many Mob Types Too Early** | Variety seems appealing. | Code complexity, balancing burden, and player confusion. Three mobs well-implemented beat ten mobs that all behave identically. | Ship 2-3 mobs first. Expand after core loop is validated. |
| **Server-Side Persistence (Dedicated Server)** | "Real" multiplayer. | Infrastructure cost, hosting complexity, maintenance burden. Overcomplicates the project. | IndexedDB + WebSocket co-op is the right scope for v1. |

## Feature Dependencies

```
World Persistence (Save/Load)
    ├──requires──> Chunk modification tracking
    │                    └──requires──> Inventory System (modified blocks go to inventory)
    │
Inventory System
    └──requires──> Hotbar UI + Block Selection
    │
Day/Night Cycle
    └──requires──> Ambient light integration with deferred renderer
    │
Health + Hunger Systems
    ├──requires──> Damage sources (falls, mobs)
    │
Block Drop Collection
    └──required by──> Crafting System
    │
Crafting System
    ├──requires──> Block Drop Collection
    ├──requires──> Crafting stations (workbench) placed in world
    └──enhances──> Survival Loop (gives purpose to gathering)
    │
Hostile Mobs
    ├──requires──> Health System
    ├──requires──> Day/Night Cycle
    └──enhances──> Survival Loop
    │
Stamina System ──enhances──> Survival Loop (tactical movement)
Equipment/Gear ──enhances──> Crafting System (progression incentive)
Temperature ──enhances──> Survival Loop (environmental pressure)
```

### Dependency Notes

- **World persistence is the foundation.** If this breaks, everything built on top is unreliable. Invest in robust IndexedDB serialization early.
- **Inventory is the gateway system.** It enables block drops, crafting, equipment, and food — all major features depend on it.
- **Day/Night and Health/Hunger form the survival core loop.** They are co-dependent and should be built together.
- **Crafting requires block drops first.** Players need to collect materials before they can craft anything.
- **Mobs require health and day/night.** These three are a tightly coupled group — implement them as a unit.
- **Temperature, stamina, equipment are layer-on systems.** They enhance an existing survival loop but don't create one.

## MVP Definition

### Launch With (v1)

Minimum viable survival game — what's needed to validate the concept and retain players.

- [ ] **World Persistence** — Save modified chunks and player state to IndexedDB. Load on startup. This is non-negotiable; players will not return if their world is lost.
- [ ] **Inventory + Hotbar** — Block type tracking, stack management, visual hotbar, 1-9 selection. Hotbar (not full inventory screen) keeps scope minimal.
- [ ] **Block Drop Collection** — Destroyed blocks become collectible items that go into inventory. Stack merging.
- [ ] **Day/Night Cycle** — Visual lighting changes, sun/moon rendering, game-time cycle (not real-time). No gameplay effects beyond ambient light in v1.
- [ ] **Health + Hunger** — Health bar with damage sources (falls, mobs once added). Hunger depletes over time; eating food restores it and health. Death = respawn.
- [ ] **Basic Hostile Mobs (2-3 types)** — Simple pathfinding, spawn at night, deal contact damage. Player can fight or flee.

### Add After Validation (v1.x)

Once the core survival loop is proven to retain players.

- [ ] **Crafting System** — Workbench station, basic tool recipes (pickaxe, axe, sword), material tiers. Trigger: after confirming players understand block collection.
- [ ] **Cooking/Food Processing** — Campfire cooking station, smelting ores, multiple food types. Trigger: after confirming players are gathering resources beyond immediate needs.
- [ ] **Stamina System** — Sprint drain, jump cost, attack cost, regeneration. Trigger: after basic combat is tested.
- [ ] **Equipment/Gear** — Armor pieces, tool tiers with visible speed improvements. Trigger: after crafting system is established.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Temperature/Weather** — Biome-specific temperature effects, clothing. High complexity, adds depth but doesn't create the loop.
- [ ] **Quest/GPS System** — Marker tracking, NPC dialogue, task lists. Adds structure for players who want direction.
- [ ] **Multiplayer Foundation** — WebSocket-based co-op, shared world state. Per PROJECT.md roadmap.
- [ ] **Advanced World Generation** — Caves, structures, ore veins. Deferred per PROJECT.md constraints.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| World Persistence | HIGH | HIGH | P1 |
| Inventory + Hotbar | HIGH | MEDIUM | P1 |
| Block Drop Collection | HIGH | LOW | P1 |
| Day/Night Cycle | MEDIUM | MEDIUM | P1 |
| Health + Hunger | HIGH | MEDIUM | P1 |
| Basic Hostile Mobs | MEDIUM | MEDIUM | P1 |
| Crafting System | HIGH | HIGH | P2 |
| Cooking/Food | MEDIUM | MEDIUM | P2 |
| Stamina System | MEDIUM | MEDIUM | P2 |
| Equipment/Gear | MEDIUM | MEDIUM | P2 |
| Temperature/Weather | LOW | HIGH | P3 |
| Quest System | LOW | HIGH | P3 |
| Multiplayer | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — without these, players leave
- P2: Should have, add when core is validated — these are what make survival *engaging*
- P3: Nice to have, future consideration — these are what make survival *deep*

## Competitor Feature Analysis

| Feature | Minecraft | Vintage Story | Hytale | Voxile | Our Approach |
|---------|-----------|---------------|--------|--------|--------------|
| **Persistence** | Auto-save, worlds persist | Full save system | Full save system | Full save system | IndexedDB auto-save, chunk + player state |
| **Inventory** | 27-slot grid + hotbar | Grid + containers | Grid + hotbar | Grid + hotbar | Hotbar-first (P1), expand if needed |
| **Day/Night** | 10-min cycle, gameplay-affecting | 30-min cycle, temperature-affecting | 10-min cycle, spawn-affecting | 10-min cycle, gameplay-affecting | Game-time cycle with lighting |
| **Health** | 10 hearts, regen when fed | Complex vitals system | 10 hearts, food-based regen | Health + armor system | 10 hearts, food-based regen |
| **Hunger** | 10 shanks, depletes with activity | Complex food system | 10 points, depletes with sprint/combat | Food/water system | 10 points, depletes over time |
| **Crafting** | Grid-based, recipe memorization | Process-based, tactile | Blueprint discovery system | Grid crafting | Workbench crafting (P2) |
| **Mobs** | 30+ types with AI | Tiered creature system | 20+ with combat patterns | Mutated creatures | 2-3 basic types (expand post-v1) |
| **Stamina** | None | None | Yes (sprint/dodge/attack) | Yes | None in v1, add in v1.x |
| **Equipment** | Armor tiers + tools | Complex crafting system | Armor + weapons | Full gear system | Basic tool tiers (P2) |
| **Temperature** | None | Core mechanic | None | None | None in v1, future consideration |

## Sources

- Minecraft (Mojang) — genre standard, feature baseline
- Vintage Story (http://www.vintagestory.at/) — process-crafting differentiation, temperature systems
- Hytale (Hypixel Studios) — blueprint crafting, stamina combat, RPG-lite progression
- Voxile (VoxRay Games, Steam EA 2025) — ray-traced voxel survival, handcrafted + procedural hybrid
- Core Keeper (Pugiato, 1.0 2026) — survival sandbox with boss progression
- Cube World (Wallfish Studios) — region-based gear scaling, material-tier crafting
- Rising World (Rising World Games) — seasons, survival mechanics in voxel world
- Terraria (Re-Logic) — structured progression, boss-gated advancement
- web.dev IndexedDB Best Practices (2024) — browser persistence patterns
- MDN Web Docs — IndexedDB API patterns
- r/VoxelGameDev community discussions (2026)

---
*Feature research for: browser-based voxel survival game*
*Researched: 2026-03-21*
