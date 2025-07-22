import { WorkerPool } from './workers/workerPool.js';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';
import ChunkWorker from './workers/chunkWorker.js?worker';

export class World {
  constructor(noiseSeed, scene) {
    this.chunks = {}; // key: `${chunkX},${chunkZ}`
    this.noiseSeed = noiseSeed;
    this.scene = scene;
    this.pendingChunks = new Map();
    this.workerPool = new WorkerPool(
      ChunkWorker,
      4
    );
    
    // Priority loading system
    this.initialChunkLoaded = false;
    this.initialChunkPosition = null;
    this.priorityQueue = [];
    this.isInitializing = false;
  }

  getChunk(chunkX, chunkZ, isPriority = false) {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunks[key]) {
      // Create placeholder chunk
      const chunk = new Chunk(chunkX, chunkZ);
      this.chunks[key] = chunk;
      this.pendingChunks.set(key, chunk);

      // Queue generation task with priority handling
      const taskData = { chunkX, chunkZ, noiseSeed: this.noiseSeed };
      const callback = (chunkData) => {
        if (!this.chunks[key]) return; // Chunk was unloaded before generation completed
        
        chunk.voxels = new Uint8Array(chunkData.voxels);
        const mesh = chunk.createMesh();
        mesh.position.set(chunkX * CHUNK_WIDTH, 0, chunkZ * CHUNK_DEPTH);
        this.scene.add(mesh);
        chunk.mesh = mesh;
        this.pendingChunks.delete(key);
        
        // Mark initial chunk as loaded if this was the priority chunk
        if (isPriority && this.initialChunkPosition && 
            chunkX === this.initialChunkPosition.x && 
            chunkZ === this.initialChunkPosition.z) {
          this.initialChunkLoaded = true;
          console.log('Initial chunk loaded at:', chunkX, chunkZ);
        }
      };

      if (isPriority) {
        // Add to front of queue for priority processing
        this.workerPool.enqueuePriorityTask(taskData, callback);
      } else {
        this.workerPool.enqueueTask(taskData, callback);
      }
    }
    return this.chunks[key];
  }

  /**
   * Preload the chunk at the given camera position with high priority
   * @param {THREE.Vector3} cameraPosition - Initial camera position
   * @returns {Promise} Promise that resolves when initial chunk is loaded
   */
  async preloadInitialChunk(cameraPosition) {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);
    
    this.initialChunkPosition = { x: camChunkX, z: camChunkZ };
    
    console.log('Preloading initial chunk at:', camChunkX, camChunkZ);
    
    // Load the initial chunk with high priority
    this.getChunk(camChunkX, camChunkZ, true);
    
    // Wait for initial chunk to load
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.initialChunkLoaded) {
          resolve();
        } else {
          setTimeout(checkLoaded, 50); // Check every 50ms
        }
      };
      checkLoaded();
    });
  }

  update(cameraPosition, renderDistance = 12) {
    // Don't update until initial chunk is loaded (unless we're not initializing)
    if (this.isInitializing && !this.initialChunkLoaded) {
      return;
    }

    // Determine current camera chunk
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);

    // Create a set for chunks that should be loaded
    const chunksToKeep = new Set();
    const chunksToLoad = [];

    // Collect chunks that need to be loaded and calculate distances
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const key = `${x},${z}`;
        chunksToKeep.add(key);
        
        if (!this.chunks[key]) {
          // Calculate distance from camera chunk for prioritization
          const dx = x - camChunkX;
          const dz = z - camChunkZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          chunksToLoad.push({ x, z, distance, key });
        }
      }
    }

    // Sort chunks by distance (closest first) for better loading order
    chunksToLoad.sort((a, b) => a.distance - b.distance);

    // Load chunks in order of proximity
    for (const chunkInfo of chunksToLoad) {
      this.getChunk(chunkInfo.x, chunkInfo.z);
    }

    // Unload chunks that are too far away
    for (const key in this.chunks) {
      if (!chunksToKeep.has(key)) {
        const chunk = this.chunks[key];
        
        // Cancel pending generation if exists
        if (this.pendingChunks.has(key)) {
          this.pendingChunks.delete(key);
        }
        
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        delete this.chunks[key];
      }
    }
  }

  dispose() {
    this.workerPool.terminate();
    for (const key in this.chunks) {
      const chunk = this.chunks[key];
      this.scene.remove(chunk.mesh);
      chunk.dispose();
    }
    this.chunks = {};
    this.pendingChunks.clear();
  }
}
