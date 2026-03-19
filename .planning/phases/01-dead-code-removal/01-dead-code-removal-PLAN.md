---
phase: 01-dead-code-removal
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/chunk.js
  - voxx-js/src/gl/test-render.js
  - voxx-js/world.js
  - voxx-js/src/main.js
autonomous: true
requirements:
  - CLEAN-01
  - CLEAN-02
  - CLEAN-03
  - CLEAN-04

must_haves:
  truths:
    - "voxx-js/chunk.js contains no Three.js references"
    - "voxx-js/src/gl/test-render.js is either removed or has documented purpose"
    - "voxx-js/world.js does not contain unused generateChunk() method"
    - "All console.log calls are guarded by debug flag check"
  artifacts:
    - path: "voxx-js/chunk.js"
      contains: "no Three.js imports or references"
    - path: "voxx-js/src/gl/test-render.js"
      contains: "either removed OR contains JSDoc explaining purpose"
    - path: "voxx-js/world.js"
      contains: "no generateChunk method"
    - path: "voxx-js/config.js"
      contains: "DEBUG flag definition"
  key_links:
    - from: "voxx-js/src/main.js"
      to: "voxx-js/config.js"
      via: "DEBUG flag import for logging"
---

<objective>
Remove dead code and unused artifacts from the codebase. All changes must be verified not to break existing functionality.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/ARCHITECTURE.md

**Phase 1 Requirements (CLEAN-01 through CLEAN-04):**
1. Remove Three.js references from chunk.js
2. Remove or document src/gl/test-render.js
3. Remove unused generateChunk() from world.js
4. Guard all console.log with debug flag
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Three.js references from chunk.js</name>
  <files>voxx-js/chunk.js</files>
  <action>
    1. Read voxx-js/chunk.js to find all Three.js references (imports, comments, dead properties)
    2. Remove any THREE import statements
    3. Remove any comments referencing "THREE" or "Three.js"
    4. Remove unused properties: `this.mesh`, `this.geometry`, `this.material` (lines 23-26)
    5. Verify no other Three.js references remain in the file
  </action>
  <verify>grep -n "THREE\|Three\.js\|three" voxx-js/chunk.js returns no matches</verify>
  <done>voxx-js/chunk.js contains no Three.js references</done>
</task>

<task type="auto">
  <name>Task 2: Handle test-render.js</name>
  <files>voxx-js/src/gl/test-render.js</files>
  <action>
    1. Read voxx-js/src/gl/test-render.js to understand its purpose
    2. Check if it's imported anywhere: grep -r "test-render" voxx-js/
    3. If NOT imported anywhere: Delete the file
    4. If imported: Add JSDoc comment explaining its purpose and mark as "dev/debug tool"
  </action>
  <verify>
    grep -r "test-render" voxx-js/ shows either:
    - File deleted (no matches)
    - File exists with documented purpose and is intentionally imported
  </verify>
  <done>voxx-js/src/gl/test-render.js is either removed or has documented purpose</done>
</task>

<task type="auto">
  <name>Task 3: Remove unused generateChunk method</name>
  <files>voxx-js/world.js</files>
  <action>
    1. Read voxx-js/world.js to find the generateChunk method
    2. Verify it's not called anywhere: grep -r "generateChunk" voxx-js/
    3. Remove the entire generateChunk method from World class
    4. Verify no references remain
  </action>
  <verify>
    grep -n "generateChunk" voxx-js/world.js returns no method definition
    grep -r "generateChunk" voxx-js/ returns no function calls
  </verify>
  <done>voxx-js/world.js does not contain unused generateChunk() method</done>
</task>

<task type="auto">
  <name>Task 4: Add debug flag and guard console.log</name>
  <files>
    - voxx-js/config.js
    - voxx-js/src/main.js
    - voxx-js/world.js
    - voxx-js/chunk.js
    - voxx-js/chunkWorker.js
  </files>
  <action>
    1. Read voxx-js/config.js to find where to add DEBUG flag
    2. Add: export const DEBUG = true; (can be toggled for production)
    3. For each file with console.log (identified in CONCERNS.md):
       - voxx-js/src/main.js: Wrap console.log with if (DEBUG) check
       - voxx-js/world.js: Wrap console.log with if (DEBUG) check
       - voxx-js/chunk.js: Wrap console.log with if (DEBUG) check
       - voxx-js/chunkWorker.js: Wrap console.log with if (DEBUG) check
       - voxx-js/render.js: Wrap console.log with if (DEBUG) check
    4. Keep at least one console.log UNGUARDED on startup to confirm app is running
    5. For worker files, import DEBUG from config or use self.importScripts pattern
  </action>
  <verify>
    grep -n "console\.log" voxx-js/*.js voxx-js/src/*.js | grep -v "if (DEBUG)" | grep -v "DEBUG === false"
    Should show minimal or no unguarded console.log statements (except startup)
  </verify>
  <done>All console.log calls are guarded by debug flag check</done>
</task>

</tasks>

<verification>
1. Load voxx-js/index.html in browser
2. Verify terrain generates correctly (chunks visible)
3. Verify block placement/destruction still works
4. Verify no console errors on load
</verification>

<success_criteria>
- [ ] CLEAN-01: No Three.js references in chunk.js
- [ ] CLEAN-02: test-render.js handled (removed or documented)
- [ ] CLEAN-03: generateChunk() removed from world.js
- [ ] CLEAN-04: All console.log guarded by DEBUG flag
</success_criteria>

<output>
After completion, create `.planning/phases/01-dead-code-removal/01-dead-code-removal-SUMMARY.md`
</output>
