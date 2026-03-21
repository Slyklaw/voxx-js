import { WORKER_CONFIG, DEBUG } from './config.js';

export class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.poolSize = poolSize;
    this.workerScript = workerScript;
    this.workers = [];
    this.taskQueue = []; // Priority queue: { message, callback, priority, callbackId }
    this.pendingCallbacks = new Map();
    this.activeRequests = new Map(); // callbackId -> { abortController, message, priority }
    this.callbackIdCounter = 0;
    this.initWorkers();
    
    // Staged dispatch settings - use WORKER_CONFIG constants
    this.maxDispatchesPerFrame = WORKER_CONFIG.MAX_DISPATCHES_PER_FRAME;
    this.dispatchBudgetMs = WORKER_CONFIG.DISPATCH_BUDGET_MS;
    this.dispatchQueue = []; // Results waiting to be dispatched to main thread
    this.lastDispatchTime = 0;
    this.frameTimeThreshold = WORKER_CONFIG.FRAME_TIME_THRESHOLD_MS; // ~60fps threshold
    this.staleRequestMaxDistance = WORKER_CONFIG.STALE_REQUEST_MAX_DISTANCE;
    
    // Start the staged dispatch loop
    this._startStagedDispatch();
  }

  initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });
      worker.onmessage = (event) => this.handleWorkerResponse(worker, event);
      worker.onerror = (error) => this.handleWorkerError(worker, i, error);
      this.workers.push({ worker, busy: false, index: i });
    }
  }

  /**
   * Recreate a worker that has failed
   * @param {number} workerIndex - Index of the worker to recreate
   * @returns {boolean} True if recreation successful
   */
  recreateWorker(workerIndex) {
    if (workerIndex < 0 || workerIndex >= this.workers.length) {
      if (DEBUG) console.error(`[WorkerPool] Invalid worker index: ${workerIndex}`);
      return false;
    }

    const oldEntry = this.workers[workerIndex];
    if (oldEntry.worker) {
      oldEntry.worker.terminate();
    }

    try {
      const newWorker = new Worker(this.workerScript, { type: 'module' });
      newWorker.onmessage = (event) => this.handleWorkerResponse(newWorker, event);
      newWorker.onerror = (error) => this.handleWorkerError(newWorker, workerIndex, error);
      newWorker.onmessageerror = (event) => this.handleWorkerMessageError(newWorker, workerIndex, event);
      
      this.workers[workerIndex] = {
        worker: newWorker,
        busy: false,
        index: workerIndex
      };

      if (DEBUG) console.log(`[WorkerPool] Worker ${workerIndex} recreated successfully`);
      return true;
    } catch (err) {
      if (DEBUG) console.error(`[WorkerPool] Failed to recreate worker ${workerIndex}:`, err);
      return false;
    }
  }

  handleWorkerMessageError(worker, workerIndex, event) {
    if (DEBUG) {
      console.error(`[WorkerPool] Worker ${workerIndex} message error:`, event);
    }
    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = false;
    }
  }

  _startStagedDispatch() {
    // Direct dispatch - call callback immediately when chunk is ready
    // This bypasses the complex staged dispatch that was causing issues
  }

  handleWorkerResponse(worker, event) {
    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = false;
      const task = this._dequeueTask();
      if (task) {
        this.executeTask(worker, task);
      }
    }

    if (event.data.type === 'chunkGenerated') {
      const { chunkData, callbackId, error } = event.data;
      
      // Handle AbortError - request was cancelled, ignore it
      if (error && error.message && error.message.includes('aborted')) {
        this.activeRequests.delete(callbackId);
        this.pendingCallbacks.delete(callbackId);
        return;
      }
      
      // Directly call the callback with the chunk data
      const callbackInfo = this.pendingCallbacks.get(callbackId);
      if (callbackInfo) {
        callbackInfo.callback(chunkData);
        this.pendingCallbacks.delete(callbackId);
      }
      // Clean up activeRequests when worker completes
      this.activeRequests.delete(callbackId);
    } else if (event.data.type === 'error') {
      const { callbackId, error } = event.data;
      
      // Handle AbortError - request was cancelled, ignore it
      if (error && error.message && error.message.includes('aborted')) {
        this.activeRequests.delete(callbackId);
        this.pendingCallbacks.delete(callbackId);
        return;
      }
      
      const callbackInfo = this.pendingCallbacks.get(callbackId);
      
      // Try error callback first, then fall back to null callback
      if (callbackInfo?.errorCallback) {
        callbackInfo.errorCallback(error, callbackId);
      } else if (callbackInfo?.callback) {
        callbackInfo.callback(null); // Call with null to indicate failure
      }
      
      if (callbackInfo) {
        this.pendingCallbacks.delete(callbackId);
      }
      
      // Clean up activeRequests on error
      this.activeRequests.delete(callbackId);
      
      if (DEBUG) {
        console.error(`[WorkerPool] Worker error for callback ${callbackId}:`, error);
      }
    }
  }

  _dequeueTask() {
    // Priority-based dequeue: sort by priority (lower = higher priority)
    if (this.taskQueue.length === 0) return null;
    this.taskQueue.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    return this.taskQueue.shift();
  }

  handleWorkerError(worker, workerIndex, error) {
    // Enhanced error handling with worker context
    const errorContext = {
      workerIndex,
      errorType: error.constructor?.name || 'Error',
      message: error.message || String(error),
      timestamp: Date.now()
    };

    if (DEBUG) {
      console.error(`[WorkerPool] Worker ${workerIndex} error:`, errorContext);
    } else {
      console.error(`[WorkerPool] Worker ${workerIndex} error: ${errorContext.message}`);
    }

    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = false;
    }

    // Attempt to recreate the failed worker
    const recreated = this.recreateWorker(workerIndex);
    if (!recreated && DEBUG) {
      console.error(`[WorkerPool] Could not recreate worker ${workerIndex}`);
    }
  }

  executeTask(worker, task) {
    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = true;
      worker.postMessage({
        ...task.message,
        callbackId: task.callbackId
      });
    }
  }

  enqueueTask(message, callback, priority = 0, errorCallback = null) {
    const callbackId = ++this.callbackIdCounter;
    const abortController = new AbortController();
    
    // Track the request with its AbortController for cancellation
    this.activeRequests.set(callbackId, { abortController, message, priority });
    this.pendingCallbacks.set(callbackId, { callback, errorCallback });

    const availableWorker = this.workers.find(w => !w.busy);
    if (availableWorker) {
      this.executeTask(availableWorker.worker, { message, callbackId, priority });
    } else {
      this.taskQueue.push({ message, callbackId, priority });
    }
    return callbackId;
  }

  /**
   * Check if a chunk generation request is still relevant (player hasn't moved too far).
   * Call this to abort stale loads during fast player movement.
   */
  isRequestStale(chunkX, chunkZ, playerChunkX, playerChunkZ, maxDistance = null) {
    const maxDist = maxDistance ?? this.staleRequestMaxDistance;
    const dx = Math.abs(chunkX - playerChunkX);
    const dz = Math.abs(chunkZ - playerChunkZ);
    return dx > maxDist || dz > maxDist;
  }

  /**
   * Clear stale requests from the queue based on current player position.
   */
  clearStaleRequests(playerChunkX, playerChunkZ, maxDistance = null) {
    const removed = [];
    this.taskQueue = this.taskQueue.filter(task => {
      const { chunkX, chunkZ } = task.message;
      if (this.isRequestStale(chunkX, chunkZ, playerChunkX, playerChunkZ, maxDistance)) {
        removed.push(task);
        return false;
      }
      return true;
    });
    return removed;
  }

  /**
   * Cancel a specific request by callbackId.
   * @param {number} callbackId - The callback ID to cancel
   * @returns {boolean} True if cancelled, false if not found
   */
  cancelRequest(callbackId) {
    const request = this.activeRequests.get(callbackId);
    if (request) {
      request.abortController.abort();
      this.activeRequests.delete(callbackId);
      this.pendingCallbacks.delete(callbackId);
      if (DEBUG) console.log(`[WorkerPool] Cancelled stale request ${callbackId}`);
      return true;
    }
    return false;
  }

  /**
   * Cancel all stale in-flight requests based on current camera position.
   * @param {number} camChunkX - Current camera chunk X
   * @param {number} camChunkZ - Current camera chunk Z
   * @param {number} maxDistance - Maximum distance for requests to remain valid
   * @returns {number} Number of requests cancelled
   */
  cancelStaleRequests(camChunkX, camChunkZ, maxDistance = null) {
    const maxDist = maxDistance ?? this.staleRequestMaxDistance;
    let cancelledCount = 0;
    
    for (const [callbackId, request] of this.activeRequests) {
      const { message } = request;
      const chunkX = message.chunkX;
      const chunkZ = message.chunkZ;
      
      const dx = Math.abs(chunkX - camChunkX);
      const dz = Math.abs(chunkZ - camChunkZ);
      
      if (dx > maxDist || dz > maxDist) {
        request.abortController.abort();
        this.activeRequests.delete(callbackId);
        this.pendingCallbacks.delete(callbackId);
        cancelledCount++;
        if (DEBUG) console.log(`[WorkerPool] Cancelled stale request ${callbackId} (chunk ${chunkX},${chunkZ})`);
      }
    }
    
    return cancelledCount;
  }

  /**
   * Register an error callback for a callbackId to handle failures gracefully
   * @param {number} callbackId - The callback ID
   * @param {Function} errorCallback - Called when worker reports an error
   */
  setErrorCallback(callbackId, errorCallback) {
    const callbackInfo = this.pendingCallbacks.get(callbackId);
    if (callbackInfo) {
      callbackInfo.errorCallback = errorCallback;
      this.pendingCallbacks.set(callbackId, callbackInfo);
    }
  }

  /**
   * Set the maximum number of chunks dispatched per frame.
   */
  setMaxDispatchesPerFrame(n) {
    this.maxDispatchesPerFrame = Math.max(1, Math.min(16, n));
  }

  /**
   * Set the frame budget in milliseconds for dispatch processing.
   */
  setDispatchBudget(ms) {
    this.dispatchBudgetMs = Math.max(1, ms);
  }

  terminate() {
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.dispatchQueue = [];
    this.pendingCallbacks.clear();
    this.activeRequests.clear();
  }
}
