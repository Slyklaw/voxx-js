export class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.poolSize = poolSize;
    this.workerScript = workerScript;
    this.workers = [];
    this.taskQueue = [];
    this.pendingCallbacks = new Map();
    this.initWorkers();
  }

  initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });
      worker.onmessage = (event) => this.handleWorkerResponse(worker, event);
      worker.onerror = (error) => this.handleWorkerError(worker, error);
      this.workers.push({ worker, busy: false });
    }
  }

  handleWorkerResponse(worker, event) {
    const workerEntry = this.workers.find(w => w.worker === worker);
    if (workerEntry) {
      workerEntry.busy = false;
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(worker, task);
      }
    }

    if (event.data.type === 'chunkGenerated') {
      const { chunkData, callbackId } = event.data;
      const callback = this.pendingCallbacks.get(callbackId);
      if (callback) {
        callback(chunkData);
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

  enqueueTask(message, callback) {
    const callbackId = performance.now() + Math.random().toString(36).substring(2);
    this.pendingCallbacks.set(callbackId, callback);

    const availableWorker = this.workers.find(w => !w.busy);
    if (availableWorker) {
      this.executeTask(availableWorker.worker, { message, callbackId });
    } else {
      this.taskQueue.push({ message, callbackId });
    }
  }

  terminate() {
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.pendingCallbacks.clear();
  }
}
