# Phase 1: UI Fixes - Research

**Researched:** 2026-03-19
**Domain:** WebGL voxel game UI implementation (compass and clock)
**Confidence:** HIGH

## Summary

This phase implements functional compass and clock UI elements by connecting existing HTML elements to game data sources. The project already has UI elements in the DOM and a working time display - the task is to wire them up properly.

**Primary recommendation:** Connect existing compass DOM elements to `cameraRotation.y` (yaw) and enhance time display to show day/night cycle phases (Dawn/Day/Dusk/Night) with a visual progress indicator.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Reuse existing compass UI already in the HTML — don't create new UI elements
- Reuse existing clock UI already in the HTML — don't create new UI elements
- Display cardinal directions (N, S, E, W) based on camera yaw
- Show player facing direction indicator (e.g., "NW", "SE") updating in real-time
- Use existing compass needle element if present
- Display day/night cycle progress (e.g., "Dawn", "Day", "Dusk", "Night")
- Link to game's existing time system

### Claude's Discretion
- Exact animation style for compass needle movement
- How to handle edge cases (exactly at N/S/E/W boundary)
- Exact format of direction text display
- Clock position and styling tweaks

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Compass displays cardinal directions (N, S, E, W) and player facing direction | Camera yaw data available in `cameraRotation.y`, existing DOM structure ready |
| UI-02 | Clock displays day/night cycle progress with visual indicator | Sun cycle time already tracked in `sunCycleTime`, time display exists but needs phase labels and visual indicator |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES6+ | UI updates | No framework needed for simple DOM manipulation |
| CSS Transforms | N/A | Compass needle rotation | Native CSS `transform: rotate()` for smooth animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing render loop | N/A | Real-time UI updates | Already calls every frame |

**Installation:**
No new packages required - all functionality uses existing codebase.

---

## Architecture Patterns

### Recommended Project Structure
No changes needed - modifications go to existing files:
- `voxx-js/src/main.js` — add compass update logic, enhance time display
- `voxx-js/style.css` — optional tweaks if needed

### Pattern 1: DOM Element Update in Render Loop
**What:** Update UI elements during the existing `render()` function
**When to use:** For real-time UI that needs to sync with each frame
**Example:**
```javascript
// In render() function - already called every frame
const compassText = document.querySelector('.compass-text');
if (compassText) {
  // Calculate direction from cameraRotation.y (yaw)
  const yaw = cameraRotation.y;
  // Convert to degrees and normalize 0-360
  let degrees = (yaw * 180 / Math.PI) % 360;
  if (degrees < 0) degrees += 360;
  compassText.textContent = getCardinalDirection(degrees);
}
```

### Pattern 2: Yaw to Cardinal Direction Conversion
**What:** Convert camera yaw angle to human-readable direction
**When to use:** For compass display
**Logic:**
```
N: 337.5° - 22.5° (or 0° ± 22.5°)
NE: 22.5° - 67.5°
E: 67.5° - 112.5°
SE: 112.5° - 157.5°
S: 157.5° - 202.5°
SW: 202.5° - 247.5°
W: 247.5° - 292.5°
NW: 292.5° - 337.5°
```

### Pattern 3: Sun Cycle to Day Phase
**What:** Map time of day (0-24) to day phase
**When to use:** For clock display showing Dawn/Day/Dusk/Night
**Logic:**
```
Dawn: 5:00 - 7:00
Day: 7:00 - 17:00
Dusk: 17:00 - 19:00
Night: 19:00 - 5:00
```

### Anti-Patterns to Avoid
- **Creating new DOM elements:** CONTEXT.md explicitly says reuse existing elements
- **Overwriting time-display entirely:** The existing `#time-display` should be enhanced, not replaced

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Direction text | Custom direction names | Cardinal/intercardinal constants | Simple lookup table sufficient |
| Angle normalization | Complex modulo handling | Simple degrees normalization | Just need 0-360 range |
| Day phase logic | Hardcoded if-else chain | Simple range checks | Only 4 phases |

**Key insight:** This is simple UI wiring, not a complex algorithm. No external libraries needed.

---

## Common Pitfalls

### Pitfall 1: Yaw Not Normalized
**What goes wrong:** Compass jumps or shows wrong direction when yaw exceeds 360° or goes negative
**Why it happens:** `cameraRotation.y` accumulates and can be any value (e.g., -3.14 to +infinity)
**How to avoid:** Normalize to 0-360 degrees: `((degrees % 360) + 360) % 360`
**Warning signs:** Direction suddenly flips or shows unexpected values

### Pitfall 2: Needle Rotates Wrong Direction
**What goes wrong:** Compass needle points opposite to player facing
**Why it happens:** CSS rotation direction vs. camera rotation direction mismatch
**How to avoid:** Test: facing North should show N, facing East should show E. May need to negate rotation angle.
**Warning signs:** Rotating right shows compass going left

