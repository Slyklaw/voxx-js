# Requirements: Voxx-JS Block Editing

**Defined:** 2026-03-18
**Core Value:** Players can explore and build in a procedurally generated 3D voxel world directly in their browser.

## v1 Requirements

Requirements for v1.1 Block Editing milestone.

### Block Operations

- [x] **EDIT-01**: User can left-click to remove the targeted block
- [ ] **EDIT-02**: User can right-click to place a block on adjacent face
- [x] **EDIT-03**: Block outline highlights targeted block for editing

### Block Inventory

- [x] **INV-01**: Pressing 1-9 selects block type, UI shows current selection

### Chunk Updates

- [x] **CHUNK-01**: Breaking/placing updates chunk mesh visually

### Persistence

- [x] **PERSIST-01**: Block edits persist until reload (no save system)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **PERSIST-02**: World state saves to localStorage
- **PERSIST-03**: World state loads on startup
- **EDIT-04**: Multiplayer block sync
- **INV-02**: Creative mode block palette (all block types)
- **INV-03**: Survival mode inventory with stacking

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Block physics (falling sand) | Complex physics system, defer to v2 |
| Redstone/logic | Requires circuit simulation, defer to v2 |
| Block damage/health | Simple instant break sufficient for v1.1 |
| Undo/redo | Requires command pattern, defer to v2 |
| World save to disk | Requires serialization, defer to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 6: Block Targeting & Interaction | Complete |
| EDIT-02 | Phase 6: Block Targeting & Interaction | Pending |
| EDIT-03 | Phase 6: Block Targeting & Interaction | Complete |
| INV-01 | Phase 7: Block Inventory | Complete |
| CHUNK-01 | Phase 8: Chunk Updates & Persistence | Complete |
| PERSIST-01 | Phase 8: Chunk Updates & Persistence | Complete |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6 ✓
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
