# Phase 2: Worker System - Research

**Researched:** 2026-03-27
**Domain:** Web Worker thread management, chunk mesh generation, race condition handling
**Confidence:** HIGH

## Summary

This phase addresses worker termination race conditions and chunk mesh synchronization issues in a vanilla JavaScript + WebGL2 voxel engine. The codebase uses a custom WorkerPool to manage chunk generation workers that run asynchronously.

**Primary recommendation:** Implement a job completion tracking system in WorkerPool that ensures in-progress jobs either complete before worker termination OR are re-queued. For mesh synchronization, add atomic chunk state flags to prevent concurrent main-thread and worker-thread mesh updates.

## Architecture Patterns

### Current Implementation

```
workerPool.js:
- Maintains pool of workers (default: hardwareConcurrency)
- Priority queue for tasks
- AbortController for request cancellation
- recreateWorker() on error - terminates and recreates worker

chunkWorker.js:
- Runs as ES module worker
- Generates voxels + mesh data via greedy meshing
- Posts message back with chunkData

world.js:
- Uses WorkerPool for async chunk generation
- Handles chunk loading/unloading
- Hot chunk retention (30s or 10 accesses)
```

### Pattern: Graceful Worker Shutdown

When terminating workers (for recreation or pool shutdown), track in-flight jobs:

```javascript
class WorkerPool {
  // Add to constructor
  this.terminatingWorkers = new Map(); // workerIndex -> { jobs: Set, promise }

  async terminateWorker(workerIndex, graceful = true) {
    const entry = this.workers[workerIndex];
    if (!entry) return false;

    if (graceful && entry.busy) {
      // Wait for current job to complete before terminating
      const completionPromise = new Promise((resolve) => {
        entry._pendingCompletion = resolve;
      });
      // Don't post new work to this worker
      // When job completes, _pendingCompletion will be called
      return completionPromise;
    }
    // Force terminate - job is lost, clean up callbacks
    entry.worker.terminate();
    this.cleanupWorkerJobs(workerIndex);
  }

  handleWorkerResponse(worker, event) {
    // Before marking worker as free, check if we're waiting for graceful shutdown
    if (workerEntry._pendingCompletion) {
      workerEntry._pendingCompletion();
      workerEntry._pendingCompletion = null;
    }
    // ... rest of existing logic
  }
}
```

### Pattern: Mesh Update Synchronization

Use chunk-level state flags to prevent concurrent mesh updates:

```javascript
// In chunk.js - add state machine
this.meshState = 'idle'; // 'idle' | 'generating' | 'ready' | 'error'

// In world.js - worker completion handler
if (chunkData && chunkData.meshData) {
  // Only apply worker mesh if chunk isn't being edited on main thread
  if (this.chunks[key].meshState === 'idle') {
    this.chunks[key].fromWorkerMesh(chunkData.meshData);
    this.chunks[key].meshState = 'ready';
  }
  // If meshState !== 'idle', main thread is editing - will regenerate
}

// In BlockEditor.js - block change
chunk.setVoxel(...);
chunk.meshState = 'generating'; // Lock against worker updates
chunk.meshData = chunk.generateMeshData();
this.syncChunkToWebGL(chunk);
chunk.meshState = 'ready';
```

### Anti-Patterns to Avoid

- **Terminating busy worker without cleanup:** Current `recreateWorker()` can lose in-flight jobs without cleaning up `pendingCallbacks` and `activeRequests`
- **Double mesh generation:** Both main thread (`BlockEditor.generateMeshData()`) and worker can generate mesh for same chunk, causing sync issues
- **Ignoring stale job responses:** Worker responses can arrive after chunk is unloaded, currently partially handled but callback still fires

## Common Pitfalls

### Pitfall 1: Lost Callbacks on Worker Recreation
**What goes wrong:** Worker crashes while job in progress. `recreateWorker()` creates new worker but:
- Old job's callback ID is orphaned
- `pendingCallbacks.get(callbackId)` returns nothing
- Callback never fires, chunk appears to never load
**Why it happens:** No mapping between worker task and callback before posting to worker
**How to avoid:** Store callbackId in activeRequests BEFORE posting, or track job-to-callbackId mapping separately
**Warning signs:** Chunks fail to load after worker error, console shows "Worker X error"

### Pitfall 2: Race Condition on Block Edit During Worker Generation
**What goes wrong:** 
1. Worker starts generating chunk mesh
2. User places block, main thread generates new mesh
3. Worker completes, overwrites main thread mesh
4. Block change appears to not work
**Why it happens:** No synchronization between worker response and main thread edits
**How to avoid:** Chunk state flag (`meshState`) that blocks worker mesh application during/after main-thread edits

### Pitfall 3: Orphaned WebGL Resources
**What goes wrong:** Chunk unloads while worker is generating, but worker response creates new WebGL buffers for deleted chunk
**Why it happens:** `handleWorkerResponse` doesn't check if chunk still exists before creating WebGL resources
**How to avoid:** Always check `this.chunks[key]` exists before applying worker result (already partially done in world.js:53-56)

## Code Examples

### Testable Worker Pool with Job Tracking

```javascript
// Add to workerPool.js for testing
export class WorkerPool {
  // For testing - track jobs in flight
  getInFlightJobs() {
    const jobs = [];
    for (const [id, req] of this.activeRequests) {
      jobs.push({ id, message: req.message });
    }
    return jobs;
  }

  // For testing - check if worker is busy
  isWorkerBusy(workerIndex) {
    return this.workers[workerIndex]?.busy ?? false;
  }
}
```

### Mock Worker for Tests

```javascript
// tests/mocks/mockChunkWorker.js
export function createMockWorker() {
  let messageHandler = null;
  const worker = {
    onmessage: null,
    postMessage(data) {
      if (messageHandler) {
        setTimeout(() => {
          messageHandler({ data: { type: 'chunkGenerated', chunkData: {...}, callbackId: data.callbackId }});
        }, 10);
      }
    },
    terminate() {},
    onerror: null
  };
  Object.defineProperty(worker, 'onmessage', {
    set(fn) { messageHandler = fn; },
    get() { return messageHandler; }
  });
  return worker;
}
```

## Open Questions

1. **Should worker recreation wait for job completion?**
   - Current: Immediate recreation loses in-flight job
   - Option A: Wait for job (blocks other recreations)
   - Option B: Re-queue job to different worker
   - Recommendation: Option B - re-queue to available worker

2. **How to handle mesh updates within 1 frame?**
   - BlockEditor currently regenerates mesh synchronously
   - Could offload to worker but that adds latency
   - Current sync approach works if we add state flags
   - Recommendation: Keep main-thread generation for block edits, add state flag to prevent worker race

3. **Test isolation for workers?**
   - Workers are hard to test in Node.js environment
   - Need worker mock or browser test runner
   - Recommendation: Use Vitest with happy-dom for component tests, manual browser test for worker behavior

## Validation Architecture

> Skipped - workflow.nyquist_validation is false in .planning/config.json

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: workerPool.js, chunkWorker.js, world.js, BlockEditor.js
- MDN Web Docs: Web Workers API, AbortController
- WHATWG: Web Workers specification for message handling

### Secondary (MEDIUM confidence)
- Various Stack Overflow patterns for worker pool management
- Common patterns for graceful worker shutdown in game engines

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vanilla JS Web Workers, well understood
- Architecture: HIGH - Current codebase patterns are clear
- Pitfalls: HIGH - Issues identified from code analysis

**Research date:** 2026-03-27
**Valid until:** 2026-04-24 (30 days for stable domain)
