export class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.poolSize = poolSize;
    this.workerScript = workerScript;
    this.workers = [];
    this.taskQueue = []; // Priority queue: { message, callback, priority, callbackId }
    this.pendingCallbacks = new Map();
    this.callbackIdCounter = 0;
    this.initWorkers();
    
    // Staged dispatch settings
    this.maxDispatchesPerFrame = 4; // Max chunks to dispatch per frame
    this.dispatchBudgetMs = 4; // Max additional frame time to spend dispatching
    this.dispatchQueue = []; // Results waiting to be dispatched to main thread
    this.lastDispatchTime = 0;
    this.frameTimeThreshold = 16; // ~60fps threshold
    
    // Start the staged dispatch loop
    this._startStagedDispatch();
  }

  initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });
      worker.onmessage = (event) => this.handleWorkerResponse(worker, event);
      worker.onerror = (error) => this.handleWorkerError(worker, error);
      this.workers.push({ worker, busy: false });
    }
  }

  _startStagedDispatch() {
    // Use setTimeout for reliable cross-browser dispatch
    const scheduleNext = () => {
      setTimeout(() => this._processDispatchQueue(), 0);
    };

    this._processDispatchQueue = () => {
      if (this.dispatchQueue.length === 0) return;
      
      const now = performance.now();
      let dispatched = 0;
      
      // Dispatch up to maxDispatchesPerFrame, respecting frame budget
      while (this.dispatchQueue.length > 0 && dispatched < this.maxDispatchesPerFrame) {
        const elapsed = performance.now() - now;
        if (elapsed >= this.dispatchBudgetMs) break; // Respect frame budget
        
        const item = this.dispatchQueue.shift();
        if (item.callback) {
          item.callback(item.chunkData);
        }
        dispatched++;
      }
      
      // Schedule next batch if more items waiting
      if (this.dispatchQueue.length > 0) {
        scheduleNext();
      }
    };
    
    // Initial schedule check
    scheduleNext();
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
      const { chunkData, callbackId } = event.data;
      // Immediately resolve the pending callback with staged queue
      // The actual dispatch happens in _processDispatchQueue
      const callback = this.pendingCallbacks.get(callbackId);
      if (callback) {
        // Wrap callback to go through staged dispatch
        this.dispatchQueue.push({
          chunkData,
          callback,
          callbackId,
          priority: 0
        });
        this.pendingCallbacks.delete(callbackId);
      }
    } else if (event.data.type === 'error') {
      console.error('[WorkerPool] Worker error:', event.data.error);
      const { callbackId } = event.data;
      const callback = this.pendingCallbacks.get(callbackId);
      if (callback) {
        callback(null); // Call with null to indicate failure
        this.pendingCallbacks.delete(callbackId);
      }
    }
  }

  _dequeueTask() {
    // Priority-based dequeue: sort by priority (lower = higher priority)
    if (this.taskQueue.length === 0) return null;
    this.taskQueue.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    return this.taskQueue.shift();
  }

  handleWorkerError(worker, error) {
    console.error('Worker error:', error);
    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = false;
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

  enqueueTask(message, callback, priority = 0) {
    const callbackId = ++this.callbackIdCounter;
    this.pendingCallbacks.set(callbackId, callback);

    const availableWorker = this.workers.find(w => !w.busy);
    if (availableWorker) {
      this.executeTask(availableWorker.worker, { message, callbackId, priority });
    } else {
      this.taskQueue.push({ message, callbackId, priority });
    }
  }

  /**
   * Check if a chunk generation request is still relevant (player hasn't moved too far).
   * Call this to abort stale loads during fast player movement.
   */
  isRequestStale(chunkX, chunkZ, playerChunkX, playerChunkZ, maxDistance = 2) {
    const dx = Math.abs(chunkX - playerChunkX);
    const dz = Math.abs(chunkZ - playerChunkZ);
    return dx > maxDistance || dz > maxDistance;
  }

  /**
   * Clear stale requests from the queue based on current player position.
   */
  clearStaleRequests(playerChunkX, playerChunkZ, maxDistance = 2) {
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
  }
}
