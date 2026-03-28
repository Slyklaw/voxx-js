---
phase: 02-worker-system
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - voxx-js/workerPool.js
autonomous: true
requirements:
  - WRK-01
must_haves:
  truths:
    - "Rapid chunk loading/unloading does not produce console errors"
    - "Worker termination waits for in-progress jobs to complete"
  artifacts:
    - path: "voxx-js/workerPool.js"
      provides: "Worker pool with graceful shutdown"
      contains: "gracefulShutdown"
  key_links:
    - from: "voxx-js/workerPool.js"
      to: "voxx-js/world.js"
      via: "pool.terminate()"
      pattern: "pool\\.terminate"
---

<objective>
Implement graceful worker termination that waits for in-progress jobs to complete, fixing errors during rapid chunk loading/unloading.
</objective>

<execution_context>
@/home/box/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/box/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-worker-system/02-RESEARCH.md
@voxx-js/workerPool.js
@voxx-js/world.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add graceful worker shutdown with job tracking</name>
  <files>voxx-js/workerPool.js</files>
  <action>
    Add graceful worker shutdown mechanism to WorkerPool:

    1. Add `this.terminatingWorkers = new Map()` to constructor to track workers being terminated

    2. Modify `recreateWorker(workerIndex, graceful = true)`:
       - If graceful=true and worker is busy, wait for current job to complete before terminating
       - Store callbackId -> workerIndex mapping in `this.activeRequests` for cleanup
       - Before terminating, call `this.cleanupWorkerJobs(workerIndex)` to remove orphaned callbacks

    3. Add `cleanupWorkerJobs(workerIndex)` method:
       - Find all activeRequests where the job was assigned to this workerIndex
       - Call their callbacks with null (indicating failure) if graceful=false
       - Remove from pendingCallbacks and activeRequests Maps

    4. Modify `handleWorkerResponse` to check for graceful shutdown completion:
       - If workerEntry._pendingCompletion exists, call it when job completes

    5. Update `terminate()` method to wait for all workers: use Promise.all with graceful shutdown
  </action>
  <verify>
    npm test -- --grep "worker" 2>/dev/null || echo "No tests found - manual verification needed"
  </verify>
  <done>
    WorkerPool.recreateWorker() waits for in-progress jobs before termination when graceful=true.
    Orphaned callbacks are cleaned up to prevent memory leaks.
  </done>
</task>

</tasks>

<verification>
- [ ] WorkerPool has graceful shutdown mechanism
- [ ] recreateWorker waits for busy workers when graceful=true
- [ ] Orphaned callbacks are cleaned up on worker recreation
- [ ] terminate() waits for all workers
</verification>

<success_criteria>
Worker termination waits for in-progress jobs to complete (criterion 3)
</success_criteria>

<output>
After completion, create .planning/phases/02-worker-system/02-01-SUMMARY.md
</output>
