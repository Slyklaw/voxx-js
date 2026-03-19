---
phase: 03-bug-fixes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/src/main.js
  - voxx-js/src/gl/context.js
  - voxx-js/index.html
autonomous: true
requirements:
  - BUG-01
  - BUG-02
  - BUG-03
  - BUG-04

must_haves:
  truths:
    - "Mousewheel block selection allows selecting blocks 1-9"
    - "Render distance UI buttons change visible chunk count"
    - "WebGL context loss triggers recovery sequence"
    - "Block selector UI visually reflects current selection"
  artifacts:
    - path: "voxx-js/src/main.js"
      contains: "blockCount = 9 or greater"
    - path: "voxx-js/src/main.js"
      contains: "renderDistance update"
    - path: "voxx-js/src/gl/context.js"
      contains: "initWebGLResources implementation"
    - path: "voxx-js/index.html"
      contains: "selection highlight update"
---

<objective>
Fix 4 known bugs identified in codebase audit. All fixes must preserve existing functionality.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONCERNS.md

**Bug details from CONCERNS.md:**

1. **BUG-01: Block Selection Mismatch**
   - File: `voxx-js/src/main.js` (line 210)
   - Issue: `blockCount = 5` limits mousewheel selection
   - Fix: Change to 9 or count actual blocks from BLOCK_TYPES

2. **BUG-02: Render Distance UI Not Functional**
   - File: `voxx-js/src/main.js` (lines 245-253, 743-744)
   - Issue: UI updates DOM but doesn't affect chunk loading
   - Fix: Connect UI buttons to `world.update()` renderDistance parameter

3. **BUG-03: Context Loss Handler Incomplete**
   - File: `voxx-js/src/gl/context.js` (lines 41-44)
   - Issue: `initWebGLResources()` is empty stub
   - Fix: Implement resource reinitialization on context restore

4. **BUG-04: Block Selector UI Stale**
   - File: `voxx-js/index.html` (lines 88-113), `voxx-js/src/main.js` (lines 24-29)
   - Issue: Block selector doesn't update visual state with scroll
   - Fix: Update data-block attributes when selection changes
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix block selection count</name>
  <files>voxx-js/src/main.js</files>
  <action>
    1. Read voxx-js/src/main.js around line 210
    2. Find: const blockCount = 5
    3. Change to count from BLOCK_TYPES or set to 9
    4. Verify keys 1-9 all work for selection
    5. Check that selectedBlockIndex stays within bounds
  </action>
  <verify>
    grep -n "blockCount" voxx-js/src/main.js
    Should show count >= 9
  </verify>
  <done>Mousewheel block selection allows selecting blocks 1-9</done>
</task>

<task type="auto">
  <name>Task 2: Connect render distance UI to world</name>
  <files>voxx-js/src/main.js</files>
  <action>
    1. Read voxx-js/src/main.js around lines 245-253 (UI buttons)
    2. Find the click handlers for render distance buttons
    3. Find where renderDistance variable is stored
    4. Update world.update() call to use renderDistance variable
    5. Test: clicking +/- buttons should change visible chunk count
  </action>
  <verify>
    grep -n "renderDistance" voxx-js/src/main.js
    Should show renderDistance used in world.update() call
  </verify>
  <done>Render distance UI buttons change visible chunk count</done>
</task>

<task type="auto">
  <name>Task 3: Implement WebGL context loss handler</name>
  <files>voxx-js/src/gl/context.js</files>
  <action>
    1. Read voxx-js/src/gl/context.js
    2. Find handleContextLost() and initWebGLResources()
    3. Implement initWebGLResources() to:
       - Recreate shader programs
       - Recreate VAOs/VBOs
       - Reload textures
       - Store function references for reinit
    4. Add resource disposal to handleContextLost()
    5. Export init function that can be called on context restore
  </action>
  <verify>
    grep -n "initWebGLResources" voxx-js/src/gl/context.js
    Should show non-empty implementation
  </verify>
  <done>WebGL context loss triggers recovery sequence</done>
</task>

<task type="auto">
  <name>Task 4: Update block selector UI on selection change</name>
  <files>
    - voxx-js/index.html
    - voxx-js/src/main.js
  </files>
  <action>
    1. Read voxx-js/index.html lines 88-113 to find block selector elements
    2. Read voxx-js/src/main.js to find where selectedBlockIndex changes
    3. Add function to update UI selection highlight:
       - Remove 'selected' class from all block elements
       - Add 'selected' class to current block
    4. Call update function when:
       - Number keys pressed
       - Mousewheel changes selection
       - PlaceBlock/destroyBlock called
    5. Add CSS for selected state if not present
  </action>
  <verify>
    Load page, use scroll to change block, verify visual highlight updates
  </verify>
  <done>Block selector UI visually reflects current selection</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 5: Verify all bug fixes</name>
  <files></files>
  <action>
    1. Test block selection with mousewheel - should scroll through all 9 blocks
    2. Click render distance +/- buttons - visible chunks should change
    3. Verify block selector shows which block is selected
    4. (Context loss is hard to test manually - verify code structure)
  </action>
  <verify>
    Manual verification of all 4 bug fixes
  </verify>
  <done>All 4 bugs fixed and verified</done>
</task>

</tasks>

<verification>
1. grep for blockCount - should be >= 9
2. grep for renderDistance.*world.update - should find usage
3. grep for initWebGLResources - should show non-empty function
4. Load page, test block selection UI updates
</verification>

<success_criteria>
- [ ] BUG-01: Mousewheel selects blocks 1-9
- [ ] BUG-02: Render distance buttons change chunk count
- [ ] BUG-03: Context loss handler implemented
- [ ] BUG-04: Block selector shows selection state
</success_criteria>

<output>
After completion, create `.planning/phases/03-bug-fixes/03-bug-fixes-SUMMARY.md`
</output>
