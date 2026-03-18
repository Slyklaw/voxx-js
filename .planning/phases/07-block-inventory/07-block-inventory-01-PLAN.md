---
phase: 07-block-inventory
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/main.js
  - voxx-js/index.html
  - voxx-js/style.css
autonomous: true
requirements:
  - INV-01

must_haves:
  truths:
    - "Pressing keys 1-5 selects the corresponding block type (Stone, Dirt, Grass, Water, Snow)"
    - "The selected block is visually highlighted in the UI"
    - "Pressing keys 6-9 does nothing (no blocks assigned)"
    - "Right-clicking places the currently selected block type"
  artifacts:
    - path: voxx-js/main.js
      provides: "Keyboard event handlers for block selection"
      contains: "keydown handler for Digit1-Digit9"
    - path: voxx-js/index.html
      provides: "Block selector UI with key indicators"
      contains: "block-item elements with key badges"
  key_links:
    - from: voxx-js/main.js
      to: "DOM elements with data-block attribute"
      via: "querySelector for block-item selection"
      pattern: "querySelectorAll.*block-item"
    - from: voxx-js/main.js
      to: "selectedBlockType variable"
      via: "update on key press"
      pattern: "selectedBlockType.*=.*parseInt"
---

<objective>
Add keyboard selection (1-9) for block types with visual feedback in UI.

Purpose: Players can quickly switch block types without mouse interaction.
Output: Working keyboard-driven block inventory selection.
</objective>

<execution_context>
@/home/box/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/box/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

Existing code:
- main.js:25 - selectedBlockType variable exists
- main.js:115-128 - keydown/keyup handlers exist (F1 toggle)
- main.js:171-194 - mouse wheel block selection exists
- index.html:76-97 - block-selector UI with 5 blocks
- blocks.js:1-9 - BLOCK_TYPES defined (AIR=0, STONE=1, DIRT=2, GRASS=3, WATER=4, SNOW=5)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add keyboard handlers for keys 1-9</name>
  <files>voxx-js/main.js</files>
  <action>
Add keydown handler in setupControls() to detect Digit1-Digit9 keys and update selectedBlockType.

1. In the existing keydown handler (around line 115), add case for digit keys:
   - Digit1 through Digit5: Set selectedBlockType to corresponding BLOCK_TYPES value
   - Digit6-Digit9: No action (future block slots)
   - Only act when isPointerLocked is true (ignore when typing/chatting)

2. After updating selectedBlockType, call a new updateBlockSelectionUI() function

3. The mapping:
   - Digit1 → BLOCK_TYPES.STONE (1)
   - Digit2 → BLOCK_TYPES.DIRT (2)
   - Digit3 → BLOCK_TYPES.GRASS (3)
   - Digit4 → BLOCK_TYPES.WATER (4)
   - Digit5 → BLOCK_TYPES.SNOW (5)

Reference existing mouse wheel code at lines 171-194 for selection pattern.
  </action>
  <verify>Press keys 1-5 in browser, verify selectedBlockType updates via console.log</verify>
  <done>Keys 1-5 update selectedBlockType variable, keys 6-9 do nothing</done>
</task>

<task type="auto">
  <name>Task 2: Update UI to show selection state and key indicators</name>
  <files>voxx-js/index.html, voxx-js/style.css</files>
  <action>
Update the block-selector UI to show:
1. Key number badge on each block item (showing 1-5)
2. Clear visual highlight for currently selected block

In index.html:
- Add a key badge span inside each .block-item element
- Example: <span class="key-badge">1</span>

In style.css:
- Add .key-badge styling (small number overlay on block icon)
- Enhance .block-item.selected styling for clear visual feedback
- The existing .selected class on block-item already exists in setupUI() code

Reference existing setupUI() function at lines 214-226 which already handles .selected class.
  </action>
  <verify>Open index.html in browser, verify key numbers visible on block items</verify>
  <done>Block items show key numbers 1-5, selected block has clear visual highlight</done>
</task>

</tasks>

<verification>
1. Open the voxel engine in browser
2. Click to lock pointer
3. Press keys 1-5 and observe:
   - Block selector UI updates to highlight the selected block
   - Right-click places the correct block type
4. Press keys 6-9 - nothing should change
</verification>

<success_criteria>
- Keys 1-5 select Stone, Dirt, Grass, Water, Snow respectively
- Visual highlight shows which block is currently selected
- Key numbers visible on each block item in UI
- Right-click places the selected block type
</success_criteria>

<output>
After completion, create `.planning/phases/07-block-inventory/07-block-inventory-01-SUMMARY.md`
</output>