### Pitfall 3: Time Display Conflicts with Existing Code
**What goes wrong:** Overwrite breaks existing time functionality
**Why it happens:** The existing `timeEl.textContent = ...` line in render() gets replaced
**How to avoid:** Extend existing time display rather than replacing. Keep the "Day/Night: HH:MM" format and add phase indicator.

### Pitfall 4: Boundary Conditions
**What goes wrong:** Exactly at N/E/S/W boundary shows wrong direction
**Why it happens:** Floating point precision at boundaries
**How to avoid:** Use inclusive/exclusive ranges properly in direction lookup. Prefer "round to nearest" approach.

---

## Code Examples

### Compass Needle Rotation (CSS + JS)
```javascript
// Update compass needle rotation
const compassNeedle = document.querySelector('.compass-needle');
if (compassNeedle) {
  // Camera rotation is inverted for compass (looking N = needle points N)
  const rotation = -(cameraRotation.y * 180 / Math.PI);
  compassNeedle.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
}
```

### Direction Text Update
```javascript
function getCardinalDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;
  // Each direction spans 45 degrees, offset by 22.5 to center
  const index = Math.round((normalized + 22.5) / 45) % 8;
  return directions[index];
}
```

### Day Phase Detection
```javascript
function getDayPhase(hours) {
  if (hours >= 5 && hours < 7) return 'Dawn';
  if (hours >= 7 && hours < 17) return 'Day';
  if (hours >= 17 && hours < 19) return 'Dusk';
  return 'Night';
}
```

### Enhanced Time Display (Keep existing + add phase)
```javascript
// In render loop, replace existing time display update:
const timeEl = document.getElementById('time-display');
if (timeEl) {
  const phase = getDayPhase(hours);
  // Keep existing format, add phase: "Day: 12:30 (Day)"
  timeEl.textContent = `${isDaytime ? 'Day' : 'Night'}: ${timeString} (${phase})`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No compass | Wire up existing compass DOM | Current phase | UI-01 |
| Basic time display | Add day phase + visual indicator | Current phase | UI-02 |

**Already implemented (not in scope):**
- Time display showing "Day: HH:MM" / "Night: HH:MM" — working in main.js lines 790-791

---

## Open Questions

1. **Should compass needle animate smoothly or snap?**
   - CSS `transition` could smooth the movement
   - CONTEXT.md says Claude's discretion
   - Recommendation: Use CSS transition for smoother feel (0.1s transition)

2. **Should the time display keep the "Day/Night" label when adding phases?**
   - Current: "Day: 12:30"
   - Proposed: "Day: 12:30 (Dusk)"
   - Or: Just show phase without day/night prefix
   - Recommendation: Keep both for consistency and add phase in parentheses

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated tests exist) |
| Config file | none |
| Quick run command | Open index.html in browser |
| Full suite command | N/A - manual verification |
| Estimated runtime | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Compass shows N/S/E/W based on camera | Manual | Rotate camera and verify compass shows correct direction | ✅ main.js needs update |
| UI-01 | Compass needle rotates correctly | Manual | Rotate camera and verify needle rotation matches | ✅ main.js needs update |
| UI-02 | Clock shows Dawn/Day/Dusk/Night | Manual | Wait for time to progress through phases | ✅ main.js needs update |
| UI-02 | Time display updates in real-time | Manual | Watch time advance | ✅ already works |

### Nyquist Sampling Rate
- **Minimum sample interval:** Not applicable (manual testing only)
- **Full suite trigger:** Not applicable
- **Phase-complete gate:** Manual verification by user
- **Estimated feedback latency per task:** N/A

### Wave 0 Gaps (must be created before implementation)
- None — existing test infrastructure not required for this UI phase
- Manual browser testing is the verification method

---

## Sources

### Primary (HIGH confidence)
- `voxx-js/src/main.js` - Existing camera rotation (`cameraRotation.y`) and sun cycle (`sunCycleTime`)
- `voxx-js/index.html` - Existing compass and time-display DOM elements
- `voxx-js/style.css` - Existing compass CSS styling
- `voxx-js/config.js` - `SUN_CYCLE_CONFIG` time settings

### Secondary (MEDIUM confidence)
- WebSearch failed - using standard game UI patterns from experience
- Standard cardinal direction calculation (22.5° segments)

### Tertiary (LOW confidence)
- None needed - straightforward DOM manipulation

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - Vanilla JS/CSS, existing render loop
- Architecture: HIGH - Simple DOM wiring in existing render function
- Pitfalls: HIGH - Known yaw normalization issues, clear solutions

**Research date:** 2026-03-19
**Valid until:** 90 days (UI implementation is stable, no fast-changing dependencies)
