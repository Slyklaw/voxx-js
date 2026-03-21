# Requirements: Voxel Engine

**Defined:** 2026-03-21
**Core Value:** Players can explore an infinite procedural voxel world and modify blocks in real-time with smooth controls.

## v1 Requirements

### Persistence

- [ ] **PERS-01**: World state saves automatically to IndexedDB every 5 seconds
- [ ] **PERS-02**: Player can manually save via pause menu or hotkey
- [ ] **PERS-03**: World state loads on page refresh, resuming exact position
- [ ] **PERS-04**: Storage quota is monitored and user is warned at >80% usage
- [ ] **PERS-05**: `navigator.storage.persist()` is called at startup for durability

### Player State

- [ ] **PLAY-01**: Player has health (10 HP) displayed as hearts in HUD
- [ ] **PLAY-02**: Player has hunger (10 points) displayed as drumsticks in HUD
- [ ] **PLAY-03**: Player takes damage from falls (proximity to ground checked)
- [ ] **PLAY-04**: Player dies at 0 HP and respawns at world spawn
- [ ] **PLAY-05**: Health regenerates slowly when hunger is >80%

### Hunger System

- [ ] **HUNG-01**: Hunger depletes over time based on game tick
- [ ] **HUNG-02**: Player can eat food items to restore hunger
- [ ] **HUNG-03**: Eating food provides buff (increased HP regen rate)
- [ ] **HUNG-04**: Full hunger grants visual feedback (subtle glow or particle)
- [ ] **HUNG-05**: Empty hunger does not cause death (buff-based design)

### Inventory

- [ ] **INV-01**: Player has hotbar with 9 slots (keys 1-9)
- [ ] **INV-02**: Selected hotbar slot is visually highlighted
- [ ] **INV-03**: Player can place the selected block type with left click
- [ ] **INV-04**: Player can pick up blocks from world into inventory
- [ ] **INV-05**: Block stacks merge when placed on same type
- [ ] **INV-06**: Inventory persists across sessions

### Day/Night Cycle

- [ ] **DAY-01**: Game time progresses through day and night phases
- [ ] **DAY-02**: Ambient lighting changes based on time of day
- [ ] **DAY-03**: Sky color transitions between day (blue), sunset (orange), night (dark blue)
- [ ] **DAY-04**: Shadows shift direction based on sun position
- [ ] **DAY-05**: SSAO contribution scales with ambient light level
- [ ] **DAY-06**: Game time is saved and restored on load

### Mobs

- [ ] **MOBS-01**: Mobs spawn at night within render distance
- [ ] **MOBS-02**: Mobs pathfind toward player when in detection range
- [ ] **MOBS-03**: Mobs deal contact damage to player
- [ ] **MOBS-04**: Player can kill mobs by placing blocks on them
- [ ] **MOBS-05**: Mob spawn count scales with difficulty

## v2 Requirements

### Crafting

- **CRAFT-01**: Player can access crafting grid (2x2 or 3x3)
- **CRAFT-02**: Basic tool recipes work (pickaxe, axe, sword)
- **CRAFT-03**: Material tiers affect tool effectiveness

### Equipment

- **EQUIP-01**: Armor slots (helmet, chest, legs, boots)
- **EQUIP-02**: Armor reduces incoming damage

### Cooking

- **COOK-01**: Furnace block for cooking food
- **COOK-02**: Cooked food provides better saturation than raw

### Weather

- **WEATH-01**: Rain weather effect
- **WEATH-02**: Rain affects visibility and ambient sound

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiplayer | Future work, requires server infrastructure |
| Procedural caves | High complexity, defer after core loop validated |
| Ore generation | Defer to v1.x, requires cave system first |
| Custom textures | UI/UX polish, not core to survival loop |
| Mobile touch controls | Desktop-first, mobile later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERS-01 | Phase 1 | Pending |
| PERS-02 | Phase 1 | Pending |
| PERS-03 | Phase 1 | Pending |
| PERS-04 | Phase 1 | Pending |
| PERS-05 | Phase 1 | Pending |
| PLAY-01 | Phase 2 | Pending |
| PLAY-02 | Phase 2 | Pending |
| PLAY-03 | Phase 2 | Pending |
| PLAY-04 | Phase 2 | Pending |
| PLAY-05 | Phase 2 | Pending |
| HUNG-01 | Phase 2 | Pending |
| HUNG-02 | Phase 2 | Pending |
| HUNG-03 | Phase 2 | Pending |
| HUNG-04 | Phase 2 | Pending |
| HUNG-05 | Phase 2 | Pending |
| INV-01 | Phase 3 | Pending |
| INV-02 | Phase 3 | Pending |
| INV-03 | Phase 3 | Pending |
| INV-04 | Phase 3 | Pending |
| INV-05 | Phase 3 | Pending |
| INV-06 | Phase 3 | Pending |
| DAY-01 | Phase 4 | Pending |
| DAY-02 | Phase 4 | Pending |
| DAY-03 | Phase 4 | Pending |
| DAY-04 | Phase 4 | Pending |
| DAY-05 | Phase 4 | Pending |
| DAY-06 | Phase 4 | Pending |
| MOBS-01 | Phase 5 | Pending |
| MOBS-02 | Phase 5 | Pending |
| MOBS-03 | Phase 5 | Pending |
| MOBS-04 | Phase 5 | Pending |
| MOBS-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
