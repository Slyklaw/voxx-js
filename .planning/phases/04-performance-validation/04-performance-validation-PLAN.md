---
phase: 04-performance-validation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/workerPool.js
  - voxx-js/blocks.js
  - voxx-js/src/main.js
  - voxx-js/config.js
autonomous: true
requirements:
  - PERF-01
  - PERF-02
  - PERF-03
  - VAL-01
  - VAL-02

must_haves:
  truths:
    - "Debug flag controls console.log output"
    - "Worker callback IDs use collision-safe generation"
    - "Invalid block types trigger debug assertions"
    - "Camera values are bounds-checked"
  artifacts:
    - path: "voxx-js/config.js"
      contains: "DEBUG flag"
    - path: "voxx-js/workerPool.js"
      contains: "callbackIdCounter incrementing"
    - path: "voxx-js/blocks.js"
      contains: "debug assertion for invalid block types"
    - path: "voxx-js/src/main.js"
      contains: "camera bounds checking"
---

<objective>
Add debug infrastructure and input validation for reliability and debugging.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

**Requirements:**
- PERF-01: DEBUG flag already exists in config.js, verify all console.log guarded
- PERF-02: Fix workerPool.js line 68 - replace Math.random() ID with incrementing counter
- PERF-03: Add debug assertions for block type bounds in blocks.js
- VAL-01: Add debug assertion for invalid block types
- VAL-02: Add camera position/rotation bounds checking in main.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify DEBUG flag and fix worker callback IDs</name>
  <files>
    - voxx-js/workerPool.js
    - voxx-js/config.js
  </files>
  <action>
    1. Read voxx-js/config.js - verify DEBUG flag exists
    2. Read voxx-js/workerPool.js line 68
    3. Replace callback ID generation:
       OLD: const callbackId = performance.now() + Math.random().toString(36).substring(2);
       NEW: 
         if (!this.callbackIdCounter) this.callbackIdCounter = 0;
         const callbackId = ++this.callbackIdCounter;
    4. Add counter initialization in constructor or initWorkers
    5. Verify DEBUG is imported where needed
  </action>
  <verify>
    grep -n "callbackIdCounter" voxx-js/workerPool.js
    Should show incrementing counter usage
  </verify>
  <done>Worker callback IDs use collision-safe incrementing counter</done>
</task>

<task type="auto">
  <name>Task 2: Add block type debug assertions</name>
  <files>voxx-js/blocks.js</files>
  <action>
    1. Read voxx-js/blocks.js to find getBlockColor and BLOCK_TYPES
    2. Add debug assertion function:
       function assertValidBlockType(blockType, operation) {
         if (DEBUG && (blockType < 0 || blockType >= BLOCK_TYPES_COUNT)) {
           console.error(`[Blocks] Invalid block type ${blockType} in ${operation}`);
         }
       }
    3. Add calls to assertValidBlockType in:
       - getBlockColor() - check blockType parameter
       - getBlockAtlasPositions() - if exists
    4. Export DEBUG from config if not already imported
  </action>
  <verify>
    grep -n "assertValidBlockType\|Invalid block" voxx-js/blocks.js
    Should show assertion function and usage
  </verify>
  <done>Invalid block types trigger debug assertions</done>
</task>

<task type="auto">
  <name>Task 3: Add camera bounds checking</name>
  <files>voxx-js/src/main.js</files>
  <action>
    1. Read voxx-js/src/main.js to find camera position/rotation variables
    2. Find updateMovement() function
    3. Add bounds checking for:
       - Camera X/Y/Z position: reasonable world limits (e.g., -10000 to 10000)
       - Camera rotation: pitch -89° to 89°, yaw 0° to 360°
    4. Clamp values if out of bounds:
       Math.max(MIN, Math.min(MAX, value))
    5. Add debug log when clamping occurs
  </action>
  <verify>
    grep -n "Math.max\|Math.min" voxx-js/src/main.js | grep -i "camera\|pitch\|yaw\|position"
    Should show bounds clamping for camera values
  </verify>
  <done>Camera position/rotation values are bounds-checked</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 4: Verify all improvements</name>
  <files></files>
  <action>
    1. Check that DEBUG flag works - toggle in config.js, verify console output changes
    2. Verify terrain still renders correctly
    3. Test block placement/destruction
  </action>
  <verify>
    Manual verification
  </verify>
  <done>All improvements verified working</done>
</task>

</tasks>

<verification>
1. grep for "callbackIdCounter" in workerPool.js - should exist
2. grep for "assertValidBlockType" in blocks.js - should exist
3. grep for camera bounds in main.js - should exist
</verification>

<success_criteria>
- [ ] PERF-01: DEBUG flag controls console.log output
- [ ] PERF-02: Callback IDs use incrementing counter
- [ ] PERF-03: Block type assertions in debug mode
- [ ] VAL-01: Invalid block type debug assertions
- [ ] VAL-02: Camera bounds checking
</success_criteria>

<output>
After completion, create `.planning/phases/04-performance-validation/04-performance-validation-SUMMARY.md`
</output>
