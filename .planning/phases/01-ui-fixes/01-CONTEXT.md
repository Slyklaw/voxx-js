# Phase 1: UI Fixes - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Make compass and clock UI elements functional, providing real-time feedback to the player. Reuse existing UI elements in the DOM — don't create new ones. This involves hooking up data sources to the existing HTML elements.

</domain>

<decisions>
## Implementation Decisions

### UI Approach
- Reuse existing compass UI already in the HTML — don't create new UI elements
- Reuse existing clock UI already in the HTML — don't create new UI elements

### Compass Behavior
- Display cardinal directions (N, S, E, W) based on camera yaw
- Show player facing direction indicator (e.g., "NW", "SE") updating in real-time
- Use existing compass needle element if present

### Clock Behavior
- Display day/night cycle progress (e.g., "Dawn", "Day", "Dusk", "Night")
- Visual indicator of time progression
- Link to game's existing time system

### Data Sources
- Use camera/yaw data from existing camera module for compass
- Use game's existing time/lighting system for clock display
- Connect existing UI elements to these data sources

### Claude's Discretion
- Exact animation style for compass needle movement
- How to handle edge cases (exactly at N/S/E/W boundary)
- Exact format of direction text display
- Clock position and styling tweaks

</decisions>

<specifics>
## Specific Ideas

- Existing UI elements for compass and clock already exist in the HTML
- Connect data to existing DOM elements rather than creating new ones

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-ui-fixes*
*Context gathered: 2026-03-19*